import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, Loader2, Plus } from 'lucide-react';
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

function pad(n: number, width = 2): string {
  return n.toString().padStart(width, '0');
}

function formatUtc(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}Z`;
}

function marketStatus(d: Date): { open: boolean; label: string } {
  // Rough NYSE: Mon-Fri, 13:30-20:00 UTC
  const day = d.getUTCDay();
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  const weekday = day >= 1 && day <= 5;
  const open = weekday && mins >= 13 * 60 + 30 && mins < 20 * 60;
  return { open, label: open ? 'MKT OPEN' : 'MKT CLOSED' };
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function StatusBar({ anyLoading }: { anyLoading: boolean }) {
  const now = useClock();
  const { open, label } = marketStatus(now);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-term-amber-dim bg-[oklch(0.18_0.018_60)] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-term-amber">
      <span className="font-bold">INCOMASH /TERM</span>
      <span className="text-term-amber-dim">v0.1.0</span>
      <span className="text-term-amber-dim">|</span>
      <span>{formatUtc(now)}</span>
      <span className="text-term-amber-dim">|</span>
      <span className={open ? 'term-tag term-tag-green' : 'term-tag term-tag-red'}>
        <span
          className="inline-block h-1.5 w-1.5"
          style={{
            background: 'currentColor',
            boxShadow: '0 0 6px currentColor',
          }}
        />
        {label}
      </span>
      <span className="ml-auto flex items-center gap-2">
        {anyLoading ? (
          <span className="term-tag term-tag-cyan">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            FEED:SYNC
          </span>
        ) : (
          <span className="term-tag term-tag-green">FEED:LIVE</span>
        )}
        <span className="term-tag">USR: LOCAL</span>
      </span>
    </div>
  );
}

interface PanelProps {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function Panel({ title, right, children, className = '' }: PanelProps) {
  return (
    <section className={`term-panel ${className}`}>
      <div className="term-panel-header">
        <span className="font-bold">{title}</span>
        {right && <span className="ml-auto flex items-center gap-2">{right}</span>}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

interface StatProps {
  label: string;
  value: string;
  tone?: 'amber' | 'green' | 'cyan';
}

function Stat({ label, value, tone = 'green' }: StatProps) {
  const colorClass =
    tone === 'green' ? 'text-term-green' : tone === 'cyan' ? 'text-term-cyan' : 'text-term-amber';
  return (
    <div className="border border-term-amber-dim/60 bg-[oklch(0.16_0.014_60)] px-3 py-2">
      <div className="flex items-center justify-between text-[0.62rem] uppercase tracking-[0.18em] text-term-amber-dim">
        <span>{label}</span>
        <span>&gt;&gt;</span>
      </div>
      <div className={`mt-1 font-bold tabular-nums text-xl ${colorClass}`}>{value}</div>
    </div>
  );
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
    <div className="dark crt-overlay min-h-screen bg-background text-foreground">
      <StatusBar anyLoading={anyLoading} />

      <div className="mx-auto max-w-6xl px-4 py-5">
        {/* Banner */}
        <header className="mb-5 border border-term-amber-dim bg-[oklch(0.17_0.014_60)] px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-2xl font-extrabold uppercase tracking-[0.25em] text-term-amber">
              <span className="text-term-amber-dim">[</span>
              INCOMASH
              <span className="text-term-amber-dim">]</span>
              <span className="ml-2 text-sm font-normal tracking-[0.2em] text-term-cyan">
                INCOME PROJECTION TERMINAL
              </span>
              <span className="term-cursor" />
            </h1>
            <div className="text-[0.65rem] uppercase tracking-[0.2em] text-term-amber-dim">
              ESTIMATE DIV INCOME ACROSS ANY PORTFOLIO
            </div>
          </div>
          <div className="mt-2 select-none whitespace-pre overflow-hidden text-[0.6rem] leading-tight text-term-amber-dim">
            {'+'.padEnd(110, '-') + '+'}
          </div>
        </header>

        {/* Income summary */}
        <Panel
          title="Income Summary"
          right={
            <span className="text-[0.6rem] tracking-[0.2em] text-term-amber-dim">FN1: PROJECT</span>
          }
          className="mb-5"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Stat label="Biweekly" value={formatCurrency(projections.netMonthlyIncome / 2)} />
            <Stat label="Monthly" value={formatCurrency(projections.netMonthlyIncome)} />
            <Stat label="Annual" value={formatCurrency(projections.netAnnualIncome)} />
            <Stat label="Blended Yld" value={formatPercent(projections.blendedYield)} tone="cyan" />
            <Stat label="Net Yld" value={formatPercent(projections.netYield)} tone="cyan" />
          </div>
          {projections.costOfCapitalPct > 0 && (
            <p className="mt-3 border-t border-term-amber-dim/50 pt-2 text-[0.7rem] uppercase tracking-[0.12em] text-term-amber-dim">
              &gt; CARRY:{' '}
              <span className="text-term-red">
                {formatCurrency(projections.monthlyCostOfCapital)}/MO
              </span>
              {' // '}
              <span className="text-term-red">
                {formatCurrency(projections.annualCostOfCapital)}/YR
              </span>{' '}
              DEBITED FROM PROJECTION
            </p>
          )}
        </Panel>

        {/* Holdings */}
        <Panel
          title="Holdings"
          right={
            <span className="text-[0.6rem] tracking-[0.2em] text-term-amber-dim">
              POS: {holdings.length.toString().padStart(2, '0')}
            </span>
          }
          className="mb-5"
        >
          {holdings.length === 0 ? (
            <div className="border border-dashed border-term-amber-dim p-8 text-center">
              <p className="mb-4 text-sm uppercase tracking-[0.18em] text-term-amber-dim">
                &gt; NO POSITIONS LOADED. ADD A SYMBOL TO BEGIN.
              </p>
              <Button
                onClick={addHolding}
                className="border border-term-amber bg-transparent uppercase tracking-[0.18em] text-term-amber hover:bg-term-amber hover:text-background"
              >
                <Plus />
                ADD SYMBOL
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[0.78rem]">
                <thead>
                  <tr className="border-b border-term-amber-dim text-[0.65rem] uppercase tracking-[0.15em] text-term-amber-dim">
                    <th className="py-1.5 pr-2 text-left font-normal">Sym</th>
                    <th className="py-1.5 pr-2 text-left font-normal">Shares</th>
                    <th className="py-1.5 pr-2 text-right font-normal">Last</th>
                    <th className="py-1.5 pr-2 text-right font-normal">Mkt Val</th>
                    <th className="py-1.5 pr-2 text-right font-normal">Alloc</th>
                    <th className="py-1.5 pr-2 text-right font-normal">Yld %</th>
                    <th className="py-1.5 pr-2 text-left font-normal">Freq</th>
                    <th className="py-1.5 pr-2 text-right font-normal">Mthly</th>
                    <th className="py-1.5 pr-2 text-right font-normal">Annual</th>
                    <th className="py-1.5"></th>
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
                  <tr className="border-t-2 border-double border-term-amber font-bold uppercase tracking-[0.1em]">
                    <td className="pt-2 text-term-amber" colSpan={3}>
                      ::TOTAL
                    </td>
                    <td className="pt-2 text-right tabular-nums text-term-amber">
                      {formatCurrency(projections.totalValue)}
                    </td>
                    <td className="pt-2 text-right tabular-nums text-term-amber">100%</td>
                    <td className="pt-2 text-right tabular-nums text-term-cyan">
                      {formatPercent(projections.netYield)}
                    </td>
                    <td className="pt-2"></td>
                    <td className="pt-2 text-right tabular-nums text-term-green">
                      {formatCurrency(projections.netMonthlyIncome)}
                    </td>
                    <td className="pt-2 text-right tabular-nums text-term-green">
                      {formatCurrency(projections.netAnnualIncome)}
                    </td>
                    <td className="pt-2"></td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addHolding}
                  className="border-term-amber bg-transparent uppercase tracking-[0.18em] text-term-amber hover:bg-term-amber hover:text-background"
                >
                  <Plus />
                  ADD SYMBOL
                </Button>
                <span className="text-[0.65rem] uppercase tracking-[0.18em] text-term-amber-dim">
                  &gt; INSERT NEW ROW
                </span>
              </div>
            </div>
          )}

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="mt-4 flex w-full items-center gap-2 border-t border-term-amber-dim pt-3 text-left text-[0.7rem] uppercase tracking-[0.18em] text-term-amber-dim transition-colors hover:text-term-amber">
              <ChevronRight
                className={`h-3 w-3 transition-transform ${advancedOpen ? 'rotate-90' : ''}`}
              />
              [F2] Advanced Settings
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="max-w-xs space-y-2 border border-term-amber-dim/60 bg-[oklch(0.16_0.014_60)] p-3">
                <Label
                  htmlFor="cost-of-capital"
                  className="text-[0.65rem] uppercase tracking-[0.18em] text-term-amber-dim"
                >
                  Cost of Capital (%)
                </Label>
                <Input
                  id="cost-of-capital"
                  type="number"
                  step={0.1}
                  min={0}
                  placeholder="0.0"
                  value={costOfCapital}
                  onChange={(e) => setCostOfCapital(e.target.value)}
                  className="border-term-amber-dim bg-background text-term-amber"
                />
                <p className="text-[0.65rem] uppercase tracking-[0.12em] text-term-amber-dim">
                  &gt; Debits carrying cost from projected income.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Panel>

        <footer className="mt-6 border-t border-term-amber-dim pt-2 text-center text-[0.6rem] uppercase tracking-[0.25em] text-term-amber-dim">
          &lt;EOF&gt; &middot; Estimates based on configured yields &middot; Past performance is not
          indicative of future results &middot; No warranty &middot; PRESS [F1] FOR HELP
        </footer>
      </div>
    </div>
  );
}
