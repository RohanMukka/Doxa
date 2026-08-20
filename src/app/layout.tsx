import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Doxa",
  description: "A decision journal that shows you where your confidence lies to you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-hairline bg-page/85 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
            <Link href="/" className="flex items-baseline gap-2.5">
              <span className="text-base font-semibold tracking-tight">Doxa</span>
              <span className="hidden text-xs text-ink-muted sm:inline">
                where your confidence lies to you
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/"
                className="rounded-lg px-3 py-1.5 text-sm text-ink-secondary transition-colors hover:bg-hairline hover:text-ink"
              >
                Dashboard
              </Link>
              <Link
                href="/journal"
                className="rounded-lg px-3 py-1.5 text-sm text-ink-secondary transition-colors hover:bg-hairline hover:text-ink"
              >
                Journal
              </Link>
              <Link
                href="/journal/new"
                className="ml-2 rounded-lg bg-ink px-3.5 py-1.5 text-sm font-medium text-page transition-opacity hover:opacity-90"
              >
                New entry
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-6">{children}</main>
      </body>
    </html>
  );
}
