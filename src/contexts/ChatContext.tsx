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

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [model, setModel] = useState<string>("gpt-4o-search-preview");
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const isInitialized = useRef(false);

  // Helper for remote save
  const syncToSupabase = useCallback(async (session: ChatSession, syncKey?: string, url?: string, anonKey?: string) => {
    const supabase = getSupabase(url || settings.supabaseUrl, anonKey || settings.supabaseAnonKey);
    const userId = syncKey || settings.syncKey;
    if (!supabase || !userId) return;

    // Upcert session
    await supabase.from('sessions').upsert({
      id: session.id,
      user_id: userId,
      title: session.title,
      model: session.model,
      provider: session.provider,
      updated_at: session.updatedAt
    });

    // Upsert messages (simple approach: sync all)
    if (session.messages.length > 0) {
      await supabase.from('messages').upsert(
        session.messages.map(m => ({
          id: m.id,
          session_id: session.id,
          role: m.role,
          content: m.content,
          created_at: m.createdAt
        }))
      );
    }
  }, [settings.supabaseUrl, settings.supabaseAnonKey, settings.syncKey]);

  // Load state from DB & LocalStorage on mount
  useEffect(() => {
    if (isInitialized.current) return;

    const load = async () => {
      // 1. Load settings
      const savedSettings = localStorage.getItem("workspace_settings");
      let currentSettings = { ...DEFAULT_SETTINGS };
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        currentSettings = { ...currentSettings, ...parsed };
        setSettings(currentSettings);
      }

      // 2. Load Local sessions
      const localData = await getAllSessions();
      let mergedData = localData;

      // 3. Attempt to Pull from Supabase if configured
      const supabase = getSupabase(currentSettings.supabaseUrl, currentSettings.supabaseAnonKey);
      if (supabase && currentSettings.syncKey) {
        try {
          const { data: remoteSessions } = await supabase
            .from('sessions')
            .select('*, messages(*)')
            .eq('user_id', currentSettings.syncKey);
          
          if (remoteSessions) {
            // Very simple merge: Remote wins by updatedAt
            const remoteMapped: ChatSession[] = remoteSessions.map(s => ({
              id: s.id,
              title: s.title,
              model: s.model,
              provider: s.provider,
              updatedAt: s.updated_at,
              messages: (s.messages || []).map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: m.created_at
              })).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            }));

            // Combine and Dedup
            const combined = [...localData];
            remoteMapped.forEach(rs => {
              const idx = combined.findIndex(ls => ls.id === rs.id);
              if (idx === -1) {
                combined.push(rs);
                dbSaveSession(rs); // Save to local too
              } else if (new Date(rs.updatedAt) > new Date(combined[idx].updatedAt)) {
                combined[idx] = rs;
                dbSaveSession(rs);
              }
            });
            mergedData = combined;
          }
        } catch (e) {
          console.error("Supabase sync failed on load:", e);
        }
      }

      const sorted = mergedData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      const now = new Date();
      const retentionMs = currentSettings.retentionDays * 24 * 60 * 60 * 1000;
      const filtered = sorted.filter(s => {
        if (currentSettings.retentionDays === 0) return false;
        if (currentSettings.retentionDays >= 365) return true;
        const diff = now.getTime() - new Date(s.updatedAt).getTime();
        return diff < retentionMs;
      });

      setSessions(filtered);
      if (filtered.length > 0) {
        setCurrentSessionId(filtered[0].id);
      }
      isInitialized.current = true;
    };
    load();
  }, []);

  // Phase 21.3: Real-time Supabase Listener
  useEffect(() => {
    const supabase = getSupabase(settings.supabaseUrl, settings.supabaseAnonKey);
    if (!supabase || !settings.syncKey) return;

    const channel = supabase
      .channel('chat_sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'sessions', 
        filter: `user_id=eq.${settings.syncKey}` 
      }, async (payload) => {
        // Simple strategy: reload list on external change
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const fresh = await getAllSessions(); // Reload from local + remote logic could be complex, for now reload local
          // This part needs better merge logic if we want true instant multi-device, 
          // but for basic MVP, polling-like re-fetch is safer.
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [settings.supabaseUrl, settings.supabaseAnonKey, settings.syncKey]);

  const updateSettings = useCallback((updates: Partial<GlobalSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem("workspace_settings", JSON.stringify(next));
      return next;
    });
  }, []);

  const createSession = useCallback((title = "New Chat") => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title,
      provider: "openai",
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

  const updateSession = useCallback((id: string, updates: Partial<ChatSession> | ((prev: ChatSession) => Partial<ChatSession>)) => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id !== id) return s;
        const resolvedUpdates = typeof updates === "function" ? updates(s) : updates;
        const newSession = { ...s, ...resolvedUpdates, updatedAt: new Date().toISOString() };
        dbSaveSession(newSession);
        syncToSupabase(newSession);
        return newSession;
      });
      return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    });
  }, [syncToSupabase]);

  const removeSession = useCallback(async (id: string) => {
    const supabase = getSupabase(settings.supabaseUrl, settings.supabaseAnonKey);
    if (supabase && settings.syncKey) {
      await supabase.from('sessions').delete().eq('id', id);
    }
    
    await dbDeleteSession(id);
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (currentSessionId === id && filtered.length > 0) {
        setCurrentSessionId(filtered[0].id);
      } else if (filtered.length === 0) {
        setCurrentSessionId(null);
      }
      return filtered;
    });
  }, [currentSessionId, settings.supabaseUrl, settings.supabaseAnonKey, settings.syncKey]);

  return (
    <ChatContext.Provider value={{
      sessions,
      currentSessionId,
      setCurrentSessionId,
      createSession,
      updateSession,
      removeSession,
      apiKey,
      setApiKey,
      model,
      setModel,
      settings,
      updateSettings
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
