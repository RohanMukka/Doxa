/**
 * Lists the models your GEMINI_API_KEY can actually reach, so you don't have to
 * guess a name. Free-tier availability moves around; whatever prints here is
 * what you can put in DOXA_MODEL.
 *
 *   npm run models
 */
import { GoogleGenAI } from "@google/genai";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in .env — get one at https://aistudio.google.com/apikey");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const pager = await ai.models.list();

  const names: string[] = [];
  for await (const model of pager) {
    if (model.name) names.push(model.name.replace(/^models\//, ""));
  }

  const generative = names.filter((n) => n.startsWith("gemini"));
  console.log(`${generative.length} Gemini models available to this key:\n`);
  for (const n of generative.sort()) console.log(`  ${n}`);
  console.log(`\nPut one in .env as DOXA_MODEL. Flash-class models are the free-tier ones.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
