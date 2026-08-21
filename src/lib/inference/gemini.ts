import { GoogleGenAI } from "@google/genai";
import { toGeminiSchema, type Backend, type StructuredRequest } from "./types";

/**
 * Google's hosted models. Fast and good, and it means the full text of every
 * resolved entry leaves this machine — so nothing selects this backend on your
 * behalf. See `chooseBackend`.
 */

export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

export function geminiBackend(): Backend {
  const model = process.env.DOXA_MODEL ?? DEFAULT_GEMINI_MODEL;

  return {
    id: "gemini",
    label: "Google Gemini",
    model,
    local: false,

    async available() {
      return Boolean(process.env.GEMINI_API_KEY);
    },

    async generate({ system, prompt, schema }: StructuredRequest) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseSchema: toGeminiSchema(schema),
        },
      });

      const text = response.text;
      if (!text) throw new Error("The model returned an empty response.");
      return text;
    },
  };
}
