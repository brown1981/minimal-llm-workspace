import { useState, useCallback } from "react";
import { ChatMessage, ChatRole } from "@/lib/types";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [apiKey, setApiKey] = useState<string>("");
  const [model, setModel] = useState<string>("gpt-4o");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    if (!apiKey) {
      setError("API Key が設定されていません。設定から入力してください。");
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          model,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch response");
      }

      const assistantMessage: ChatMessage = {
        id: data.id,
        role: data.role,
        content: data.content,
        createdAt: data.createdAt,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || "予期せぬエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, messages, model]);

  const clearMessages = () => setMessages([]);

  return {
    messages,
    apiKey,
    setApiKey,
    model,
    setModel,
    sendMessage,
    clearMessages,
    isLoading,
    error,
    setError
  };
}
