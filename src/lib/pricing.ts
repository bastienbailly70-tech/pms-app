import type { PricingRuleModel, RatePlanModel } from "@/generated/prisma/models";

export type PriceBreakdown = {
  nights: number;
  baseRate: number;        // per night (after seasonal override)
  nightsTotal: number;     // baseRate × nights
  lengthDiscount: number;  // amount saved (negative)
  cleaningFee: number;
  extraGuestFee: number;   // per extra guest × nights
  subtotal: number;        // before deposit
  securityDeposit: number; // not charged, just shown
  total: number;           // subtotal (deposit excluded)
  currency: string;
  appliedRatePlanMultiplier: number;
  notes: string[];
};

export function calculatePrice(
  checkIn: Date,
  checkOut: Date,
  guests: number,
  maxGuestsBase: number,
  rules: PricingRuleModel[],
  ratePlan?: RatePlanModel | null,
  platformKey?: string
): PriceBreakdown {
  const nights = Math.round(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (nights <= 0) throw new Error("checkOut must be after checkIn");

  const currency = rules.find(r => r.type === "BASE")?.currency ?? "EUR";
  const notes: string[] = [];

  // 1. Base price per night
  let baseRate = toNumber(
    rules.find(r => r.type === "BASE" && (!r.platform || r.platform === platformKey))?.amount
  );

  // 2. Seasonal override: pick the most specific seasonal rate overlapping the stay
  const seasonal = rules
    .filter(r => {
      if (r.type !== "SEASONAL") return false;
      if (!r.startDate || !r.endDate) return false;
      if (r.platform && r.platform !== platformKey) return false;
      const s = new Date(r.startDate);
      const e = new Date(r.endDate);
      return checkIn < e && checkOut > s;
    })
    .sort((a, b) => toNumber(b.amount) - toNumber(a.amount)); // highest wins if overlap

  if (seasonal.length > 0) {
    const sr = seasonal[0]!;
    baseRate = toNumber(sr.amount);
    notes.push(`Tarif saisonnier appliqué (${fmt(baseRate, currency)}/nuit)`);
  }

  // 3. Rate plan multiplier
  const multiplier = ratePlan ? toNumber(ratePlan.multiplier) : 1;
  if (multiplier !== 1 && ratePlan) {
    baseRate = round2(baseRate * multiplier);
    notes.push(`Plan tarifaire "${ratePlan.name}" (×${multiplier})`);
  }

  const nightsTotal = round2(baseRate * nights);

  // 4. Length-of-stay discount
  const losRule = rules
    .filter(r => r.type === "LENGTH_OF_STAY" && r.minNights != null && r.minNights <= nights)
    .sort((a, b) => (b.minNights ?? 0) - (a.minNights ?? 0))[0];

  let lengthDiscount = 0;
  if (losRule?.discount) {
    const pct = toNumber(losRule.discount) / 100;
    lengthDiscount = round2(nightsTotal * pct);
    notes.push(`Remise séjour ${losRule.minNights}+ nuits : -${losRule.discount}%`);
  }

  // 5. Fees
  const cleaningFee = toNumber(
    rules.find(r => r.type === "CLEANING_FEE" && (!r.platform || r.platform === platformKey))?.amount
  );
  if (cleaningFee > 0) notes.push(`Frais de ménage : ${fmt(cleaningFee, currency)}`);

  const extraGuestRule = rules.find(r => r.type === "EXTRA_GUEST");
  const extraGuests = Math.max(0, guests - maxGuestsBase);
  const extraGuestFee = extraGuestRule
    ? round2(toNumber(extraGuestRule.amount) * extraGuests * nights)
    : 0;
  if (extraGuestFee > 0) notes.push(`${extraGuests} voyageur(s) supplémentaire(s) : ${fmt(extraGuestFee, currency)}`);

  const securityDeposit = toNumber(rules.find(r => r.type === "SECURITY_DEPOSIT")?.amount);

  const subtotal = round2(nightsTotal - lengthDiscount + cleaningFee + extraGuestFee);

  return {
    nights,
    baseRate,
    nightsTotal,
    lengthDiscount,
    cleaningFee,
    extraGuestFee,
    subtotal,
    securityDeposit,
    total: subtotal,
    currency,
    appliedRatePlanMultiplier: multiplier,
    notes,
  };
}

function toNumber(val: unknown): number {
  if (val == null) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}
