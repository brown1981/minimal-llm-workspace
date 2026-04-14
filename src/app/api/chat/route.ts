import { OpenAI } from "openai";
import { NextResponse } from "next/server";

export const runtime = "edge";

// Helper to extract mime type and base64 data from data URL
function parseDataUrl(dataUrl: string) {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return null;
  return { mimeType: matches[1], base64Data: matches[2] };
}

export async function POST(req: Request) {
  try {
    const openaiKey = req.headers.get("Authorization")?.replace("Bearer ", "");
    const anthropicKey = req.headers.get("X-Anthropic-Key");
    const geminiKey = req.headers.get("X-Gemini-Key");
    
    const { messages, model, image } = await req.json();
    const imageData = image ? parseDataUrl(image) : null;

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
          contents: messages.map((m: any, idx: number) => {
            const isLastMessage = idx === messages.length - 1;
            const parts = [];
            
            // If this is the last message and we have an image attached, add it to parts
            if (isLastMessage && imageData) {
              parts.push({
                inline_data: {
                  mime_type: imageData.mimeType,
                  data: imageData.base64Data,
                }
              });
            }

            // Strip the base64 from stored content for the clean payload
            const textContent = m.content.replace(/data:image\/[^;]+;base64,[^ \n]+/, "").trim();
            parts.push({ text: textContent });

            return {
              role: m.role === "assistant" ? "model" : "user",
              parts
            };
          }),
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
          messages: messages.map((m: any, idx: number) => {
            const isLastMessage = idx === messages.length - 1;
            const textContent = m.content.replace(/data:image\/[^;]+;base64,[^ \n]+/, "").trim();

            if (isLastMessage && imageData) {
              return {
                role: m.role,
                content: [
                  {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: imageData.mimeType,
                      data: imageData.base64Data,
                    },
                  },
                  { type: "text", text: textContent },
                ],
              };
            }
            return { role: m.role, content: textContent };
          }),
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
    
    // Format messages for OpenAI Vision/Text
    const formattedMessages = messages.map((m: any, idx: number) => {
      const isLastMessage = idx === messages.length - 1;
      const textContent = m.content.replace(/data:image\/[^;]+;base64,[^ \n]+/, "").trim();

      if (isLastMessage && imageData) {
        return {
          role: m.role,
          content: [
            { type: "text", text: textContent },
            { 
              type: "image_url", 
              image_url: { url: image, detail: "low" } 
            },
          ],
        };
      }
      return { role: m.role, content: textContent };
    });

    const response = await openai.chat.completions.create({
      model: model || "gpt-4o-mini-search-preview",
      messages: formattedMessages,
      ...(isSearchModel ? { web_search_options: {} } : {}),
    } as any);

    const assistantMessage = response.choices[0].message;

    return NextResponse.json({
      id: response.id,
      role: "assistant",
      content: assistantMessage.content,
      createdAt: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error("Universal API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch from AI Provider" },
      { status: 500 }
    );
  }
}
