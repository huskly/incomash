import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Loader2, Plus } from 'lucide-react';
import { HoldingRow } from '@/components/HoldingRow';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useHoldingPrices } from '@/hooks/useHoldingPrices';
import { useHoldingFundamentals } from '@/hooks/useHoldingFundamentals';
import { calculateProjections } from '@/lib/projections';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export default function App() {
  const { holdings, costOfCapital, addHolding, updateHolding, removeHolding, setCostOfCapital } =
    usePortfolio();

  const priceMap = useHoldingPrices(holdings);
  useHoldingFundamentals({ holdings, updateHolding });

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const pricesById = useMemo(() => {
    const out: Record<string, number> = {};
    for (const h of holdings) {
      const p = priceMap[h.id]?.price;
      if (p !== null && p !== undefined) out[h.id] = p;
    }
    return out;
  }, [holdings, priceMap]);

  const projections = useMemo(
    () => calculateProjections(holdings, pricesById, costOfCapital),
    [holdings, pricesById, costOfCapital]
  );

  const anyLoading = holdings.some((h) => priceMap[h.id]?.loading);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">incomash</h1>
          <p className="mt-2 text-muted-foreground">
            Estimate your dividend income across any portfolio
          </p>
          {anyLoading && (
            <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Fetching live data...
            </div>
          )}
        </header>

        {/* Income Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-5">
              <div>
                <p className="text-sm text-muted-foreground">Biweekly</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(projections.netMonthlyIncome / 2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(projections.netMonthlyIncome)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Annual</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(projections.netAnnualIncome)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Blended Yield</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatPercent(projections.blendedYield)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Yield</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatPercent(projections.netYield)}
                </p>
              </div>
            </div>
            {projections.costOfCapitalPct > 0 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Includes {formatCurrency(projections.monthlyCostOfCapital)}/mo and{' '}
                {formatCurrency(projections.annualCostOfCapital)}/yr of capital carrying cost.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Holdings table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            {holdings.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <p className="mb-4">Add a symbol to get started.</p>
                <Button onClick={addHolding}>
                  <Plus />
                  Add symbol
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-2 pr-2 text-left font-medium">Symbol</th>
                      <th className="pb-2 pr-2 text-left font-medium">Shares</th>
                      <th className="pb-2 pr-2 text-right font-medium">Price</th>
                      <th className="pb-2 pr-2 text-right font-medium">Value</th>
                      <th className="pb-2 pr-2 text-right font-medium">Alloc</th>
                      <th className="pb-2 pr-2 text-right font-medium">Yield %</th>
                      <th className="pb-2 pr-2 text-left font-medium">Frequency</th>
                      <th className="pb-2 pr-2 text-right font-medium">Monthly</th>
                      <th className="pb-2 pr-2 text-right font-medium">Annual</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h) => (
                      <HoldingRow
                        key={h.id}
                        holding={h}
                        price={priceMap[h.id] ?? { price: null, loading: false, error: null }}
                        projection={projections.byHolding[h.id]}
                        onChange={(patch) => updateHolding(h.id, patch)}
                        onRemove={() => removeHolding(h.id)}
                      />
                    ))}
                    <tr className="font-semibold">
                      <td className="pt-3" colSpan={3}>
                        Total
                      </td>
                      <td className="pt-3 text-right tabular-nums">
                        {formatCurrency(projections.totalValue)}
                      </td>
                      <td className="pt-3 text-right tabular-nums">100%</td>
                      <td className="pt-3 text-right tabular-nums">
                        {formatPercent(projections.netYield)}
                      </td>
                      <td className="pt-3"></td>
                      <td className="pt-3 text-right tabular-nums text-emerald-400">
                        {formatCurrency(projections.netMonthlyIncome)}
                      </td>
                      <td className="pt-3 text-right tabular-nums text-emerald-400">
                        {formatCurrency(projections.netAnnualIncome)}
                      </td>
                      <td className="pt-3"></td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-4">
                  <Button variant="outline" size="sm" onClick={addHolding}>
                    <Plus />
                    Add symbol
                  </Button>
                </div>
              </div>
            )}

            {/* Advanced Settings */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger className="flex w-full items-center gap-2 pt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                />
                Advanced Settings
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="max-w-xs space-y-2">
                  <Label htmlFor="cost-of-capital">Cost of Capital (%)</Label>
                  <Input
                    id="cost-of-capital"
                    type="number"
                    step={0.1}
                    min={0}
                    placeholder="Optional"
                    value={costOfCapital}
                    onChange={(e) => setCostOfCapital(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Debits carrying cost from projected monthly and annual income.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          Estimates based on current yield rates. Actual results may vary.
        </footer>
      </div>
    </div>
  );
}
