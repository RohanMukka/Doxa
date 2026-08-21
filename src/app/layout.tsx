import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
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

// Editorial serif, used for prose only. Optical sizing keeps the large
// headline from looking spindly at display sizes.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Doxa — where your confidence lies to you",
  description:
    "A decision journal that measures the gap between how sure you were and how often you were right.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-20 border-b border-hairline bg-page/80 backdrop-blur-md">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
            <Link href="/" className="group flex items-baseline gap-3">
              <span className="display text-[19px] tracking-tight">Doxa</span>
              <span className="hidden text-[13px] italic text-ink-muted sm:inline">
                where your confidence lies to you
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/"
                className="rounded-full px-3.5 py-1.5 text-[13px] text-ink-secondary transition-colors duration-200 hover:bg-hairline hover:text-ink"
              >
                Dashboard
              </Link>
              <Link
                href="/journal"
                className="rounded-full px-3.5 py-1.5 text-[13px] text-ink-secondary transition-colors duration-200 hover:bg-hairline hover:text-ink"
              >
                Journal
              </Link>
              <Link
                href="/journal/new"
                className="ml-2 rounded-full bg-ink px-4 py-1.5 text-[13px] font-medium text-page transition-opacity duration-200 hover:opacity-85"
              >
                New entry
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-24 pt-10">{children}</main>
        <footer className="border-t border-hairline">
          <div className="mx-auto max-w-5xl px-6 py-6 text-[13px] text-ink-muted">
            Doxa keeps everything on this machine. Your decision journal is the most honest
            thing you&rsquo;ll write about yourself.
          </div>
        </footer>
      </body>
    </html>
  );
}
