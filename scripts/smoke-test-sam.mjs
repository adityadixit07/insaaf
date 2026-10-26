// One-off smoke test against the real Meta Model API to confirm the
// exact shape of SAM 3.1 responses before wiring the app around them.
// Usage: MODEL_API_KEY=... node scripts/smoke-test-sam.mjs
import OpenAI from "openai";
import { readFileSync } from "node:fs";
import { parseImageStream, recordsOfKind, decodeMaskToSVGPath } from "@meta-sam/parser";

const apiKey = process.env.MODEL_API_KEY;
if (!apiKey) {
  console.error("Set MODEL_API_KEY first");
  process.exit(1);
}

const client = new OpenAI({ baseURL: "https://api.meta.ai/v1", apiKey });

const imagePath = process.argv[2] ?? "/tmp/test_pothole.jpg";
const b64 = readFileSync(imagePath).toString("base64");
const imageUrl = `data:image/jpeg;base64,${b64}`;

const events = await client.responses.create({
  model: "sam-3.1",
  input: [
    {
      type: "message",
      role: "user",
      content: [
        { type: "input_text", text: "dark jagged patch" },
        { type: "input_image", image_url: imageUrl },
      ],
    },
  ],
  stream: true,
  metadata: { mask_encoding: "one_bit", include_confidence: "true" },
});

const parsed = parseImageStream(events);
const result = await parsed.finalResult;

console.log("outcome:", JSON.stringify(result.outcome));
console.log("diagnostics:", JSON.stringify(result.diagnostics));
console.log("raw record count:", result.records.length);

const boxes = recordsOfKind(result.records, "box");
const masks = recordsOfKind(result.records, "mask");

console.log("\n--- BOX records ---");
for (const b of boxes) {
  console.log(JSON.stringify(b, null, 2));
}

console.log("\n--- MASK records (keys only, payload omitted) ---");
for (const m of masks) {
  const { mask, ...rest } = m;
  console.log(JSON.stringify(rest, null, 2));
  console.log("mask keys:", mask ? Object.keys(mask) : mask);
  try {
    const svg = decodeMaskToSVGPath(mask);
    console.log("svg path length:", svg.length, "sample:", svg.slice(0, 80));
  } catch (e) {
    console.log("decode error:", e.message);
  }
}
