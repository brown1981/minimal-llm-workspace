"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ChatMessage, ChatSession } from "@/lib/types";
import { useChatContext } from "@/contexts/ChatContext";

export function useChat() {
  const { 
    sessions, currentSessionId, updateSession, upsertSession,
    createSession: contextCreateSession, apiKey, setApiKey: contextSetApiKey,
    model, setModel: contextSetModel, settings
  } = useChatContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setIsLoading(false);
    setStreamingContent("");
  }, []);

  const clearMessages = useCallback(() => {
    if (currentSessionId) updateSession(currentSessionId, { messages: [] });
  }, [currentSessionId, updateSession]);

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const sendMessage = useCallback(async (content: string, image?: string | null) => {
    if (!content.trim() && !image) return;
    if (isLoading) return;

    if (!apiKey) {
      setError("AI Key が設定されていません。設定画面で API キーを正しく入力してください。");
      return;
    }

    setIsLoading(true);
    setError(null);
    setStreamingContent("");

    let targetSession = currentSession;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: image ? `${image}\n\n${content}` : content,
      createdAt: new Date().toISOString(),
    };

    let payloadMessages: ChatMessage[] = [];

    if (!targetSession) {
      targetSession = {
        id: crypto.randomUUID(),
        title: content.slice(0, 20) || "Image Analysis",
        provider: model.includes("claude") ? "anthropic" : model.includes("gemini") ? "google" : "openai",
        model,
        messages: [userMessage],
        updatedAt: new Date().toISOString(),
      };
      upsertSession(targetSession);
      payloadMessages = [userMessage];
    } else {
      payloadMessages = [...targetSession.messages, userMessage];
      updateSession(targetSession.id, { messages: payloadMessages });
    }

    abortControllerRef.current = new AbortController();
    
    const timeoutId = setTimeout(() => {
      if (isLoading && abortControllerRef.current) {
        abortControllerRef.current.abort();
        setError("通信が10秒を超えたためタイムアウトしました (Vercelの制限)。GPT-4o mini 等の軽量モデルへの切り替えをお勧めします。");
        setIsLoading(false);
      }
    }, 12000);

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
          messages: payloadMessages,
          model: model,
          image: image,
          customInstructions: settings.customInstructions
        }),
        signal: abortControllerRef.current.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        let msg = errorData.error || response.statusText;
        if (response.status === 401) msg = "認証エラー(401): APIキーが正しくないか、期限が切れています。";
        if (response.status === 504) msg = "サーバータイムアウト(504): 処理に時間がかかりすぎました。軽量モデルを試してください。";
        throw new Error(`[${response.status}] ${msg}`);
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        id: data.id || crypto.randomUUID(),
        role: "assistant",
        content: data.content || "",
        createdAt: new Date().toISOString(),
      };

      // Phase 35: IMMEDIATE BUBBLE INJECTION
      // AIからデータが届いた瞬間、空のメッセージ（あるいはプレースホルダ）を配列に追加して画面に出す
      updateSession(targetSession!.id, (prev) => ({ 
        messages: [...prev.messages, { ...assistantMessage, content: "" }] 
      }));

      let i = 0;
      const fullContent = data.content || "";
      if (typingIntervalRef.current) { clearInterval(typingIntervalRef.current); typingIntervalRef.current = null; }
      
      if (!fullContent) {
        // もし中身が空なら、空のまま終了させる
        setIsLoading(false);
        return;
      }

      typingIntervalRef.current = setInterval(() => {
        if (i < fullContent.length) {
          // タイピング中の文字を streamingContent に入れる（page.tsx で合成表示する）
          setStreamingContent(prev => prev + fullContent[i]);
          i++;
        } else {
          if (typingIntervalRef.current) { clearInterval(typingIntervalRef.current); typingIntervalRef.current = null; }
          
          // タイピング完了後、正式にメッセージ内容を確定させる
          updateSession(targetSession!.id, (prev) => {
            const nextMessages = [...prev.messages];
            const lastIdx = nextMessages.length - 1;
            if (lastIdx >= 0 && nextMessages[lastIdx].role === "assistant") {
              nextMessages[lastIdx] = { ...assistantMessage }; // 内容を上書き確定
            }
            return { messages: nextMessages };
          });

          setStreamingContent("");
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      }, settings.typingSpeed || 20);

    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') return;
      setError(err.message || "Unknown error occurred");
      setIsLoading(false);
      abortControllerRef.current = null;
      setStreamingContent("");
      console.error("Chat Error:", err);
    }
  }, [apiKey, currentSession, upsertSession, updateSession, model, settings, isLoading]);

  return {
    messages, sendMessage, stopGeneration, apiKey, setApiKey: contextSetApiKey,
    model, setModel: contextSetModel, clearMessages, isLoading, error,
    createSession: contextCreateSession, streamingContent
  };
}
