"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { DISPUTE_TYPES } from "@/lib/disputes";
import { WavRecorder } from "@/lib/wav-recorder";
import { AppealResult } from "@/components/AppealResult";
import type { DisputeCase } from "@/lib/store";

type LocationState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ready"; lat: number; lng: number }
  | { status: "error"; message: string };

export default function FilePage() {
  const [disputeTypeId, setDisputeTypeId] = useState(DISPUTE_TYPES[0].id);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DisputeCase | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<WavRecorder | null>(null);
  const latInputRef = useRef<HTMLInputElement>(null);
  const lngInputRef = useRef<HTMLInputElement>(null);

  const selected = DISPUTE_TYPES.find((d) => d.id === disputeTypeId)!;

  function applyManualLocation() {
    const lat = latInputRef.current?.valueAsNumber;
    const lng = lngInputRef.current?.valueAsNumber;
    if (lat != null && Number.isFinite(lat) && lng != null && Number.isFinite(lng)) {
      setLocation({ status: "ready", lat, lng });
    }
  }

  function onPickImage(file: File | null) {
    setImageFile(file);
    setImagePreview(null);
    setImageDims(null);
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImageDims({ w: img.naturalWidth, h: img.naturalHeight });
      setImagePreview(url);
    };
    img.src = url;
  }

  function useMyLocation() {
    setLocation({ status: "locating" });
    if (!navigator.geolocation) {
      setLocation({ status: "error", message: "Geolocation is not available in this browser." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({ status: "ready", lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setLocation({ status: "error", message: err.message }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function toggleRecording() {
    if (!recording) {
      recorderRef.current = new WavRecorder();
      await recorderRef.current.start();
      setRecording(true);
    } else {
      const blob = recorderRef.current?.stop();
      setRecording(false);
      if (blob) setAudioBlob(blob);
    }
  }

  async function submit() {
    setError(null);
    if (!imageFile || !imageDims) {
      setError("Add a photo first.");
      return;
    }
    if (location.status !== "ready") {
      setError("Share a location first.");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("disputeTypeId", disputeTypeId);
      form.append("image", imageFile);
      form.append("imageWidth", String(imageDims.w));
      form.append("imageHeight", String(imageDims.h));
      form.append("lat", String(location.lat));
      form.append("lng", String(location.lng));
      if (audioBlob) form.append("audio", audioBlob, "note.wav");

      const res = await fetch("/api/file-case", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed.");
      setResult(data.case as DisputeCase);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <main className="max-w-xl mx-auto px-4 py-10 space-y-6 w-full">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
            Case filed
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight">Here&apos;s your appeal</h1>
        </div>
        <AppealResult dispute={result} />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setImageFile(null);
              setImagePreview(null);
              setAudioBlob(null);
            }}
            className="btn-secondary px-4 py-2.5 text-sm"
          >
            File another case
          </button>
          <Link href="/cases" className="btn-primary px-4 py-2.5 text-sm">
            View my appeals
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-10 space-y-7 w-full">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">File a case</h1>
        <p className="text-sm text-muted mt-1">
          SAM 3.1 checks your evidence before Muse Spark writes anything, so your appeal is
          backed by what the photo actually shows.
        </p>
      </div>

      <div className="space-y-2.5">
        <label className="text-sm font-semibold">What happened?</label>
        <div className="grid gap-2">
          {DISPUTE_TYPES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDisputeTypeId(d.id)}
              className={`text-left rounded-xl border px-4 py-3 transition-colors ${
                disputeTypeId === d.id
                  ? "border-primary bg-primary-tint"
                  : "border-border bg-surface hover:border-primary/40"
              }`}
            >
              <p className="text-sm font-semibold">{d.label}</p>
              <p className="text-xs text-muted mt-0.5">against: {d.platformClaim}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <label className="text-sm font-semibold">Evidence photo</label>
        <p className="text-xs text-muted">
          SAM 3.1 will look for: <span className="font-medium">{selected.samPrompt}</span>
        </p>
        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface px-4 py-6 cursor-pointer hover:border-primary/50 transition-colors">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="Selected" className="rounded-lg max-h-56 object-contain" />
          ) : (
            <>
              <span className="text-2xl">📷</span>
              <span className="text-sm font-medium text-primary">Tap to add a photo</span>
            </>
          )}
        </label>
      </div>

      <div className="space-y-2.5">
        <label className="text-sm font-semibold">Location</label>
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={useMyLocation} className="btn-secondary px-4 py-2 text-sm">
            Use my location
          </button>
          <span className="text-sm text-muted">
            {location.status === "ready" &&
              `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
            {location.status === "locating" && "Locating..."}
            {location.status === "error" && location.message}
          </span>
        </div>
        {location.status !== "ready" && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={latInputRef}
              type="number"
              step="any"
              placeholder="Latitude"
              className="input-field w-28 p-2 text-sm"
              onChange={applyManualLocation}
            />
            <input
              ref={lngInputRef}
              type="number"
              step="any"
              placeholder="Longitude"
              className="input-field w-28 p-2 text-sm"
              onChange={applyManualLocation}
            />
            <span className="text-xs text-muted">or enter coordinates manually</span>
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        <label className="text-sm font-semibold">Voice note (optional)</label>
        <p className="text-xs text-muted">
          Explain it out loud in your own language -- Muse Voice Transcribe reads it for the
          appeal.
        </p>
        <button
          type="button"
          onClick={toggleRecording}
          className={
            recording
              ? "rounded-full bg-danger text-white px-4 py-2 text-sm font-semibold"
              : "btn-secondary px-4 py-2 text-sm"
          }
        >
          {recording ? "Stop recording" : audioBlob ? "Re-record" : "Record"}
        </button>
        {audioBlob && !recording && (
          <span className="ml-3 text-sm text-success font-medium">Note recorded</span>
        )}
      </div>

      {error && <p className="text-sm text-danger font-medium">{error}</p>}

      <button
        type="button"
        disabled={submitting}
        onClick={submit}
        className="btn-primary w-full px-4 py-3.5 text-base"
      >
        {submitting ? "Verifying with SAM 3.1 + Muse Spark..." : "Verify & draft my appeal"}
      </button>
    </main>
  );
}
