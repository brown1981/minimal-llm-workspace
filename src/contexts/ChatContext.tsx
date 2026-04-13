"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ChatSession, ChatMessage, AppTheme, GlobalSettings } from "@/lib/types";
import { getAllSessions, saveSession as dbSaveSession, deleteSession as dbDeleteSession, initDB } from "@/lib/db";

interface ChatContextType {
  sessions: ChatSession[];
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  createSession: (title?: string) => ChatSession;
  updateSession: (id: string, updates: Partial<ChatSession>) => void;
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

  // Load state from DB & LocalStorage on mount
  useEffect(() => {
    const load = async () => {
      // Load sessions
      const data = await getAllSessions();
      const sorted = data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      // Cleanup sessions based on retention policy (simple check)
      const now = new Date();
      const retentionMs = settings.retentionDays * 24 * 60 * 60 * 1000;
      const filtered = sorted.filter(s => {
        if (settings.retentionDays === 0) return false;
        if (settings.retentionDays >= 365) return true;
        const diff = now.getTime() - new Date(s.updatedAt).getTime();
        return diff < retentionMs;
      });

      setSessions(filtered);
      if (filtered.length > 0) {
        setCurrentSessionId(filtered[0].id);
      }

      // Load settings from localStorage
      const savedSettings = localStorage.getItem("workspace_settings");
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      }
    };
    load();
  }, [settings.retentionDays]);

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

  const updateSession = useCallback((id: string, updates: Partial<ChatSession>) => {
    setSessions(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s);
      const target = updated.find(s => s.id === id);
      if (target) dbSaveSession(target);
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
