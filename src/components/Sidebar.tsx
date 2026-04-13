"use client";

import { X, Plus, MessageSquare, Trash2, ChevronLeft } from "lucide-react";
import { useChatContext } from "@/contexts/ChatContext";
import { ChatSession } from "@/lib/types";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { 
    sessions, 
    currentSessionId, 
    setCurrentSessionId, 
    createSession, 
    removeSession 
  } = useChatContext();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-40 transition-opacity animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl z-50 
        border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="text-xs font-bold uppercase tracking-widest opacity-30">History</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <ChevronLeft size={16} className="opacity-40" />
            </button>
          </div>

          <button 
            onClick={() => {
              createSession();
              onClose();
            }}
            className="flex items-center gap-3 w-full px-4 py-3 mb-6 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-sm font-medium hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-black/5"
          >
            <Plus size={16} />
            <span>New Chat</span>
          </button>

          <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
            {sessions.length === 0 ? (
              <div className="px-4 py-8 text-center opacity-20 text-xs italic">
                No history yet
              </div>
            ) : (
              sessions.map((session) => (
                <div 
                  key={session.id}
                  className="group relative flex items-center"
                >
                  <button
                    onClick={() => {
                      setCurrentSessionId(session.id);
                      onClose();
                    }}
                    className={`
                      flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm transition-all text-left truncate
                      ${currentSessionId === session.id 
                        ? "bg-accent/5 text-accent font-medium" 
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-60 hover:opacity-100"}
                    `}
                  >
                    <MessageSquare size={14} className={currentSessionId === session.id ? "opacity-100" : "opacity-40"} />
                    <span className="truncate flex-1 pr-4">{session.title || "Untitled"}</span>
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSession(session.id);
                    }}
                    className="absolute right-2 p-2 opacity-0 group-hover:opacity-40 hover:opacity-100 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800 px-2">
            <div className="text-[10px] opacity-20 uppercase font-bold tracking-tighter">
              Minimal LLM Workspace v0.2.0
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
