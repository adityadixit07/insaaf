"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { DisputeCase } from "@/lib/store";

export function CasesMap({ cases }: { cases: DisputeCase[] }) {
  const center: [number, number] =
    cases.length > 0 ? [cases[0].lat, cases[0].lng] : [20.5937, 78.9629];

  return (
    <MapContainer center={center} zoom={cases.length > 0 ? 12 : 5} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {cases.map((c) => (
        <CircleMarker
          key={c.id}
          center={[c.lat, c.lng]}
          radius={9}
          pathOptions={{
            color: c.evidenceSupportsWorker ? "#0f6e5e" : "#c2690f",
            fillColor: c.evidenceSupportsWorker ? "#0f6e5e" : "#c2690f",
            fillOpacity: 0.75,
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{c.title}</p>
              <p>{c.defenseLabel}</p>
              <p className="text-xs text-black/60">
                {c.submitTo} · Strength {c.appealStrength}/5 ·{" "}
                {c.evidenceSupportsWorker ? "Verified" : "Needs more evidence"}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
