# 🧠 Minimal LLM Workspace - Master Blueprint v3.0
> **このドキュメントは本プロジェクトの唯一の正典（Source of Truth）です。**  
> 次の開発を担う AI エージェントは、まずこのファイルを読み込んでください。

---

## 1. プロジェクト概要
ユーザーが自分の API キーを持ち込み（BYOK: Bring Your Own Key）、プライバシーと速度を極限まで追求したミニマルな AI ワークスペース。

### 技術スタック
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS
- **Local DB**: IndexedDB (Raw API - `src/lib/db.ts`)
- **Cloud DB**: Supabase (Optional Sync)
- **Deployment**: Vercel (Edge Runtime)

---

## 2. 状態管理と重要ロジック

### 原子操作 (Atomic Upsert)
チャットの状態管理は `ChatContext.tsx` と `useChat.ts` で行われます。
レースコンディションを防ぐため、以下の設計を採用しています：
- メッセージ送信時にセッションの存在を確認し、なければ **Atomic Upsert**（生成と追加を一つの更新で行う）を実行。
- `isLoading` フラグを同期的にロックし、二重送信（二重バブル）を物理的に防止。

### セキュリティとバリデーション (BYOK)
API キーはブラウザの `localStorage` にのみ保存（IndexedDB には保存しない）。
- **自動洗浄機能**: ユーザーが設定時に `npx supabase ...` 等のコマンドを誤って貼り付けた場合、自動で不純物を除去してキーのみを抽出するロジックを搭載。

---

## 3. データベース・スキーマ (Supabase 用)

他デバイスとの同期を有効にする場合、Supabase 側に以下のテーブルが必要です。

```sql
/** 1. sessions テーブル **/
create table sessions (
  id uuid primary key,
  user_id text not null, -- Settings の Sync Key に対応
  title text,
  model text,
  provider text,
  updated_at timestamp with time zone default now()
);

/** 2. messages テーブル **/
create table messages (
  id uuid primary key,
  session_id uuid references sessions(id) on delete cascade,
  role text,
  content text,
  created_at timestamp with time zone default now()
);
```

---

## 4. 進行状況とロードマップ

| Phase | 定義 | 状態 | 内容 |
|---|---|---|---|
| **Phase 1** | **PoC** | ✅ 完了 | 基本チャット、Vercel デプロイ、OpenAI 連携 |
| **Phase 2** | **MVP** | ✅ 完了 | IndexedDB 保存、サイドバー履歴、ファイル添付 |
| **Phase 3** | **Stability** | ✅ 完了 | エラー可視化、二重送信防止、タイピング機能削除（高速化）|
| **Phase 4** | **Power-up** | ✅ 完了 | Supabase 同期、Claude/Gemini 複数プロバイダー対応 |
| **Phase 5** | **Polish** | 🚀 NEXT | 極上のアニメーション、Web 検索(Search)の UI 改善 |

---

## 5. 次の AI エージェントへの指示
このリポジトリを読み込んだら、まずは `src/app/api/chat/route.ts` でプロバイダーのルーティングを確認し、`src/hooks/useChat.ts` でメッセージの流し込みロジックを理解してください。
現在の課題は、Vercel の 10 秒制限（Free Tier）下でいかに検索のような重い処理をユーザーにストレスなく体験させるか、という点にあります。
