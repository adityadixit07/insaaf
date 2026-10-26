import { NextResponse } from "next/server";
import { getDisputeType } from "@/lib/disputes";
import { draftAppeal, segmentImage, transcribeVoiceNote } from "@/lib/meta-client";
import { addCase, findSimilarRecentCase } from "@/lib/store";

async function fileToDataUrl(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || "image/jpeg"};base64,${buf.toString("base64")}`;
}

export async function POST(request: Request) {
  const form = await request.formData();

  const disputeTypeId = String(form.get("disputeTypeId") ?? "");
  const disputeType = getDisputeType(disputeTypeId);
  if (!disputeType) {
    return NextResponse.json({ error: "Unknown dispute type." }, { status: 400 });
  }

  const image = form.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "A photo is required." }, { status: 400 });
  }

  const lat = Number(form.get("lat"));
  const lng = Number(form.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "A location is required." }, { status: 400 });
  }

  const imageWidth = Number(form.get("imageWidth")) || 0;
  const imageHeight = Number(form.get("imageHeight")) || 0;

  const audio = form.get("audio");

  try {
    const imageDataUrl = await fileToDataUrl(image);

    const [matches, transcript, similar] = await Promise.all([
      segmentImage(disputeType.samPrompt, imageDataUrl),
      audio instanceof File
        ? transcribeVoiceNote(Buffer.from(await audio.arrayBuffer()))
        : Promise.resolve(null),
      findSimilarRecentCase(disputeType.id, lat, lng),
    ]);

    const best = matches[0] ?? null;
    const boxAreaFraction =
      best && imageWidth > 0 && imageHeight > 0
        ? ((best.right - best.left) * (best.bottom - best.top)) / (imageWidth * imageHeight)
        : null;

    const draft = await draftAppeal({
      platformClaim: disputeType.platformClaim,
      defenseLabel: disputeType.label,
      submitTo: disputeType.submitTo,
      matched: best !== null,
      confidence: best?.confidence ?? null,
      boxAreaFraction,
      transcript,
      similarRecentNearby: similar !== null,
    });

    const dispute = await addCase({
      disputeTypeId: disputeType.id,
      platformClaim: disputeType.platformClaim,
      defenseLabel: disputeType.label,
      submitTo: disputeType.submitTo,
      lat,
      lng,
      imageDataUrl,
      imageWidth,
      imageHeight,
      match: best,
      evidenceSupportsWorker: draft.evidenceSupportsWorker,
      appealStrength: draft.appealStrength,
      recommendedAction: draft.recommendedAction,
      title: draft.title,
      appealText: draft.appealText,
      transcript,
      similarRecentNearbyId: similar?.id ?? null,
      status: draft.evidenceSupportsWorker ? "ready_to_submit" : "needs_more_evidence",
    });

    return NextResponse.json({ case: dispute });
  } catch (err) {
    console.error("file-case route failed:", err);
    const message = err instanceof Error ? err.message : "Verification failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
