export function fCurrency(value: number | null | undefined, decimals = 0): string {
  if (value == null || isNaN(value)) return '—';
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null || isNaN(value)) return '—';
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value)) return '—';
  return (value * 100).toFixed(decimals) + '%';
}

export function fReps(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—';
  return value.toFixed(1);
}

export function fMeetings(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—';
  return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
