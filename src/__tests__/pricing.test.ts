import { describe, it, expect } from "vitest";
import { calculatePrice } from "@/lib/pricing";
import type { PricingRuleModel, RatePlanModel } from "@/generated/prisma/models";

function rule(overrides: Partial<PricingRuleModel>): PricingRuleModel {
  return {
    id: "r1",
    propertyId: "p1",
    type: "BASE",
    amount: 100 as unknown as PricingRuleModel["amount"],
    currency: "EUR",
    startDate: null,
    endDate: null,
    minNights: null,
    discount: null,
    platform: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function plan(overrides: Partial<RatePlanModel>): RatePlanModel {
  return {
    id: "rp1",
    propertyId: "p1",
    name: "Standard",
    descriptionFr: null,
    descriptionEn: null,
    isRefundable: true,
    minNights: 1,
    maxNights: null,
    multiplier: 1 as unknown as RatePlanModel["multiplier"],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const d = (s: string) => new Date(s);

describe("calculatePrice", () => {
  it("computes base rate × nights", () => {
    const result = calculatePrice(d("2025-07-01"), d("2025-07-05"), 2, 4, [rule({})]);
    expect(result.nights).toBe(4);
    expect(result.nightsTotal).toBe(400);
    expect(result.total).toBe(400);
  });

  it("applies seasonal rate when stay overlaps", () => {
    const rules = [
      rule({ type: "BASE", amount: 100 as unknown as PricingRuleModel["amount"] }),
      rule({
        id: "r2",
        type: "SEASONAL",
        amount: 150 as unknown as PricingRuleModel["amount"],
        startDate: d("2025-07-01"),
        endDate: d("2025-07-31"),
      }),
    ];
    const result = calculatePrice(d("2025-07-10"), d("2025-07-15"), 2, 4, rules);
    expect(result.baseRate).toBe(150);
    expect(result.nightsTotal).toBe(750);
  });

  it("ignores seasonal rule that does not overlap", () => {
    const rules = [
      rule({ type: "BASE", amount: 100 as unknown as PricingRuleModel["amount"] }),
      rule({
        id: "r2",
        type: "SEASONAL",
        amount: 200 as unknown as PricingRuleModel["amount"],
        startDate: d("2025-08-01"),
        endDate: d("2025-08-31"),
      }),
    ];
    const result = calculatePrice(d("2025-07-01"), d("2025-07-05"), 2, 4, rules);
    expect(result.baseRate).toBe(100);
  });

  it("applies length-of-stay discount for 7+ nights", () => {
    const rules = [
      rule({ type: "BASE", amount: 100 as unknown as PricingRuleModel["amount"] }),
      rule({
        id: "r3",
        type: "LENGTH_OF_STAY",
        amount: 0 as unknown as PricingRuleModel["amount"],
        minNights: 7,
        discount: 10 as unknown as PricingRuleModel["discount"],
      }),
    ];
    const result = calculatePrice(d("2025-07-01"), d("2025-07-08"), 2, 4, rules);
    expect(result.nights).toBe(7);
    expect(result.nightsTotal).toBe(700);
    expect(result.lengthDiscount).toBe(70);
    expect(result.total).toBe(630);
  });

  it("picks best LOS discount for long stays", () => {
    const rules = [
      rule({ type: "BASE", amount: 100 as unknown as PricingRuleModel["amount"] }),
      rule({ id: "r3", type: "LENGTH_OF_STAY", amount: 0 as unknown as PricingRuleModel["amount"], minNights: 7, discount: 10 as unknown as PricingRuleModel["discount"] }),
      rule({ id: "r4", type: "LENGTH_OF_STAY", amount: 0 as unknown as PricingRuleModel["amount"], minNights: 28, discount: 20 as unknown as PricingRuleModel["discount"] }),
    ];
    const result = calculatePrice(d("2025-07-01"), d("2025-07-29"), 2, 4, rules);
    expect(result.lengthDiscount).toBe(round2(2800 * 0.20));
  });

  it("adds cleaning fee", () => {
    const rules = [
      rule({ type: "BASE", amount: 100 as unknown as PricingRuleModel["amount"] }),
      rule({ id: "r5", type: "CLEANING_FEE", amount: 50 as unknown as PricingRuleModel["amount"] }),
    ];
    const result = calculatePrice(d("2025-07-01"), d("2025-07-03"), 2, 4, rules);
    expect(result.cleaningFee).toBe(50);
    expect(result.total).toBe(250);
  });

  it("adds extra guest fee when guests exceed base", () => {
    const rules = [
      rule({ type: "BASE", amount: 100 as unknown as PricingRuleModel["amount"] }),
      rule({ id: "r6", type: "EXTRA_GUEST", amount: 15 as unknown as PricingRuleModel["amount"] }),
    ];
    // 5 guests, base is 4 → 1 extra × 15 × 3 nights = 45
    const result = calculatePrice(d("2025-07-01"), d("2025-07-04"), 5, 4, rules);
    expect(result.extraGuestFee).toBe(45);
    expect(result.total).toBe(345);
  });

  it("applies rate plan multiplier", () => {
    const rules = [rule({ type: "BASE", amount: 100 as unknown as PricingRuleModel["amount"] })];
    const nonRefundable = plan({ multiplier: 0.9 as unknown as RatePlanModel["multiplier"] });
    const result = calculatePrice(d("2025-07-01"), d("2025-07-05"), 2, 4, rules, nonRefundable);
    expect(result.baseRate).toBe(90);
    expect(result.nightsTotal).toBe(360);
  });

  it("security deposit is shown but not added to total", () => {
    const rules = [
      rule({ type: "BASE", amount: 100 as unknown as PricingRuleModel["amount"] }),
      rule({ id: "r7", type: "SECURITY_DEPOSIT", amount: 300 as unknown as PricingRuleModel["amount"] }),
    ];
    const result = calculatePrice(d("2025-07-01"), d("2025-07-03"), 2, 4, rules);
    expect(result.securityDeposit).toBe(300);
    expect(result.total).toBe(200); // deposit excluded from total
  });

  it("throws when checkOut is before checkIn", () => {
    expect(() => calculatePrice(d("2025-07-05"), d("2025-07-01"), 2, 4, [])).toThrow();
  });
});

function round2(n: number) { return Math.round(n * 100) / 100; }
