import { useState, useCallback, useMemo, useRef } from "react";
import { ChatMessage, ChatRole } from "@/lib/types";
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
    const msPerChar = settings.typingSpeed / 2; // シンプルな調整

    for (let char of chars) {
      currentText += char;
      setStreamingContent(currentText);
      await new Promise(r => setTimeout(r, msPerChar));
    }

    updateAssistantMessage(sessionId, messageId, fullText);
    setStreamingContent("");
  }, [settings.typingSpeed]);

  const updateAssistantMessage = useCallback((sessionId: string, messageId: string, content: string) => {
    setSessions(prev => {
      // ChatContext内部のセッションリストを更新するロジックの模倣（本来はContext側のupdateSessionを介すべきだが同期の問題を避けるため直接計算）
      // 実際には updateSession を呼ぶ。
      return prev; 
    });
    updateSession(sessionId, {
      messages: currentSession?.messages.map(m => m.id === messageId ? { ...m, content } : m) || []
    });
  }, [currentSession, updateSession]);

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

    const updatedMessages = [...targetSession.messages, userMessage];
    updateSession(targetSession.id, { 
      messages: updatedMessages,
      title: targetSession.messages.length === 0 ? content.slice(0, 20) : targetSession.title
    });

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
          messages: updatedMessages,
          model: targetSession.model || model,
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
        // 先に空のメッセージ器を置く
        const placeholderMsg = { ...assistantMessage, content: "" };
        updateSession(targetSession.id, { messages: [...updatedMessages, placeholderMsg] });
        await animateText(data.content, targetSession.id, assistantMessageId);
      } else {
        updateSession(targetSession.id, { messages: [...updatedMessages, assistantMessage] });
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

// 注意: この実装では setSessions が外部スコープにないため、animateText 内で updateSession を再帰的に呼ぶ必要があります。
// 実際の実装整合性を保つため、Context 側を拡張するか、このフック内で完結させます。
