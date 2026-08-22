# Doxa

> **A mathematically rigorous, tamper-evident decision journal that measures cognitive bias, red-teams overconfidence, and recalibrates your intuition.**

You log a decision *before* you know how it turns out — what you're deciding, your actual reasoning, how confident you are, and what would make you wrong. Later you record what happened. Once enough decisions have resolved, Doxa reads back across all of them and tells you where your certainty and your accuracy come apart.

The journal is an append-only, cryptographic **SHA-256 hash-chained log**, so *"I wrote this down beforehand"* is mathematically demonstrable rather than taken on trust.

---

## 🎬 Demo

**[Watch the 2-minute demo →](docs/doxa-demo.webm)** — the dashboard, the adversarial
interrogation firing at 92% confidence, the counterfactual sandbox, and the hash chain
breaking under a simulated tamper.

The video is generated rather than hand-captured: [`scripts/demo-video/record.js`](scripts/demo-video)
drives a real browser through the running production build and records the session, so
nothing in it is mocked. Beat sheet and voiceover script: [`docs/demo-video.md`](docs/demo-video.md).

There is also a **[78-second cut in the editorial light theme](docs/video/doxa-demo-light.webm)**,
which opens on the headline and ends on the premortem refusing an entry. Shorter, and it
reads as the paper object the design is after.

---

## ⚡ Key Highlights & Architecture

### 1. The Adversarial "Interrogator" (Red-Teaming High Certainty)
When you set confidence $\ge 85\%$, Doxa intercepts your submission with a red-team interrogation modal:
- **Historical Failure Analogue Matching:** Queries resolved decisions to find historical examples where you expressed high certainty but were wrong.
- **Semantic Quote Attribution:** Uses deterministic pattern matching and LLM cross-examination to quote your exact phrases with glowing semantic highlights.
- **Actionable Pathways:** Choose to **Defend Your Stance** (saving your reasoning as a preregistered premortem), **Recalibrate** to your empirical Bayesian median with one click, or **Proceed Anyway**.

### 2. Cryptographic Auditor & Tamper Simulator (`/verify`)
Every decision, update, and resolution is an immutable event hashed via canonical JSON stringification and chained with `SHA-256`:
- **Interactive Block Visualizer:** Inspect the hash chain, pre-image components, timestamps, and payload hashes in real time.
- **Client-Side Web Crypto Verification:** Verifies the cryptographic integrity directly in your browser using `window.crypto.subtle`.
- **Live Tamper Simulator:** Interactively alter past confidence values, flip recorded outcomes, or mutate reasoning to watch the cryptographic chain break in real-time.

### 3. Counterfactual Recalibration Sandbox & Laboratory
Instead of static charts, Doxa runs a **60fps client-side Bayesian posterior calculation**:
- **Hypothetical Confidence Sliders:** Drag a slider from $-30\%$ to $+30\%$ to simulate: *"What if you had deflated your un-consulted bets by 14%?"*
- **Real-Time Murphy Brier Decomposition:** Instantly recalculates overall Brier Score, Miscalibration (Reliability), and Discrimination (Resolution).
- **Responsive SVG Calibration Fan:** Morphs the 95% Bayesian credible interval and median curve dynamically against the observed baseline.

### 4. Deep Obsidian Aesthetic & Micro-Interactions
- **Glassmorphic Obsidian Palette:** Deep dark space (`#09090b`), tinted slate cards, and tabular monospace numerals (`tabular-nums font-mono`).
- **Dynamic Confidence Slider:** Transitions from emerald $\rightarrow$ amber $\rightarrow$ rose glow as confidence increases, activating threshold warnings at $\ge 85\%$.
- **1-Click Theme Toggle:** Seamless switching between **Deep Obsidian** and **Editorial Light paper** mode with zero flash on reload.

---

## 🔬 Mathematical Rigor & Statistical Depth

A tool about overconfidence has no business being overconfident:

- **Grid-Fitted Bayesian Recalibration Model:** Stated confidence maps to reality through $\sigma(a \cdot \text{logit}(p) + b)$ — two parameters rather than five loose bucket rates, fitted over a grid so the posterior is exact, deterministic, and testable without an MCMC sampler.
- **Simulation-Based Calibration:** The inference is validated by generating journals from known distortions, refitting, and confirming the intervals contain the truth as often as they claim.
- **Wilson Score Intervals on Buckets:** Buckets holding sparse data render wide, hollow uncertainty ranges rather than deceptive solid points.
- **Brier Score & Murphy Decomposition:** Computes reliability, resolution, and uncertainty to distinguish whether you are well-calibrated vs. simply possessing discriminatory power.
- **Permutation Tests for Hindsight Spread:** Shuffles outcomes 10,000 times to test if your memory gap is statistically distinct from chance.
- **Machine-Grade Resolvers:** Hand deterministic criteria to GitHub PRs, issues, or public JSON endpoints to grade outcomes automatically.

---

## 🚀 Quickstart

### Prerequisites
- Node.js 18+
- SQLite (included via Prisma)
- *(Optional)* [Ollama](https://ollama.com) for 100% private, local LLM analysis (`ollama pull llama3.1:8b`)

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/RohanMukka/Doxa.git
cd Doxa

# 2. Install dependencies
npm install

# 3. Setup environment & database
cp .env.example .env
npx prisma db push

# 4. Seed demo dataset (41 resolved & 6 open decisions with SHA-256 chain)
npm run seed

# 5. Run the dev server
npm run dev
```

Open **`http://localhost:3000`** to view the dashboard, or visit **`http://localhost:3000/verify`** to inspect the cryptographic auditor.

---

## 🧪 Test Suite

Doxa contains **246 comprehensive unit and statistical tests**:

```bash
npm run test
```

Test coverage includes:
- Bayesian grid-fitting & distortion recovery
- Brier score decomposition & ECE boundary cases
- Cryptographic hash-chain preimages & canonical JSON serialization
- Client-side Web Crypto verification & tamper detection
- Adversarial interrogation reasoning & phrase extraction
- Permutation tests, Wilson intervals, and hypothesis correction

---

## 🛠️ Stack

- **Framework:** Next.js 16 (App Router, Turbopack) & React 19
- **Styling:** Tailwind CSS v4 `@theme inline` with CSS variables
- **Database & ORM:** SQLite & Prisma ORM
- **Cryptography:** Web Crypto API (`SHA-256`) & Node.js `crypto`
- **Inference & LLM:** Local-first Ollama (`llama3.1:8b`) / Google Gemini API
- **Visualization:** Custom responsive SVGs & Recharts
- **Testing:** Vitest

---

## 📄 License

MIT License. Designed and built with mathematical rigor.
