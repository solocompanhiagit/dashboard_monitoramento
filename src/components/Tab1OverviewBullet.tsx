import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Compass,
  Gauge,
  Info,
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

  // Top 3 Agronomic Priorities: nutrients below REF_MIN sorted by largest deficitPercent
  const topDeficits = [...validWithRef]
    .filter((e) => e.status === 'LOW' && e.deficitPercent > 0)
    .sort((a, b) => b.deficitPercent - a.deficitPercent)
    .slice(0, 3);

  // If fewer than 3 deficits exist, also surface the highest excesses as secondary watch items
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
    ? 'bg-[#111827]/80 border-[#1e293b] text-slate-100 backdrop-blur-md'
    : 'bg-white border-slate-200 text-slate-900 shadow-sm';

  const renderBulletRow = (item: NutrientEvaluation) => {
    const statusMeta = getStatusMeta(item.status);
    const val = item.value ?? 0;
    const min = item.refMin ?? 0;
    const max = item.refMax ?? 0;
    const mid = item.refMid ?? (min + max) / 2;

    // Dynamic horizontal scale so that the ideal band [min..max] and the measured value both fit cleanly
    const domainMax = Math.max(max * 1.45, val * 1.15, 1);
    const minPct = Math.min(100, Math.max(0, (min / domainMax) * 100));
    const maxPct = Math.min(100, Math.max(minPct + 2, (max / domainMax) * 100));
    const midPct = Math.min(100, Math.max(0, (mid / domainMax) * 100));
    const valPct = item.value !== null ? Math.min(100, Math.max(1.5, (val / domainMax) * 100)) : 0;

    return (
      <div
        key={item.code}
        className={`p-3.5 rounded-xl border transition-all ${
          isDark
            ? 'bg-[#070d12]/65 border-[#1e293b]/90 hover:border-slate-700'
            : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Top label line */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${
                isDark
                  ? 'bg-[#111827] border-[#1e293b] text-slate-200'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {item.code}
            </span>
            <div>
              <div className="text-xs font-semibold leading-tight">{item.name}</div>
              <div className="text-[10px] text-slate-400 tabular-nums">
                {item.refMin !== null && item.refMax !== null
                  ? `Faixa Ideal: ${formatNumberPtBR(item.refMin)} – ${formatNumberPtBR(
                      item.refMax
                    )} ${item.unit}`
                  : `Unidade: ${item.unit}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-right tabular-nums">
              <span className="text-sm font-bold">{formatNumberPtBR(item.value)}</span>
              <span className="text-[10px] text-slate-400 ml-1">{item.unit}</span>
            </div>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                isDark ? statusMeta.bgClass : statusMeta.lightBgClass
              }`}
            >
              {statusMeta.shortLabel}
            </span>
          </div>
        </div>

        {/* Bullet Chart Track */}
        <div className="relative h-6 rounded-lg overflow-hidden bg-slate-800/40 border border-slate-700/40">
          {/* Shaded Ideal Reference Zone (REF_MIN to REF_MAX) */}
          {item.refMin !== null && item.refMax !== null && (
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500/45 transition-all duration-500"
              style={{
                left: `${minPct}%`,
                width: `${Math.max(2, maxPct - minPct)}%`,
              }}
              title={`Faixa Ideal: ${formatNumberPtBR(item.refMin)} a ${formatNumberPtBR(
                item.refMax
              )} ${item.unit}`}
            />
          )}

          {/* Measured Value Bar */}
          {item.value !== null && (
            <div
              className="absolute top-1.5 bottom-1.5 left-0 rounded-r-md transition-all duration-500"
              style={{
                width: `${valPct}%`,
                backgroundColor: statusMeta.hex,
                opacity: 0.9,
              }}
            />
          )}

          {/* Vertical Ideal Midpoint Line */}
          {item.refMid !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.9)] z-10"
              style={{ left: `${midPct}%` }}
              title={`Centro Ideal: ${formatNumberPtBR(item.refMid)} ${item.unit}`}
            />
          )}
        </div>

        {/* Bottom Scale Legend */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 tabular-nums">
          <span>0,00</span>
          {item.refMin !== null && item.refMax !== null ? (
            <span className="text-emerald-400/90 font-medium">
              Mín: {formatNumberPtBR(item.refMin)} • Alvo: {formatNumberPtBR(item.refMid)} • Máx:{' '}
              {formatNumberPtBR(item.refMax)}
            </span>
          ) : (
            <span>Leitura laboratorial direta</span>
          )}
          <span>{formatNumberPtBR(domainMax, 1)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Row 1: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Nutritional Balance Index */}
        <div className={`p-4 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Índice de Equilíbrio Nutricional
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2 tabular-nums">
            <span className="text-3xl font-extrabold text-emerald-400">
              {formatPercentPtBR(balanceIndex, 1)}
            </span>
            <span className="text-xs text-slate-400">dentro da faixa ideal</span>
          </div>
          <div className="mt-3 w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, balanceIndex))}%` }}
            />
          </div>
        </div>

        {/* Card 2: Nutrients in Ideal Range */}
        <div className={`p-4 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Nutrientes no Ideal
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2 tabular-nums">
            <span className="text-3xl font-extrabold text-emerald-400">
              {idealCount}/{totalEvaluated}
            </span>
            <span className="text-xs text-slate-400">em equilíbrio ótimo</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            REF_MIN &le; leitura &le; REF_MAX ({cultura} •{' '}
            {daeLabel === 'TODOS' ? 'Ciclo Geral' : daeLabel})
          </p>
        </div>

        {/* Card 3: Below Minimum (Deficiencies) */}
        <div className={`p-4 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Abaixo do Mínimo (Déficit)
            </span>
            <div className="p-2 rounded-xl bg-rose-500/15 text-[#fb7185]">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2 tabular-nums">
            <span className="text-3xl font-extrabold text-[#fb7185]">{lowCount}</span>
            <span className="text-xs text-slate-400">
              {lowCount === 1 ? 'nutriente em deficiência' : 'nutrientes em deficiência'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {lowCount > 0
              ? `Atenção prioritária: ${validWithRef
                  .filter((e) => e.status === 'LOW')
                  .map((e) => e.code)
                  .join(', ')}`
              : 'Nenhuma deficiência detectada na leitura atual'}
          </p>
        </div>

        {/* Card 4: Above Maximum (Excesses / Accumulation) */}
        <div className={`p-4 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Acima do Máximo (Excesso)
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/15 text-[#22d3ee]">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2 tabular-nums">
            <span className="text-3xl font-extrabold text-[#22d3ee]">{highCount}</span>
            <span className="text-xs text-slate-400">
              {highCount === 1 ? 'nutriente acumulado' : 'nutrientes acumulados'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {highCount > 0
              ? `Acima da referência: ${validWithRef
                  .filter((e) => e.status === 'HIGH')
                  .map((e) => e.code)
                  .join(', ')}`
              : 'Nenhum excesso acima de REF_MAX'}
          </p>
        </div>
      </div>

      {/* Row 2: Top 3 Agronomic Priorities Card */}
      <div className={`p-5 rounded-2xl border ${cardClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3.5 border-b border-[#1e293b]/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/15 text-[#fb7185] border border-rose-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">
                Top 3 Prioridades Agronômicas (Diagnóstico Automático de Déficit)
              </h2>
              <p className="text-xs text-slate-400">
                Ordenado pelo maior déficit percentual relativo ao limite mínimo de referência{' '}
                <code className="text-rose-300">((REF_MIN - medido) / REF_MIN)</code>
              </p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 tabular-nums">
            Base: {totalSamples} {totalSamples === 1 ? 'amostra selecionada' : 'amostras no grupo'}
          </span>
        </div>

        {topDeficits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {topDeficits.map((item, idx) => (
              <div
                key={item.code}
                className={`p-4 rounded-xl border relative overflow-hidden ${
                  isDark
                    ? 'bg-[#070d12]/80 border-rose-500/30'
                    : 'bg-rose-50/50 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-[#fb7185] border border-rose-500/30">
                    #{idx + 1} Prioridade Crítica
                  </span>
                  <span className="text-sm font-extrabold text-[#fb7185] tabular-nums flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    -{formatPercentPtBR(item.deficitPercent, 1)} abaixo do mín.
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-2 tabular-nums">
                  <div>
                    <span className="text-lg font-bold">{item.name}</span>{' '}
                    <span className="text-xs font-semibold text-slate-400">({item.code})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-[#fb7185]">
                      {formatNumberPtBR(item.value)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {' '}
                      / mín. {formatNumberPtBR(item.refMin)} {item.unit}
                    </span>
                  </div>
                </div>

                <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
                  {getRoleDescription(item.code)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-emerald-300">
                  Nenhum nutriente abaixo da Referência Mínima!
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  Todos os elementos avaliados encontram-se na faixa ideal ou acima do limite mínimo
                  para {cultura}.
                  {topExcesses.length > 0 &&
                    ` Monitorar acúmulos elevados em: ${topExcesses
                      .map((e) => `${e.name} (+${formatPercentPtBR(e.excessPercent, 0)})`)
                      .join(', ')}.`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Row 3: Two Side-by-Side Bullet Chart Panels (Macronutrients & Micronutrients) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Panel: Macronutrientes / Parâmetros Primários */}
        <div className={`p-5 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1e293b]/70">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold">
                {tipoAnalise === 'SOLO'
                  ? 'Fertilidade Base & Complexo Sortivo'
                  : tipoAnalise === 'SOLUÇÃO'
                  ? 'Íons Primários & Fisico-Química'
                  : 'Macronutrientes Primários e Secundários (g/kg)'}
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 tabular-nums">
              {macroEvaluations.length} parâmetros
            </span>
          </div>

          <div className="space-y-3">
            {macroEvaluations.map((item) => renderBulletRow(item))}
          </div>
        </div>

        {/* Right Panel: Micronutrientes / Relações */}
        <div className={`p-5 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1e293b]/70">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm sm:text-base font-bold">
                {tipoAnalise === 'SOLO'
                  ? 'Micronutrientes & Relações Catiônicas'
                  : tipoAnalise === 'SOLUÇÃO'
                  ? 'Micronutrientes & Salinidade na Solução'
                  : 'Micronutrientes Essenciais (mg/kg)'}
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 tabular-nums">
              {microEvaluations.length} parâmetros
            </span>
          </div>

          <div className="space-y-3">
            {microEvaluations.map((item) => renderBulletRow(item))}
          </div>
        </div>
      </div>
    </div>
  );
};
