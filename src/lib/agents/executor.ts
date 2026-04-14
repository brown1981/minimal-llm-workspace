import { OpenAI } from "openai";
import { toolSchemas, tools } from "@/lib/tools";

/**
 * 🧠 Engawa Cycle - Agent Executor
 * AI社員の「思考ループ」を統合管理するコアエンジン
 */
export class AgentExecutor {
  private openai: OpenAI;
  private requestId: string;
  private maxLoops: number;

  constructor(apiKey: string, requestId: string, maxLoops: number = 5) {
    this.openai = new OpenAI({ apiKey, timeout: 25000 });
    this.requestId = requestId;
    this.maxLoops = maxLoops;
  }

  /**
   * 社長（ユーザー）からの指示を受け取り、
   * 必要ならツールを使いながら最終的な解決策を導き出す。
   */
  async runV2(messages: any[], model: string) {
    let loopCount = 0;
    const history = [...messages];

    while (loopCount < this.maxLoops) {
      console.log(`[Executor:${this.requestId}] Loop ${loopCount + 1}...`);
      
      const completion = await this.openai.chat.completions.create({
        model: model || "gpt-4o-mini",
        messages: history,
        tools: toolSchemas,
        tool_choice: "auto",
      });

      const assistantMessage = completion.choices[0].message;
      history.push(assistantMessage);

      // 1. ツール呼び出しがない＝思考完了
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        console.log(`[Executor:${this.requestId}] Goal reached.`);
        return {
          id: completion.id,
          content: assistantMessage.content,
          history // 必要に応じて最終的な履歴も返せる
        };
      }

      // 2. ツール呼び出しがある＝行動して観察
      console.log(`[Executor:${this.requestId}] Executing ${assistantMessage.tool_calls.length} tools...`);
      
      for (const toolCall of assistantMessage.tool_calls) {
        const tool = tools[toolCall.function.name];
        if (tool) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await tool.execute(args);
            history.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });
          } catch (err: any) {
            console.error(`[Executor:${this.requestId}] Tool Error (${toolCall.function.name}):`, err);
            history.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: err.message || "Execution failed" }),
            });
          }
        } else {
          console.warn(`[Executor:${this.requestId}] Tool not found: ${toolCall.function.name}`);
        }
      }

      loopCount++;
    }

    throw new Error(`Maximum thinking loops (${this.maxLoops}) reached. Try a the more powerful GPT-4o model.`);
  }
}
