import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Holding, PayoutFrequency } from '@/lib/portfolio';
import type { HoldingProjection } from '@/lib/projections';
import type { PriceState } from '@/hooks/useHoldingPrices';

const FREQUENCIES: PayoutFrequency[] = ['monthly', 'quarterly', 'semi-annual', 'annual'];

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
    <tr className="border-b border-border/50">
      <td className="py-2 pr-2">
        <Input
          aria-label="Symbol"
          className="h-7 w-20 uppercase"
          value={holding.symbol}
          placeholder="TICK"
          onChange={(e) => onChange({ symbol: e.target.value.toUpperCase() })}
        />
      </td>
      <td className="py-2 pr-2">
        <Input
          aria-label="Shares"
          className="h-7 w-24"
          type="number"
          min={0}
          value={holding.shares}
          onChange={(e) => onChange({ shares: Number(e.target.value) || 0 })}
        />
      </td>
      <td className="py-2 pr-2 text-right tabular-nums">
        {price.loading ? (
          <Loader2 className="ml-auto h-3 w-3 animate-spin text-muted-foreground" />
        ) : price.price !== null ? (
          `$${price.price.toFixed(2)}`
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-2 pr-2 text-right tabular-nums">{formatCurrency(value)}</td>
      <td className="py-2 pr-2 text-right tabular-nums">{allocationPct.toFixed(0)}%</td>
      <td className="py-2 pr-2">
        <div className="flex items-center justify-end gap-1">
          {holding.yieldSource === 'auto' && holding.yieldPct !== null && (
            <Sparkles className="h-3 w-3 text-emerald-400" aria-label="Auto-fetched" />
          )}
          <Input
            aria-label="Yield"
            className="h-7 w-16 text-right"
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
      <td className="py-2 pr-2">
        <select
          aria-label="Frequency"
          className="h-7 rounded-lg border border-input bg-transparent px-1.5 text-sm"
          value={holding.frequency}
          onChange={(e) =>
            onChange({
              frequency: e.target.value as PayoutFrequency,
              frequencySource: 'manual',
            })
          }
        >
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-2 text-right tabular-nums text-emerald-400">
        {formatCurrency(monthlyIncome)}
      </td>
      <td className="py-2 pr-2 text-right tabular-nums text-emerald-400">
        {formatCurrency(annualIncome)}
      </td>
      <td className="py-2 text-right">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Remove holding"
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </td>
    </tr>
  );
}
