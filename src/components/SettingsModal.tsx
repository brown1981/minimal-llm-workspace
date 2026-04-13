"use client";

import { X, Key, Box, ShieldCheck, AlertCircle } from "lucide-react";
import { OPENAI_MODELS } from "@/lib/types";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X size={20} className="opacity-40" />
          </button>
        </div>

        <div className="space-y-6">
          {/* API Key Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider opacity-40 flex items-center gap-2">
              <Key size={12} /> OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all"
            />
            <div className="flex items-center gap-2 mt-1 text-[10px] opacity-30">
              <ShieldCheck size={10} />
              <span>APIキーはメモリ内のみに保持され、公開されません。</span>
            </div>
          </div>

          {/* Model Selection Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider opacity-40 flex items-center gap-2">
              <Box size={12} /> Model Selection
            </label>
            <div className="grid grid-cols-1 gap-2">
              {OPENAI_MODELS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setModel(opt.id)}
                  className={`
                    w-full text-left px-4 py-3 rounded-xl text-sm transition-all border
                    ${model === opt.id 
                      ? 'bg-accent/5 border-accent text-accent' 
                      : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 opacity-60'}
                  `}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10">
          <button
            onClick={onClose}
            className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3 rounded-2xl font-medium text-sm hover:opacity-90 active:scale-95 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
