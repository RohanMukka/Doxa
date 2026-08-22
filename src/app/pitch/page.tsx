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
      tag: "THE HOOK // PROBLEM",
      title: "Doxa",
      subtitle: "Where your confidence lies to you.",
      content: (
        <div className="space-y-6">
          <p className="text-[18px] leading-relaxed text-ink-secondary">
            Every consequential mistake you have ever made was accompanied by complete confidence. 
            Once an outcome occurs, your brain retroactively edits its memory to protect your ego:
            <span className="block mt-2 font-serif text-[22px] italic text-ink">
              &ldquo;I always knew that was risky.&rdquo;
            </span>
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-4 font-mono text-[13px]">
            <div className="rounded-2xl border border-hairline bg-surface-raised p-4">
              <div className="text-rose-400 font-bold text-[18px]">90%+</div>
              <div className="text-ink-muted text-[11px] mt-1">HUMAN OVERCONFIDENCE</div>
              <div className="text-ink-secondary text-[12px] mt-2">Stated certainty routinely outstrips empirical hit rates by 20-30%.</div>
            </div>
            <div className="rounded-2xl border border-hairline bg-surface-raised p-4">
              <div className="text-amber-400 font-bold text-[18px]">0 Proof</div>
              <div className="text-ink-muted text-[11px] mt-1">NOTION & SPREADSHEETS</div>
              <div className="text-ink-secondary text-[12px] mt-2">Cannot mathematically prove you didn&rsquo;t edit predictions after the fact.</div>
            </div>
            <div className="rounded-2xl border border-hairline bg-surface-raised p-4">
              <div className="text-emerald-400 font-bold text-[18px]">1 Fix</div>
              <div className="text-ink-muted text-[11px] mt-1">MATHEMATICAL DOXA</div>
              <div className="text-ink-secondary text-[12px] mt-2">Preregistered, SHA-256 sealed, and recalibrated with Bayesian inference.</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "math",
      tag: "CORE MATHEMATICS",
      title: "Proper Scoring & Bayesian Recalibration",
      subtitle: "A tool about overconfidence has no business being overconfident.",
      content: (
        <div className="space-y-5 text-[14px]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-hairline bg-surface-raised p-5 space-y-2">
              <div className="font-mono text-emerald-400 text-[12px] font-bold">1. BAYESIAN GRID RECALIBRATION</div>
              <div className="font-mono text-[16px] text-ink font-semibold">σ(a · logit(p) + b)</div>
              <p className="text-ink-secondary text-[13px] leading-relaxed">
                Maps subjective confidence to empirical reality using a 2-parameter model with an exact 95% Bayesian credible fan—deterministic without MCMC approximation.
              </p>
            </div>
            <div className="rounded-2xl border border-hairline bg-surface-raised p-5 space-y-2">
              <div className="font-mono text-sky-400 text-[12px] font-bold">2. MURPHY BRIER DECOMPOSITION</div>
              <div className="font-mono text-[16px] text-ink font-semibold">Brier = Reliability - Resolution + Uncertainty</div>
              <p className="text-ink-secondary text-[13px] leading-relaxed">
                Separates honest calibration (not overclaiming) from true discrimination power (detecting high-probability events).
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-hairline bg-surface/60 p-4 font-mono text-[12px] text-ink-secondary flex items-center justify-between">
            <span>✓ Wilson score intervals on sparse buckets</span>
            <span>✓ 10,000-shuffle permutation test for hindsight gap</span>
          </div>
        </div>
      ),
    },
    {
      id: "interrogator",
      tag: "THE SHOWSTOPPER FEATURE",
      title: "The Adversarial Interrogator",
      subtitle: "Red-teaming certainty at the moment of highest risk (≥85%).",
      content: (
        <div className="space-y-4">
          <p className="text-[15px] text-ink-secondary">
            When you attempt to commit an entry with &ge;85% confidence, Doxa intercepts you with a live red-team interrogation modal:
          </p>
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                ⚡ Adversarial Interrogation Gate Active
              </span>
              <span className="font-mono text-[11px] text-rose-300">Stated: 90% → Empirical: 61%</span>
            </div>
            <div className="text-zinc-100 font-serif italic text-[14px]">
              &ldquo;You are citing strong conviction, but your empirical hit rate in this category is only 61%. Historical Analogue: On Oct 14 you were 90% certain of an identical premise that failed.&rdquo;
            </div>
            <div className="flex flex-wrap gap-2 pt-2 text-[12px]">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-emerald-400">
                1-Click Recalibrate to 61%
              </span>
              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-mono text-rose-300">
                Freeze Premortem Defense
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "crypto",
      tag: "TAMPER-EVIDENT INTEGRITY",
      title: "SHA-256 Hash Chain & Live Auditor",
      subtitle: "Mathematically proving 'I wrote this before I knew'.",
      content: (
        <div className="space-y-4">
          <p className="text-[14px] text-ink-secondary">
            Every decision, recall, and outcome is canonicalized into an append-only cryptographic event chain:
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-hairline bg-surface-raised p-4 font-mono text-[12px] space-y-2">
              <div className="text-emerald-400 font-bold">CLIENT-SIDE WEBCRYPTO</div>
              <p className="text-ink-secondary text-[12px]">
                The <code className="text-white">/verify</code> engine runs <code className="text-white">window.crypto.subtle</code> to replay every event hash directly in the judge&rsquo;s browser.
              </p>
            </div>
            <div className="rounded-2xl border border-hairline bg-surface-raised p-4 font-mono text-[12px] space-y-2">
              <div className="text-rose-400 font-bold">LIVE TAMPER SIMULATOR</div>
              <p className="text-ink-secondary text-[12px]">
                Interactively flip historical outcomes or alter confidence to watch the cryptographic chain break in real-time.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-hairline bg-surface/60 p-3 font-mono text-[11px] text-ink-muted text-center">
            Chain Head: <span className="text-ink">SHA-256 Digest Verified // 100% Sealed</span>
          </div>
        </div>
      ),
    },
    {
      id: "sandbox",
      tag: "INTERACTIVE LABORATORY",
      title: "Counterfactual Sandbox & Epistemic ROI",
      subtitle: "Simulate deflating unearned certainty at 60 frames per second.",
      content: (
        <div className="space-y-4">
          <p className="text-[14px] text-ink-secondary">
            Instead of static charts, Doxa provides a live simulation sandbox:
          </p>
          <div className="rounded-2xl border border-hairline bg-surface-raised p-5 space-y-3 font-mono text-[12px]">
            <div className="flex items-center justify-between text-ink">
              <span className="text-emerald-400 font-bold">SLIDER: -14% CONFIDENCE DEFLATION</span>
              <span>Brier: 0.241 → 0.188 (Better)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-hairline overflow-hidden">
              <div className="h-full bg-emerald-400 w-3/4 rounded-full" />
            </div>
            <div className="text-ink-secondary text-[11px] leading-relaxed">
              ⚡ <span className="text-emerald-400 font-bold">Epistemic ROI:</span> Purges unearned certainty points from failed bets, raises reliability by 24%, and neutralizes high-certainty blindspots without damaging discrimination.
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "antiwrapper",
      tag: "TECHNICAL SUPERIORITY",
      title: "The Ultimate Anti-Wrapper",
      subtitle: "Why technical hackathon judges love Doxa.",
      content: (
        <div className="space-y-4 text-[13px]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 font-mono">
            <div className="rounded-xl border border-hairline bg-surface-raised p-3.5">
              <div className="text-sky-400 font-bold text-[14px]">246 Tests</div>
              <div className="text-ink-secondary text-[11px] mt-1">100% Vitest coverage over Bayesian math, hash chains, and FDR holdout splits.</div>
            </div>
            <div className="rounded-xl border border-hairline bg-surface-raised p-3.5">
              <div className="text-emerald-400 font-bold text-[14px]">Machine Oracles</div>
              <div className="text-ink-secondary text-[11px] mt-1">Automatic grading via GitHub PRs, issues, and NPM registry APIs.</div>
            </div>
            <div className="rounded-xl border border-hairline bg-surface-raised p-3.5">
              <div className="text-amber-400 font-bold text-[14px]">Self-Refuting</div>
              <div className="text-ink-secondary text-[11px] mt-1">Displays its own failed hypotheses on screen using Benjamini-Hochberg FDR control.</div>
            </div>
          </div>
          <div className="rounded-2xl border border-hairline bg-surface/70 p-4 text-[13px] text-ink-secondary">
            <strong className="text-ink">100% Local &amp; Private:</strong> SQLite, Node.js WebCrypto, zero tracking, and local Ollama inference with explicit Gemini cloud fallback consent.
          </div>
        </div>
      ),
    },
    {
      id: "summary",
      tag: "THE VERDICT",
      title: "Turn Intuition into an Empirical Asset",
      subtitle: "Built with mathematical rigor for the Build Beyond Hackathon.",
      content: (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center space-y-3">
            <div className="display text-[26px] text-ink">Ready to Judge &amp; Experience</div>
            <p className="text-[14px] text-emerald-300 max-w-xl mx-auto">
              Doxa turns the fog of human memory into a calibrated, tamper-evident cognitive instrument.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/"
                className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-page hover:opacity-90 transition-opacity"
              >
                Open Main Dashboard →
              </Link>
              <Link
                href="/verify"
                className="rounded-full border border-hairline bg-surface-raised px-5 py-2.5 text-[13px] font-medium text-ink hover:bg-hairline transition-colors"
              >
                Launch Cryptographic Auditor
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-between text-[12px] font-mono text-ink-muted">
            <span>Solo Submission: Rohan Mukka</span>
            <span>MIT License · Next.js 16 + React 19</span>
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
            ← Prev
          </button>
          <button
            type="button"
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="rounded-full border border-hairline bg-surface-raised px-3 py-1 text-[12px] text-ink disabled:opacity-30 hover:bg-hairline transition-colors"
          >
            Next →
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
            Use <kbd className="rounded border border-hairline px-1.5 py-0.5 bg-surface-raised text-ink">←</kbd> <kbd className="rounded border border-hairline px-1.5 py-0.5 bg-surface-raised text-ink">→</kbd> arrow keys to navigate
          </div>
        </div>
      </div>
    </div>
  );
}
