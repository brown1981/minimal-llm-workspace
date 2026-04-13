"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { ChatSession, ChatMessage, AppTheme, GlobalSettings } from "@/lib/types";
import { getAllSessions, saveSession as dbSaveSession, deleteSession as dbDeleteSession } from "@/lib/db";

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
  const [model, setModel] = useState<string>("gpt-4o");
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const isInitialized = useRef(false);

  // Load state from DB & LocalStorage on mount
  useEffect(() => {
    if (isInitialized.current) return;

    const load = async () => {
      // 1. Load settings first
      const savedSettings = localStorage.getItem("workspace_settings");
      let currentRetention = DEFAULT_SETTINGS.retentionDays;
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        currentRetention = parsed.retentionDays;
        setSettings(prev => ({ ...prev, ...parsed }));
      }

      // 2. Load sessions
      const data = await getAllSessions();
      const sorted = data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      const now = new Date();
      const retentionMs = currentRetention * 24 * 60 * 60 * 1000;
      const filtered = sorted.filter(s => {
        if (currentRetention === 0) return false;
        if (currentRetention >= 365) return true;
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
    return newSession;
  }, [model]);

  const updateSession = useCallback((id: string, updates: Partial<ChatSession> | ((prev: ChatSession) => Partial<ChatSession>)) => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id !== id) return s;
        const resolvedUpdates = typeof updates === "function" ? updates(s) : updates;
        const newSession = { ...s, ...resolvedUpdates, updatedAt: new Date().toISOString() };
        dbSaveSession(newSession);
        return newSession;
      });
      return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    });
  }, []);

  const removeSession = useCallback(async (id: string) => {
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
  }, [currentSessionId]);

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
