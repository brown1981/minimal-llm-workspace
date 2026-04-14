"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { Settings, Send, Download, Copy, MessageSquare, Plus, Paperclip, X, Image as ImageIcon } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { exportToMarkdown } from "@/lib/export";
import { SettingsModal } from "@/components/SettingsModal";

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
    error,
    createSession,
    streamingContent
  } = useChat();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null); // Base64 image
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSend = () => {
    if ((!input.trim() && !attachedImage) || isLoading) return;
    
    // Phase 5: Pass attachedImage to sendMessage
    (sendMessage as any)(input, attachedImage);
    
    setInput("");
    setAttachedImage(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    if (file.type.startsWith("image/")) {
      reader.onload = (event) => {
        setAttachedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const injection = `\n\n--- [FILE: ${file.name}] ---\n${content}\n--- END FILE ---\n`;
        setInput(prev => prev + injection);
      };
      reader.readAsText(file);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <main className="flex h-screen bg-transparent overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-full relative">
        {/* Header - The Ultimate Minimalist Hub (v8) */}
        <header className="flex justify-between items-center px-8 py-6 z-10">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 opacity-10 hover:opacity-100 transition-opacity"
              title="Menu"
            >
              <MessageSquare size={18} />
            </button>
          </div>
          
          <div className="flex gap-4 items-center">
            {messages.length > 0 && (
              <div className="text-[10px] opacity-10 font-bold uppercase tracking-[0.2em] mr-4 select-none">
                {messages.length} Thoughts
              </div>
            )}
            <button 
              onClick={() => createSession()}
              className="p-2 opacity-10 hover:opacity-100 transition-opacity"
              title="New Chat"
            >
              <Plus size={18} />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 opacity-10 hover:opacity-100 transition-opacity"
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Chat Viewport */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-8 pb-36 pt-4 space-y-12 max-w-3xl mx-auto w-full scroll-smooth custom-scrollbar"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10 space-y-4">
              <h1 className="text-5xl font-semibold tracking-tighter mix-blend-difference">Genesis</h1>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em]">思考を、そのままの形で。</p>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isLast = idx === messages.length - 1;
              const displayContent = (isLast && m.role === "assistant" && streamingContent) 
                ? streamingContent 
                : m.content;

              if (isLast && m.role === "assistant" && !m.content && !streamingContent) return null;

              return (
                <div 
                  key={m.id} 
                  className={`group flex flex-col space-y-4 ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`
                    chat-bubble px-6 py-5 rounded-[2rem] shadow-sm max-w-[90%]
                    ${m.role === 'user' 
                      ? 'bg-accent text-white rounded-tr-none' 
                      : 'bg-zinc-100 dark:bg-zinc-900 rounded-tl-none border border-zinc-200 dark:border-zinc-800'}
                  `}>
                    {/* Render Image Content if exists (simple check for data URL) */}
                    {m.content.includes("data:image") && (
                       <img 
                         src={m.content.match(/data:image\/[^;]+;base64,[^ \n]+/)?.[0]} 
                         alt="Attached" 
                         className="rounded-xl mb-4 max-h-64 object-cover w-full shadow-lg"
                       />
                    )}
                    
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {/* Strip the base64 from text display for clean UI */}
                      {displayContent.replace(/data:image\/[^;]+;base64,[^ \n]+/, "").trim()}
                    </div>
                  </div>
                  
                  <div className="flex gap-4 px-4 opacity-0 group-hover:opacity-20 transition-opacity duration-300">
                    <button onClick={() => navigator.clipboard.writeText(m.content)} className="hover:opacity-100"><Copy size={14} /></button>
                    {m.role === 'assistant' && (
                      <button onClick={() => exportToMarkdown(m.content)} className="hover:opacity-100"><Download size={14} /></button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          
          {isLoading && !streamingContent && (
            <div className="flex items-start">
              <div className="bg-zinc-100 dark:bg-zinc-900 px-6 py-5 rounded-[2rem] rounded-tl-none animate-pulse-slow">
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-30">Synapsing...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-6 bg-red-50 dark:bg-red-900/10 text-red-500 text-xs rounded-[1.5rem] border border-red-100 dark:border-red-900/20">
              {error}
            </div>
          )}
        </div>

        {/* Input Area - Floating Glass (Phase 5 Enhanced) */}
        <div className="fixed bottom-0 left-0 right-0 p-10 pointer-events-none">
          <div className="max-w-3xl mx-auto w-full pointer-events-auto">
            <div className="relative group">
              
              {/* Image Preview Area */}
              {attachedImage && (
                <div className="absolute -top-24 left-4 p-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in slide-in-from-bottom-2 duration-300 pointer-events-auto">
                  <div className="relative">
                    <img src={attachedImage} alt="Preview" className="w-16 h-16 object-cover rounded-xl" />
                    <button 
                      onClick={() => setAttachedImage(null)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:scale-110 transition-all shadow-lg"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
              )}

              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.md,image/*" />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder={attachedImage ? "画像についての質問を入力..." : "思考を入力..."}
                className="w-full bg-white dark:bg-zinc-900/80 backdrop-blur-3xl border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] px-8 py-6 pr-32 shadow-2xl shadow-black/5 focus:outline-none focus:ring-1 focus:ring-accent transition-all resize-none min-h-[72px] max-h-48 custom-scrollbar leading-relaxed"
                rows={1}
              />
              <div className="absolute right-5 bottom-5 flex gap-3">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-3 transition-all rounded-full ${attachedImage ? 'text-accent opacity-100' : 'opacity-20 hover:opacity-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  title="Attach Files or Images"
                >
                  <Paperclip size={20} />
                </button>
                <button 
                  onClick={handleSend}
                  disabled={isLoading || (!input.trim() && !attachedImage)}
                  className="p-3 bg-accent text-white rounded-[1.2rem] disabled:opacity-20 disabled:grayscale transition-all hover:scale-105 active:scale-95 shadow-xl shadow-accent/20"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          apiKey={apiKey}
          setApiKey={setApiKey}
          model={model}
          setModel={setModel}
        />
      </div>
    </main>
  );
}
