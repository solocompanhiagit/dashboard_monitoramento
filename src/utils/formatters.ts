import { NutrientStatus } from '../types/schema';

const ptBRFormatter2 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ptBRFormatter1 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const ptBRFormatter0 = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

export function formatNumberPtBR(
  value: number | null | undefined,
  decimals: 0 | 1 | 2 = 2,
  fallback = '—'
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  if (decimals === 0) return ptBRFormatter0.format(value);
  if (decimals === 1) return ptBRFormatter1.format(value);
  return ptBRFormatter2.format(value);
}

export function formatPercentPtBR(
  value: number | null | undefined,
  decimals: 0 | 1 = 1,
  fallback = '—'
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  const formatted = decimals === 0 ? ptBRFormatter0.format(value) : ptBRFormatter1.format(value);
  return `${formatted}%`;
}

export function safeDivide(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
  fallback: number | null = null
): number | null {
  if (
    numerator === null ||
    numerator === undefined ||
    denominator === null ||
    denominator === undefined ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    Math.abs(denominator) < 1e-9
  ) {
    return fallback;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

export function getStatusMeta(status: NutrientStatus) {
  switch (status) {
    case 'LOW':
      return {
        label: 'Abaixo do Mín.',
        shortLabel: 'Baixo',
        hex: '#fb7185',
        bgClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        lightBgClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-[#fb7185]',
      };
    case 'IDEAL':
      return {
        label: 'Faixa Ideal',
        shortLabel: 'Ideal',
        hex: '#10b981',
        bgClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        lightBgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-[#10b981]',
      };
    case 'HIGH':
      return {
        label: 'Acima do Máx.',
        shortLabel: 'Alto',
        hex: '#22d3ee',
        bgClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        lightBgClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        dotClass: 'bg-[#22d3ee]',
      };
    default:
      return {
        label: 'Sem Referência',
        shortLabel: 'S/ Ref',
        hex: '#94a3b8',
        bgClass: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
        lightBgClass: 'bg-slate-100 text-slate-600 border-slate-300',
        dotClass: 'bg-slate-400',
      };
  }
}
