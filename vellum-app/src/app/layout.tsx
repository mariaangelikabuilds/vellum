import type { Metadata } from "next";
import { Geist_Mono, Newsreader, Libre_Franklin } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// Two-font system, both free Google Fonts:
//   Newsreader (serif)      → body prose, hero headlines, mark cards, paragraphs
//   Libre Franklin (sans)   → chrome — labels, tabs, nav, footer, metadata
// This is the NYT pattern: serif body, sans-grotesque section-header chrome.
// Geist Mono is kept only as a fallback for any future code-block context.

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

const libreFranklin = Libre_Franklin({
  variable: "--font-chrome",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Vellum",
  description: "A graph-of-claims word processor for essayists, analysts, and longform writers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistMono.variable} ${newsreader.variable} ${libreFranklin.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
