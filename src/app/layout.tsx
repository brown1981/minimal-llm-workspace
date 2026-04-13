import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Minimal LLM Workspace",
  description: "Pure thinking space for LLM interactions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
