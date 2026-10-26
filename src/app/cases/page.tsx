"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { DisputeCase } from "@/lib/store";

const CasesMap = dynamic(() => import("@/components/CasesMap").then((m) => m.CasesMap), {
  ssr: false,
});

export default function CasesPage() {
  const [cases, setCases] = useState<DisputeCase[] | null>(null);

  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then((d) => setCases(d.cases));
  }, []);

  const verified = cases?.filter((c) => c.evidenceSupportsWorker).length ?? 0;
  const avgStrength = cases?.length
    ? (cases.reduce((s, c) => s + c.appealStrength, 0) / cases.length).toFixed(1)
    : "--";

  return (
    <main className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="border-b border-border shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">My appeals</h1>
            <p className="text-sm text-muted">
              {cases ? `${cases.length} case${cases.length === 1 ? "" : "s"} filed` : "Loading..."}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="card px-4 py-2.5 text-center">
              <p className="text-lg font-bold text-success">{verified}</p>
              <p className="text-[11px] text-muted font-medium">Verified</p>
            </div>
            <div className="card px-4 py-2.5 text-center">
              <p className="text-lg font-bold text-primary">{avgStrength}</p>
              <p className="text-[11px] text-muted font-medium">Avg strength</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0">{cases && <CasesMap cases={cases} />}</div>
    </main>
  );
}
