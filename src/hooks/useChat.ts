"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ChatMessage, ChatSession } from "@/lib/types";
import { useChatContext } from "@/contexts/ChatContext";

export function useChat() {
  const { 
    sessions, 
    currentSessionId, 
    updateSession, 
    createSession: contextCreateSession,
    apiKey,
    setApiKey: contextSetApiKey,
    model,
    setModel: contextSetModel,
    settings
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
    if (currentSessionId) {
      updateSession(currentSessionId, { messages: [] });
    }
  }, [currentSessionId, updateSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const sendMessage = useCallback(async (content: string, image?: string | null) => {
    if (!content.trim() && !image) return;
    if (!apiKey) {
      setError("API Key が設定されていません。設定から入力してください。");
      return;
    }

    let targetSession = currentSession;
    if (!targetSession) {
      targetSession = contextCreateSession(content.slice(0, 20) || "Image Analysis");
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: image ? `${image}\n\n${content}` : content,
      createdAt: new Date().toISOString(),
    };

    updateSession(targetSession.id, (prev) => {
      const updatedMessages = [...prev.messages, userMessage];
      return { 
        messages: updatedMessages,
        title: prev.messages.length === 0 ? (content.slice(0, 20) || "Image Analysis") : prev.title
      };
    });

    setIsLoading(true);
    setError(null);
    setStreamingContent("");

    abortControllerRef.current = new AbortController();

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
          image: image,
          customInstructions: settings.customInstructions
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch from AI");
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: data.id || crypto.randomUUID(),
        role: "assistant",
        content: data.content || "",
        createdAt: new Date().toISOString(),
      };

      // シミュレーション：タイピングエフェクト
      let i = 0;
      const fullContent = data.content || "";
      
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      
      // Handle empty response gracefully
      if (!fullContent) {
        updateSession(targetSession!.id, (prev) => ({
          messages: [...prev.messages, assistantMessage]
        }));
        setIsLoading(false);
        abortControllerRef.current = null;
        return;
      }

      typingIntervalRef.current = setInterval(() => {
        // Correct boundary check: update state only while we have characters to add
        if (i < fullContent.length) {
          setStreamingContent(prev => prev + fullContent[i]);
          i++;
        } else {
          // Finish loop
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
          
          updateSession(targetSession!.id, (prev) => ({
            messages: [...prev.messages, assistantMessage]
          }));
          setStreamingContent("");
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      }, settings.typingSpeed || 20);

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      setError(err.message || "Unknown error occurred");
      setIsLoading(false);
      abortControllerRef.current = null;
      setStreamingContent("");
    }
  }, [apiKey, currentSession, contextCreateSession, model, updateSession, settings]);

  return {
    messages,
    sendMessage,
    stopGeneration,
    apiKey,
    setApiKey: contextSetApiKey, // Re-connected!
    model,
    setModel: contextSetModel, // Re-connected!
    clearMessages,
    isLoading,
    error,
    createSession: contextCreateSession,
    streamingContent
  };
}
