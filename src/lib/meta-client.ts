import OpenAI from "openai";
import { parseImageStream, recordsOfKind, decodeMaskToSVGPath } from "@meta-sam/parser";
import type { ResponsesEvent } from "@meta-sam/parser";
import type { SegmentationMatch } from "./store";

const BASE_URL = "https://api.meta.ai/v1";
const SAM_MODEL = "sam-3.1";
const TEXT_MODEL = process.env.META_TEXT_MODEL ?? "muse-spark-1.3";

function getClient(): OpenAI {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) {
    throw new Error(
      "MODEL_API_KEY is not set. Copy .env.example to .env.local and add your Meta Model API key.",
    );
  }
  return new OpenAI({ baseURL: BASE_URL, apiKey });
}

/**
 * Runs SAM 3.1 against one image for a short noun-phrase prompt and returns
 * every match, best confidence first. The mask's own raster box (`bounds`)
 * is in full-image pixel coordinates; `maskWidth`/`maskHeight` describe the
 * mask's own (usually smaller) raster, to be scaled into those bounds.
 */
export async function segmentImage(
  promptText: string,
  imageDataUrl: string,
): Promise<SegmentationMatch[]> {
  const client = getClient();

  const events = await client.responses.create({
    model: SAM_MODEL,
    input: [
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: promptText },
          { type: "input_image", image_url: imageDataUrl },
        ],
      },
    ],
    stream: true,
    metadata: { mask_encoding: "one_bit", include_confidence: "true" },
    // The Responses SDK types don't yet model SAM's metadata field; the
    // request shape itself is exactly what the Media segmentation guide uses.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const parsed = parseImageStream(events as unknown as AsyncIterable<ResponsesEvent>);
  const result = await parsed.finalResult;

  const boxes = recordsOfKind(result.records, "box");
  const masks = recordsOfKind(result.records, "mask");
  const maskByObjectId = new Map(masks.map((m) => [m.objectId, m]));

  const matches: SegmentationMatch[] = boxes.map((b) => {
    const maskRecord = maskByObjectId.get(b.objectId);
    let maskSvgPath: string | undefined;
    let maskWidth: number | undefined;
    let maskHeight: number | undefined;
    if (maskRecord) {
      try {
        maskSvgPath = decodeMaskToSVGPath(maskRecord.mask);
        maskWidth = maskRecord.mask.width;
        maskHeight = maskRecord.mask.height;
      } catch {
        // Mask failed to decode; the box alone is still useful proof.
      }
    }
    return {
      objectId: b.objectId,
      left: b.left,
      top: b.top,
      right: b.right,
      bottom: b.bottom,
      confidence: b.confidence,
      maskSvgPath,
      maskWidth,
      maskHeight,
    };
  });

  matches.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  return matches;
}

export interface AppealDraft {
  evidenceSupportsWorker: boolean;
  appealStrength: number;
  recommendedAction: "submit_now" | "add_more_evidence" | "escalate_to_helpline";
  title: string;
  appealText: string;
}

export interface DraftInput {
  platformClaim: string;
  defenseLabel: string;
  submitTo: string;
  matched: boolean;
  confidence: number | null;
  boxAreaFraction: number | null;
  transcript: string | null;
  similarRecentNearby: boolean;
  authenticityNote: string;
}

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    evidenceSupportsWorker: {
      type: "boolean",
      description:
        "True only if the vision detector genuinely confirms the worker's stated defense.",
    },
    appealStrength: {
      type: "integer",
      description:
        "1 (weak, little evidence) to 5 (strong, clear photographic proof) -- how convincing this appeal is likely to be.",
    },
    recommendedAction: {
      type: "string",
      enum: ["submit_now", "add_more_evidence", "escalate_to_helpline"],
      description:
        "submit_now if evidence is strong; add_more_evidence if the detector found no match or confidence is low; escalate_to_helpline if this looks like a safety issue, not just a delivery dispute.",
    },
    title: { type: "string", description: "A short appeal title, under 12 words." },
    appealText: {
      type: "string",
      description:
        "A calm, factual, first-person appeal a gig worker can submit to platform support as-is, in English.",
    },
  },
  required: [
    "evidenceSupportsWorker",
    "appealStrength",
    "recommendedAction",
    "title",
    "appealText",
  ],
};

/**
 * Cross-checks the worker's stated defense against what SAM 3.1 actually
 * found in their evidence photo, then drafts a platform-ready appeal and a
 * recommended next action. Uses reasoning_effort "minimal" deliberately --
 * this is a short classification + drafting task, and dialing reasoning
 * down cuts token spend roughly 3x with no quality loss we could detect,
 * which matters under a fixed API budget.
 */
export async function draftAppeal(input: DraftInput): Promise<AppealDraft> {
  const client = getClient();

  const evidenceLines = [
    `Platform's complaint against the worker: ${input.platformClaim}`,
    `Worker's stated defense: ${input.defenseLabel}`,
    `This appeal would go to: ${input.submitTo}`,
    input.matched
      ? `SAM 3.1 visual detector: MATCH found supporting the defense, confidence ${input.confidence?.toFixed(2)}, covering about ${((input.boxAreaFraction ?? 0) * 100).toFixed(0)}% of the frame.`
      : "SAM 3.1 visual detector: NO MATCH found -- the photo does not clearly show what the worker claims.",
    input.transcript
      ? `Worker's voice note (transcribed, may be in a regional language): "${input.transcript}"`
      : "No voice note was provided.",
    input.similarRecentNearby
      ? "Note: another worker filed the same kind of defense nearby in the last 24 hours -- this may be a localized, verifiable pattern (e.g. flooding, a blocked road). Mention this as corroborating context, not as a duplicate to dismiss."
      : "No similar recent nearby case was found.",
    `Photo metadata check (independent of what the image shows): ${input.authenticityNote}.`,
  ];

  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    reasoning_effort: "minimal",
    messages: [
      {
        role: "system",
        content:
          "You are a dispute-evidence assistant for gig delivery and rideshare workers in India appealing an unfair platform penalty. " +
          "You are given deterministic evidence from a vision model, not raw pixels -- trust it over the worker's wording. " +
          "If the detector found no match, set evidenceSupportsWorker to false, keep appealStrength low, and recommend add_more_evidence rather than inventing visual detail you were not given. " +
          "Weigh the photo metadata check too: missing camera metadata, a stale timestamp, or a GPS mismatch are soft signals the photo may not be a genuine, fresh, on-location photo (it could be a screenshot, a reused old photo, or an AI-generated image) -- note this honestly in the appeal and lower appealStrength accordingly, but don't accuse the worker of fraud outright, since messaging apps also strip this metadata from real photos. " +
          "If the stated issue sounds like a safety incident (accident, injury, vehicle damage) rather than a routine delivery delay, recommend escalate_to_helpline. " +
          "Keep the appeal calm, factual, and first-person, written for the worker to submit as-is. Reply only with the given JSON schema.",
      },
      { role: "user", content: evidenceLines.join("\n") },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "AppealDraft", schema: DRAFT_SCHEMA },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Muse Spark returned an empty draft.");
  return JSON.parse(content) as AppealDraft;
}

/**
 * Transcribes a short recorded voice note (mono 16-bit PCM WAV) with Muse
 * Voice Transcribe. Returns null on any failure -- a missing transcript
 * should never block filing a report that otherwise has good photo evidence.
 */
export async function transcribeVoiceNote(wav: Buffer): Promise<string | null> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) return null;

  try {
    const form = new FormData();
    form.append(
      "request",
      new Blob(
        [JSON.stringify({ mode: "PUSH_TO_TALK", model: "muse-voice-transcribe-1.0", audioEncoding: "WAV" })],
        { type: "application/json" },
      ),
    );
    const audioBytes = new Uint8Array(wav);
    form.append("audio", new Blob([audioBytes], { type: "audio/wav" }), "note.wav");

    const res = await fetch(`${BASE_URL}/asr/transcribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) {
      console.error("transcribeVoiceNote failed:", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { transcript?: string };
    return data.transcript?.trim() || null;
  } catch (err) {
    console.error("transcribeVoiceNote error:", err);
    return null;
  }
}
