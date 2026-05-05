import type { Holding } from './portfolio';

export interface HoldingProjection {
  id: string;
  value: number;
  allocationPct: number;
  annualIncome: number;
  monthlyIncome: number;
}

export interface ProjectionResult {
  byHolding: Record<string, HoldingProjection>;
  totalValue: number;
  totalAnnualIncome: number;
  totalMonthlyIncome: number;
  blendedYield: number;
  costOfCapitalPct: number;
  annualCostOfCapital: number;
  monthlyCostOfCapital: number;
  netAnnualIncome: number;
  netMonthlyIncome: number;
  netYield: number;
}

export function parseOptionalPercent(value: string): number {
  if (value.trim() === '') return 0;
  return Number(value) || 0;
}

export function calculateProjections(
  holdings: Holding[],
  prices: Record<string, number>,
  costOfCapital: string,
): ProjectionResult {
  const costOfCapitalPct = parseOptionalPercent(costOfCapital);

  const values = holdings.map((h) => ({
    holding: h,
    price: prices[h.id] ?? 0,
    value: h.shares * (prices[h.id] ?? 0),
  }));

  const totalValue = values.reduce((sum, v) => sum + v.value, 0);

  const byHolding: Record<string, HoldingProjection> = {};
  let totalAnnualIncome = 0;

  for (const { holding, value } of values) {
    const yieldPct = holding.yieldPct ?? 0;
    const annualIncome = value * (yieldPct / 100);
    totalAnnualIncome += annualIncome;
    byHolding[holding.id] = {
      id: holding.id,
      value,
      allocationPct: totalValue > 0 ? (value / totalValue) * 100 : 0,
      annualIncome,
      monthlyIncome: annualIncome / 12,
    };
  }

  const totalMonthlyIncome = totalAnnualIncome / 12;
  const blendedYield = totalValue > 0 ? (totalAnnualIncome / totalValue) * 100 : 0;
  const annualCostOfCapital = totalValue * (costOfCapitalPct / 100);
  const monthlyCostOfCapital = annualCostOfCapital / 12;
  const netAnnualIncome = totalAnnualIncome - annualCostOfCapital;
  const netMonthlyIncome = totalMonthlyIncome - monthlyCostOfCapital;
  const netYield = totalValue > 0 ? (netAnnualIncome / totalValue) * 100 : 0;

  return {
    byHolding,
    totalValue,
    totalAnnualIncome,
    totalMonthlyIncome,
    blendedYield,
    costOfCapitalPct,
    annualCostOfCapital,
    monthlyCostOfCapital,
    netAnnualIncome,
    netMonthlyIncome,
    netYield,
  };
}
