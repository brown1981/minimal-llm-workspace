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
  const requestId = Math.random().toString(36).slice(7);
  console.log(`[API:${requestId}] --- New Request ---`);
  
  try {
    const openaiKey = req.headers.get("Authorization")?.replace("Bearer ", "")?.trim();
    const anthropicKey = req.headers.get("X-Anthropic-Key")?.trim();
    const geminiKey = req.headers.get("X-Gemini-Key")?.trim();
    
    const body = await req.json();
    const { messages, model, image, customInstructions } = body;
    
    console.log(`[API:${requestId}] Model: ${model}, Messages: ${messages?.length}`);
    
    const imageData = image ? parseDataUrl(image) : null;
    if (image && !imageData) console.warn(`[API:${requestId}] Image attached but failed to parse DataURL`);

    // Provider Routing: Google Gemini
    if (model.startsWith("gemini")) {
      console.log(`[API:${requestId}] Routing to Gemini...`);
      if (!geminiKey) return NextResponse.json({ error: "Google API Key is required" }, { status: 401 });

      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": geminiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(customInstructions ? { systemInstruction: { parts: [{ text: customInstructions }] } } : {}),
          contents: messages.map((m: any, idx: number) => {
            const isLastMessage = idx === messages.length - 1;
            const parts = [];
            if (isLastMessage && imageData) {
              parts.push({ inline_data: { mime_type: imageData.mimeType, data: imageData.base64Data } });
            }
            const textContent = m.content.replace(/data:image\/[^;]+;base64,[^ \n]+/, "").trim();
            parts.push({ text: textContent });
            return { role: m.role === "assistant" ? "model" : "user", parts };
          }),
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
        }),
      });

      const data = await geminiResponse.json();
      console.log(`[API:${requestId}] Gemini Status: ${geminiResponse.status}`);
      if (!geminiResponse.ok) throw new Error(data.error?.message || `Gemini Error ${geminiResponse.status}`);

      const assistantText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!assistantText) throw new Error("No response generated from Gemini");

      return NextResponse.json({
        id: `gemini-${Date.now()}`, role: "assistant", content: assistantText, createdAt: new Date().toISOString()
      });
    }

    // Provider Routing: Anthropic Claude
    if (model.startsWith("claude")) {
      console.log(`[API:${requestId}] Routing to Anthropic...`);
      if (!anthropicKey) return NextResponse.json({ error: "Anthropic API Key is required" }, { status: 401 });

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
          ...(customInstructions ? { system: customInstructions } : {}),
          messages: messages.map((m: any, idx: number) => {
            const isLastMessage = idx === messages.length - 1;
            const textContent = m.content.replace(/data:image\/[^;]+;base64,[^ \n]+/, "").trim();
            if (isLastMessage && imageData) {
              return {
                role: m.role,
                content: [
                  { type: "image", source: { type: "base64", media_type: imageData.mimeType, data: imageData.base64Data } },
                  { type: "text", text: textContent },
                ],
              };
            }
            return { role: m.role, content: textContent };
          }),
        }),
      });

      const data = await anthropicResponse.json();
      console.log(`[API:${requestId}] Anthropic Status: ${anthropicResponse.status}`);
      if (!anthropicResponse.ok) throw new Error(data.error?.message || `Anthropic Error ${anthropicResponse.status}`);

      return NextResponse.json({
        id: data.id, role: "assistant", content: data.content[0].text, createdAt: new Date().toISOString()
      });
    } 
    
    // Provider Routing: OpenAI (Default)
    console.log(`[API:${requestId}] Routing to OpenAI...`);
    if (!openaiKey) return NextResponse.json({ error: "OpenAI API Key is required" }, { status: 401 });

    const openai = new OpenAI({ 
      apiKey: openaiKey,
      timeout: 25000, // Client side timeout for safety
    });
    const isSearchModel = model?.includes("search");
    
    const formattedMessages = messages.map((m: any, idx: number) => {
      const isLastMessage = idx === messages.length - 1;
      const textContent = m.content.replace(/data:image\/[^;]+;base64,[^ \n]+/, "").trim();
      if (isLastMessage && imageData) {
        return {
          role: m.role,
          content: [
            { type: "text", text: textContent },
            { image_url: { url: image, detail: "low" }, type: "image_url" },
          ],
        };
      }
      return { role: m.role, content: textContent };
    });

    if (customInstructions) {
      formattedMessages.unshift({ role: "system", content: customInstructions });
    }

    console.log(`[API:${requestId}] OpenAI Request Start...`);
    const completion = await openai.chat.completions.create({
      model: model || "gpt-4o-mini",
      messages: formattedMessages,
    } as any);
    console.log(`[API:${requestId}] OpenAI Response Received: ${completion.id}`);

    const assistantMessage = completion.choices[0].message;

    return NextResponse.json({
      id: completion.id, role: "assistant", content: assistantMessage.content, createdAt: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error(`[API:${requestId}] Universal API Error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch from AI Provider" },
      { status: 500 }
    );
  }
}
