import { useState, useCallback, useMemo } from "react";
import { ChatMessage } from "@/lib/types";
import { useChatContext } from "@/contexts/ChatContext";

export function useChat() {
  const {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    createSession,
    updateSession,
    apiKey,
    setApiKey,
    model,
    setModel,
    settings
  } = useChatContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // アニメーション表示用のバッファ（Phase 3）
  const [streamingContent, setStreamingContent] = useState("");

  const currentSession = useMemo(() => 
    sessions.find(s => s.id === currentSessionId), 
    [sessions, currentSessionId]
  );

  const messages = useMemo(() => 
    currentSession?.messages || [], 
    [currentSession]
  );

  // タイピングアニメーションのシミュレーション（簡易版）
  const animateText = useCallback(async (fullText: string, sessionId: string, messageId: string) => {
    if (settings.typingSpeed === 0) {
      updateAssistantMessage(sessionId, messageId, fullText);
      return;
    }

    let currentText = "";
    const chars = Array.from(fullText);
    const msPerChar = settings.typingSpeed / 2;

    for (let char of chars) {
      currentText += char;
      setStreamingContent(currentText);
      await new Promise(r => setTimeout(r, msPerChar));
    }

    updateAssistantMessage(sessionId, messageId, fullText);
    setStreamingContent("");
  }, [settings.typingSpeed]);

  const updateAssistantMessage = useCallback((sessionId: string, messageId: string, content: string) => {
    // 関数型アップデートを使用して、常に最新の messages 配列に対して更新を行う
    updateSession(sessionId, (prev) => ({
      messages: prev.messages.map(m => m.id === messageId ? { ...m, content } : m)
    }));
  }, [updateSession]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    if (!apiKey) {
      setError("API Key が設定されていません。設定から入力してください。");
      return;
    }

    let targetSession = currentSession;
    if (!targetSession) {
      targetSession = createSession(content.slice(0, 20) + "...");
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    // UIを即座に更新
    updateSession(targetSession.id, (prev) => {
      const updatedMessages = [...prev.messages, userMessage];
      return { 
        messages: updatedMessages,
        title: prev.messages.length === 0 ? content.slice(0, 20) : prev.title
      };
    });

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          ...(settings.anthropicKey ? { "X-Anthropic-Key": settings.anthropicKey } : {}),
          ...(settings.geminiKey ? { "X-Gemini-Key": settings.geminiKey } : {}),
        },
        body: JSON.stringify({
          messages: [...(targetSession?.messages || []), userMessage],
          model: targetSession?.model || model,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch response");
      }

      const assistantMessageId = data.id || crypto.randomUUID();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: data.role || "assistant",
        content: data.content,
        createdAt: data.createdAt || new Date().toISOString(),
      };

      // Phase 3: タイピングアニメーションを適用
      if (settings.typingSpeed > 0) {
        const placeholderMsg = { ...assistantMessage, content: "" };
        updateSession(targetSession.id, (prev) => ({ messages: [...prev.messages, placeholderMsg] }));
        await animateText(data.content, targetSession.id, assistantMessageId);
      } else {
        updateSession(targetSession.id, (prev) => ({ messages: [...prev.messages, assistantMessage] }));
      }
    } catch (err: any) {
      setError(err.message || "予期せぬエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, currentSession, createSession, updateSession, model, settings.typingSpeed, animateText]);

  const clearMessages = useCallback(() => {
    if (currentSessionId) {
      updateSession(currentSessionId, { messages: [] });
    }
  }, [currentSessionId, updateSession]);

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
    setError,
    sessions,
    currentSessionId,
    setCurrentSessionId,
    createSession,
    settings,
    streamingContent
  };
}
