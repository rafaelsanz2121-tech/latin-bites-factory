export const PRODUCTS = [
  { code: "PORK_BELLY", name: "Pork Belly" },
  { code: "CHICHARRON", name: "Chicharrón" },
  { code: "BUNUELOS", name: "Buñuelos" },
  { code: "PORK_BELLY_BROWNED", name: "Pork Belly – Browned" },
  { code: "PORK_BELLY_PARTIAL", name: "Pork Belly – Partially Cooked" },
] as const

export type ProductCode = (typeof PRODUCTS)[number]["code"]

export const CCP_LABELS: Record<string, string> = {
  CCP_1B: "CCP 1-B: Cooking Pork ≥160°F",
  CCP_1B_1: "CCP 1B(1): Partially Cooking Pork Bellies 145–150°F",
  CCP_1B_2: "CCP 1B(2): Browning Pork Bellies ≤145°F",
  CCP_2B: "CCP 2-B: Chilling – Product at 130°F",
  CCP_2B_1: "CCP 2B(1): Chilling Step Tracking",
}

export const CCP_LIMITS: Record<string, { min?: number; max?: number; description: string }> = {
  CCP_1B: { min: 160, description: "Internal temp must reach ≥160°F" },
  CCP_1B_1: { min: 145, max: 150, description: "Internal temp must reach 145–150°F" },
  CCP_1B_2: { max: 145, description: "Internal temp must stay ≤145°F" },
  CCP_2B: { description: "Start chilling from 130°F: reach 80°F within 1.5hr, then 40°F within 5hr" },
  CCP_2B_1: { description: "Chilling phase tracking" },
}
