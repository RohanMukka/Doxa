import type { Backend, StructuredRequest } from "./types";

/**
 * A model running on this machine, through Ollama.
 *
 * This is the backend the product's privacy claim actually depends on. A
 * decision journal holds the most honest things you will write about yourself,
 * and the analysis is the one feature that wants to read all of it at once —
 * so the default has to be the one where none of it moves.
 *
 * The cost is real and worth naming: a 7B model on a laptop reasons less well
 * over forty entries than a hosted frontier model does. That is the trade, and
 * it should be the user's to make rather than one made quietly for them.
 */

export const DEFAULT_OLLAMA_MODEL = "llama3.1:8b";
const DEFAULT_HOST = "http://127.0.0.1:11434";

/** Short, because this runs on page load to decide what to offer. */
const PROBE_TIMEOUT_MS = 800;

function host() {
  return process.env.OLLAMA_HOST ?? DEFAULT_HOST;
}

export function ollamaBackend(): Backend {
  const model = process.env.DOXA_LOCAL_MODEL ?? DEFAULT_OLLAMA_MODEL;

  return {
    id: "ollama",
    label: "Ollama, on this machine",
    model,
    local: true,

    async available() {
      try {
        const response = await fetch(`${host()}/api/tags`, {
          signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        });
        if (!response.ok) return false;

        // Reachable isn't enough — the configured model has to be pulled, or
        // the run fails later with a much less useful message.
        const body = (await response.json()) as { models?: { name?: string }[] };
        return (body.models ?? []).some(
          (m) => m.name === model || m.name?.split(":")[0] === model.split(":")[0]
        );
      } catch {
        return false;
      }
    },

    async generate({ system, prompt, schema }: StructuredRequest) {
      const response = await fetch(`${host()}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          // Ollama takes a JSON Schema directly and constrains decoding to it,
          // which is the same guarantee Gemini's responseSchema gives.
          format: schema,
          options: { temperature: 0.4 },
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Ollama answered ${response.status}. Is \`ollama serve\` running, and has \`${model}\` been pulled?`
        );
      }

      const body = (await response.json()) as { message?: { content?: string } };
      const text = body.message?.content;
      if (!text) throw new Error("The local model returned an empty response.");
      return text;
    },
  };
}
