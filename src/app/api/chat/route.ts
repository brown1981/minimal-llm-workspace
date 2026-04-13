import { OpenAI } from "openai";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const openaiKey = req.headers.get("Authorization")?.replace("Bearer ", "");
    const anthropicKey = req.headers.get("X-Anthropic-Key");
    
    const { messages, model } = await req.json();

    // Provider Routing
    if (model.startsWith("claude")) {
      if (!anthropicKey) {
        return NextResponse.json({ error: "Anthropic API Key is required for Claude models" }, { status: 401 });
      }

      // Anthropic Messages API call via fetch
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

    } else {
      // Default: OpenAI
      if (!openaiKey) {
        return NextResponse.json({ error: "OpenAI API Key is required" }, { status: 401 });
      }

      const openai = new OpenAI({ apiKey: openaiKey });
      const isSearchModel = model?.includes("search");
      
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
    }
  } catch (error: any) {
    console.error("Universal API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch from AI Provider" },
      { status: 500 }
    );
  }
}
