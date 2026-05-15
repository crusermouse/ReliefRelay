import type { Metadata } from "next";
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
  themeColor: "#06090f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
