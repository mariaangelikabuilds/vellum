import type { Metadata } from "next";
import { Geist_Mono, Newsreader } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// Geist Sans dropped on purpose — sans-default reads as generic AI/SaaS chrome.
// Vellum uses serif (Newsreader) for prose surfaces and Geist Mono for chrome.

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
        className={`${geistMono.variable} ${newsreader.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
