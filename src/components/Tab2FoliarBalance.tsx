import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart2, Leaf, Scale } from 'lucide-react';
import {
  DatabaseStarSchema,
  FilterState,
  NutrientEvaluation,
} from '../types/schema';
import { formatNumberPtBR, formatPercentPtBR, safeDivide } from '../utils/formatters';
import { getReferenceBounds, TISSUE_ELEMENTS } from '../utils/referenceEngine';
import { MatrixSampleItem } from './Tab4SampleMatrix';

interface Tab2FoliarBalanceProps {
  db: DatabaseStarSchema;
  filters: FilterState;
  evaluations: NutrientEvaluation[];
  groupRecords: MatrixSampleItem[];
  activeRecords: MatrixSampleItem[];
  isDark: boolean;
}

export const Tab2FoliarBalance: React.FC<Tab2FoliarBalanceProps> = ({
  db,
  filters,
  evaluations,
  groupRecords,
  activeRecords,
  isDark,
}) => {
  const isSingleSample = filters.amostraMode !== 'GROUP_AVG' && activeRecords.length === 1;
  const [selectedElement, setSelectedElement] = useState<string>('N');

  const activeMeta =
    TISSUE_ELEMENTS.find((e) => e.code === selectedElement) || TISSUE_ELEMENTS[0];

  // 1. Divergent Balance Index (DRIS-style % deviation from Ideal Midpoint, sorted most limiting -> surplus)
  const divergentData = useMemo(() => {
    return evaluations
      .filter((e) => e.value !== null && e.refMid !== null && e.refMid > 0)
      .map((e) => {
        const rawDev = safeDivide(((e.value ?? 0) - (e.refMid ?? 1)) * 100, e.refMid, 0) ?? 0;
        const clamped = Math.max(-100, Math.min(100, Number(rawDev.toFixed(1))));
        const color =
          e.status === 'LOW' ? '#fb7185' : e.status === 'HIGH' ? '#22d3ee' : '#10b981';
        return {
          code: e.code,
          name: e.name,
          unit: e.unit,
          deviation: clamped,
          rawDeviation: Number(rawDev.toFixed(1)),
          value: e.value,
          refMin: e.refMin,
          refMax: e.refMax,
          refMid: e.refMid,
          status: e.status,
          color,
        };
      })
      .sort((a, b) => a.rawDeviation - b.rawDeviation);
  }, [evaluations]);

  // 2. Foliar Physiological Ratios (N/S, N/K, K/Mg, P/Zn)
  const foliarRatios = useMemo(() => {
    const getVal = (code: string) => evaluations.find((e) => e.code === code)?.value ?? null;
    const n = getVal('N');
    const s = getVal('S');
    const k = getVal('K');
    const mg = getVal('Mg');
    const p = getVal('P');
    const zn = getVal('Zn');

    // Note units: N, P, K, Mg, S in g/kg; Zn in mg/kg (converted for ratio display)
    const nS = safeDivide(n, s);
    const nK = safeDivide(n, k);
    const kMg = safeDivide(k, mg);
    const pZn = p !== null && zn !== null && zn > 0 ? safeDivide(p * 1000, zn) : null;

    const checkStatus = (v: number | null, min: number, max: number) => {
      if (v === null) return { label: '—', color: 'text-slate-400', dot: 'bg-slate-500' };
      if (v < min) return { label: 'Baixa', color: 'text-[#fb7185]', dot: 'bg-[#fb7185]' };
      if (v > max) return { label: 'Elevada', color: 'text-[#22d3ee]', dot: 'bg-[#22d3ee]' };
      return { label: 'Equilibrada', color: 'text-emerald-400', dot: 'bg-[#10b981]' };
    };

    return [
      {
        title: 'Relação N / S',
        value: nS,
        ideal: '10,0 – 16,0',
        hint: 'Conversão de N em proteína',
        ...checkStatus(nS, 10, 16),
      },
      {
        title: 'Relação N / K',
        value: nK,
        ideal: '1,8 – 2,8',
        hint: 'Vigor vs. enchimento',
        ...checkStatus(nK, 1.8, 2.8),
      },
      {
        title: 'Relação K / Mg',
        value: kMg,
        ideal: '3,5 – 7,0',
        hint: 'Risco de bloqueio de Mg',
        ...checkStatus(kMg, 3.5, 7.0),
      },
      {
        title: 'Relação P / Zn',
        value: pZn,
        ideal: '60 – 140',
        hint: 'Interação fósforo × zinco',
        ...checkStatus(pZn, 60, 140),
      },
    ];
  }, [evaluations]);

  // 3. Spatial Comparison across plots/samples for chosen element
  const sampleComparison = useMemo(() => {
    const bounds = getReferenceBounds(
      db,
      'FOLHA',
      filters.cultura,
      filters.dae !== 'TODOS' ? filters.dae : 'R1',
      selectedElement
    );

    return groupRecords
      .filter((r) => r.nutrients[selectedElement] !== null && r.nutrients[selectedElement] !== undefined)
      .slice(0, 15)
      .map((r) => {
        const val = r.nutrients[selectedElement] ?? 0;
        let color = '#10b981';
        if (bounds.min !== null && val < bounds.min) color = '#fb7185';
        else if (bounds.max !== null && val > bounds.max) color = '#22d3ee';
        return {
          label: r.amostra,
          valor: val,
          refMin: bounds.min,
          refMax: bounds.max,
          color,
        };
      });
  }, [groupRecords, selectedElement, db, filters.cultura, filters.dae]);

  const cardClass = isDark
    ? 'bg-[#111827]/80 border-[#1e293b] text-slate-100 backdrop-blur-md'
    : 'bg-white border-slate-200 text-slate-900 shadow-sm';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
      {/* Left 7 cols: Divergent Nutritional Balance Index (DRIS-style Limitation Order) */}
      <div className={`xl:col-span-7 p-5 rounded-2xl border flex flex-col ${cardClass}`}>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#1e293b]/70">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">
                Índice de Balanço Foliar (Ordem de Limitação Nutricional)
              </h2>
              <p className="text-xs text-slate-400">
                Desvio percentual ao centro ideal ({filters.cultura}) • Esquerda = maior carência
              </p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 tabular-nums">
            {isSingleSample ? activeRecords[0].amostra : `${activeRecords.length} amostras`}
          </span>
        </div>

        <div className="flex-1 min-h-[380px] mt-3">
          {divergentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart
                data={divergentData}
                layout="vertical"
                margin={{ top: 6, right: 24, left: 10, bottom: 6 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                <XAxis
                  type="number"
                  domain={[-100, 100]}
                  unit="%"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="code"
                  width={42}
                  tick={{ fill: isDark ? '#e2e8f0' : '#1e293b', fontSize: 12, fontWeight: 700 }}
                />
                <ReferenceLine x={0} stroke="#10b981" strokeWidth={2} />
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
                          Medido: <strong>{formatNumberPtBR(d.value)} {d.unit}</strong>
                        </div>
                        <div className="text-slate-400">
                          Ideal: {formatNumberPtBR(d.refMin)} – {formatNumberPtBR(d.refMax)} {d.unit}
                        </div>
                        <div className="text-cyan-300 font-semibold">
                          Desvio do alvo: {d.rawDeviation >= 0 ? '+' : ''}
                          {formatPercentPtBR(d.rawDeviation, 1)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="deviation" name="Desvio (%)" radius={[4, 4, 4, 4]} barSize={20}>
                  {divergentData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Sem dados com referência para calcular o balanço foliar.
            </div>
          )}
        </div>
      </div>

      {/* Right 5 cols: Physiological Ratios (Top) + Spatial Talhão Comparison (Bottom) */}
      <div className="xl:col-span-5 flex flex-col gap-5">
        {/* Foliar Ratios Card */}
        <div className={`p-5 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#1e293b]/70">
            <Scale className="w-4 h-4 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold">Relações Fisiológicas Foliares</h3>
              <p className="text-[11px] text-slate-400">
                Equilíbrio interno para evitar antagonismo nutricional
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 tabular-nums">
            {foliarRatios.map((r) => (
              <div
                key={r.title}
                className={`p-3 rounded-xl border ${
                  isDark ? 'bg-[#070d12]/60 border-[#1e293b]' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">{r.title}</span>
                  <span className={`w-2 h-2 rounded-full ${r.dot}`} />
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-lg font-extrabold">{formatNumberPtBR(r.value, 1)}</span>
                  <span className={`text-[10px] font-semibold ${r.color}`}>{r.label}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Ideal: {r.ideal}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Talhão / Plot Spatial Comparison */}
        {!isSingleSample && sampleComparison.length > 1 && (
          <div className={`p-5 rounded-2xl border flex-1 flex flex-col ${cardClass}`}>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#1e293b]/70">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">
                  Talhões — {activeMeta.name} ({activeMeta.unit})
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto py-2.5">
              {TISSUE_ELEMENTS.map((el) => (
                <button
                  key={el.code}
                  onClick={() => setSelectedElement(el.code)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold border transition cursor-pointer ${
                    el.code === selectedElement
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : isDark
                      ? 'bg-[#070d12] text-slate-300 border-[#1e293b] hover:border-emerald-500/40'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {el.code}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-[190px]">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={sampleComparison} margin={{ top: 8, right: 8, left: -10, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={46}
                  />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  {sampleComparison[0]?.refMin !== null && (
                    <ReferenceLine
                      y={sampleComparison[0].refMin as number}
                      stroke="#fb7185"
                      strokeDasharray="3 3"
                    />
                  )}
                  {sampleComparison[0]?.refMax !== null && (
                    <ReferenceLine
                      y={sampleComparison[0].refMax as number}
                      stroke="#10b981"
                      strokeDasharray="3 3"
                    />
                  )}
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-[#1e293b] bg-[#070d12]/95 p-2 text-xs text-slate-100 tabular-nums">
                          <div className="font-bold text-emerald-400">{d.label}</div>
                          <div>
                            {selectedElement}: <strong>{formatNumberPtBR(d.valor)} {activeMeta.unit}</strong>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]} barSize={18}>
                    {sampleComparison.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
