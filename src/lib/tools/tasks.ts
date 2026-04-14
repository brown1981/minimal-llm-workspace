import { ToolDefinition } from "./index";

/**
 * 🗄️ Task Management Tool
 * AI社員が自ら「DBに業務を記録する」ための手足
 */
export const manage_tasks: ToolDefinition = {
  name: "manage_tasks",
  description: "会社のタスク（業務）をデータベースに記録・更新します。",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["create", "list"],
        description: "操作内容。create(作成) または list(一覧取得)",
      },
      title: {
        type: "string",
        description: "タスクのタイトル（create時必須）",
      },
      description: {
        type: "string",
        description: "タスクの詳細内容",
      },
    },
    required: ["action"],
  },
  execute: async ({ action, title, description }) => {
    // 💡 注意: 実際のプロダクトでは settings から URL と Key を取得して fetch する必要があります。
    // コンテキストの都合上、ここでは URL などが API ルート側で管理されている想定、
    // またはツール実行時に環境変数やヘッダーから流し込む設計にします。
    
    // このツール内では、API ルート側で定義された Supabase 連携ロジックを期待するか、
    // あるいは直接 Fetch で Supabase API を叩きます。
    
    return {
      success: true,
      message: `タスク '${title}' を(模擬的に)DBに保存しました。`,
      action,
      data: { title, description, status: "todo" }
    };
  },
};
