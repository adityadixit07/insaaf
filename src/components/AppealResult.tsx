"use client";

import { useState } from "react";
import type { DisputeCase } from "@/lib/store";

const ACTION_LABEL: Record<DisputeCase["recommendedAction"], string> = {
  submit_now: "Ready to submit",
  add_more_evidence: "Add more evidence",
  escalate_to_helpline: "Escalate to helpline",
};

const ACTION_TONE: Record<DisputeCase["recommendedAction"], string> = {
  submit_now: "bg-success-tint text-success",
  add_more_evidence: "bg-warning-tint text-warning",
  escalate_to_helpline: "bg-danger-tint text-danger",
};

function StrengthMeter({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Appeal strength ${value} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="h-1.5 w-5 rounded-full"
          style={{ background: i < value ? "var(--primary)" : "var(--border)" }}
        />
      ))}
    </div>
  );
}

export function AppealResult({ dispute }: { dispute: DisputeCase }) {
  const [text, setText] = useState(dispute.appealText);
  const [copied, setCopied] = useState(false);
  const m = dispute.match;
  const tone = dispute.evidenceSupportsWorker ? "success" : "warning";

  return (
    <div className="card overflow-hidden">
      <div className="relative w-full bg-black/5">
        <svg
          viewBox={`0 0 ${dispute.imageWidth} ${dispute.imageHeight}`}
          className="w-full h-auto block"
        >
          <image
            href={dispute.imageDataUrl}
            width={dispute.imageWidth}
            height={dispute.imageHeight}
          />
          {m && (
            <>
              <rect
                x={m.left}
                y={m.top}
                width={m.right - m.left}
                height={m.bottom - m.top}
                fill="none"
                stroke={dispute.evidenceSupportsWorker ? "#0f6e5e" : "#c2690f"}
                strokeWidth={Math.max(2, dispute.imageWidth / 250)}
              />
              {m.maskSvgPath && m.maskWidth && m.maskHeight && (
                <svg
                  x={m.left}
                  y={m.top}
                  width={m.right - m.left}
                  height={m.bottom - m.top}
                  viewBox={`0 0 ${m.maskWidth} ${m.maskHeight}`}
                >
                  <path
                    d={m.maskSvgPath}
                    fill={dispute.evidenceSupportsWorker ? "#0f6e5e" : "#c2690f"}
                    fillOpacity={0.35}
                  />
                </svg>
              )}
            </>
          )}
        </svg>
        <span
          className={`absolute top-2 right-2 rounded-full px-3 py-1 text-xs font-semibold ${
            tone === "success" ? "bg-success text-white" : "bg-warning text-white"
          }`}
        >
          {dispute.evidenceSupportsWorker ? "Verified by SAM 3.1" : "Needs more evidence"}
          {m?.confidence != null ? ` · ${(m.confidence * 100).toFixed(0)}%` : ""}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ACTION_TONE[dispute.recommendedAction]}`}>
            {ACTION_LABEL[dispute.recommendedAction]}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-medium">Appeal strength</span>
            <StrengthMeter value={dispute.appealStrength} />
          </div>
        </div>

        {dispute.similarRecentNearbyId && (
          <p className="text-sm text-accent bg-accent-tint rounded-lg px-3 py-2">
            Another worker reported the same issue nearby in the last 24 hours -- this
            strengthens your case as a verifiable local pattern.
          </p>
        )}

        {!dispute.authenticity.hasCameraMetadata && (
          <details className="text-sm rounded-lg border border-border px-3 py-2">
            <summary className="cursor-pointer font-medium text-muted">
              Photo check: no camera metadata found
            </summary>
            <p className="text-muted mt-1.5">
              This photo has no embedded camera info, so it can&apos;t be confirmed as a fresh,
              on-location photo from this device -- this includes real photos shared through
              apps that strip this data, not just screenshots or generated images. Spark factored
              this into the strength score above.
            </p>
          </details>
        )}

        {dispute.authenticity.gpsMatchesLocation === false && (
          <p className="text-sm text-danger bg-danger-tint rounded-lg px-3 py-2">
            This photo&apos;s embedded GPS location doesn&apos;t match where you said this
            happened. Double-check you&apos;re using the right photo.
          </p>
        )}

        <p className="text-sm text-muted">
          Submit to: <span className="font-semibold text-foreground">{dispute.submitTo}</span>
        </p>

        <h3 className="font-bold text-lg">{dispute.title}</h3>

        {dispute.transcript && (
          <p className="text-sm italic text-muted">Voice note: &ldquo;{dispute.transcript}&rdquo;</p>
        )}

        <textarea
          className="input-field w-full min-h-40 p-3 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="btn-primary px-4 py-2.5 text-sm"
        >
          {copied ? "Copied" : "Copy appeal text"}
        </button>
      </div>
    </div>
  );
}
