/**
 * Where the reasoning analysis actually runs.
 *
 * This exists because of a contradiction the app used to carry: the footer
 * promised your journal never leaves your machine, and the analysis posted
 * every resolved entry — the reasoning text, the part you'd least want read —
 * to Google. One of those had to give. Making the backend pluggable is the
 * first step to the honest version, where the local one is the default and the
 * remote one is something you choose on purpose.
 */

export type JsonSchema = {
  type: "object" | "array" | "string" | "number" | "boolean";
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
};

export type StructuredRequest = {
  system: string;
  prompt: string;
  /** The shape the model must return. Each backend states it in its own dialect. */
  schema: JsonSchema;
};

export type BackendId = "ollama" | "gemini";

export type Backend = {
  id: BackendId;
  label: string;
  model: string;
  /**
   * Whether running this keeps the journal on this machine. The single most
   * important property here, and the one the interface has to surface.
   */
  local: boolean;
  /** Cheap reachability check. Never throws; a backend that can't answer is absent. */
  available(): Promise<boolean>;
  /** Returns raw JSON text, still to be parsed and validated by the caller. */
  generate(request: StructuredRequest): Promise<string>;
};

/**
 * Gemini takes the same schema with upper-cased type names, and honours
 * `propertyOrdering` when generating — a mismatch between that and the order
 * the prompt describes tends to produce malformed output, so it is derived from
 * the declaration order rather than written out by hand a second time.
 */
export function toGeminiSchema(schema: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = { type: schema.type.toUpperCase() };

  if (schema.description) out.description = schema.description;
  if (schema.items) out.items = toGeminiSchema(schema.items);

  if (schema.properties) {
    const keys = Object.keys(schema.properties);
    out.properties = Object.fromEntries(
      keys.map((k) => [k, toGeminiSchema(schema.properties![k])])
    );
    out.propertyOrdering = keys;
  }

  if (schema.required) out.required = schema.required;

  return out;
}
