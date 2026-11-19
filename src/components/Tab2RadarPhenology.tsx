import React, { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Compass,
  Sprout,
} from 'lucide-react';
import {
  DatabaseStarSchema,
  FilterState,
  NutrientEvaluation,
} from '../types/schema';
import { formatNumberPtBR, formatPercentPtBR, safeDivide } from '../utils/formatters';
import {
  getReferenceBounds,
  getStageOrderScore,
  TISSUE_ELEMENTS,
} from '../utils/referenceEngine';
import { MatrixSampleItem } from './Tab4SampleMatrix';

interface Tab2RadarPhenologyProps {
  db: DatabaseStarSchema;
  filters: FilterState;
  evaluations: NutrientEvaluation[];
  groupEvaluations: NutrientEvaluation[]; // Média do grupo/propriedade para comparação
  groupRecords: MatrixSampleItem[]; // Todas as leituras da propriedade/variedade para curva ou comparativo
  activeRecords: MatrixSampleItem[];
  isDark: boolean;
}

export const Tab2RadarPhenology: React.FC<Tab2RadarPhenologyProps> = ({
  db,
  filters,
  evaluations,
  groupEvaluations,
  groupRecords,
  activeRecords,
  isDark,
}) => {
  const isSingleSample = filters.amostraMode !== 'GROUP_AVG' && activeRecords.length === 1;
  const inspectedSample = isSingleSample ? activeRecords[0] : null;

  const availableElements = TISSUE_ELEMENTS;
  const [selectedElement, setSelectedElement] = useState<string>('N');
  const [showStagesGuide, setShowStagesGuide] = useState<boolean>(false);
  const [singleSampleView, setSingleSampleView] = useState<'DEVIATION' | 'PROPERTY_CURVE'>('DEVIATION');

  const activeElementCode = useMemo(() => {
    if (availableElements.some((e) => e.code === selectedElement)) {
      return selectedElement;
    }
    return availableElements[0]?.code || 'N';
  }, [availableElements, selectedElement]);

  const activeElementMeta = useMemo(
    () =>
      availableElements.find((e) => e.code === activeElementCode) ||
      availableElements[0],
    [availableElements, activeElementCode]
  );

  // 1. Radar Chart Data (overlays Sample vs Property/Group Mean vs 100% Ideal Center)
  const radarData = useMemo(() => {
    return evaluations
      .filter((e) => e.radarNormalized !== null && e.refMin !== null && e.refMax !== null)
      .map((e) => {
        const groupItem = groupEvaluations.find((g) => g.code === e.code);
        return {
          subject: e.code,
          fullName: e.name,
          unit: e.unit,
          measuredPct: e.radarNormalized ?? 0,
          groupPct: groupItem?.radarNormalized ?? 100,
          idealCenterPct: 100,
          rawVal: e.value,
          groupRawVal: groupItem?.value ?? null,
          refMin: e.refMin,
          refMax: e.refMax,
        };
      });
  }, [evaluations, groupEvaluations]);

  // 2. Phenological Stage Curve Data across groupRecords (Property/Variety history)
  const curveData = useMemo(() => {
    const byStage = new Map<
      string,
      { sum: number; count: number; minVal: number; maxVal: number }
    >();

    for (const rec of groupRecords) {
      const stage = rec.dae || 'Não Inf.';
      if (stage === 'Não Inf.') continue;
      const val = rec.nutrients[activeElementCode];
      if (val === null || val === undefined || !Number.isFinite(val)) continue;

      const cur = byStage.get(stage) || {
        sum: 0,
        count: 0,
        minVal: val,
        maxVal: val,
      };
      cur.sum += val;
      cur.count += 1;
      cur.minVal = Math.min(cur.minVal, val);
      cur.maxVal = Math.max(cur.maxVal, val);
      byStage.set(stage, cur);
    }

    const sortedStages = [...byStage.keys()].sort(
      (a, b) => getStageOrderScore(a) - getStageOrderScore(b)
    );

    const hasRealRain = db.fChuvas.length > 0;

    return sortedStages.map((stage, idx) => {
      const item = byStage.get(stage)!;
      const avg = Number((item.sum / item.count).toFixed(2));
      const bounds = getReferenceBounds(
        db,
        filters.tipoAnalise,
        filters.cultura,
        stage,
        activeElementCode
      );

      let mmChuva: number | null = null;
      if (hasRealRain) {
        const rainRow = db.fChuvas[idx % db.fChuvas.length];
        mmChuva = rainRow ? rainRow.MM_CHUVA : 0;
      }

      return {
        stage,
        medido: avg,
        amostras: item.count,
        refMin: bounds.min ?? 0,
        refMax: bounds.max ?? 0,
        mmChuva,
      };
    });
  }, [
    groupRecords,
    activeElementCode,
    db,
    filters.tipoAnalise,
    filters.cultura,
  ]);

  const hasMultiStageCurve = curveData.length >= 2;

  // 3. Single Sample Deviation Diagnostic (% relative to Ideal Midpoint & Group Avg)
  const sampleDeviationData = useMemo(() => {
    return evaluations
      .filter((e) => e.value !== null && e.refMid !== null)
      .map((e) => {
        const gItem = groupEvaluations.find((g) => g.code === e.code);
        const pctOfIdeal = safeDivide((e.value ?? 0) * 100, e.refMid, 100) ?? 100;
        const pctVsGroup =
          gItem?.value && gItem.value > 0
            ? safeDivide(((e.value ?? 0) - gItem.value) * 100, gItem.value, 0) ?? 0
            : 0;
        return {
          code: e.code,
          name: e.name,
          unit: e.unit,
          pctOfIdeal: Math.min(200, Number(pctOfIdeal.toFixed(1))),
          pctVsGroup: Number(pctVsGroup.toFixed(1)),
          rawVal: e.value,
          groupVal: gItem?.value ?? null,
          status: e.status,
          color:
            e.status === 'LOW'
              ? '#fb7185'
              : e.status === 'HIGH'
              ? '#22d3ee'
              : '#10b981',
        };
      });
  }, [evaluations, groupEvaluations]);

  // 4. Sample vs Talhão Comparison (when only 1 stage exists, e.g. Folha)
  const talhaoComparisonData = useMemo(() => {
    const activeBounds = getReferenceBounds(
      db,
      filters.tipoAnalise,
      filters.cultura,
      filters.dae !== 'TODOS' ? filters.dae : 'R1',
      activeElementCode
    );
    return groupRecords
      .filter((r) => r.nutrients[activeElementCode] !== null && r.nutrients[activeElementCode] !== undefined)
      .slice(0, 18)
      .map((r) => {
        const val = r.nutrients[activeElementCode] ?? 0;
        let color = '#10b981';
        if (activeBounds.min !== null && val < activeBounds.min) color = '#fb7185';
        else if (activeBounds.max !== null && val > activeBounds.max) color = '#22d3ee';
        return {
          label: `${r.amostra} (#${r.idAnalise})`,
          valor: val,
          refMin: activeBounds.min,
          refMax: activeBounds.max,
          color,
        };
      });
  }, [groupRecords, activeElementCode, db, filters.tipoAnalise, filters.cultura, filters.dae]);

  // Phenological Stages Table for current crop (only when not inspecting single sample)
  const cropStages = useMemo(() => {
    const cleanCult = filters.cultura.toLowerCase();
    const matched = db.dEstagios.filter((e) =>
      e.NOME_CULTURA.toLowerCase().includes(cleanCult)
    );
    return matched.length > 0 ? matched : db.dEstagios;
  }, [db.dEstagios, filters.cultura]);

  const cardClass = isDark
    ? 'bg-[#0e1726]/80 border-white/[0.07] text-slate-100'
    : 'bg-white border-slate-200/90 text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.04)]';

  const inspectedSampleStageVal =
    inspectedSample && inspectedSample.nutrients[activeElementCode] !== null
      ? inspectedSample.nutrients[activeElementCode]
      : null;
  const inspectedSampleInCurve =
    inspectedSample && curveData.some((c) => c.stage === inspectedSample.dae);

  const showDeviationBars =
    isSingleSample && (!hasMultiStageCurve || singleSampleView === 'DEVIATION');

  return (
    <div className="space-y-5">
      {/* Top Grid: Radar Chart + Contextual Right Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left 5 cols: Nutritional Balance Radar */}
        <div className={`xl:col-span-5 p-5 rounded-2xl border flex flex-col ${cardClass}`}>
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#1e293b]/70">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold">
                  Radar de Equilíbrio Nutricional
                </h2>
                <p className="text-xs text-slate-400">
                  {isSingleSample
                    ? `Amostra ${inspectedSample?.amostra} comparada à média do grupo e ao centro ideal (100%)`
                    : 'Normalizado para % do centro ideal (100% = média entre REF_MIN e REF_MAX, teto 200%)'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[340px] mt-3">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart cx="50%" cy="50%" outerRadius="74%" data={radarData}>
                  <PolarGrid stroke={isDark ? '#1e293b' : '#cbd5e1'} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{
                      fill: isDark ? '#e2e8f0' : '#1e293b',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 200]}
                    tickCount={5}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Radar
                    name="Centro Ideal (100%)"
                    dataKey="idealCenterPct"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fill="#10b981"
                    fillOpacity={0.1}
                  />
                  {isSingleSample && (
                    <Radar
                      name="Média do Grupo (%)"
                      dataKey="groupPct"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      fill="#94a3b8"
                      fillOpacity={0.08}
                    />
                  )}
                  <Radar
                    name={isSingleSample ? `Amostra ${inspectedSample?.amostra}` : 'Leitura Medida (%)'}
                    dataKey="measuredPct"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fill="#06b6d4"
                    fillOpacity={0.32}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-[#1e293b] bg-[#070d12]/95 p-3 text-xs text-slate-100 shadow-xl tabular-nums">
                          <div className="font-bold text-emerald-400 mb-1">
                            {d.fullName} ({d.subject})
                          </div>
                          <div>
                            Valor Medido:{' '}
                            <strong className="text-white">
                              {formatNumberPtBR(d.rawVal)} {d.unit}
                            </strong>
                          </div>
                          {isSingleSample && d.groupRawVal !== null && (
                            <div className="text-slate-300">
                              Média do Grupo: {formatNumberPtBR(d.groupRawVal)} {d.unit}
                            </div>
                          )}
                          <div>
                            Faixa Ideal: {formatNumberPtBR(d.refMin)} –{' '}
                            {formatNumberPtBR(d.refMax)} {d.unit}
                          </div>
                          <div className="mt-1 pt-1 border-t border-slate-800 text-cyan-300 font-semibold">
                            Índice relativo ao centro ideal: {formatPercentPtBR(d.measuredPct, 1)}
                          </div>
                        </div>
                      );
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sem faixas de referência cadastradas para os parâmetros atuais.
              </div>
            )}
          </div>

          <div className="mt-2 pt-3 border-t border-[#1e293b]/60 grid grid-cols-3 gap-2 text-[11px] text-center tabular-nums">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
              &lt; 75% do centro: <strong>Deficiência</strong>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              100% Polígono: <strong>Alvo Ótimo</strong>
            </div>
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
              &gt; 130% do centro: <strong>Acúmulo</strong>
            </div>
          </div>
        </div>

        {/* Right 7 cols: Smart Context Chart */}
        <div className={`xl:col-span-7 p-5 rounded-2xl border flex flex-col ${cardClass}`}>
          {showDeviationBars ? (
            /* CASE A: Single Sample Inspection -> Deviation Bars (Much clearer than a 1-point timeline!) */
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#1e293b]/70">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold">
                      Diagnóstico Pontual da Amostra ({inspectedSample?.amostra} • Estágio{' '}
                      {inspectedSample?.dae})
                    </h2>
                    <p className="text-xs text-slate-400">
                      Desempenho de cada nutriente relativo ao centro ideal (100%) e comparação com a
                      média do grupo do cliente
                    </p>
                  </div>
                </div>

                {hasMultiStageCurve && (
                  <button
                    onClick={() => setSingleSampleView('PROPERTY_CURVE')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer shrink-0"
                  >
                    Ver Posição na Curva da Fazenda →
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-[340px] mt-4">
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart
                    data={sampleDeviationData}
                    margin={{ top: 12, right: 20, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                    <XAxis
                      dataKey="code"
                      tick={{ fill: isDark ? '#e2e8f0' : '#334155', fontSize: 12, fontWeight: 700 }}
                    />
                    <YAxis
                      domain={[0, 200]}
                      unit="%"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <ReferenceLine
                      y={100}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{ value: 'Alvo Ideal (100%)', fill: '#10b981', fontSize: 11 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-[#1e293b] bg-[#070d12]/95 p-3 text-xs text-slate-100 shadow-xl tabular-nums space-y-1">
                            <div className="font-bold text-emerald-400">
                              {d.name} ({d.code})
                            </div>
                            <div>
                              Amostra {inspectedSample?.amostra}:{' '}
                              <strong>
                                {formatNumberPtBR(d.rawVal)} {d.unit}
                              </strong>
                            </div>
                            {d.groupVal !== null && (
                              <div>
                                Média do Grupo: {formatNumberPtBR(d.groupVal)} {d.unit} (
                                {d.pctVsGroup >= 0 ? '+' : ''}
                                {formatPercentPtBR(d.pctVsGroup, 1)})
                              </div>
                            )}
                            <div className="text-cyan-300 font-semibold">
                              Índice vs Centro Ideal: {formatPercentPtBR(d.pctOfIdeal, 1)}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="pctOfIdeal" name="% do Centro Ideal" radius={[6, 6, 0, 0]} barSize={28}>
                      {sampleDeviationData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : !hasMultiStageCurve ? (
            /* CASE B: Multi-sample group with only 1 stage (e.g. Folha collected only in R1 or Not Inf.) -> Compare samples side-by-side */
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#1e293b]/70">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold">
                      Comparativo Entre Amostras / Talhões — {activeElementMeta?.name} (
                      {activeElementMeta?.unit})
                    </h2>
                    <p className="text-xs text-slate-400">
                      Este lote possui apenas 1 estágio fenológico ({curveData[0]?.stage || 'único'});
                      exibindo variação espacial entre amostras em vez de curva temporal
                    </p>
                  </div>
                </div>
              </div>

              {/* Element Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-3">
                {availableElements.map((el) => {
                  const active = el.code === activeElementCode;
                  return (
                    <button
                      key={el.code}
                      onClick={() => setSelectedElement(el.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                          : isDark
                          ? 'bg-[#070d12] text-slate-300 border-[#1e293b] hover:border-emerald-500/40'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {el.code}{' '}
                      <span className="font-normal opacity-75 text-[10px]">({el.unit})</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 min-h-[290px]">
                <ResponsiveContainer width="100%" height={290}>
                  <BarChart
                    data={talhaoComparisonData}
                    margin={{ top: 10, right: 16, left: 0, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={58}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      unit={` ${activeElementMeta?.unit || ''}`}
                    />
                    {talhaoComparisonData[0]?.refMin !== null && (
                      <ReferenceLine
                        y={talhaoComparisonData[0]?.refMin as number}
                        stroke="#fb7185"
                        strokeDasharray="4 4"
                        label={{ value: 'REF_MIN', fill: '#fb7185', fontSize: 10 }}
                      />
                    )}
                    {talhaoComparisonData[0]?.refMax !== null && (
                      <ReferenceLine
                        y={talhaoComparisonData[0]?.refMax as number}
                        stroke="#10b981"
                        strokeDasharray="4 4"
                        label={{ value: 'REF_MAX', fill: '#10b981', fontSize: 10 }}
                      />
                    )}
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-[#1e293b] bg-[#070d12]/95 p-3 text-xs text-slate-100 shadow-xl tabular-nums">
                            <div className="font-bold text-emerald-400">{d.label}</div>
                            <div className="mt-1">
                              {activeElementCode}:{' '}
                              <strong>
                                {formatNumberPtBR(d.valor)} {activeElementMeta?.unit}
                              </strong>
                            </div>
                            <div className="text-slate-400">
                              Ideal: {formatNumberPtBR(d.refMin)} – {formatNumberPtBR(d.refMax)}{' '}
                              {activeElementMeta?.unit}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="valor" name={activeElementCode} radius={[4, 4, 0, 0]} barSize={22}>
                      {talhaoComparisonData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            /* CASE C: Multi-stage Phenological Curve (>= 2 stages) */
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#1e293b]/70">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold">
                      {isSingleSample
                        ? `Posição de ${inspectedSample?.amostra} na Curva da Propriedade (${activeElementMeta?.name})`
                        : `Curva de Absorção por Estágio Fenológico (${activeElementMeta?.name} ${activeElementMeta?.unit})`}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Eixo X agrupado por Estágio Fenológico com banda sombreada de REF_MIN a REF_MAX
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isSingleSample && (
                    <button
                      onClick={() => setSingleSampleView('DEVIATION')}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition cursor-pointer"
                    >
                      ← Desvio da Amostra
                    </button>
                  )}
                </div>
              </div>

              {/* Element Selector Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-3">
                {availableElements.map((el) => {
                  const active = el.code === activeElementCode;
                  return (
                    <button
                      key={el.code}
                      onClick={() => setSelectedElement(el.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                          : isDark
                          ? 'bg-[#070d12] text-slate-300 border-[#1e293b] hover:border-emerald-500/40'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {el.code}{' '}
                      <span className="font-normal opacity-75 text-[10px]">({el.unit})</span>
                    </button>
                  );
                })}
              </div>

              {/* Composed Line + Reference Band + Optional Inspected Sample Pin */}
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart
                    data={curveData}
                    margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                    <XAxis
                      dataKey="stage"
                      tick={{
                        fill: isDark ? '#cbd5e1' : '#334155',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      unit={` ${activeElementMeta?.unit || ''}`}
                    />
                    {db.fChuvas.length > 0 && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: '#38bdf8', fontSize: 11 }}
                        unit=" mm"
                      />
                    )}
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const row = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-[#1e293b] bg-[#070d12]/95 p-3 text-xs text-slate-100 shadow-xl tabular-nums space-y-1">
                            <div className="font-bold text-emerald-400">
                              Estágio Fenológico: {label} ({row.amostras} leituras)
                            </div>
                            <div>
                              Média da Propriedade ({activeElementCode}):{' '}
                              <strong className="text-white">
                                {formatNumberPtBR(row.medido)} {activeElementMeta?.unit}
                              </strong>
                            </div>
                            <div>
                              Faixa Ideal (REF_MIN – REF_MAX):{' '}
                              <span className="text-emerald-300">
                                {formatNumberPtBR(row.refMin)} – {formatNumberPtBR(row.refMax)}{' '}
                                {activeElementMeta?.unit}
                              </span>
                            </div>
                            {row.mmChuva !== null && (
                              <div className="text-cyan-300">
                                Precipitação: {formatNumberPtBR(row.mmChuva, 1)} mm
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />

                    {db.fChuvas.length > 0 && (
                      <Bar
                        yAxisId="right"
                        dataKey="mmChuva"
                        name="Precipitação (mm)"
                        fill="#06b6d4"
                        fillOpacity={0.25}
                        barSize={24}
                        radius={[4, 4, 0, 0]}
                      />
                    )}

                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="refMax"
                      name="Limite Máx. Ideal (REF_MAX)"
                      stroke="#10b981"
                      strokeDasharray="3 3"
                      fill="#10b981"
                      fillOpacity={0.14}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="refMin"
                      name="Limite Mín. Ideal (REF_MIN)"
                      stroke="#fb7185"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="medido"
                      name={`Média da Fazenda (${activeElementCode})`}
                      stroke="#22d3ee"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#22d3ee', strokeWidth: 2, stroke: '#070d12' }}
                      activeDot={{ r: 7 }}
                    />
                    {isSingleSample && inspectedSampleInCurve && inspectedSampleStageVal !== null && (
                      <ReferenceDot
                        yAxisId="left"
                        x={inspectedSample!.dae}
                        y={inspectedSampleStageVal}
                        r={8}
                        fill="#fb7185"
                        stroke="#ffffff"
                        strokeWidth={2}
                        label={{
                          value: `${inspectedSample!.amostra}: ${formatNumberPtBR(inspectedSampleStageVal)}`,
                          position: 'top',
                          fill: '#fb7185',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compact Collapsible Phenological Reference Guide */}
      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
        <button
          onClick={() => setShowStagesGuide((v) => !v)}
          className="w-full px-5 py-3 flex items-center justify-between text-xs font-semibold hover:bg-slate-800/30 transition cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Sprout className="w-4 h-4 text-emerald-400" />
            <span>
              Guia de Estágios Fenológicos ({filters.cultura} • {cropStages.length} estágios)
            </span>
          </span>
          {showStagesGuide ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showStagesGuide && (
          <div className="px-5 pb-4 pt-1 border-t border-[#1e293b]/60">
            <div className="max-h-56 overflow-y-auto rounded-xl border border-[#1e293b]/60">
              <table className="w-full text-left text-xs">
                <thead
                  className={`sticky top-0 ${
                    isDark ? 'bg-[#070d12] text-slate-400' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <tr>
                    <th className="py-2 px-3 font-semibold">Fase</th>
                    <th className="py-2 px-3 font-semibold">Estágio Fenológico</th>
                    <th className="py-2 px-3 font-semibold text-right">DAE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/50">
                  {cropStages.map((st) => {
                    const highlightStage =
                      inspectedSample &&
                      st.ESTAGIOS.toUpperCase().startsWith(inspectedSample.dae.toUpperCase());
                    return (
                      <tr
                        key={st.ID_ESTAGIO}
                        className={
                          highlightStage
                            ? 'bg-emerald-500/15'
                            : isDark
                            ? 'hover:bg-slate-800/40'
                            : 'hover:bg-slate-50'
                        }
                      >
                        <td className="py-2 px-3 text-slate-400">{st.FASE}</td>
                        <td className="py-2 px-3 font-medium">
                          {st.ESTAGIOS}
                          {highlightStage && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                              Amostra Atual
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-400">
                          {st.DIAS !== null ? `${st.DIAS} dias` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
