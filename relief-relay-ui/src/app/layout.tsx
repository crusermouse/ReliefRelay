import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReliefRelay — Disaster Relief Intake Copilot",
  description:
    "Offline-first disaster relief intake copilot powered by Gemma 4. Turns handwritten forms, voice notes, and photos into structured action plans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
