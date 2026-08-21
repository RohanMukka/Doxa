import { geminiBackend } from "./gemini";
import { ollamaBackend } from "./ollama";
import type { Backend, BackendId } from "./types";

export * from "./types";
export { geminiBackend } from "./gemini";
export { ollamaBackend } from "./ollama";

/**
 * Which backend runs, and — the part that matters — whether anything is allowed
 * to leave this machine.
 *
 * Kept pure so every path can be tested without a network. The single rule it
 * enforces: the remote backend is never selected by default, by fallback, or by
 * absence of a local one. It is reachable only when the caller has said yes to
 * this specific run.
 */

export type Availability = {
  localAvailable: boolean;
  cloudConfigured: boolean;
  /** Consent for *this run*. Never sticky, never inferred. */
  cloudConsented: boolean;
  /** DOXA_INFERENCE — "local" or "cloud". Anything else is treated as unset. */
  preference?: string;
};

export type Choice =
  | { ok: true; backend: BackendId; local: boolean }
  | { ok: false; reason: "no-local" | "cloud-not-consented" | "nothing-available"; error: string };

const INSTALL_HINT =
  "Install Ollama and run `ollama pull llama3.1:8b`, or choose to send this analysis to Google.";

export function chooseBackend(a: Availability): Choice {
  const preference = a.preference === "local" || a.preference === "cloud" ? a.preference : null;

  if (preference === "local") {
    if (a.localAvailable) return { ok: true, backend: "ollama", local: true };
    return {
      ok: false,
      reason: "no-local",
      error: `DOXA_INFERENCE is set to "local" but no local model is reachable. ${INSTALL_HINT}`,
    };
  }

  // Even an explicit preference for the cloud doesn't skip consent — the
  // setting says which backend you'd like, not that you've agreed to send your
  // journal off this machine.
  if (preference === "cloud") {
    if (!a.cloudConfigured) {
      return {
        ok: false,
        reason: "nothing-available",
        error: 'DOXA_INFERENCE is set to "cloud" but GEMINI_API_KEY is not set.',
      };
    }
    if (!a.cloudConsented) {
      return {
        ok: false,
        reason: "cloud-not-consented",
        error: "Sending your journal to Google needs a deliberate yes for this run.",
      };
    }
    return { ok: true, backend: "gemini", local: false };
  }

  // Unset: local wins whenever it can. Falling back to the cloud here is
  // exactly the silent decision this function exists to prevent.
  if (a.localAvailable) return { ok: true, backend: "ollama", local: true };

  if (a.cloudConsented && a.cloudConfigured) {
    return { ok: true, backend: "gemini", local: false };
  }

  if (a.cloudConfigured) {
    return {
      ok: false,
      reason: "cloud-not-consented",
      error: `No local model is reachable. ${INSTALL_HINT}`,
    };
  }

  return {
    ok: false,
    reason: "nothing-available",
    error: `No local model is reachable, and no GEMINI_API_KEY is set. ${INSTALL_HINT}`,
  };
}

export function backendFor(id: BackendId): Backend {
  return id === "ollama" ? ollamaBackend() : geminiBackend();
}

/** Probes what's actually reachable right now. */
export async function survey(cloudConsented = false): Promise<Availability> {
  const local = ollamaBackend();
  return {
    localAvailable: await local.available(),
    cloudConfigured: Boolean(process.env.GEMINI_API_KEY),
    cloudConsented,
    preference: process.env.DOXA_INFERENCE,
  };
}
