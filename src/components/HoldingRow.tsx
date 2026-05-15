import { Loader2, Sparkles, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Holding, PayoutFrequency } from '@/lib/portfolio';
import type { HoldingProjection } from '@/lib/projections';
import type { PriceState } from '@/hooks/useHoldingPrices';

const FREQUENCIES: PayoutFrequency[] = ['monthly', 'quarterly', 'semi-annual', 'annual'];

const FREQ_CODE: Record<PayoutFrequency, string> = {
  monthly: 'M',
  quarterly: 'Q',
  'semi-annual': 'S',
  annual: 'A',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface Props {
  holding: Holding;
  price: PriceState;
  projection: HoldingProjection | undefined;
  onChange: (patch: Partial<Holding>) => void;
  onRemove: () => void;
}

export function HoldingRow({ holding, price, projection, onChange, onRemove }: Props) {
  const value = projection?.value ?? 0;
  const allocationPct = projection?.allocationPct ?? 0;
  const monthlyIncome = projection?.monthlyIncome ?? 0;
  const annualIncome = projection?.annualIncome ?? 0;

  return (
    <tr className="border-b border-term-amber-dim/30 hover:bg-[oklch(0.2_0.018_60)]">
      <td className="py-1.5 pr-2">
        <Input
          aria-label="Symbol"
          className="h-7 w-20 border-term-amber-dim bg-transparent font-bold uppercase tracking-widest text-term-amber"
          value={holding.symbol}
          placeholder="TICK"
          onChange={(e) => onChange({ symbol: e.target.value.toUpperCase() })}
        />
      </td>
      <td className="py-1.5 pr-2">
        <Input
          aria-label="Shares"
          className="h-7 w-24 border-term-amber-dim bg-transparent tabular-nums text-term-amber"
          type="number"
          min={0}
          value={holding.shares}
          onChange={(e) => onChange({ shares: Number(e.target.value) || 0 })}
        />
      </td>
      <td className="py-1.5 pr-2 text-right tabular-nums text-term-amber">
        {price.loading ? (
          <Loader2 className="ml-auto h-3 w-3 animate-spin text-term-cyan" />
        ) : price.price !== null ? (
          `$${price.price.toFixed(2)}`
        ) : (
          <span className="text-term-amber-dim">— — —</span>
        )}
      </td>
      <td className="py-1.5 pr-2 text-right tabular-nums text-term-amber">
        {formatCurrency(value)}
      </td>
      <td className="py-1.5 pr-2 text-right tabular-nums text-term-cyan">
        {allocationPct.toFixed(0)}%
      </td>
      <td className="py-1.5 pr-2">
        <div className="flex items-center justify-end gap-1">
          {holding.yieldSource === 'auto' && holding.yieldPct !== null && (
            <Sparkles className="h-3 w-3 text-term-green" aria-label="Auto-fetched" />
          )}
          <Input
            aria-label="Yield"
            className="h-7 w-16 border-term-amber-dim bg-transparent text-right tabular-nums text-term-amber"
            type="number"
            step={0.1}
            min={0}
            value={holding.yieldPct ?? ''}
            placeholder="—"
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                yieldPct: v === '' ? null : Number(v) || 0,
                yieldSource: 'manual',
              });
            }}
          />
        </div>
      </td>
      <td className="py-1.5 pr-2">
        <div className="flex items-center gap-1">
          <span className="border border-term-amber-dim px-1 text-[0.6rem] font-bold uppercase tracking-widest text-term-cyan">
            {FREQ_CODE[holding.frequency]}
          </span>
          <select
            aria-label="Frequency"
            className="h-7 border border-term-amber-dim bg-transparent px-1.5 text-[0.72rem] uppercase tracking-wider text-term-amber"
            value={holding.frequency}
            onChange={(e) =>
              onChange({
                frequency: e.target.value as PayoutFrequency,
                frequencySource: 'manual',
              })
            }
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f} className="bg-background text-term-amber">
                {f}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="py-1.5 pr-2 text-right tabular-nums font-bold text-term-green">
        {formatCurrency(monthlyIncome)}
      </td>
      <td className="py-1.5 pr-2 text-right tabular-nums font-bold text-term-green">
        {formatCurrency(annualIncome)}
      </td>
      <td className="py-1.5 text-right">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Remove holding"
          onClick={onRemove}
          className="text-term-amber-dim hover:bg-term-red/20 hover:text-term-red"
        >
          <X />
        </Button>
      </td>
    </tr>
  );
}
