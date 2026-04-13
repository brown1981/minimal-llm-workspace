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
  provider: string; // "openai"
  model: string;
  messages: ChatMessage[];
  updatedAt: string;
};

export type ModelOption = {
  id: string;
  name: string;
  description: string;
  tier: "light" | "deep" | "search"; // Phase 3 分類
};

export const OPENAI_MODELS: ModelOption[] = [
  { id: "gpt-4o-mini", name: "Light Intelligence", description: "Fast & cost-effective for daily tasks.", tier: "light" },
  { id: "gpt-4o", name: "Deep Reasoning", description: "Smartest capabilities for complex problems.", tier: "deep" },
  { id: "gpt-4o-search-preview", name: "Search (OpenAI Native)", description: "Reasoning with live web access.", tier: "search" },
];

export type AppTheme = "pure-black" | "glass" | "paper";

export type GlobalSettings = {
  theme: AppTheme;
  typingSpeed: number; // 0 to 100 (0 = instant, 100 = slow/rhythmic)
  retentionDays: number; // 0 = session only, 365+ = permanent
  autoSearch: boolean;
};
