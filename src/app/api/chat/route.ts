import { OpenAI } from "openai";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const openaiKey = req.headers.get("Authorization")?.replace("Bearer ", "");
    const anthropicKey = req.headers.get("X-Anthropic-Key");
    const geminiKey = req.headers.get("X-Gemini-Key");
    
    const { messages, model } = await req.json();

    // Provider Routing: Google Gemini
    if (model.startsWith("gemini")) {
      if (!geminiKey) {
        return NextResponse.json({ error: "Google API Key is required for Gemini models" }, { status: 401 });
      }

      // Gemini Content API call
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: {
          "x-goog-api-key": geminiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: messages.map((m: any) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          }
        }),
      });

      const data = await geminiResponse.json();
      if (!geminiResponse.ok) {
        throw new Error(data.error?.message || "Google Gemini API Error");
      }

      // Extract content from Gemini response structure
      const assistantText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!assistantText) throw new Error("No response generated from Gemini");

      return NextResponse.json({
        id: `gemini-${Date.now()}`,
        role: "assistant",
        content: assistantText,
        createdAt: new Date().toISOString(),
      });
    }

    // Provider Routing: Anthropic Claude
    if (model.startsWith("claude")) {
      if (!anthropicKey) {
        return NextResponse.json({ error: "Anthropic API Key is required for Claude models" }, { status: 401 });
      }

      const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 4096,
          messages: messages.map((m: any) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await anthropicResponse.json();
      if (!anthropicResponse.ok) {
        throw new Error(data.error?.message || "Anthropic API Error");
      }

      return NextResponse.json({
        id: data.id,
        role: "assistant",
        content: data.content[0].text,
        createdAt: new Date().toISOString(),
      });

    } 
    
    // Provider Routing: OpenAI (Default)
    if (!openaiKey) {
      return NextResponse.json({ error: "OpenAI API Key is required" }, { status: 401 });
    }

    const openai = new OpenAI({ apiKey: openaiKey });
    const isSearchModel = model?.includes("search");
    
    try {
      const response = await openai.chat.completions.create({
        model: model || "gpt-4o-mini-search-preview",
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        ...(isSearchModel ? { web_search_options: {} } : {}),
      } as any);

      const assistantMessage = response.choices[0].message;

      return NextResponse.json({
        id: response.id,
        role: "assistant",
        content: assistantMessage.content,
        createdAt: new Date().toISOString(),
      });
    } catch (openaiErr: any) {
      throw new Error(openaiErr.message || "OpenAI API Error");
    }
    
  } catch (error: any) {
    console.error("Universal API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch from AI Provider" },
      { status: 500 }
    );
  }
}
