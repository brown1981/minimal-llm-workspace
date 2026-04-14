"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { ChatSession, ChatMessage, AppTheme, GlobalSettings } from "@/lib/types";
import { getAllSessions, saveSession as dbSaveSession, deleteSession as dbDeleteSession } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";

interface ChatContextType {
  sessions: ChatSession[];
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  createSession: (title?: string) => ChatSession;
  updateSession: (id: string, updates: Partial<ChatSession> | ((prev: ChatSession) => Partial<ChatSession>)) => void;
  upsertSession: (session: ChatSession) => void;
  removeSession: (id: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  model: string;
  setModel: (model: string) => void;
  settings: GlobalSettings;
  updateSettings: (updates: Partial<GlobalSettings>) => void;
}

const DEFAULT_SETTINGS: GlobalSettings = {
  theme: "pure-black",
  typingSpeed: 20,
  retentionDays: 30,
  autoSearch: true,
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Aggressive Key Sanitation (Phase 34)
function sanitizeKey(key: string, name: string): string {
  if (!key) return "";
  let clean = key.trim();
  // Remove accidental command prefix if present (Vercel Log evidence found "npx ...")
  if (clean.toLowerCase().includes("npx ") || clean.toLowerCase().includes("supabase")) {
    console.warn(`[ChatContext] Detected command-like string in ${name} field. Removing...`);
    // Heuristic: If SK is hidden somewhere inside, extract it, otherwise clear it.
    const match = clean.match(/(sk-[a-zA-Z0-9]+)/);
    return match ? match[1] : "";
  }
  return clean;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [model, setModel] = useState<string>("gpt-4o-mini"); // Default to mini for reliability
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const isInitialized = useRef(false);

  const apiKey = settings.openaiKey || "";

  const syncToSupabase = useCallback(async (session: ChatSession) => {
    try {
      const supabase = getSupabase(settings.supabaseUrl, settings.supabaseAnonKey);
      if (!supabase || !settings.syncKey) return;
      await supabase.from('sessions').upsert({
        id: session.id,
        user_id: settings.syncKey,
        title: session.title,
        model: session.model,
        provider: session.provider,
        updated_at: session.updatedAt
      });
      if (session.messages.length > 0) {
        await supabase.from('messages').upsert(
          session.messages.map(m => ({
            id: m.id,
            session_id: session.id,
            role: m.role,
            content: m.content,
            created_at: m.createdAt
          }))
        ).select("*"); // Trigger execution instead of .catch
      }
    } catch (e) { console.warn("Sync failed:", e); }
  }, [settings.supabaseUrl, settings.supabaseAnonKey, settings.syncKey]);

  useEffect(() => {
    if (isInitialized.current) return;
    const load = async () => {
      const savedSettings = localStorage.getItem("workspace_settings");
      let currentSettings = { ...DEFAULT_SETTINGS };
      if (savedSettings) {
        try { 
          const parsed = JSON.parse(savedSettings);
          // Auto-sanitize on load
          currentSettings = { 
            ...currentSettings, 
            ...parsed,
            openaiKey: sanitizeKey(parsed.openaiKey, "OpenAI"),
            anthropicKey: sanitizeKey(parsed.anthropicKey, "Anthropic"),
            geminiKey: sanitizeKey(parsed.geminiKey, "Gemini")
          };
        } catch (e) {}
      }
      setSettings(currentSettings);
      try {
        const localData = await getAllSessions();
        const sorted = localData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setSessions(sorted);
        if (sorted.length > 0) setCurrentSessionId(sorted[0].id);
      } catch (e) {}
      isInitialized.current = true;
    };
    load();
  }, []);

  const updateSettings = useCallback((updates: Partial<GlobalSettings>) => {
    setSettings(prev => {
      const next = { 
        ...prev, 
        ...updates,
        openaiKey: updates.openaiKey !== undefined ? sanitizeKey(updates.openaiKey, "OpenAI") : prev.openaiKey,
        anthropicKey: updates.anthropicKey !== undefined ? sanitizeKey(updates.anthropicKey, "Anthropic") : prev.anthropicKey,
        geminiKey: updates.geminiKey !== undefined ? sanitizeKey(updates.geminiKey, "Gemini") : prev.geminiKey
      };
      localStorage.setItem("workspace_settings", JSON.stringify(next));
      return next;
    });
  }, []);

  const setApiKey = useCallback((key: string) => updateSettings({ openaiKey: key }), [updateSettings]);
  
  const setModelInContext = useCallback((newModel: string) => setModel(newModel), []);

  const createSession = useCallback((title = "New Chat") => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title,
      provider: model.includes("claude") ? "anthropic" : model.includes("gemini") ? "google" : "openai",
      model,
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    dbSaveSession(newSession);
    syncToSupabase(newSession);
    return newSession;
  }, [model, syncToSupabase]);

  const upsertSession = useCallback((session: ChatSession) => {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === session.id);
      let next;
      if (idx === -1) {
        next = [session, ...prev];
      } else {
        next = [...prev];
        next[idx] = session;
      }
      return next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    });
    setCurrentSessionId(session.id); // Move out of updater
    dbSaveSession(session);
    syncToSupabase(session);
  }, [syncToSupabase]);

  const updateSession = useCallback((id: string, updates: Partial<ChatSession> | ((prev: ChatSession) => Partial<ChatSession>)) => {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx === -1) return prev;
      const resolvedUpdates = typeof updates === "function" ? updates(prev[idx]) : updates;
      const newSession = { ...prev[idx], ...resolvedUpdates, updatedAt: new Date().toISOString() };
      dbSaveSession(newSession);
      syncToSupabase(newSession);
      const next = [...prev];
      next[idx] = newSession;
      return next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    });
  }, [syncToSupabase]);

  const removeSession = useCallback(async (id: string) => {
    await dbDeleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) setCurrentSessionId(null);
    const supabase = getSupabase(settings.supabaseUrl, settings.supabaseAnonKey);
    if (supabase && settings.syncKey) await supabase.from('sessions').delete().eq('id', id);
  }, [currentSessionId, settings.supabaseUrl, settings.supabaseAnonKey, settings.syncKey]);

  return (
    <ChatContext.Provider value={{
      sessions, currentSessionId, setCurrentSessionId, createSession, updateSession, upsertSession,
      removeSession, apiKey, setApiKey, model, setModel: setModelInContext, settings, updateSettings
    }}>
      <div className={`theme-root ${settings.theme}`}>
        {children}
      </div>
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChatContext must be used within a ChatProvider");
  return context;
}
