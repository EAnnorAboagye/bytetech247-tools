import { describe, expect, it } from "vitest";
import {
  computeFederalTax,
  computeFica,
  computeTakeHomePay,
  NO_INCOME_TAX_STATES,
} from "../../src/lib/paycheck-tax";

describe("computeFederalTax", () => {
  it("computes single-filer tax across two brackets ($50,000)", () => {
    // Standard deduction $16,100 -> taxable $33,900.
    // 10% * 12,400 = 1,240; 12% * (33,900 - 12,400) = 2,580.
    expect(computeFederalTax(50_000, "single")).toBeCloseTo(3_820, 2);
  });

  it("computes marriedJointly tax across two brackets ($100,000)", () => {
    // Standard deduction $32,200 -> taxable $67,800.
    // 10% * 24,800 = 2,480; 12% * (67,800 - 24,800) = 5,160.
    expect(computeFederalTax(100_000, "marriedJointly")).toBeCloseTo(7_640, 2);
  });

  it("computes tax through the top bracket for a high single income", () => {
    // Hand-verified across all 7 brackets for $700,000 single, see
    // src/lib/paycheck-tax.ts's bracket table.
    expect(computeFederalTax(700_000, "single")).toBeCloseTo(209_000.25, 2);
  });

  it("returns 0 when income is below the standard deduction", () => {
    expect(computeFederalTax(10_000, "single")).toBe(0);
  });

  it("computes marriedSeparately as exactly half of marriedJointly's bracket math for equal half-income", () => {
    const mfjTax = computeFederalTax(200_000, "marriedJointly");
    const mfsTax = computeFederalTax(100_000, "marriedSeparately");
    // Not a generally-true identity (deductions differ in absolute
    // terms), but at this specific income level both taxable incomes
    // land inside brackets where MFS's thresholds are exactly half of
    // MFJ's, so the two should match closely.
    expect(mfsTax).toBeCloseTo(mfjTax / 2, 0);
  });
});

describe("computeFica", () => {
  it("computes Social Security + Medicare under the wage base ($50,000)", () => {
    const fica = computeFica(50_000, "single");
    expect(fica.socialSecurity).toBeCloseTo(3_100, 2);
    expect(fica.medicare).toBeCloseTo(725, 2);
    expect(fica.additionalMedicare).toBe(0);
    expect(fica.total).toBeCloseTo(3_825, 2);
  });

  it("caps Social Security at the 2026 wage base for high income", () => {
    // SSA's own 2026 fact sheet states the max employee SS tax is
    // $11,439 for 2026 ($184,500 * 6.2%) — cross-checked against that
    // published figure, not just re-deriving the same formula.
    const fica = computeFica(700_000, "single");
    expect(fica.socialSecurity).toBeCloseTo(11_439, 0);
  });

  it("applies the Additional Medicare Tax above the single-filer threshold", () => {
    const fica = computeFica(700_000, "single");
    // (700,000 - 200,000) * 0.9%
    expect(fica.additionalMedicare).toBeCloseTo(4_500, 2);
  });

  it("uses the higher marriedJointly Additional Medicare threshold", () => {
    const fica = computeFica(220_000, "marriedJointly");
    // Below the $250,000 MFJ threshold -> no additional Medicare tax.
    expect(fica.additionalMedicare).toBe(0);
  });
});

describe("computeTakeHomePay", () => {
  it("marks a no-income-tax state as exact with zero state tax", () => {
    expect(NO_INCOME_TAX_STATES).toContain("TX");
    const result = computeTakeHomePay({
      annualSalary: 50_000,
      filingStatus: "single",
      payFrequency: "annual",
      stateTax: { type: "none" },
    });
    expect(result.stateTaxAnnual).toBe(0);
    expect(result.stateTaxIsExact).toBe(true);
    expect(result.netAnnual).toBeCloseTo(50_000 - 3_820 - 3_825, 2);
  });

  it("marks a manual state rate as an estimate, not exact", () => {
    const result = computeTakeHomePay({
      annualSalary: 50_000,
      filingStatus: "single",
      payFrequency: "annual",
      stateTax: { type: "manual", effectiveRatePercent: 5 },
    });
    expect(result.stateTaxAnnual).toBeCloseTo(2_500, 2);
    expect(result.stateTaxIsExact).toBe(false);
  });

  it("divides net pay by the correct number of pay periods (biweekly)", () => {
    const result = computeTakeHomePay({
      annualSalary: 52_000,
      filingStatus: "single",
      payFrequency: "biweekly",
      stateTax: { type: "none" },
    });
    expect(result.payPeriodsPerYear).toBe(26);
    expect(result.netPerPeriod).toBeCloseTo(result.netAnnual / 26, 6);
    expect(result.grossPerPeriod).toBeCloseTo(2_000, 6);
  });
});
