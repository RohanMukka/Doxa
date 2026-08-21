/**
 * Calibration needs resolved predictions, and life decisions take months to
 * resolve — so a new journal is useless for a year.
 *
 * The way out is that calibration is a general skill, not a per-topic one: the
 * habit of saying 90% when you mean 70% shows up on trivia as readily as on
 * career moves. So you can learn your own bias on predictions that resolve in
 * days, then carry that baseline into the decisions that actually matter.
 *
 * These are deliberately short-horizon and self-verifiable — no waiting, no
 * ambiguity about whether it came true.
 */
export type Starter = {
  decision: string;
  category: string;
  /** Days from now this can realistically be settled. */
  horizonDays: number;
};

export const STARTERS: Starter[] = [
  {
    decision: "I'll finish the task I keep postponing before the end of this week.",
    category: "self",
    horizonDays: 7,
  },
  {
    decision: "The thing I'm dreading this week will go better than I expect.",
    category: "self",
    horizonDays: 7,
  },
  {
    decision: "I'll stick to the habit I started for all seven of the next seven days.",
    category: "self",
    horizonDays: 7,
  },
  {
    decision: "The person I'm waiting on will reply within three days.",
    category: "other people",
    horizonDays: 3,
  },
  {
    decision: "My estimate for how long my current project takes is within 20% of the truth.",
    category: "work",
    horizonDays: 14,
  },
  {
    decision: "I'll spend less this week than I did last week.",
    category: "money",
    horizonDays: 7,
  },
  {
    decision: "The decision I made last month still looks right to me in two weeks.",
    category: "self",
    horizonDays: 14,
  },
  {
    decision: "I'll get through my planned workouts this week without skipping one.",
    category: "health",
    horizonDays: 7,
  },
];

/** A yyyy-mm-dd string this many days out, built in local time. */
export function horizonDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
