"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { Settings, Send, Download, Copy, Trash2 } from "lucide-react";
import { OPENAI_MODELS } from "@/lib/types";
import { SettingsModal } from "@/components/SettingsModal";
import { exportToMarkdown, exportToText } from "@/lib/export";

export default function Home() {
  const { 
    messages, 
    sendMessage, 
    apiKey, 
    setApiKey, 
    model, 
    setModel, 
    clearMessages, 
    isLoading, 
    error 
  } = useChat();

  const [input, setInput] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <main className="flex flex-col h-screen bg-transparent">
      {/* Header - Minimal & Floating */}
      <header className="flex justify-between items-center px-6 py-4 z-10">
        <div className="text-sm font-medium tracking-tight opacity-40 select-none">
          Minimal LLM Workspace
        </div>
        <div className="flex gap-4 items-center">
          {messages.length > 0 && (
            <button 
              onClick={clearMessages}
              className="p-2 opacity-30 hover:opacity-100 transition-opacity"
              title="Clear Chat"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 opacity-30 hover:opacity-100 transition-opacity"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Chat Viewport */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 pb-32 pt-4 space-y-8 max-w-3xl mx-auto w-full scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
            <h1 className="text-4xl font-semibold tracking-tighter">Genesis</h1>
            <p className="text-sm">思考を、そのままの形で。</p>
          </div>
        ) : (
          messages.map((m) => (
            <div 
              key={m.id} 
              className={`group flex flex-col space-y-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`
                chat-bubble px-4 py-3 rounded-2xl
                ${m.role === 'user' 
                  ? 'bg-accent text-white rounded-tr-none' 
                  : 'bg-zinc-100 dark:bg-zinc-900 rounded-tl-none border border-zinc-200 dark:border-zinc-800'}
              `}>
                <div className="whitespace-pre-wrap leading-relaxed">
                  {m.content}
                </div>
              </div>
              
              {/* Message Actions - Hidden until hover */}
              <div className="flex gap-3 px-1 opacity-0 group-hover:opacity-40 transition-opacity">
                <button onClick={() => copyToClipboard(m.content)} className="hover:opacity-100"><Copy size={14} /></button>
                {m.role === 'assistant' && (
                  <>
                    <button onClick={() => exportToMarkdown(m.content)} className="hover:opacity-100"><Download size={14} /></button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex items-start">
            <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-3 rounded-2xl rounded-tl-none animate-pulse">
              <span className="text-sm opacity-50">Thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-500 text-sm rounded-xl border border-red-100 dark:border-red-900/20">
            {error}
          </div>
        )}
      </div>

      {/* Input Area - Minimal Floating */}
      <div className="fixed bottom-0 left-0 right-0 p-6 pointer-events-none">
        <div className="max-w-3xl mx-auto w-full pointer-events-auto">
          <div className="relative group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="メッセージを入力..."
              className="w-full bg-white dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 pr-12 shadow-2xl shadow-black/5 focus:outline-none focus:ring-1 focus:ring-accent transition-all resize-none min-h-[56px] max-h-48"
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-3 bottom-3 p-2 bg-accent text-white rounded-xl disabled:opacity-20 disabled:grayscale transition-all hover:scale-105 active:scale-95"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        setApiKey={setApiKey}
        model={model}
        setModel={setModel}
      />
    </main>
  );
}
