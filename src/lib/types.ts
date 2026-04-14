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
  provider: "openai" | "anthropic" | "google"; // Phase 4.3 Expansion
};

export const AVAILABLE_MODELS: ModelOption[] = [
  { 
    id: "gpt-4o-search-preview", 
    name: "Deep Performance (GPT)", 
    description: "Highest intelligence with autonomous search.",
    provider: "openai"
  },
  { 
    id: "claude-3-5-sonnet-20241022", 
    name: "Claude 3.5 Sonnet", 
    description: "Exceptional reasoning, speed, and character.",
    provider: "anthropic"
  },
  { 
    id: "gemini-2.5-flash", 
    name: "Swift & Adaptive (Gemini)", 
    description: "Google's fastest model with huge context window.",
    provider: "google"
  },
  { 
    id: "gemini-2.5-pro", 
    name: "Gemini 2.5 Pro", 
    description: "Sophisticated reasoning and complex task handling.",
    provider: "google"
  },
  { 
    id: "gpt-4o-mini-search-preview", 
    name: "Light & Swift (GPT)", 
    description: "Fast responses with autonomous search.",
    provider: "openai"
  },
];

// For backward compatibility while migration
export const OPENAI_MODELS = AVAILABLE_MODELS.filter(m => m.provider === "openai");

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
  // Phase 4.2 & 4.3: Multi-provider Keys
  anthropicKey?: string;
  geminiKey?: string;
};
