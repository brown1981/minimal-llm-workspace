/**
 * 🧠 Minimal LLM Workspace - Core Types
 * Blueprint v2 準拠のデータ構造
 */

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  agentId?: string; // 将来のエージェント拡張用
  createdAt: string;
};

export type ChatSession = {
  id: string;
  provider: string; // "openai" 固定
  model: string;
  messages: ChatMessage[];
};

export type ModelOption = {
  id: string;
  name: string;
};

export const OPENAI_MODELS: ModelOption[] = [
  { id: "gpt-4o", name: "GPT-4o (Latest)" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "o1-preview", name: "o1-preview" },
  { id: "o1-mini", name: "o1-mini" },
];
