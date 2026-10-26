// One-off smoke test for Muse Spark structured-output drafting.
// Usage: MODEL_API_KEY=... node scripts/smoke-test-spark.mjs
import OpenAI from "openai";

const apiKey = process.env.MODEL_API_KEY;
if (!apiKey) {
  console.error("Set MODEL_API_KEY first");
  process.exit(1);
}

const client = new OpenAI({ baseURL: "https://api.meta.ai/v1", apiKey });

const response = await client.chat.completions.create({
  model: "muse-spark-1.3",
  reasoning_effort: "minimal",
  messages: [
    {
      role: "system",
      content:
        "You draft formal civic complaints for Indian municipal bodies from structured evidence. Reply only with the JSON schema given.",
    },
    {
      role: "user",
      content:
        "Category: pothole. Detector found a match with confidence 0.74, bounding box covers about 10% of the frame. Citizen note (transcribed): 'yeh gaddha bahut din se hai, bike slip ho gaya'. Draft the complaint.",
    },
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "ComplaintDraft",
      schema: {
        type: "object",
        properties: {
          categoryConfirmed: { type: "boolean" },
          severity: { type: "integer", description: "1 (minor) to 5 (severe)" },
          department: { type: "string" },
          title: { type: "string" },
          complaintText: { type: "string" },
        },
        required: [
          "categoryConfirmed",
          "severity",
          "department",
          "title",
          "complaintText",
        ],
      },
    },
  },
});

console.log(JSON.stringify(response.choices[0].message, null, 2));
console.log("\nusage:", JSON.stringify(response.usage));
