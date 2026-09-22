/** Visual receipt skins: independent of vibe (copy tone).
 *  Each id maps to a structurally different layout in ReceiptCard.
 */
export type ReceiptTemplateId = "drop" | "soft" | "noted" | "ledger" | "night" | "ticket";

export type ReceiptTemplateMeta = {
  id: ReceiptTemplateId;
  /** i18n key for short name */
  nameKey: string;
  /** Free users may use these without Unlimited */
  free: boolean;
  /** Swatch colors for the picker thumb */
  swatchBg: string;
  swatchAccent: string;
};

export const RECEIPT_TEMPLATES: readonly ReceiptTemplateMeta[] = [
  { id: "drop", nameKey: "templateDrop", free: true, swatchBg: "#FF6B3D", swatchAccent: "#1A0A04" },
  { id: "soft", nameKey: "templateSoft", free: true, swatchBg: "#E8F0EC", swatchAccent: "#4A7C6F" },
  { id: "noted", nameKey: "templateNoted", free: false, swatchBg: "#FFE566", swatchAccent: "#2A2410" },
  { id: "ledger", nameKey: "templateLedger", free: false, swatchBg: "#F7F4EC", swatchAccent: "#0B1F4A" },
  { id: "night", nameKey: "templateNight", free: false, swatchBg: "#0A0A12", swatchAccent: "#39FF14" },
  { id: "ticket", nameKey: "templateTicket", free: false, swatchBg: "#F2E6D0", swatchAccent: "#C41E3A" },
] as const;

export const DEFAULT_RECEIPT_TEMPLATE: ReceiptTemplateId = "drop";

export const FREE_RECEIPT_TEMPLATE_IDS: readonly ReceiptTemplateId[] = RECEIPT_TEMPLATES.filter(
  (t) => t.free
).map((t) => t.id);

export function isReceiptTemplateId(value: string): value is ReceiptTemplateId {
  return RECEIPT_TEMPLATES.some((t) => t.id === value);
}

export function isFreeReceiptTemplate(id: ReceiptTemplateId): boolean {
  return FREE_RECEIPT_TEMPLATE_IDS.includes(id);
}

export function resolveReceiptTemplateId(
  id: string | undefined | null,
  isPro: boolean
): ReceiptTemplateId {
  const candidate = id && isReceiptTemplateId(id) ? id : DEFAULT_RECEIPT_TEMPLATE;
  if (!isPro && !isFreeReceiptTemplate(candidate)) {
    return DEFAULT_RECEIPT_TEMPLATE;
  }
  return candidate;
}
