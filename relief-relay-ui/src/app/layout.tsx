import type { Metadata } from "next";
import { HeartPulse } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReliefRelay — Humanitarian AI Operations",
  description:
    "Offline-first disaster relief intake copilot powered by Gemma 4. Turns handwritten forms, voice notes, and photos into structured triage decisions and action plans — no cloud required.",
  keywords: ["disaster relief", "humanitarian AI", "triage", "offline-first", "Gemma 4"],
  openGraph: {
    title: "ReliefRelay — Humanitarian AI Operations",
    description: "Offline-first disaster relief intake copilot powered by Gemma 4.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D1117",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary font-sans text-[15px] font-normal leading-[1.6]">
        {children}
      </body>
    </html>
  );
}
