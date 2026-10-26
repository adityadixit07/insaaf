import exifr from "exifr";
import { haversineMeters } from "./geo";

export interface AuthenticitySignals {
  hasCameraMetadata: boolean;
  takenRecently: boolean | null; // null = no timestamp in the photo to check
  gpsMatchesLocation: boolean | null; // null = no GPS embedded in the photo to check
  note: string;
}

const RECENT_WINDOW_HOURS = 48;
const GPS_MATCH_RADIUS_M = 2000;

/**
 * Checks what a photo's own metadata says about where and when it was
 * taken, as a signal independent of SAM 3.1's "does the image contain X"
 * check. Screenshots, stock photos, and most AI image generators strip or
 * fabricate EXIF, so its absence is a (soft, not conclusive) red flag --
 * real phones attach it by default. This never blocks filing; it's one
 * more thing Spark reasons about alongside everything else.
 */
export async function checkAuthenticity(
  imageBuffer: Buffer,
  submittedLat: number,
  submittedLng: number,
): Promise<AuthenticitySignals> {
  let exif: Record<string, unknown> | null = null;
  try {
    // No `pick` filter here: exifr's "latitude"/"longitude" are computed
    // from the raw GPSLatitude/GPSLongitude tags, and restricting pick to
    // just the computed keys stops it from reading the raw tags it needs,
    // so the computed fields silently come back undefined. Confirmed live.
    exif = await exifr.parse(imageBuffer, { gps: true });
  } catch {
    exif = null;
  }

  const hasCameraMetadata = Boolean(exif?.Make || exif?.Model);

  let takenRecently: boolean | null = null;
  const dateTaken = exif?.DateTimeOriginal as Date | undefined;
  if (dateTaken instanceof Date && !Number.isNaN(dateTaken.getTime())) {
    const ageHours = (Date.now() - dateTaken.getTime()) / (1000 * 60 * 60);
    takenRecently = ageHours >= -1 && ageHours <= RECENT_WINDOW_HOURS;
  }

  let gpsMatchesLocation: boolean | null = null;
  const lat = exif?.latitude as number | undefined;
  const lng = exif?.longitude as number | undefined;
  if (typeof lat === "number" && typeof lng === "number") {
    const dist = haversineMeters(lat, lng, submittedLat, submittedLng);
    gpsMatchesLocation = dist <= GPS_MATCH_RADIUS_M;
  }

  const notes: string[] = [];
  notes.push(
    hasCameraMetadata
      ? "photo carries camera metadata (consistent with a real phone photo)"
      : "photo has no camera metadata (consistent with a screenshot, downloaded image, or AI-generated image -- but also common for photos re-shared through messaging apps, which strip EXIF)",
  );
  if (takenRecently !== null) {
    notes.push(
      takenRecently
        ? "timestamp in the photo is recent"
        : "timestamp in the photo is more than 48 hours old or in the future -- this photo may not be from this incident",
    );
  }
  if (gpsMatchesLocation !== null) {
    notes.push(
      gpsMatchesLocation
        ? "embedded GPS location matches where the worker says this happened"
        : "embedded GPS location does NOT match where the worker says this happened",
    );
  }

  return {
    hasCameraMetadata,
    takenRecently,
    gpsMatchesLocation,
    note: notes.join("; "),
  };
}
