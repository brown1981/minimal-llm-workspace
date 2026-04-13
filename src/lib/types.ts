/**
 * 🎨 Minimal LLM Workspace - Types definition
 */

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type ChatSession = {
  id: string;
  title: string;
  provider: string;
  model: string;
  messages: ChatMessage[];
  updatedAt: string;
};

export type ModelOption = {
  id: string;
  name: string;
  description: string;
};

export const OPENAI_MODELS: ModelOption[] = [
  { 
    id: "gpt-4o-search-preview", 
    name: "Deep Performance", 
    description: "Highest intelligence with autonomous search." 
  },
  { 
    id: "gpt-4o-mini-search-preview", 
    name: "Light & Swift", 
    description: "Fast responses with autonomous search." 
  },
];

export type AppTheme = "pure-black" | "glass" | "paper";

export type GlobalSettings = {
  theme: AppTheme;
  typingSpeed: number;
  retentionDays: number;
  autoSearch: boolean;
  // Phase 4: Sync Settings
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  syncKey?: string;
};
