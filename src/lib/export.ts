/**
 * 📦 Export Utilities
 * 生成されたテキストをごくシンプルにファイルとして書き出すユーティリティ
 */

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToMarkdown(content: string) {
  const date = new Date().toISOString().split('T')[0];
  const filename = `minimal-llm-export-${date}.md`;
  downloadFile(content, filename, "text/markdown");
}

export function exportToText(content: string) {
  const date = new Date().toISOString().split('T')[0];
  const filename = `minimal-llm-export-${date}.txt`;
  downloadFile(content, filename, "text/plain");
}
