import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { haversineMeters } from "./geo";

export interface SegmentationMatch {
  objectId: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  confidence?: number;
  maskSvgPath?: string;
  maskWidth?: number;
  maskHeight?: number;
}

export type RecommendedAction = "submit_now" | "add_more_evidence" | "escalate_to_helpline";

export interface DisputeCase {
  id: string;
  createdAt: string;
  disputeTypeId: string;
  platformClaim: string;
  defenseLabel: string;
  submitTo: string;
  lat: number;
  lng: number;
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  match: SegmentationMatch | null;
  evidenceSupportsWorker: boolean;
  appealStrength: number; // 1 (weak) to 5 (strong)
  recommendedAction: RecommendedAction;
  title: string;
  appealText: string;
  transcript: string | null;
  similarRecentNearbyId: string | null;
  authenticity: {
    hasCameraMetadata: boolean;
    takenRecently: boolean | null;
    gpsMatchesLocation: boolean | null;
    note: string;
  };
  status: "ready_to_submit" | "needs_more_evidence";
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "cases.json");

const PATTERN_RADIUS_M = 1500;
const PATTERN_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

async function ensureFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readAll(): Promise<DisputeCase[]> {
  await ensureFile();
  const raw = await readFile(DATA_FILE, "utf8");
  try {
    return JSON.parse(raw) as DisputeCase[];
  } catch {
    return [];
  }
}

async function writeAll(cases: DisputeCase[]): Promise<void> {
  await writeFile(DATA_FILE, JSON.stringify(cases, null, 2), "utf8");
}

export async function listCases(): Promise<DisputeCase[]> {
  const cases = await readAll();
  return cases.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Finds a recent case of the same dispute type nearby -- not a duplicate to
 * reject, but corroborating pattern evidence ("3 drivers reported flooding
 * on this route today") that can strengthen an appeal.
 */
export async function findSimilarRecentCase(
  disputeTypeId: string,
  lat: number,
  lng: number,
): Promise<DisputeCase | null> {
  const cases = await readAll();
  const cutoff = Date.now() - PATTERN_WINDOW_MS;
  let best: DisputeCase | null = null;
  let bestDist = Infinity;

  for (const c of cases) {
    if (c.disputeTypeId !== disputeTypeId) continue;
    if (new Date(c.createdAt).getTime() < cutoff) continue;
    const dist = haversineMeters(lat, lng, c.lat, c.lng);
    if (dist <= PATTERN_RADIUS_M && dist < bestDist) {
      best = c;
      bestDist = dist;
    }
  }
  return best;
}

export async function addCase(
  dispute: Omit<DisputeCase, "id" | "createdAt">,
): Promise<DisputeCase> {
  const cases = await readAll();
  const full: DisputeCase = {
    ...dispute,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  cases.push(full);
  await writeAll(cases);
  return full;
}
