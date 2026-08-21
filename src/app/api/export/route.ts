import { prisma } from "@/lib/prisma";
import {
  accuracyFor,
  averageConfidence,
  brierScore,
  byCategory,
  calibrationCurve,
  calibrationGap,
  expectedCalibrationError,
} from "@/lib/calibration";

export const dynamic = "force-dynamic";

const COLUMNS = [
  "id",
  "decision",
  "reasoning",
  "confidence",
  "category",
  "consultedOthers",
  "createdAt",
  "resolutionDate",
  "status",
  "resolvedAt",
  "outcome",
  "resolutionNote",
] as const;

/** RFC 4180: wrap in quotes, double any quote inside. */
function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const s = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const entries = await prisma.entry.findMany({ orderBy: { createdAt: "asc" } });

  if (format === "csv") {
    const rows = [
      COLUMNS.join(","),
      ...entries.map((e) =>
        COLUMNS.map((c) => csvCell((e as Record<string, unknown>)[c])).join(",")
      ),
    ];
    return new Response(rows.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="doxa-${stamp()}.csv"`,
      },
    });
  }

  const resolved = entries.filter((e) => e.status === "resolved");

  const payload = {
    exportedAt: new Date().toISOString(),
    entryCount: entries.length,
    // Recomputable from the entries, but included so an export is readable on
    // its own without reimplementing the maths.
    metrics: {
      resolved: resolved.length,
      statedConfidence: averageConfidence(resolved),
      accuracy: accuracyFor(resolved),
      calibrationGap: calibrationGap(resolved),
      expectedCalibrationError: expectedCalibrationError(resolved),
      brierScore: brierScore(resolved),
      buckets: calibrationCurve(resolved),
      categories: byCategory(resolved),
    },
    entries,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="doxa-${stamp()}.json"`,
    },
  });
}
