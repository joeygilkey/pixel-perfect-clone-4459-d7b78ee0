import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

export default function NumericInput({ label, value, onChange, prefix, suffix, placeholder = '—', tooltip, step, commas = false }: {
  label: string; value: number | null; onChange: (v: number | null) => void;
  prefix?: string; suffix?: string; placeholder?: string; tooltip?: string; step?: string; commas?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);

  const displayValue = useMemo(() => {
    if (value == null) return '';
    if (isFocused) return String(value);
    if (commas) return value.toLocaleString('en-US');
    if (step === '0.01') return value.toFixed(2);
    return String(value);
  }, [value, isFocused, commas, step]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</label>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger><HelpCircle className="h-3 w-3 text-muted-foreground/60" /></TooltipTrigger>
            <TooltipContent className="glass-strong max-w-[220px] text-xs border-none">{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="relative group">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/70">{prefix}</span>}
        <Input
          type={isFocused || !commas ? 'number' : 'text'}
          step={step}
          className={`glass-subtle border-none h-9 text-sm text-foreground placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary/40 transition-all duration-300 group-hover:bg-muted/60 ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-7' : ''}`}
          placeholder={placeholder}
          value={displayValue}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => {
            const raw = e.target.value.replace(/,/g, '');
            onChange(raw === '' ? null : parseFloat(raw));
          }}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/70">{suffix}</span>}
      </div>
    </div>
  );
}
