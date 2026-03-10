import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useStockPrice } from '@/hooks/useStockPrice';

const STRC_FALLBACK = 25.0;
const SATA_FALLBACK = 25.0;

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
  const strc = useStockPrice('STRC', STRC_FALLBACK);
  const sata = useStockPrice('SATA', SATA_FALLBACK);
  const pricesLoading = strc.loading || sata.loading;

  const [strcShares, setStrcSharesRaw] = useState(() => {
    const saved = localStorage.getItem('strcShares');
    return saved !== null ? Number(saved) : 1000;
  });
  const [sataShares, setSataSharesRaw] = useState(() => {
    const saved = localStorage.getItem('sataShares');
    return saved !== null ? Number(saved) : 1000;
  });
  const setStrcShares = useCallback((v: number) => {
    setStrcSharesRaw(v);
    localStorage.setItem('strcShares', String(v));
  }, []);
  const setSataShares = useCallback((v: number) => {
    setSataSharesRaw(v);
    localStorage.setItem('sataShares', String(v));
  }, []);
  const [strcYield, setStrcYield] = useState(11.5);
  const [sataYield, setSataYield] = useState(13.3);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const calculations = useMemo(() => {
    const strcValue = strcShares * strc.price;
    const sataValue = sataShares * sata.price;
    const totalValue = strcValue + sataValue;

    const strcAllocationPct = totalValue > 0 ? (strcValue / totalValue) * 100 : 0;
    const sataAllocationPct = totalValue > 0 ? (sataValue / totalValue) * 100 : 0;

    const strcAnnualIncome = strcValue * (strcYield / 100);
    const sataAnnualIncome = sataValue * (sataYield / 100);
    const totalAnnualIncome = strcAnnualIncome + sataAnnualIncome;

    const strcMonthlyIncome = strcAnnualIncome / 12;
    const sataMonthlyIncome = sataAnnualIncome / 12;
    const totalMonthlyIncome = totalAnnualIncome / 12;

    const blendedYield = totalValue > 0 ? (totalAnnualIncome / totalValue) * 100 : 0;

    return {
      strcValue,
      sataValue,
      totalValue,
      strcAllocationPct,
      sataAllocationPct,
      strcAnnualIncome,
      sataAnnualIncome,
      totalAnnualIncome,
      strcMonthlyIncome,
      sataMonthlyIncome,
      totalMonthlyIncome,
      blendedYield,
    };
  }, [strcShares, sataShares, strcYield, sataYield, strc.price, sata.price]);

  const handleSlider = (value: number[]) => {
    const strcPct = value[0] / 100;
    const totalValue = calculations.totalValue;
    if (totalValue === 0) return;
    const newStrcShares = Math.round((totalValue * strcPct) / strc.price);
    const newSataShares = Math.round((totalValue * (1 - strcPct)) / sata.price);
    setStrcShares(newStrcShares);
    setSataShares(newSataShares);
  };

  const sliderValue = calculations.totalValue > 0 ? calculations.strcAllocationPct : 50;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">incomash</h1>
          <p className="mt-2 text-muted-foreground">Estimate your STRC &amp; SATA income</p>
          {pricesLoading && (
            <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Fetching live prices...
            </div>
          )}
        </header>

        {/* Inputs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Holdings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="strc-shares">STRC Shares</Label>
                <Input
                  id="strc-shares"
                  type="number"
                  min={0}
                  value={strcShares}
                  onChange={(e) => setStrcShares(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  ≈ {formatCurrency(calculations.strcValue)} @ ${strc.price.toFixed(2)}/sh
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sata-shares">SATA Shares</Label>
                <Input
                  id="sata-shares"
                  type="number"
                  min={0}
                  value={sataShares}
                  onChange={(e) => setSataShares(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  ≈ {formatCurrency(calculations.sataValue)} @ ${sata.price.toFixed(2)}/sh
                </p>
              </div>
            </div>

            {/* Allocation Slider */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span>STRC {calculations.strcAllocationPct.toFixed(0)}%</span>
                <span>SATA {calculations.sataAllocationPct.toFixed(0)}%</span>
              </div>
              <Slider value={[sliderValue]} onValueChange={handleSlider} max={100} step={1} />
            </div>

            {/* Advanced Settings */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger className="flex w-full items-center gap-2 pt-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                />
                Advanced Settings
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="strc-yield">STRC Yield (%)</Label>
                    <Input
                      id="strc-yield"
                      type="number"
                      step={0.1}
                      min={0}
                      value={strcYield}
                      onChange={(e) => setStrcYield(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sata-yield">SATA Yield (%)</Label>
                    <Input
                      id="sata-yield"
                      type="number"
                      step={0.1}
                      min={0}
                      value={sataYield}
                      onChange={(e) => setSataYield(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Income Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Monthly</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(calculations.totalMonthlyIncome)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Annual</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(calculations.totalAnnualIncome)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Blended Yield</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatPercent(calculations.blendedYield)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Allocation Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Your Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Asset</th>
                    <th className="pb-2 text-right font-medium">Allocation</th>
                    <th className="pb-2 text-right font-medium">Value</th>
                    <th className="pb-2 text-right font-medium">Yield</th>
                    <th className="pb-2 text-right font-medium">Monthly</th>
                    <th className="pb-2 text-right font-medium">Annual</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3 font-medium">STRC</td>
                    <td className="py-3 text-right">
                      {calculations.strcAllocationPct.toFixed(0)}%
                    </td>
                    <td className="py-3 text-right">{formatCurrency(calculations.strcValue)}</td>
                    <td className="py-3 text-right">{formatPercent(strcYield)}</td>
                    <td className="py-3 text-right text-emerald-400">
                      {formatCurrency(calculations.strcMonthlyIncome)}
                    </td>
                    <td className="py-3 text-right text-emerald-400">
                      {formatCurrency(calculations.strcAnnualIncome)}
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 font-medium">SATA</td>
                    <td className="py-3 text-right">
                      {calculations.sataAllocationPct.toFixed(0)}%
                    </td>
                    <td className="py-3 text-right">{formatCurrency(calculations.sataValue)}</td>
                    <td className="py-3 text-right">{formatPercent(sataYield)}</td>
                    <td className="py-3 text-right text-emerald-400">
                      {formatCurrency(calculations.sataMonthlyIncome)}
                    </td>
                    <td className="py-3 text-right text-emerald-400">
                      {formatCurrency(calculations.sataAnnualIncome)}
                    </td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="pt-3">Total</td>
                    <td className="pt-3 text-right">100%</td>
                    <td className="pt-3 text-right">{formatCurrency(calculations.totalValue)}</td>
                    <td className="pt-3 text-right">{formatPercent(calculations.blendedYield)}</td>
                    <td className="pt-3 text-right text-emerald-400">
                      {formatCurrency(calculations.totalMonthlyIncome)}
                    </td>
                    <td className="pt-3 text-right text-emerald-400">
                      {formatCurrency(calculations.totalAnnualIncome)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          Estimates based on current yield rates. Actual results may vary.
        </footer>
      </div>
    </div>
  );
}
