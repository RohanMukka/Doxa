---
marp: true
theme: default
class: lead
size: 16:9
backgroundColor: #09090b
color: #fafafa
style: |
  section { 
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    padding: 60px 80px;
  }
  h1 { 
    font-family: Georgia, "Times New Roman", serif; 
    color: #fafafa; 
    font-size: 3.5em; 
    margin-bottom: 0.1em;
    font-weight: 500;
    letter-spacing: -0.02em;
  }
  h2 { 
    font-family: Georgia, "Times New Roman", serif; 
    color: #a1a1aa; 
    font-weight: 400; 
    font-size: 1.6em; 
    font-style: italic;
    margin-top: 0; 
    margin-bottom: 1.5em;
  }
  p { 
    font-size: 1.3em; 
    line-height: 1.6; 
    color: #a1a1aa; 
  }
  .tag { 
    font-family: monospace; 
    color: #38bdf8; 
    font-size: 0.85em; 
    font-weight: 600;
    letter-spacing: 0.05em; 
    text-transform: uppercase;
    margin-bottom: 15px;
  }
  .card {
    background-color: #18181f;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 30px;
    margin-top: 30px;
    box-shadow: 0 8px 32px -4px rgba(0, 0, 0, 0.8);
  }
  .critical-card {
    background-color: rgba(244, 63, 94, 0.1);
    border: 1px solid rgba(244, 63, 94, 0.3);
    border-radius: 16px;
    padding: 30px;
    margin-top: 30px;
  }
  .good-card {
    background-color: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 16px;
    padding: 40px;
    margin-top: 40px;
    text-align: center;
  }
  .mono { font-family: monospace; }
  .text-critical { color: #f43f5e; }
  .text-good { color: #10b981; }
  .badge {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.2);
    border-radius: 9999px;
    padding: 6px 16px;
    font-family: monospace;
    font-size: 0.6em;
    display: inline-block;
    margin-top: 15px;
  }
---
<div class="tag">THE PROBLEM</div>
# Why I Built Doxa
## The problem with hindsight.

We all have a habit of tricking ourselves. When we are right, we say "I knew it all along." When we are wrong, we say "Nobody could have seen that coming." 

I wanted to build something that stops this cycle. Doxa is a decision journal that holds you accountable to actual reality, not just comforting hindsight.

---
<div class="tag">CRYPTOGRAPHIC HONESTY</div>
# Proving what you knew
## And exactly when you knew it.

Most AI tools let you easily edit your prompts or history. I took the opposite approach. I built Doxa on an append-only ledger. 

Every time you log a prediction, it gets sealed with a SHA-256 hash. If you try to go back and change your past confidence level to look smarter, the entire chain breaks.

---
<div class="tag">CORE MATHEMATICS</div>
# Measuring True Calibration
## Bayesian math under the hood.

Instead of just asking "was I right or wrong", Doxa runs Bayesian math in the background to check your actual calibration. 

<div class="card">
  <p style="margin: 0; font-size: 1.1em; color: #fafafa;">Are you actually right 90% of the time when you claim to be 90% sure? It breaks your track record down into a Brier score, showing if you have genuine insight or if you are just being overconfident.</p>
</div>

---
<div class="tag">THE SHOWSTOPPER FEATURE</div>
# The Adversarial Interrogator
## Stopping mistakes before they happen.

This is my favorite feature. If you try to log a new decision with extreme confidence, but your historical track record in that area is poor, Doxa will literally pause the screen. 

<div class="critical-card">
  <div style="display: flex; justify-content: space-between; font-family: monospace; font-size: 0.8em; font-weight: bold;" class="text-critical">
    <span>ADVERSARIAL INTERROGATION GATE ACTIVE</span>
    <span>Stated: 90% | Empirical: 61%</span>
  </div>
  <p style="font-family: Georgia, serif; font-style: italic; font-size: 1.1em; color: #fafafa; margin-top: 20px;">
    "You are citing strong conviction, but your empirical hit rate in this category is only 61%. Historical Analogue: On Oct 14 you were 90% certain of an identical premise that failed."
  </p>
  <div class="badge">1-Click Recalibrate to 61%</div>
</div>

---
<div class="tag">INTERACTIVE LABORATORY</div>
# The Counterfactual Sandbox
## A playground for better thinking.

I added a live sandbox so you can play with your own data. You can drag sliders to see what would happen if you were just a little less confident across the board. 

<div class="card">
  <div style="font-family: monospace; font-weight: bold; font-size: 0.8em;" class="text-good">
    SLIDER: -14% CONFIDENCE DEFLATION
  </div>
  <p style="margin-top: 15px; margin-bottom: 0; font-size: 1.1em; color: #fafafa;">
    The math instantly recalculates on screen, showing exactly how much your overall reliability would improve just by being a little more humble.
  </p>
</div>

---
<div class="tag">THE VERDICT</div>
# Ready for the Judges
## Built for the Build Beyond Hackathon.

Doxa is not just another thin AI wrapper. It is 100% local, deeply private, and built with genuine mathematical rigor. It turns the fog of human memory into something you can actually measure and improve.

<div class="good-card">
  <h1 style="margin: 0; font-size: 2.5em;">Ready to Judge & Experience</h1>
  <p style="margin-top: 15px; margin-bottom: 0;" class="text-good">Open Main Dashboard | Launch Cryptographic Auditor</p>
</div>
