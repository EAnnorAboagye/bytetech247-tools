// Pure, DOM-free tax math for the Paycheck Calculator — unit-testable in
// isolation (tests/unit/paycheck-tax.test.ts), no browser APIs used
// anywhere in this file.
//
// TAX_YEAR_2026 sourcing, by confidence level (never blur these together
// in UI copy — this file's whole value proposition is not overstating
// what's verified):
//   - Federal brackets for "single" and "marriedJointly": quoted directly
//     from IRS.gov's own tax year 2026 inflation-adjustment announcement
//     (IR-2025-102, Revenue Procedure 2025-32), fetched directly, not
//     paraphrased from a secondary aggregator.
//   - Federal brackets for "headOfHousehold": that same IRS press release
//     does not itemize Head of Household thresholds, only a single data
//     point (the standard deduction). These figures are Tax Foundation's
//     published transcription of the same Revenue Procedure 2025-32 — a
//     reputable secondary source, not itself the primary IRS document.
//   - Federal brackets for "marriedSeparately": not published as its own
//     table anywhere found. Computed as exactly half of the marriedJointly
//     thresholds at every bracket, the IRS's standing statutory rule for
//     MFS (unchanged for years, not itself an inflation-adjusted figure
//     that needed 2026-specific sourcing).
//   - Standard deduction figures: quoted directly from IR-2025-102 for
//     all four filing statuses.
//   - FICA (Social Security wage base $184,500, 6.2%/1.45% rates,
//     Additional Medicare Tax thresholds): corroborated by multiple
//     independent secondary sources (Thomson Reuters Tax, The Tax
//     Adviser, payroll.org's published fact sheet), not independently
//     confirmed against ssa.gov directly — that fetch returned HTTP 403.
//     Re-verify against ssa.gov manually before treating this as
//     IRS-brackets-grade confirmed.

export const TAX_YEAR = 2026;

export type FilingStatus =
  "single" | "marriedJointly" | "marriedSeparately" | "headOfHousehold";

export type PayFrequency =
  "weekly" | "biweekly" | "semimonthly" | "monthly" | "annual";

export const PAY_PERIODS_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
  annual: 1,
};

interface Bracket {
  rate: number;
  /** Upper end of this bracket's income range. Infinity for the top bracket. */
  upTo: number;
}

// Each array must be ordered ascending by `upTo`, and every rate must
// appear exactly once, ending in Infinity — applyBrackets() below assumes
// this shape and does not re-sort.
const FEDERAL_BRACKETS_2026: Record<FilingStatus, Bracket[]> = {
  single: [
    { rate: 0.1, upTo: 12_400 },
    { rate: 0.12, upTo: 50_400 },
    { rate: 0.22, upTo: 105_700 },
    { rate: 0.24, upTo: 201_775 },
    { rate: 0.32, upTo: 256_225 },
    { rate: 0.35, upTo: 640_600 },
    { rate: 0.37, upTo: Infinity },
  ],
  marriedJointly: [
    { rate: 0.1, upTo: 24_800 },
    { rate: 0.12, upTo: 100_800 },
    { rate: 0.22, upTo: 211_400 },
    { rate: 0.24, upTo: 403_550 },
    { rate: 0.32, upTo: 512_450 },
    { rate: 0.35, upTo: 768_700 },
    { rate: 0.37, upTo: Infinity },
  ],
  headOfHousehold: [
    { rate: 0.1, upTo: 17_700 },
    { rate: 0.12, upTo: 67_450 },
    { rate: 0.22, upTo: 105_700 },
    { rate: 0.24, upTo: 201_775 },
    { rate: 0.32, upTo: 256_200 },
    { rate: 0.35, upTo: 640_600 },
    { rate: 0.37, upTo: Infinity },
  ],
  // Exactly half of marriedJointly's thresholds at every bracket — see
  // file-header comment.
  marriedSeparately: [
    { rate: 0.1, upTo: 12_400 },
    { rate: 0.12, upTo: 50_400 },
    { rate: 0.22, upTo: 105_700 },
    { rate: 0.24, upTo: 201_775 },
    { rate: 0.32, upTo: 256_225 },
    { rate: 0.35, upTo: 384_350 },
    { rate: 0.37, upTo: Infinity },
  ],
};

export const STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  single: 16_100,
  marriedSeparately: 16_100,
  marriedJointly: 32_200,
  headOfHousehold: 24_150,
};

const SOCIAL_SECURITY_RATE = 0.062;
const SOCIAL_SECURITY_WAGE_BASE_2026 = 184_500;
const MEDICARE_RATE = 0.0145;
const ADDITIONAL_MEDICARE_RATE = 0.009;
// Fixed by statute since 2013, not inflation-adjusted — same figures
// apply every year until Congress changes them.
const ADDITIONAL_MEDICARE_THRESHOLD: Record<FilingStatus, number> = {
  single: 200_000,
  headOfHousehold: 200_000,
  marriedSeparately: 125_000,
  marriedJointly: 250_000,
};

// The 9 states with no tax on wage/salary income for 2026. New Hampshire
// taxed interest/dividends only, and that tax was fully phased out by
// 2025 — no wage income tax there either as of this tax year.
export const NO_INCOME_TAX_STATES = [
  "AK",
  "FL",
  "NV",
  "NH",
  "SD",
  "TN",
  "TX",
  "WA",
  "WY",
] as const;
export type NoIncomeTaxState = (typeof NO_INCOME_TAX_STATES)[number];

function isNoIncomeTaxState(code: string): code is NoIncomeTaxState {
  return (NO_INCOME_TAX_STATES as readonly string[]).includes(code);
}

function applyBrackets(taxableIncome: number, brackets: Bracket[]): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let previousUpTo = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= previousUpTo) break;
    const amountInBracket =
      Math.min(taxableIncome, bracket.upTo) - previousUpTo;
    tax += amountInBracket * bracket.rate;
    previousUpTo = bracket.upTo;
  }
  return tax;
}

export function computeFederalTax(
  annualSalary: number,
  filingStatus: FilingStatus,
): number {
  const taxableIncome = Math.max(
    0,
    annualSalary - STANDARD_DEDUCTION_2026[filingStatus],
  );
  return applyBrackets(taxableIncome, FEDERAL_BRACKETS_2026[filingStatus]);
}

export interface FicaBreakdown {
  socialSecurity: number;
  medicare: number;
  additionalMedicare: number;
  total: number;
}

export function computeFica(
  annualSalary: number,
  filingStatus: FilingStatus,
): FicaBreakdown {
  const socialSecurity =
    Math.min(annualSalary, SOCIAL_SECURITY_WAGE_BASE_2026) *
    SOCIAL_SECURITY_RATE;
  const medicare = annualSalary * MEDICARE_RATE;
  const additionalMedicare =
    Math.max(0, annualSalary - ADDITIONAL_MEDICARE_THRESHOLD[filingStatus]) *
    ADDITIONAL_MEDICARE_RATE;
  return {
    socialSecurity,
    medicare,
    additionalMedicare,
    total: socialSecurity + medicare + additionalMedicare,
  };
}

/**
 * State tax input for computeTakeHomePay(). "none" covers the 9
 * confirmed no-income-tax states (isExact: true in the result). "manual"
 * lets the caller supply their own effective rate for every other state
 * — never a canned 50-state dataset presented as verified (isExact:
 * false in the result).
 */
export type StateTaxInput =
  { type: "none" } | { type: "manual"; effectiveRatePercent: number };

export interface TakeHomePayResult {
  grossAnnual: number;
  grossPerPeriod: number;
  federalTaxAnnual: number;
  fica: FicaBreakdown;
  stateTaxAnnual: number;
  /** True only for the 9 confirmed no-income-tax states. */
  stateTaxIsExact: boolean;
  netAnnual: number;
  netPerPeriod: number;
  payPeriodsPerYear: number;
}

export interface TakeHomePayInput {
  annualSalary: number;
  filingStatus: FilingStatus;
  payFrequency: PayFrequency;
  stateTax: StateTaxInput;
}

export function computeTakeHomePay(input: TakeHomePayInput): TakeHomePayResult {
  const { annualSalary, filingStatus, payFrequency, stateTax } = input;
  const federalTaxAnnual = computeFederalTax(annualSalary, filingStatus);
  const fica = computeFica(annualSalary, filingStatus);

  const stateTaxAnnual =
    stateTax.type === "none"
      ? 0
      : annualSalary * (stateTax.effectiveRatePercent / 100);
  const stateTaxIsExact = stateTax.type === "none";

  const netAnnual =
    annualSalary - federalTaxAnnual - fica.total - stateTaxAnnual;
  const payPeriodsPerYear = PAY_PERIODS_PER_YEAR[payFrequency];

  return {
    grossAnnual: annualSalary,
    grossPerPeriod: annualSalary / payPeriodsPerYear,
    federalTaxAnnual,
    fica,
    stateTaxAnnual,
    stateTaxIsExact,
    netAnnual,
    netPerPeriod: netAnnual / payPeriodsPerYear,
    payPeriodsPerYear,
  };
}

export { isNoIncomeTaxState };
