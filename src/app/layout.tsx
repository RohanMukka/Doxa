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
        <header className="sticky top-0 z-20 border-b border-hairline bg-page/80 backdrop-blur-lg">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="group flex items-baseline gap-3">
                <span className="display text-[21px] font-medium tracking-tight text-ink">Doxa</span>
                <span className="hidden text-[13px] italic text-ink-muted sm:inline">
                  where your confidence lies to you
                </span>
              </Link>
              <Link
                href="/verify"
                className="hidden items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/40 md:inline-flex"
                title="Inspect cryptographic SHA-256 event chain"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>SEALED // SHA-256</span>
              </Link>
            </div>
            <div className="flex items-center gap-1.5">
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
                href="/verify"
                className="rounded-full px-3.5 py-1.5 text-[13px] text-ink-secondary transition-colors duration-200 hover:bg-hairline hover:text-ink"
              >
                Auditor
              </Link>
              <Link
                href="/journal/new"
                className="ml-2 rounded-full border border-white/15 bg-ink px-4 py-1.5 text-[13px] font-medium text-page transition-all duration-200 hover:opacity-90 hover:shadow-sm"
              >
                New entry
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-24 pt-10">{children}</main>
        <footer className="border-t border-hairline">
          <div className="mx-auto max-w-5xl px-6 py-6 text-[13px] text-ink-muted">
            Your decision journal is the most honest thing you&rsquo;ll write about
            yourself, so it stays in a file on this machine. The one feature that wants to
            read all of it at once — the pattern analysis — runs on a local model by
            default, and can only reach a hosted one if you say so for that run.
          </div>
        </footer>
      </body>
    </html>
  );
}
