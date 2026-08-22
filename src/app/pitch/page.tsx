"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Slide = {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
};

export default function PitchDeckPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: Slide[] = [
    {
      id: "title",
      tag: "THE PROBLEM",
      title: "Why I Built Doxa",
      subtitle: "The problem with hindsight.",
      content: (
        <div className="space-y-6">
          <p className="text-[18px] leading-relaxed text-ink-secondary">
            We all have a habit of tricking ourselves. When we are right, we say &quot;I knew it all along.&quot; When we are wrong, we say &quot;Nobody could have seen that coming.&quot;
          </p>
          <p className="text-[18px] leading-relaxed text-ink-secondary">
            I wanted to build something that stops this cycle. Doxa is a decision journal that holds you accountable to actual reality, not just comforting hindsight.
          </p>
        </div>
      ),
    },
    {
      id: "crypto",
      tag: "CRYPTOGRAPHIC HONESTY",
      title: "Proving what you knew",
      subtitle: "And exactly when you knew it.",
      content: (
        <div className="space-y-6">
          <p className="text-[18px] leading-relaxed text-ink-secondary">
            Most AI tools let you easily edit your prompts or history. I took the opposite approach. I built Doxa on an append-only ledger.
          </p>
          <p className="text-[18px] leading-relaxed text-ink-secondary">
            Every time you log a prediction, it gets sealed with a SHA-256 hash. If you try to go back and change your past confidence level to look smarter, the entire chain breaks.
          </p>
        </div>
      ),
    },
    {
      id: "math",
      tag: "CORE MATHEMATICS",
      title: "Measuring True Calibration",
      subtitle: "Bayesian math under the hood.",
      content: (
        <div className="space-y-6">
          <p className="text-[18px] leading-relaxed text-ink-secondary">
            Instead of just asking &quot;was I right or wrong&quot;, Doxa runs Bayesian math in the background to check your actual calibration.
          </p>
          <div className="rounded-2xl border border-hairline bg-surface-raised p-5 space-y-2 text-[15px]">
            Are you actually right 90% of the time when you claim to be 90% sure? It breaks your track record down into a Brier score, showing if you have genuine insight or if you are just being overconfident.
          </div>
        </div>
      ),
    },
    {
      id: "interrogator",
      tag: "THE SHOWSTOPPER FEATURE",
      title: "The Adversarial Interrogator",
      subtitle: "Stopping mistakes before they happen.",
      content: (
        <div className="space-y-6">
          <p className="text-[16px] leading-relaxed text-ink-secondary">
            This is my favorite feature. If you try to log a new decision with extreme confidence, but your historical track record in that area is poor, Doxa will literally pause the screen.
          </p>
          <div className="rounded-2xl border border-critical/30 bg-critical/10 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-critical uppercase tracking-wider">
                ADVERSARIAL INTERROGATION GATE ACTIVE
              </span>
              <span className="font-mono text-[11px] text-critical">Stated: 90% | Empirical: 61%</span>
            </div>
            <div className="text-ink font-serif italic text-[14px]">
              &quot;You are citing strong conviction, but your empirical hit rate in this category is only 61%. Historical Analogue: On Oct 14 you were 90% certain of an identical premise that failed.&quot;
            </div>
            <div className="flex flex-wrap gap-2 pt-2 text-[12px]">
              <span className="rounded-full border border-good/30 bg-good/10 px-3 py-1 font-mono text-good">
                1-Click Recalibrate to 61%
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "sandbox",
      tag: "INTERACTIVE LABORATORY",
      title: "The Counterfactual Sandbox",
      subtitle: "A playground for better thinking.",
      content: (
        <div className="space-y-6">
          <p className="text-[18px] leading-relaxed text-ink-secondary">
            I added a live sandbox so you can play with your own data. You can drag sliders to see what would happen if you were just a little less confident across the board.
          </p>
          <div className="rounded-2xl border border-hairline bg-surface-raised p-5 space-y-3 font-mono text-[12px]">
            <div className="flex items-center justify-between text-ink">
              <span className="text-good font-bold">SLIDER: -14% CONFIDENCE DEFLATION</span>
            </div>
            <div className="text-ink-secondary text-[13px] leading-relaxed mt-2">
              The math instantly recalculates on screen, showing exactly how much your overall reliability would improve just by being a little more humble.
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "summary",
      tag: "THE VERDICT",
      title: "Ready for the Judges",
      subtitle: "Built for the Build Beyond Hackathon.",
      content: (
        <div className="space-y-6">
          <p className="text-[16px] leading-relaxed text-ink-secondary text-center mb-6">
            Doxa is not just another thin AI wrapper. It is 100% local, deeply private, and built with genuine mathematical rigor. It turns the fog of human memory into something you can actually measure and improve.
          </p>
          <div className="rounded-2xl border border-good/30 bg-good/10 p-6 text-center space-y-3">
            <div className="display text-[26px] text-ink">Ready to Judge & Experience</div>
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <Link href="/" className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-page hover:opacity-90 transition-opacity">
                Open Main Dashboard
              </Link>
              <Link href="/verify" className="rounded-full border border-hairline bg-surface-raised px-5 py-2.5 text-[13px] font-medium text-ink hover:bg-hairline transition-colors">
                Launch Cryptographic Auditor
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-between text-[12px] font-mono text-ink-muted mt-8">
            <span>Solo Submission: Rohan Mukka</span>
            <span>MIT License | Next.js 16 + React 19</span>
          </div>
        </div>
      ),
    },
  ];


  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Space") {
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        prevSlide();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  const slide = slides[currentSlide];

  return (
    <div className="rise flex flex-col justify-between min-h-[75vh] space-y-8">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-hairline pb-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            JUDGE PITCH DECK
          </span>
          <span className="font-mono text-[12px] text-ink-muted">
            Slide {currentSlide + 1} of {slides.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="rounded-full border border-hairline bg-surface-raised px-3 py-1 text-[12px] text-ink disabled:opacity-30 hover:bg-hairline transition-colors"
          >
            â† Prev
          </button>
          <button
            type="button"
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="rounded-full border border-hairline bg-surface-raised px-3 py-1 text-[12px] text-ink disabled:opacity-30 hover:bg-hairline transition-colors"
          >
            Next â†’
          </button>
        </div>
      </div>

      {/* Main Slide Card */}
      <div className="rounded-3xl border border-hairline bg-surface/80 p-8 sm:p-12 shadow-[var(--shadow-card)] backdrop-blur-md flex-1 flex flex-col justify-between transition-all duration-300">
        <div>
          <p className="eyebrow text-sky-400">{slide.tag}</p>
          <h1 className="display mt-3 text-[36px] sm:text-[48px] text-ink font-medium tracking-tight">
            {slide.title}
          </h1>
          <p className="mt-2 text-[16px] italic text-ink-muted font-serif">
            {slide.subtitle}
          </p>

          <div className="mt-8">{slide.content}</div>
        </div>

        {/* Navigation Dot Indicators */}
        <div className="mt-12 flex items-center justify-between border-t border-hairline pt-6">
          <div className="flex items-center gap-2">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlide
                    ? "w-8 bg-emerald-400"
                    : "w-2 bg-hairline-strong hover:bg-ink-muted"
                }`}
                title={`Jump to slide ${idx + 1}`}
              />
            ))}
          </div>

          <div className="text-[11px] font-mono text-ink-muted hidden sm:block">
            Use <kbd className="rounded border border-hairline px-1.5 py-0.5 bg-surface-raised text-ink">â†</kbd> <kbd className="rounded border border-hairline px-1.5 py-0.5 bg-surface-raised text-ink">â†’</kbd> arrow keys to navigate
          </div>
        </div>
      </div>
    </div>
  );
}
