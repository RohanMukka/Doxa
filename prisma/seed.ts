import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { append, type NewEvent } from "../src/lib/journal/log";

type SeedEntry = {
  decision: string;
  reasoning: string;
  confidence: number;
  category: string;
  consultedOthers: boolean;
  createdAt: string;
  resolutionDate: string;
  outcome: "correct" | "incorrect";
  resolutionNote: string;
};

// Bucket A: high confidence (85-95), reasoned alone. Deliberately overconfident —
// actual hit rate lands around 55%, far below the stated confidence. The reasoning
// text leans on "I've thought about this" / "I don't need to run this by anyone"
// as a stand-in for the tell a real person's journal would contain.
const bucketA: SeedEntry[] = [
  {
    decision: "Turn down the PM offer at the fintech startup and stay in my current eng role.",
    reasoning:
      "I've thought about this a lot over the past week. The eng role has more upside long-term and I don't think I need a title change right now. I'm confident staying is right.",
    confidence: 90,
    category: "career",
    consultedOthers: false,
    createdAt: "2025-09-03",
    resolutionDate: "2025-12-01",
    outcome: "incorrect",
    resolutionNote:
      "Regretted it by December — the startup role would have given me the scope I ended up leaving for anyway, six months later and with worse timing.",
  },
  {
    decision: "Skip the annual physical this year, I feel fine.",
    reasoning:
      "I've thought about this and I really don't think it's necessary. I feel fine, nothing's changed, and I'd rather not spend the afternoon on it.",
    confidence: 88,
    category: "health",
    consultedOthers: false,
    createdAt: "2025-09-10",
    resolutionDate: "2025-11-15",
    outcome: "incorrect",
    resolutionNote: "Blood pressure had crept up. Should have just gone.",
  },
  {
    decision: "Put the year-end bonus entirely into the same index fund I already hold, no rebalancing.",
    reasoning:
      "I've thought about this plenty and I don't see the point of overcomplicating it. Simple is right. I'm sure this is fine as-is.",
    confidence: 85,
    category: "money",
    consultedOthers: false,
    createdAt: "2025-09-18",
    resolutionDate: "2026-01-10",
    outcome: "correct",
    resolutionNote: "Fine in hindsight, market was flat, no real cost either way.",
  },
  {
    decision: "Tell my landlord I won't be renewing, and start apartment hunting solo without a checklist.",
    reasoning:
      "I don't need to run this by anyone, I've done this before. I'm confident I can just wing the search like last time.",
    confidence: 87,
    category: "money",
    consultedOthers: false,
    createdAt: "2025-09-25",
    resolutionDate: "2025-10-30",
    outcome: "correct",
    resolutionNote: "Found a decent unit within the week despite winging it — got lucky on timing.",
  },
  {
    decision: "Take on the extra project at work without asking for a scope reduction elsewhere.",
    reasoning:
      "I've thought about this a lot and I'm confident I can handle it. I don't need to check with my manager about workload, I know my own bandwidth.",
    confidence: 92,
    category: "career",
    consultedOthers: false,
    createdAt: "2025-10-02",
    resolutionDate: "2025-12-20",
    outcome: "incorrect",
    resolutionNote: "Burned out in December and dropped quality on both projects.",
  },
  {
    decision: "Commit to running a marathon in six months with no coach, just a plan I found online.",
    reasoning:
      "I'm confident in this. I've thought about it and I know my body well enough to self-coach through it.",
    confidence: 85,
    category: "health",
    consultedOthers: false,
    createdAt: "2025-10-14",
    resolutionDate: "2026-04-14",
    outcome: "correct",
    resolutionNote: "Finished, slower than hoped but no injuries.",
  },
  {
    decision: "Cut ties with a long-time supplier for my side project without lining up a replacement first.",
    reasoning:
      "I don't need a second opinion on this, it's obviously the right call. I've thought about this for weeks.",
    confidence: 90,
    category: "side-project",
    consultedOthers: false,
    createdAt: "2025-10-28",
    resolutionDate: "2025-12-05",
    outcome: "correct",
    resolutionNote: "Found a new supplier faster than expected, no real disruption.",
  },
  {
    decision: "Move in with my partner after eight months, no formal conversation about finances first.",
    reasoning:
      "I'm confident this is right, I've thought about it enough on my own and don't feel like I need to overplan the logistics.",
    confidence: 88,
    category: "relationships",
    consultedOthers: false,
    createdAt: "2025-11-05",
    resolutionDate: "2026-02-05",
    outcome: "incorrect",
    resolutionNote:
      "The relationship itself was fine, but the lack of an upfront money conversation caused two real fights.",
  },
  {
    decision: "Self-fund the next quarter of the side project instead of raising a small round.",
    reasoning:
      "I've thought about this a lot and I'm sure bootstrapping keeps me in control. Didn't feel the need to sanity check the runway math with anyone.",
    confidence: 90,
    category: "side-project",
    consultedOthers: false,
    createdAt: "2025-11-20",
    resolutionDate: "2026-02-28",
    outcome: "correct",
    resolutionNote: "Runway math was tight but a late invoice payment came through just in time.",
  },
  {
    decision: "Negotiate my own salary bump without benchmarking against market data.",
    reasoning:
      "I'm confident I know what I'm worth. I've thought about this and don't think I need to check leveling data first.",
    confidence: 93,
    category: "career",
    consultedOthers: false,
    createdAt: "2025-12-08",
    resolutionDate: "2026-01-20",
    outcome: "incorrect",
    resolutionNote: "Asked for less than the actual band once a friend later shared the leveling doc.",
  },
  {
    decision: "Switch my retirement contributions to a more aggressive allocation right before a planned home purchase.",
    reasoning:
      "I've thought about this a lot on my own. I'm confident the timeline is fine and I don't need to check the math against the purchase date.",
    confidence: 86,
    category: "money",
    consultedOthers: false,
    createdAt: "2025-12-15",
    resolutionDate: "2026-03-01",
    outcome: "correct",
    resolutionNote: "Purchase got pushed anyway, so the timing risk never actually mattered.",
  },
];

// Bucket B: high confidence (85-95), talked it through with someone first.
// Hit rate lands close to the stated confidence — genuinely well-calibrated.
const bucketB: SeedEntry[] = [
  {
    decision: "Accept the lateral move to the platform team after talking it through with my manager.",
    reasoning:
      "Walked through the trade-offs with my manager and a former teammate on that team. Both flagged the same upside I saw. Confident in this.",
    confidence: 88,
    category: "career",
    consultedOthers: true,
    createdAt: "2025-09-05",
    resolutionDate: "2025-12-15",
    outcome: "correct",
    resolutionNote: "Good move, learned a lot, no regrets.",
  },
  {
    decision: "Refinance the car loan after comparing rates with my partner and a broker.",
    reasoning: "Got a second opinion from my partner and ran the numbers past a broker friend. Confident this saves real money.",
    confidence: 90,
    category: "money",
    consultedOthers: true,
    createdAt: "2025-09-22",
    resolutionDate: "2025-10-22",
    outcome: "incorrect",
    resolutionNote: "Fees ate most of the savings — should have modeled the fee schedule more carefully.",
  },
  {
    decision: "Start physical therapy for the knee instead of pushing through it, per doctor's advice.",
    reasoning: "Doctor recommended it directly and a friend who went through the same injury backed it up. Confident this is right.",
    confidence: 92,
    category: "health",
    consultedOthers: true,
    createdAt: "2025-10-01",
    resolutionDate: "2025-12-01",
    outcome: "correct",
    resolutionNote: "Knee is fully recovered, no relapse.",
  },
  {
    decision: "Bring on a co-founder for the side project after three long conversations with them and a mentor.",
    reasoning: "Talked it through extensively with a mentor and did two working sessions with the potential co-founder first. Confident in the fit.",
    confidence: 87,
    category: "side-project",
    consultedOthers: true,
    createdAt: "2025-10-20",
    resolutionDate: "2026-02-20",
    outcome: "correct",
    resolutionNote: "Partnership is working well four months in.",
  },
  {
    decision: "Have the direct conversation about moving in together after discussing finances with my partner first.",
    reasoning: "We sat down together and went through budgets before deciding. Confident we're aligned.",
    confidence: 89,
    category: "relationships",
    consultedOthers: true,
    createdAt: "2025-11-08",
    resolutionDate: "2026-02-08",
    outcome: "correct",
    resolutionNote: "Smooth transition, no money surprises.",
  },
  {
    decision: "Take the counteroffer instead of leaving, after a long talk with a mentor about the actual reasons I wanted to leave.",
    reasoning: "My mentor pushed me to separate the money issue from the real issue, which was my manager. Since my manager was also leaving, confident staying makes sense now.",
    confidence: 85,
    category: "career",
    consultedOthers: true,
    createdAt: "2025-11-25",
    resolutionDate: "2026-02-25",
    outcome: "correct",
    resolutionNote: "New manager is a big improvement, glad I stayed.",
  },
  {
    decision: "Sign up for a 10k instead of the marathon after talking to a running coach about my current base.",
    reasoning: "Coach reviewed my training log and recommended scaling down the goal this cycle. Confident this is the smarter target.",
    confidence: 86,
    category: "health",
    consultedOthers: true,
    createdAt: "2025-12-02",
    resolutionDate: "2026-02-15",
    outcome: "correct",
    resolutionNote: "Hit the goal comfortably, no injuries.",
  },
  {
    decision: "Raise a small pre-seed round instead of bootstrapping, after modeling runway with an advisor.",
    reasoning: "Advisor and I built out three runway scenarios together. The bootstrap case was too fragile. Confident raising is right.",
    confidence: 91,
    category: "side-project",
    consultedOthers: true,
    createdAt: "2025-12-18",
    resolutionDate: "2026-04-18",
    outcome: "correct",
    resolutionNote: "Round closed, runway is comfortable.",
  },
];

// Bucket C: mid confidence (60-78), reasoned mostly alone. Hit rate tracks
// roughly with stated confidence — no real overconfidence signal here.
const bucketC: SeedEntry[] = [
  {
    decision: "Try a new grocery delivery service instead of the usual one.",
    reasoning: "Seems like a reasonable switch based on the reviews I read. Not fully sure it'll be better.",
    confidence: 65,
    category: "daily",
    consultedOthers: false,
    createdAt: "2025-09-08",
    resolutionDate: "2025-09-22",
    outcome: "correct",
    resolutionNote: "Slightly better, worth the switch.",
  },
  {
    decision: "Skip the industry conference this year and rely on recordings instead.",
    reasoning: "Budget's tight and I think the recordings cover most of it, though I could be missing the networking value.",
    confidence: 62,
    category: "career",
    consultedOthers: false,
    createdAt: "2025-09-16",
    resolutionDate: "2025-11-01",
    outcome: "incorrect",
    resolutionNote: "Missed a hallway conversation that would've mattered for a role I later wanted.",
  },
  {
    decision: "Try intermittent fasting for a month to see if it helps energy levels.",
    reasoning: "Reasonably confident based on what I've read, but I know results vary a lot person to person.",
    confidence: 60,
    category: "health",
    consultedOthers: false,
    createdAt: "2025-10-05",
    resolutionDate: "2025-11-05",
    outcome: "correct",
    resolutionNote: "Noticeably better afternoon energy.",
  },
  {
    decision: "Move a small chunk of savings into a CD instead of leaving it in checking.",
    reasoning: "Seems like free money for cash I won't touch, though the rate environment could shift.",
    confidence: 70,
    category: "money",
    consultedOthers: false,
    createdAt: "2025-10-18",
    resolutionDate: "2026-01-18",
    outcome: "correct",
    resolutionNote: "Rate held, worked out as expected.",
  },
  {
    decision: "Switch the side project's landing page copy without running a formal A/B test.",
    reasoning: "Gut says the new copy is clearer, but I'm not fully certain it'll move conversion.",
    confidence: 58,
    category: "side-project",
    consultedOthers: false,
    createdAt: "2025-11-02",
    resolutionDate: "2025-12-02",
    outcome: "incorrect",
    resolutionNote: "Conversion dipped slightly, reverted.",
  },
  {
    decision: "Bring up moving in together earlier than planned, on a hunch.",
    reasoning: "Feels like the right timing but I'm genuinely unsure, haven't talked it through with anyone.",
    confidence: 55,
    category: "relationships",
    consultedOthers: false,
    createdAt: "2025-11-14",
    resolutionDate: "2026-01-14",
    outcome: "incorrect",
    resolutionNote: "It was too early, caused some stress.",
  },
  {
    decision: "Try a new productivity app instead of my current notes setup.",
    reasoning: "Might stick, might not. Reasonably optimistic based on the demo.",
    confidence: 60,
    category: "daily",
    consultedOthers: false,
    createdAt: "2025-12-01",
    resolutionDate: "2025-12-20",
    outcome: "correct",
    resolutionNote: "Stuck with it, genuinely better fit.",
  },
  {
    decision: "Skip renewing a niche subscription I rarely use.",
    reasoning: "Fairly confident I won't miss it, though there's a small chance a project needs it later.",
    confidence: 72,
    category: "money",
    consultedOthers: false,
    createdAt: "2025-12-10",
    resolutionDate: "2026-02-10",
    outcome: "correct",
    resolutionNote: "Didn't miss it.",
  },
];

// Bucket D: mid confidence (60-78), talked it through with someone. Also
// roughly matches stated confidence.
const bucketD: SeedEntry[] = [
  {
    decision: "Push back the launch date after checking in with the design team on their timeline.",
    reasoning: "Design flagged real risk in the current timeline. Reasonably confident a two-week push is the right call.",
    confidence: 74,
    category: "side-project",
    consultedOthers: true,
    createdAt: "2025-09-12",
    resolutionDate: "2025-10-12",
    outcome: "correct",
    resolutionNote: "Launch was much smoother for the delay.",
  },
  {
    decision: "Ask for a flexible work schedule after discussing it with my manager informally first.",
    reasoning: "Manager seemed open in the informal chat, so reasonably confident the formal ask goes fine.",
    confidence: 75,
    category: "career",
    consultedOthers: true,
    createdAt: "2025-09-28",
    resolutionDate: "2025-10-15",
    outcome: "correct",
    resolutionNote: "Approved without pushback.",
  },
  {
    decision: "Try a new therapist after a friend's recommendation and one intro call.",
    reasoning: "Good sign from the intro call and a trusted referral, but fit is always a bit of a gamble.",
    confidence: 68,
    category: "health",
    consultedOthers: true,
    createdAt: "2025-10-10",
    resolutionDate: "2025-12-10",
    outcome: "correct",
    resolutionNote: "Good fit, continuing.",
  },
  {
    decision: "Split a large purchase across two credit cards after asking a friend who does personal finance for a living.",
    reasoning: "Friend's rationale made sense for the rewards math, moderately confident it's worth the extra tracking.",
    confidence: 65,
    category: "money",
    consultedOthers: true,
    createdAt: "2025-10-25",
    resolutionDate: "2025-11-25",
    outcome: "incorrect",
    resolutionNote: "Rewards math was right but tracking two statements was more annoying than expected.",
  },
  {
    decision: "Bring in a part-time contractor for the side project after posting the idea to a small founder group for feedback.",
    reasoning: "Group feedback was mixed but leaned positive. Moderately confident it's worth trying for a month.",
    confidence: 63,
    category: "side-project",
    consultedOthers: true,
    createdAt: "2025-11-10",
    resolutionDate: "2025-12-25",
    outcome: "incorrect",
    resolutionNote: "Contractor wasn't the right skill match, ended the trial early.",
  },
  {
    decision: "Have a direct conversation with a friend about a recurring tension, after getting advice from another friend on how to phrase it.",
    reasoning: "Advice helped me feel more prepared, but still genuinely unsure how it'll land.",
    confidence: 60,
    category: "relationships",
    consultedOthers: true,
    createdAt: "2025-11-22",
    resolutionDate: "2025-12-05",
    outcome: "correct",
    resolutionNote: "Went better than expected, cleared the air.",
  },
  {
    decision: "Switch primary bank after comparing notes with two coworkers who'd already switched.",
    reasoning: "Their experience was positive, reasonably confident based on that plus my own research.",
    confidence: 70,
    category: "money",
    consultedOthers: true,
    createdAt: "2025-12-05",
    resolutionDate: "2026-01-05",
    outcome: "correct",
    resolutionNote: "Smooth switch, better rates as expected.",
  },
  {
    decision: "Adjust the side project's pricing tier after a call with two early users.",
    reasoning: "Users gave clear, specific feedback. Reasonably confident the new tier fits better, though sample size is small.",
    confidence: 66,
    category: "side-project",
    consultedOthers: true,
    createdAt: "2025-12-20",
    resolutionDate: "2026-01-20",
    outcome: "correct",
    resolutionNote: "Conversion improved modestly.",
  },
];

// Bucket E: low confidence (30-50) coin-flip decisions. Roughly matches
// stated confidence — genuinely uncertain calls that resolved about half right.
const bucketE: SeedEntry[] = [
  {
    decision: "Bet that the side project's next feature idea will land with users.",
    reasoning: "Honestly a guess. Could easily be wrong.",
    confidence: 45,
    category: "side-project",
    consultedOthers: false,
    createdAt: "2025-09-14",
    resolutionDate: "2025-10-14",
    outcome: "incorrect",
    resolutionNote: "Users didn't care much, low usage.",
  },
  {
    decision: "Guess that a stalled friendship will pick back up on its own without me reaching out.",
    reasoning: "No real basis for this, just hoping.",
    confidence: 35,
    category: "relationships",
    consultedOthers: false,
    createdAt: "2025-10-01",
    resolutionDate: "2026-01-01",
    outcome: "incorrect",
    resolutionNote: "Never picked back up, would've needed to reach out.",
  },
  {
    decision: "Try a new workout split with no real evidence it'll suit me.",
    reasoning: "Coin flip, really. Might work, might not.",
    confidence: 50,
    category: "health",
    consultedOthers: false,
    createdAt: "2025-10-22",
    resolutionDate: "2025-11-22",
    outcome: "correct",
    resolutionNote: "Actually stuck and felt good.",
  },
  {
    decision: "Guess that a volatile stock I already hold a small position in will be up in three months.",
    reasoning: "No real edge here, pure speculation.",
    confidence: 40,
    category: "money",
    consultedOthers: false,
    createdAt: "2025-11-01",
    resolutionDate: "2026-02-01",
    outcome: "incorrect",
    resolutionNote: "Down slightly, as likely as not going in.",
  },
  {
    decision: "Bet that switching commute times will meaningfully cut travel time.",
    reasoning: "Uncertain, traffic patterns are unpredictable.",
    confidence: 48,
    category: "daily",
    consultedOthers: false,
    createdAt: "2025-11-18",
    resolutionDate: "2025-12-02",
    outcome: "correct",
    resolutionNote: "Shaved off a real chunk of time.",
  },
  {
    decision: "Guess whether a cold outreach email for the side project will get a response.",
    reasoning: "Total coin flip, no prior relationship to go on.",
    confidence: 30,
    category: "side-project",
    consultedOthers: false,
    createdAt: "2025-12-03",
    resolutionDate: "2025-12-17",
    outcome: "incorrect",
    resolutionNote: "No response.",
  },
];

// A handful of still-open entries so the journal doesn't look purely
// retrospective — these have no outcome yet.
type OpenSeedEntry = Omit<SeedEntry, "outcome" | "resolutionNote">;

const openEntries: OpenSeedEntry[] = [
  // Two of these are already past the date they said they'd know. That is
  // deliberate: an unresolved journal quietly stops measuring anything, so the
  // app has to open on that state rather than on a tidy one — and the recall
  // question at resolution is unreachable on a fresh clone if nothing is due.
  {
    decision: "Turn down the contract work and keep the evenings free for the side project.",
    reasoning:
      "I've thought about this a lot. The money is good but the project only moves when I have real time for it, and I don't need to talk this one through — I know how I work.",
    confidence: 84,
    category: "side-project",
    consultedOthers: false,
    createdAt: "2026-06-02",
    resolutionDate: "2026-08-02",
  },
  {
    decision: "Move the weekly team sync to async written updates, after floating it with two teammates.",
    reasoning:
      "Both of them said the meeting rarely earns its hour. Reasonably confident this sticks, though I've seen async updates quietly die before.",
    confidence: 66,
    category: "career",
    consultedOthers: true,
    createdAt: "2026-06-20",
    resolutionDate: "2026-08-15",
  },
  {
    decision: "Apply for the internal transfer to the data team without discussing it with my current manager yet.",
    reasoning: "I've thought about this a lot and I'm confident it's the right move. Haven't looped in my manager yet.",
    confidence: 89,
    category: "career",
    consultedOthers: false,
    createdAt: "2026-07-10",
    resolutionDate: "2026-10-10",
  },
  {
    decision: "Increase the side project's ad spend after a conversation with a growth marketer friend.",
    reasoning: "Friend walked through the unit economics with me and it checks out. Reasonably confident.",
    confidence: 68,
    category: "side-project",
    consultedOthers: true,
    createdAt: "2026-08-01",
    resolutionDate: "2026-09-15",
  },
  {
    decision: "Start a monthly budget review with my partner instead of handling money separately.",
    reasoning: "We talked about it together and both want to try it. Fairly confident but new territory for us.",
    confidence: 72,
    category: "money",
    consultedOthers: true,
    createdAt: "2026-08-12",
    resolutionDate: "2026-09-30",
  },
];

/**
 * The date this fictional journal adopted two practices that did not exist when
 * it was started: writing down a falsification criterion in advance, and being
 * asked to recall your own confidence before the stored figure is shown.
 *
 * Backdating both to the beginning would be tidier and less honest. Adopting a
 * practice partway through is what actually happens, and it leaves the app
 * showing the "no criterion recorded" state for the earlier entries — which is
 * a state real users will spend a long time looking at.
 */
const PRACTICE_ADOPTED = "2025-12-01";

/**
 * Preregistered criteria for the decisions made after that date. Keyed by the
 * opening of the decision text so the pairing stays obvious when either side is
 * edited.
 */
const FALSIFIERS: [string, string][] = [
  [
    "Try a new productivity app",
    "I'm back in my old notes setup within a month, or I'm still migrating things three weeks from now.",
  ],
  [
    "Sign up for a 10k",
    "I finish the 10k feeling I'd left a lot in the tank, or I pick up an injury training for it anyway.",
  ],
  [
    "Guess whether a cold outreach email",
    "No reply of any kind inside two weeks — a one-line brush-off still counts as a reply.",
  ],
  [
    "Switch primary bank",
    "Anything still pointing at the old account sixty days from now, or a fee I didn't expect in the first two statements.",
  ],
  [
    "Negotiate my own salary bump",
    "I find out afterwards that the band topped out well above what I asked for.",
  ],
  [
    "Skip renewing a niche subscription",
    "I go looking for it more than twice before the renewal date would have come round again.",
  ],
  [
    "Switch my retirement contributions",
    "I have to sell any of it inside eighteen months to make the deposit work.",
  ],
  [
    "Raise a small pre-seed round",
    "We're raising again inside nine months, or the round takes more than a quarter to close.",
  ],
  [
    "Adjust the side project's pricing tier",
    "Net revenue is flat or down two months after the change, or churn rises among the users already paying.",
  ],
  [
    "Turn down the contract work",
    "The side project gets less of my time over these two months than it did before, or I turn down the money and don't ship anything with it.",
  ],
  [
    "Move the weekly team sync",
    "Written updates stop landing within a month, or we quietly put the meeting back.",
  ],
  [
    "Apply for the internal transfer",
    "My manager hears about it from someone else before I tell them, or the transfer stalls because I skipped that conversation.",
  ],
  [
    "Increase the side project's ad spend",
    "Cost per signup rises two weeks running, or payback stretches past four months.",
  ],
  [
    "Start a monthly budget review",
    "We miss two reviews in a row, or the first one turns into an argument neither of us wants to repeat.",
  ],
];

function falsifierFor(decision: string, createdAt: string): string | null {
  if (createdAt < PRACTICE_ADOPTED) return null;
  const match = FALSIFIERS.find(([prefix]) => decision.startsWith(prefix));
  if (!match) {
    throw new Error(`No preregistered criterion written for: ${decision}`);
  }
  return match[1];
}

/**
 * Synthetic recalled confidences.
 *
 * These are invented, like everything else in this file, so they are built to
 * be *weak* on purpose. It would be trivial to plant a dramatic hindsight
 * effect here and let the app announce it, and that would be worthless: the
 * finding would have been authored rather than found. The drift below is a few
 * points either way against nine points of noise, which at this sample size
 * lands inside what chance produces — so the dashboard reports it as
 * inconclusive, which is the correct behaviour and the thing worth showing.
 *
 * Deterministic, so the seeded journal is byte-identical on every machine and
 * the hash chain can be compared across clones.
 */
function recalledConfidence(
  decision: string,
  stated: number,
  outcome: "correct" | "incorrect"
): number {
  const digest = createHash("sha256").update(decision).digest();
  // Irwin-Hall: twelve uniforms summed, minus six, is very close to a standard
  // normal deviate. Scaled to a standard deviation of nine points, which is
  // roughly how badly people misremember a number they wrote down months ago.
  const irwinHall =
    Array.from({ length: 12 }, (_, i) => digest[i] / 255).reduce((a, u) => a + u, 0) - 6;
  const noise = irwinHall * 9;
  const drift = outcome === "correct" ? 3 : -2;
  return Math.max(0, Math.min(100, Math.round(stated + drift + noise)));
}

async function main() {
  // Order matters: Entry rows are a projection of Event, so the log is what
  // actually gets rebuilt and the table follows from it.
  await prisma.entry.deleteMany();
  await prisma.event.deleteMany();

  const resolved = [...bucketA, ...bucketB, ...bucketC, ...bucketD, ...bucketE];
  const events: NewEvent[] = [];
  let id = 0;
  const nextId = () => `seed-${String(++id).padStart(3, "0")}`;

  const isResolved = (e: SeedEntry | OpenSeedEntry): e is SeedEntry => "outcome" in e;

  for (const e of [...resolved, ...openEntries] as (SeedEntry | OpenSeedEntry)[]) {
    const entryId = nextId();
    events.push({
      type: "DecisionMade",
      entryId,
      recordedAt: new Date(e.createdAt),
      payload: {
        decision: e.decision,
        reasoning: e.reasoning,
        confidence: e.confidence,
        category: e.category,
        consultedOthers: e.consultedOthers,
        resolutionDate: new Date(e.resolutionDate).toISOString(),
        falsifier: falsifierFor(e.decision, e.createdAt),
      },
    });

    if (!isResolved(e)) continue;

    // The recall question only exists for outcomes recorded after the practice
    // was adopted — earlier resolutions simply have no answer, and a missing
    // measurement beats an invented one.
    const asked = e.resolutionDate >= PRACTICE_ADOPTED;
    if (asked) {
      // A minute before the outcome, because that ordering is the evidence: the
      // log shows the recall was committed while the answer was still sealed.
      events.push({
        type: "ConfidenceRecalled",
        entryId,
        recordedAt: new Date(new Date(e.resolutionDate).getTime() - 60_000),
        payload: {
          recalledConfidence: recalledConfidence(e.decision, e.confidence, e.outcome),
          blind: true,
        },
      });
    }

    events.push({
      type: "OutcomeRecorded",
      entryId,
      recordedAt: new Date(e.resolutionDate),
      payload: {
        outcome: e.outcome,
        resolutionNote: e.resolutionNote,
        adjudication: "self",
      },
    });
  }

  // Append in the order the events actually happened, so the chain reads as a
  // history rather than as the order this file happens to list things in.
  events.sort((a, b) => (a.recordedAt as Date).getTime() - (b.recordedAt as Date).getTime());

  const { head } = await append(events, prisma);

  const withCriteria = events.filter(
    (e): e is NewEvent<"DecisionMade"> =>
      e.type === "DecisionMade" && e.payload.falsifier !== null
  ).length;
  const withRecall = events.filter((e) => e.type === "ConfidenceRecalled").length;

  console.log(
    `Seeded ${resolved.length} resolved and ${openEntries.length} open entries ` +
      `as ${events.length} events.`
  );
  console.log(`  ${withCriteria} carry a preregistered criterion, ${withRecall} a recalled confidence.`);
  console.log(`  chain head ${head}`);

  await seedCapturedAnalysis();
}

// If a previous real analysis run was captured (npm run capture:analysis), load
// it so a fresh clone opens on a dashboard that already shows model output.
// Nothing here fabricates insights — it only replays a run that actually happened.
async function seedCapturedAnalysis() {
  const file = path.join(process.cwd(), "prisma", "seed-analysis.json");

  await prisma.analysis.deleteMany();

  if (!fs.existsSync(file)) {
    console.log("No captured analysis found — run one from the dashboard to fill that panel.");
    return;
  }

  const captured = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(captured.insights) || captured.insights.length === 0) {
    console.log("Captured analysis file has no insights — skipping.");
    return;
  }

  await prisma.analysis.create({
    data: {
      insights: JSON.stringify(captured.insights),
      entriesAnalyzed: captured.entriesAnalyzed ?? (await prisma.entry.count({ where: { status: "resolved" } })),
    },
  });

  console.log(`Loaded ${captured.insights.length} captured insights.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
