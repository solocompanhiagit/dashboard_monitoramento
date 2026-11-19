import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Gauge,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { AnalysisType, NutrientEvaluation } from '../types/schema';
import { formatNumberPtBR, formatPercentPtBR, getStatusMeta, safeDivide } from '../utils/formatters';
import {
  SOLO_ELEMENTS,
  SOLUCAO_ELEMENTS,
  TISSUE_ELEMENTS,
} from '../utils/referenceEngine';

interface Tab1OverviewBulletProps {
  evaluations: NutrientEvaluation[];
  tipoAnalise: AnalysisType;
  cultura: string;
  daeLabel: string;
  isDark: boolean;
  totalSamples: number;
}

export const Tab1OverviewBullet: React.FC<Tab1OverviewBulletProps> = ({
  evaluations,
  tipoAnalise,
  cultura,
  daeLabel,
  isDark,
  totalSamples,
}) => {
  const validWithRef = evaluations.filter(
    (e) => e.value !== null && e.refMin !== null && e.refMax !== null && e.status !== 'NO_REF'
  );
  const totalEvaluated = validWithRef.length;
  const idealCount = validWithRef.filter((e) => e.status === 'IDEAL').length;
  const lowCount = validWithRef.filter((e) => e.status === 'LOW').length;
  const highCount = validWithRef.filter((e) => e.status === 'HIGH').length;

  const balanceIndex = safeDivide(idealCount * 100, totalEvaluated, 0) ?? 0;

  const topDeficits = [...validWithRef]
    .filter((e) => e.status === 'LOW' && e.deficitPercent > 0)
    .sort((a, b) => b.deficitPercent - a.deficitPercent)
    .slice(0, 3);

  const topExcesses = [...validWithRef]
    .filter((e) => e.status === 'HIGH' && e.excessPercent > 0)
    .sort((a, b) => b.excessPercent - a.excessPercent)
    .slice(0, 3);

  const macroEvaluations = evaluations.filter((e) => e.group === 'MACRO');
  const microEvaluations = evaluations.filter((e) => e.group === 'MICRO');

  const allMeta = [...TISSUE_ELEMENTS, ...SOLO_ELEMENTS, ...SOLUCAO_ELEMENTS];
  const getRoleDescription = (code: string) =>
    allMeta.find((m) => m.code === code)?.agronomicRole ||
    'Equilíbrio fisiológico e nutricional da lavoura.';

  const cardClass = isDark
    ? 'bg-[#0e1726]/80 border-white/[0.07] text-slate-100'
    : 'bg-white border-slate-200/90 text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.04)]';

  const dividerClass = isDark ? 'divide-white/[0.06]' : 'divide-slate-100';
  const trackBg = isDark ? 'bg-white/[0.06]' : 'bg-slate-100';

  const renderBulletRow = (item: NutrientEvaluation) => {
    const statusMeta = getStatusMeta(item.status);
    const val = item.value ?? 0;
    const min = item.refMin ?? 0;
    const max = item.refMax ?? 0;
    const mid = item.refMid ?? (min + max) / 2;

    const domainMax = Math.max(max * 1.45, val * 1.15, 1);
    const minPct = Math.min(100, Math.max(0, (min / domainMax) * 100));
    const maxPct = Math.min(100, Math.max(minPct + 2, (max / domainMax) * 100));
    const midPct = Math.min(100, Math.max(0, (mid / domainMax) * 100));
    const valPct = item.value !== null ? Math.min(100, Math.max(1.5, (val / domainMax) * 100)) : 0;

    return (
      <div
        key={item.code}
        className={`py-3.5 px-1 transition-colors ${
          isDark ? 'hover:bg-white/[0.015]' : 'hover:bg-slate-50/70'
        }`}
      >
        {/* Row Top: Nutrient Identity + Measured Value + Status Pill */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                isDark
                  ? 'bg-white/[0.05] text-slate-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {item.code}
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold leading-tight truncate">{item.name}</div>
              <div className="text-[11px] text-slate-400 tabular-nums">
                {item.refMin !== null && item.refMax !== null
                  ? `Ideal: ${formatNumberPtBR(item.refMin)} – ${formatNumberPtBR(item.refMax)} ${item.unit}`
                  : item.unit}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right tabular-nums">
              <span className="text-sm font-bold">{formatNumberPtBR(item.value)}</span>
              <span className="text-[11px] text-slate-400 ml-1">{item.unit}</span>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border min-w-[54px] text-center ${
                isDark ? statusMeta.bgClass : statusMeta.lightBgClass
              }`}
            >
              {statusMeta.shortLabel}
            </span>
          </div>
        </div>

        {/* Sleek Precision Bullet Track */}
        <div
          className={`relative h-2.5 rounded-full overflow-hidden ${trackBg}`}
          title={
            item.refMin !== null && item.refMax !== null
              ? `Medido: ${formatNumberPtBR(item.value)} ${item.unit} | Ideal: ${formatNumberPtBR(
                  item.refMin
                )} – ${formatNumberPtBR(item.refMax)} ${item.unit}`
              : undefined
          }
        >
          {/* Ideal Band */}
          {item.refMin !== null && item.refMax !== null && (
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500/40 transition-all duration-500"
              style={{
                left: `${minPct}%`,
                width: `${Math.max(2, maxPct - minPct)}%`,
              }}
            />
          )}

          {/* Measured Bar */}
          {item.value !== null && (
            <div
              className="absolute top-[2px] bottom-[2px] left-0 rounded-full transition-all duration-500"
              style={{
                width: `${valPct}%`,
                backgroundColor: statusMeta.hex,
              }}
            />
          )}

          {/* Ideal Midpoint Marker */}
          {item.refMid !== null && (
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-emerald-400 z-10"
              style={{ left: `${midPct}%` }}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Row 1: 4 Minimalist KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Balance Index */}
        <div className={`p-5 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              Equilíbrio Nutricional
            </span>
            <Gauge className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2 tabular-nums">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-500">
              {formatPercentPtBR(balanceIndex, 1)}
            </span>
          </div>
          <div className={`mt-3 w-full h-1.5 rounded-full overflow-hidden ${trackBg}`}>
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, balanceIndex))}%` }}
            />
          </div>
        </div>

        {/* Card 2: Ideal Count */}
        <div className={`p-5 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              Na Faixa Ideal
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5 tabular-nums">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight">
              {idealCount}
            </span>
            <span className="text-sm text-slate-400 font-medium">/ {totalEvaluated}</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 truncate">
            {cultura} • {daeLabel === 'TODOS' ? 'Ciclo completo' : daeLabel}
          </p>
        </div>

        {/* Card 3: Below Minimum */}
        <div className={`p-5 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              Abaixo do Mínimo
            </span>
            <ArrowDownRight className="w-4 h-4 text-[#fb7185]" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2 tabular-nums">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#fb7185]">
              {lowCount}
            </span>
            <span className="text-xs text-slate-400">
              {lowCount === 1 ? 'déficit' : 'déficits'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 truncate">
            {lowCount > 0
              ? validWithRef
                  .filter((e) => e.status === 'LOW')
                  .map((e) => e.code)
                  .join(', ')
              : 'Sem deficiências'}
          </p>
        </div>

        {/* Card 4: Above Maximum */}
        <div className={`p-5 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              Acima do Máximo
            </span>
            <ArrowUpRight className="w-4 h-4 text-[#22d3ee]" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2 tabular-nums">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#22d3ee]">
              {highCount}
            </span>
            <span className="text-xs text-slate-400">
              {highCount === 1 ? 'excesso' : 'excessos'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 truncate">
            {highCount > 0
              ? validWithRef
                  .filter((e) => e.status === 'HIGH')
                  .map((e) => e.code)
                  .join(', ')
              : 'Sem excessos'}
          </p>
        </div>
      </div>

      {/* Row 2: Clean Top 3 Priorities Strip */}
      <div className={`p-5 rounded-2xl border ${cardClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            {topDeficits.length > 0 ? (
              <AlertTriangle className="w-4 h-4 text-[#fb7185]" />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-500" />
            )}
            <h2 className="text-sm font-bold tracking-tight">
              {topDeficits.length > 0
                ? 'Prioridades Agronômicas (Maiores Déficits)'
                : 'Diagnóstico de Equilíbrio'}
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 tabular-nums">
            {totalSamples} {totalSamples === 1 ? 'amostra analisada' : 'amostras no grupo'}
          </span>
        </div>

        {topDeficits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topDeficits.map((item, idx) => (
              <div
                key={item.code}
                className={`p-4 rounded-xl border-l-2 border-l-[#fb7185] ${
                  isDark ? 'bg-white/[0.025]' : 'bg-rose-50/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold">
                    {idx + 1}. {item.name}{' '}
                    <span className="text-slate-400 font-medium">({item.code})</span>
                  </span>
                  <span className="text-xs font-bold text-[#fb7185] tabular-nums inline-flex items-center gap-0.5">
                    <TrendingDown className="w-3.5 h-3.5" />
                    -{formatPercentPtBR(item.deficitPercent, 0)}
                  </span>
                </div>
                <div className="text-xs tabular-nums text-slate-400">
                  Medido <strong className="text-[#fb7185]">{formatNumberPtBR(item.value)}</strong>{' '}
                  • Mín. {formatNumberPtBR(item.refMin)} {item.unit}
                </div>
                <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                  {getRoleDescription(item.code)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`p-3.5 rounded-xl flex items-center gap-3 text-xs ${
              isDark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Nenhum nutriente abaixo da referência mínima para <strong>{cultura}</strong>.
              {topExcesses.length > 0 &&
                ` Acúmulos a monitorar: ${topExcesses
                  .map((e) => `${e.code} (+${formatPercentPtBR(e.excessPercent, 0)})`)
                  .join(', ')}.`}
            </span>
          </div>
        )}
      </div>

      {/* Row 3: Two Airy Bullet Chart Panels (Borderless Hairline Rows) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`p-5 sm:p-6 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between pb-3 mb-1 border-b border-current/10">
            <h3 className="text-sm font-bold tracking-tight">
              {tipoAnalise === 'SOLO'
                ? 'Fertilidade & Complexo Sortivo'
                : tipoAnalise === 'SOLUÇÃO'
                ? 'Íons Primários & Fisico-Química'
                : 'Macronutrientes'}
            </h3>
            <span className="text-[11px] text-slate-400 tabular-nums">
              {macroEvaluations.length} parâmetros
            </span>
          </div>
          <div className={`divide-y ${dividerClass}`}>
            {macroEvaluations.map((item) => renderBulletRow(item))}
          </div>
        </div>

        <div className={`p-5 sm:p-6 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between pb-3 mb-1 border-b border-current/10">
            <h3 className="text-sm font-bold tracking-tight">
              {tipoAnalise === 'SOLO'
                ? 'Micronutrientes & Relações Catiônicas'
                : tipoAnalise === 'SOLUÇÃO'
                ? 'Micronutrientes & Salinidade'
                : 'Micronutrientes'}
            </h3>
            <span className="text-[11px] text-slate-400 tabular-nums">
              {microEvaluations.length} parâmetros
            </span>
          </div>
          <div className={`divide-y ${dividerClass}`}>
            {microEvaluations.map((item) => renderBulletRow(item))}
          </div>
        </div>
      </div>
    </div>
  );
};
