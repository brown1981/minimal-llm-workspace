"use client";

import { X, Key, Box, ShieldCheck, Palette, Zap, History } from "lucide-react";
import { OPENAI_MODELS, AppTheme, GlobalSettings } from "@/lib/types";
import { useChatContext } from "@/contexts/ChatContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  model: string;
  setModel: (model: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  setApiKey,
  model,
  setModel
}: SettingsModalProps) {
  const { settings, updateSettings } = useChatContext();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-300"
      >
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X size={20} className="opacity-40" />
          </button>
        </div>

        <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {/* API Key Section */}
          <section className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 flex items-center gap-2">
              <Key size={12} /> OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all"
            />
            <div className="flex items-center gap-2 mt-1 text-[10px] opacity-30">
              <ShieldCheck size={10} />
              <span>In-memory only. Never persisted.</span>
            </div>
          </section>

          {/* Theme Section */}
          <section className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 flex items-center gap-2">
              <Palette size={12} /> Aesthetic Theme
            </label>
            <div className="flex gap-2">
              {(["pure-black", "glass", "paper"] as AppTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => updateSettings({ theme: t })}
                  className={`
                    flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all
                    ${settings.theme === t 
                      ? "bg-accent border-accent text-white" 
                      : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 opacity-60"}
                  `}
                >
                  {t.replace("-", " ")}
                </button>
              ))}
            </div>
          </section>

          {/* Typing Speed Section */}
          <section className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 flex items-center gap-2">
              <Zap size={12} /> Typing Rhythm
            </label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="10" 
              value={settings.typingSpeed}
              onChange={(e) => updateSettings({ typingSpeed: parseInt(e.target.value) })}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[10px] opacity-40 font-medium">
              <span>Instant</span>
              <span>Emotional / Slow</span>
            </div>
          </section>

          {/* Retention Section */}
          <section className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 flex items-center gap-2">
              <History size={12} /> History Retention
            </label>
            <select 
              value={settings.retentionDays}
              onChange={(e) => updateSettings({ retentionDays: parseInt(e.target.value) })}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:outline-none appearance-none cursor-pointer"
            >
              <option value={0}>Forget immediately (Incognito)</option>
              <option value={7}>7 Days</option>
              <option value={30}>30 Days</option>
              <option value={365}>Forever (Local)</option>
            </select>
          </section>
        </div>

        <div className="mt-12">
          <button
            onClick={onClose}
            className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-4 rounded-[1.5rem] font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-black/10"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
