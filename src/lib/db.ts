/**
 * 🗄️ Minimal LLM Workspace - Persistence Layer (IndexedDB)
 * 外部ライブラリを使わず、ピュアな IndexedDB API で実装。
 * 会話履歴とセッションメタデータのみを保存し、APIキーは保存しない。
 */

import { ChatSession, ChatMessage } from "./types";

const DB_NAME = "MinimalLLMWorkspace";
const DB_VERSION = 1;
const STORE_SESSIONS = "sessions";

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: "id" });
      }
    };
  });
}

export async function saveSession(session: ChatSession): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SESSIONS, "readwrite");
    const store = transaction.objectStore(STORE_SESSIONS);
    const request = store.put(session);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getAllSessions(): Promise<ChatSession[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SESSIONS, "readonly");
    const store = transaction.objectStore(STORE_SESSIONS);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function deleteSession(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SESSIONS, "readwrite");
    const store = transaction.objectStore(STORE_SESSIONS);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
