"use client";

import { X, Key, ShieldCheck, Palette, Zap, History, Cpu, Cloud, RefreshCw, Copy, Check, BrainCircuit } from "lucide-react";
import { AVAILABLE_MODELS, AppTheme } from "@/lib/types";
import { useChatContext } from "@/contexts/ChatContext";
import { useState } from "react";

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
  const [copied, setCopied] = useState(false);
  
  if (!isOpen) return null;

  const generateSyncKey = () => {
    updateSettings({ syncKey: crypto.randomUUID() });
  };

  const handleCopy = () => {
    if (settings.syncKey) {
      navigator.clipboard.writeText(settings.syncKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-300"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold tracking-tight">Settings</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X size={20} className="opacity-40" />
          </button>
        </div>

        <div className="space-y-8 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar pb-4">
          
          {/* Intelligence Engine */}
          <section className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 flex items-center gap-2">
              <Cpu size={12} /> Intelligence Engine
            </label>
            <div className="grid grid-cols-1 gap-2">
              {AVAILABLE_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={`
                    flex flex-col items-start px-5 py-3 rounded-2xl border transition-all text-left
                    ${model === m.id 
                      ? "bg-accent/5 border-accent ring-1 ring-accent" 
                      : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 opacity-60 hover:opacity-100"}
                  `}
                >
                  <div className="flex justify-between w-full items-center">
                    <span className="text-sm font-bold tracking-tight">{m.name}</span>
                    <span className="text-[9px] px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded-full opacity-50 font-bold uppercase tracking-wider">
                      {m.provider}
                    </span>
                  </div>
                  <span className="text-[10px] opacity-40">{m.description}</span>
                </button>
              ))}
            </div>
          </section>

          {/* API Keys - Multiple Providers (Phase 4.2 & 4.3) */}
          <section className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 flex items-center gap-2">
              <BrainCircuit size={12} /> Provider Keys
            </label>
            
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between px-2">
                  <span className="text-[9px] font-bold opacity-30">OPENAI (GPT-4o)</span>
                  <a href="https://platform.openai.com/" target="_blank" className="text-[9px] opacity-20 hover:opacity-50 transition-opacity underline">Get Key</a>
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between px-2">
                  <span className="text-[9px] font-bold opacity-30">ANTHROPIC (Claude 3.5)</span>
                  <a href="https://console.anthropic.com/" target="_blank" className="text-[9px] opacity-20 hover:opacity-50 transition-opacity underline">Get Key</a>
                </div>
                <input
                  type="password"
                  value={settings.anthropicKey || ""}
                  onChange={(e) => updateSettings({ anthropicKey: e.target.value })}
                  placeholder="sk-ant-..."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between px-2">
                  <span className="text-[9px] font-bold opacity-30">GOOGLE (Gemini 2.5)</span>
                  <a href="https://aistudio.google.com/" target="_blank" className="text-[9px] opacity-20 hover:opacity-50 transition-opacity underline">Get Key Free</a>
                </div>
                <input
                  type="password"
                  value={settings.geminiKey || ""}
                  onChange={(e) => updateSettings({ geminiKey: e.target.value })}
                  placeholder="AIza..."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                />
              </div>
            </div>
          </section>

          {/* Cloud Sync Section */}
          <section className="space-y-4 p-5 bg-zinc-50 dark:bg-zinc-950/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 flex items-center gap-2">
              <Cloud size={12} /> Cloud Sync (Supabase)
            </label>
            
            <div className="space-y-3">
              <input
                type="text"
                value={settings.supabaseUrl || ""}
                onChange={(e) => updateSettings({ supabaseUrl: e.target.value })}
                placeholder="Supabase Project URL"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none"
              />
              <input
                type="password"
                value={settings.supabaseAnonKey || ""}
                onChange={(e) => updateSettings({ supabaseAnonKey: e.target.value })}
                placeholder="Supabase Anon Key"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none"
              />
              <div className="relative">
                <input
                  type="text"
                  value={settings.syncKey || ""}
                  onChange={(e) => updateSettings({ syncKey: e.target.value })}
                  placeholder="Sync Key (Enter or Generate)"
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none pr-20"
                />
                <div className="absolute right-2 top-1.5 flex gap-1">
                  {settings.syncKey && (
                    <button onClick={handleCopy} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg opacity-40">
                      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  )}
                  <button 
                    onClick={generateSyncKey}
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg opacity-40"
                    title="Generate New Key"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[10px] opacity-30 leading-relaxed italic">
              * このキーを別のデバイスで入力すると同期が始まります。
            </p>
          </section>

          {/* Theme & Aesthetics */}
          <div className="grid grid-cols-2 gap-6">
            <section className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 flex items-center gap-2">
                <Palette size={12} /> Theme
              </label>
              <div className="flex gap-2">
                {(["pure-black", "glass", "paper"] as AppTheme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => updateSettings({ theme: t })}
                    className={`
                      w-8 h-8 rounded-full border transition-all
                      ${t === 'pure-black' ? 'bg-black' : t === 'glass' ? 'bg-zinc-200' : 'bg-[#fdfaf6]'}
                      ${settings.theme === t ? "ring-2 ring-accent ring-offset-2" : "opacity-40"}
                    `}
                    title={t}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 flex items-center gap-2">
                <Zap size={12} /> Rhythm
              </label>
              <input 
                type="range" min="0" max="100" step="10" 
                value={settings.typingSpeed}
                onChange={(e) => updateSettings({ typingSpeed: parseInt(e.target.value) })}
                className="w-full accent-accent"
              />
            </section>
          </div>

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
              <option value={0}>Forget immediately</option>
              <option value={7}>7 Days</option>
              <option value={30}>30 Days</option>
              <option value={365}>Forever (Local)</option>
            </select>
          </section>
        </div>

        <div className="mt-8">
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
