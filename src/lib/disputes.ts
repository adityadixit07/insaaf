export interface DisputeType {
  id: string;
  /** What the platform's complaint against the worker usually claims. */
  platformClaim: string;
  /** The worker's defense, in their own words -- shown in the picker. */
  label: string;
  /** Short noun phrase SAM 3.1 checks the evidence photo for. */
  samPrompt: string;
  /** Where this kind of appeal typically goes. */
  submitTo: string;
}

export const DISPUTE_TYPES: DisputeType[] = [
  {
    id: "delivered_ok",
    platformClaim: "Customer says the order never arrived",
    label: "I delivered it -- here's proof",
    samPrompt: "food delivery package or parcel placed at a doorstep",
    submitTo: "Delivery Support -- Non-Delivery Disputes",
  },
  {
    id: "sealed_intact",
    platformClaim: "Customer says the package was damaged or tampered with",
    label: "It was sealed and undamaged when I handed it over",
    samPrompt: "sealed, intact, undamaged package",
    submitTo: "Delivery Support -- Item Condition Disputes",
  },
  {
    id: "gate_locked",
    platformClaim: "Customer says I never attempted delivery",
    label: "The gate was locked / building had no access",
    samPrompt: "locked gate or closed building entrance",
    submitTo: "Delivery Support -- Non-Delivery Disputes",
  },
  {
    id: "vehicle_breakdown",
    platformClaim: "A ride or delivery was cancelled or delayed",
    label: "My vehicle broke down",
    samPrompt: "flat tire or broken down two-wheeler",
    submitTo: "Driver Support -- Cancellation Disputes",
  },
  {
    id: "road_blocked",
    platformClaim: "A ride or delivery was late",
    label: "The road was blocked or there was an accident ahead",
    samPrompt: "road accident, protest, or blocked street",
    submitTo: "Driver Support -- Late Arrival Disputes",
  },
  {
    id: "flooded_street",
    platformClaim: "A ride or delivery was late",
    label: "The street was flooded / heavy rain slowed me down",
    samPrompt: "flooded or heavily waterlogged street",
    submitTo: "Driver Support -- Late Arrival Disputes",
  },
];

export function getDisputeType(id: string): DisputeType | undefined {
  return DISPUTE_TYPES.find((d) => d.id === id);
}
