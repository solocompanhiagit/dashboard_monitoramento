import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Layers, PieChart as PieIcon, Scale, ShieldCheck } from 'lucide-react';
import { FilterState, NutrientEvaluation } from '../types/schema';
import { formatNumberPtBR, formatPercentPtBR } from '../utils/formatters';
import { MatrixSampleItem } from './Tab4SampleMatrix';

interface Tab2SoilFertilityProfileProps {
  filters: FilterState;
  evaluations: NutrientEvaluation[];
  clientSoilRecords: MatrixSampleItem[]; // Scoped to active client + property + texture
  activeRecords: MatrixSampleItem[]; // Either group or single inspected sample
  isDark: boolean;
}

export const Tab2SoilFertilityProfile: React.FC<Tab2SoilFertilityProfileProps> = ({
  filters,
  evaluations,
  clientSoilRecords,
  activeRecords,
  isDark,
}) => {
  const isSingleSample = filters.amostraMode !== 'GROUP_AVG' && activeRecords.length === 1;

  // Compute averages helper
  const computeAvg = (rows: MatrixSampleItem[], code: string): number | null => {
    let sum = 0;
    let cnt = 0;
    for (const r of rows) {
      const v = r.nutrients[code];
      if (v !== null && v !== undefined && Number.isFinite(v)) {
        sum += v;
        cnt += 1;
      }
    }
    return cnt > 0 ? Number((sum / cnt).toFixed(2)) : null;
  };

  // 1. Radar de Fertilidade & Equilíbrio Químico do Solo (normalized vs ideal midpoint)
  const soilRadarData = useMemo(() => {
    const priorityCodes = ['pH (CaCl2)', 'V', 'Ca', 'Mg', 'K_1', 'P(mel)', 'S', 'M.O', 'B', 'Zn'];
    return evaluations
      .filter((e) => priorityCodes.includes(e.code) && e.radarNormalized !== null)
      .map((e) => ({
        subject: e.code === 'pH (CaCl2)' ? 'pH' : e.code === 'K_1' ? 'K' : e.code === 'P(mel)' ? 'P' : e.code,
        fullName: e.name,
        unit: e.unit,
        measuredPct: e.radarNormalized ?? 0,
        idealCenterPct: 100,
        rawVal: e.value,
        refMin: e.refMin,
        refMax: e.refMax,
      }));
  }, [evaluations]);

  // 2. Complexo Sortivo: Participação na CTC (%Ca/CTC, %Mg/CTC, %K/CTC, %H+Al/CTC)
  const ctcPartitionData = useMemo(() => {
    const caCtc = computeAvg(activeRecords, 'Ca/CTC') ?? 0;
    const mgCtc = computeAvg(activeRecords, 'Mg/CTC') ?? 0;
    const kCtc = computeAvg(activeRecords, 'K/CTC') ?? 0;
    const hAlCtc = computeAvg(activeRecords, 'H+Al/CTC') ?? 0;

    return [
      {
        ion: 'Cálcio (%Ca/CTC)',
        medido: caCtc,
        alvoIdeal: 45,
        faixaIdeal: '35% – 55%',
        color: '#10b981',
      },
      {
        ion: 'Magnésio (%Mg/CTC)',
        medido: mgCtc,
        alvoIdeal: 15,
        faixaIdeal: '10% – 20%',
        color: '#22d3ee',
      },
      {
        ion: 'Potássio (%K/CTC)',
        medido: kCtc,
        alvoIdeal: 4,
        faixaIdeal: '3% – 5%',
        color: '#34d399',
      },
      {
        ion: 'Acidez (%H+Al/CTC)',
        medido: hAlCtc,
        alvoIdeal: 25,
        faixaIdeal: '< 30%',
        color: '#fb7185',
      },
    ];
  }, [activeRecords]);

  // 3. Gradiente por Profundidade (0 - 20cm vs 20 - 40cm) dentro do escopo do cliente
  const depthComparisonData = useMemo(() => {
    // If single sample selected, try matching same sample base name across depths; otherwise compare client's 0-20 vs 20-40
    let targetRows = clientSoilRecords;
    if (isSingleSample) {
      const sampleBase = activeRecords[0].amostra.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
      const paired = clientSoilRecords.filter((r) =>
        r.amostra.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase() === sampleBase
      );
      if (paired.length > 0) targetRows = paired;
    }

    const r0_20 = targetRows.filter((r) => r.dae.includes('0 - 20'));
    const r20_40 = targetRows.filter((r) => r.dae.includes('20 - 40'));

    const params = [
      { code: 'pH (CaCl2)', label: 'pH CaCl₂', unit: 'un' },
      { code: 'Ca', label: 'Cálcio', unit: 'cmolc/dm³' },
      { code: 'Mg', label: 'Magnésio', unit: 'cmolc/dm³' },
      { code: 'S', label: 'Enxofre', unit: 'mg/dm³' },
      { code: 'M.O', label: 'Mat. Org.', unit: 'dag/kg' },
      { code: 'V', label: 'V% / 10', unit: '×10%', divisor: 10 },
    ];

    return params.map((p) => {
      const v1 = computeAvg(r0_20, p.code);
      const v2 = computeAvg(r20_40, p.code);
      const div = p.divisor || 1;
      return {
        param: p.label,
        unit: p.unit,
        prof0_20: v1 !== null ? Number((v1 / div).toFixed(2)) : 0,
        prof20_40: v2 !== null ? Number((v2 / div).toFixed(2)) : 0,
        raw0_20: v1,
        raw20_40: v2,
      };
    });
  }, [clientSoilRecords, activeRecords, isSingleSample]);

  // 4. Granulometria & Relações Catiônicas
  const textureMetrics = useMemo(() => {
    const argila = computeAvg(activeRecords, 'ArgilaPercent');
    const silteRaw = computeAvg(activeRecords, 'Silte');
    const areiaRaw = computeAvg(activeRecords, 'Areia');

    // Normalize g/kg -> % if > 100
    const toPct = (v: number | null) =>
      v === null ? null : v > 100 ? Number((v / 10).toFixed(1)) : Number(v.toFixed(1));

    const argPct = argila !== null ? Number(argila.toFixed(1)) : 0;
    const siltePct = toPct(silteRaw) ?? 0;
    const areiaPct = toPct(areiaRaw) ?? Math.max(0, 100 - argPct - siltePct);

    const caMg = computeAvg(activeRecords, 'Ca/Mg');
    const caK = computeAvg(activeRecords, 'Ca/K');
    const mgK = computeAvg(activeRecords, 'Mg/K');
    const ctc = computeAvg(activeRecords, 'CTC');
    const vPct = computeAvg(activeRecords, 'V');
    const mPct = computeAvg(activeRecords, 'm');

    const texturaDominante = activeRecords[0]?.variedade || 'Argiloso / Médio';

    return {
      argPct,
      siltePct,
      areiaPct,
      texturaDominante,
      caMg,
      caK,
      mgK,
      ctc,
      vPct,
      mPct,
    };
  }, [activeRecords]);

  const cardClass = isDark
    ? 'bg-[#0e1726]/80 border-white/[0.07] text-slate-100'
    : 'bg-white border-slate-200/90 text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.04)]';

  return (
    <div className="space-y-5">
      {/* Banner explaining Soil-specific Agronomic View */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardClass}`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold">
              Perfil Químico do Solo, Saturação na CTC & Gradiente de Profundidade
            </h2>
            <p className="text-xs text-slate-400">
              Visualização dedicada à química e física do solo (sem estágios fenológicos ou curva de
              absorção foliar), ajustada ao teor de argila e CTC das amostras selecionadas.
            </p>
          </div>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold tabular-nums self-start sm:self-auto">
          {isSingleSample
            ? `Amostra: ${activeRecords[0].amostra}`
            : `Grupo: ${activeRecords.length} leituras de solo`}
        </span>
      </div>

      {/* Top Row: Soil Radar (5 cols) + CTC Cation Partition (7 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left 5 cols: Soil Fertility Radar */}
        <div className={`xl:col-span-5 p-5 rounded-2xl border flex flex-col ${cardClass}`}>
          <div className="flex items-center gap-2 pb-3 border-b border-[#1e293b]/70">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold">Radar de Equilíbrio Químico do Solo</h3>
              <p className="text-[11px] text-slate-400">
                100% = centro ideal para Argila {formatNumberPtBR(textureMetrics.argPct, 0)}% (dElementoSoloRef)
              </p>
            </div>
          </div>

          <div className="flex-1 min-h-[310px] mt-2">
            {soilRadarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={310}>
                <RadarChart cx="50%" cy="50%" outerRadius="74%" data={soilRadarData}>
                  <PolarGrid stroke={isDark ? '#1e293b' : '#cbd5e1'} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: isDark ? '#e2e8f0' : '#1e293b', fontSize: 12, fontWeight: 700 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 200]}
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
                    fillOpacity={0.12}
                  />
                  <Radar
                    name="Solo Medido (%)"
                    dataKey="measuredPct"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fill="#06b6d4"
                    fillOpacity={0.32}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-[#1e293b] bg-[#070d12]/95 p-3 text-xs text-slate-100 shadow-xl tabular-nums">
                          <div className="font-bold text-emerald-400 mb-1">{d.fullName}</div>
                          <div>
                            Valor Medido: <strong>{formatNumberPtBR(d.rawVal)} {d.unit}</strong>
                          </div>
                          <div>
                            Faixa Ideal: {formatNumberPtBR(d.refMin)} – {formatNumberPtBR(d.refMax)} {d.unit}
                          </div>
                          <div className="mt-1 text-cyan-300 font-semibold">
                            Equilíbrio: {formatPercentPtBR(d.measuredPct, 1)}
                          </div>
                        </div>
                      );
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sem dados suficientes de solo para compor o radar.
              </div>
            )}
          </div>
        </div>

        {/* Right 7 cols: Cation Saturation on CTC (%Ca, %Mg, %K, %H+Al) */}
        <div className={`xl:col-span-7 p-5 rounded-2xl border flex flex-col ${cardClass}`}>
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]/70">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold">
                  Participação das Bases & Acidez na CTC a pH 7,0 (%)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Comparativo da ocupação da CTC vs. alvo agronômico ideal (Ca 45%, Mg 15%, K 4%, H+Al &lt;30%)
                </p>
              </div>
            </div>
            <span className="text-xs font-bold tabular-nums text-emerald-400">
              V% = {formatPercentPtBR(textureMetrics.vPct, 1)}
            </span>
          </div>

          <div className="flex-1 min-h-[290px] mt-3">
            <ResponsiveContainer width="100%" height={290}>
              <BarChart
                data={ctcPartitionData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 20, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                <XAxis
                  type="number"
                  domain={[0, 75]}
                  unit="%"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="ion"
                  width={135}
                  tick={{ fill: isDark ? '#e2e8f0' : '#334155', fontSize: 11, fontWeight: 600 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const row = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-[#1e293b] bg-[#070d12]/95 p-3 text-xs text-slate-100 shadow-xl tabular-nums">
                        <div className="font-bold text-emerald-400 mb-1">{row.ion}</div>
                        <div>
                          Medido na CTC: <strong>{formatPercentPtBR(row.medido, 1)}</strong>
                        </div>
                        <div className="text-cyan-300">
                          Faixa Agronômica Ideal: {row.faixaIdeal}
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="medido" name="Ocupação Medida (%)" radius={[0, 6, 6, 0]} barSize={20}>
                  {ctcPartitionData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
                <Bar
                  dataKey="alvoIdeal"
                  name="Alvo Agronômico (%)"
                  fill="#64748b"
                  fillOpacity={0.35}
                  radius={[0, 6, 6, 0]}
                  barSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Depth Gradient 0-20 vs 20-40cm (7 cols) + Granulometry & Ratios (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Depth Gradient Chart */}
        <div className={`xl:col-span-7 p-5 rounded-2xl border ${cardClass}`}>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1e293b]/70">
            <div>
              <h3 className="text-sm font-bold">
                Gradiente Químico por Profundidade: 0 - 20cm vs 20 - 40cm
              </h3>
              <p className="text-[11px] text-slate-400">
                Avaliação da construção de perfil radicular (pH, Ca, Mg, S, Matéria Orgânica e V%/10)
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={depthComparisonData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
              <XAxis
                dataKey="param"
                tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11, fontWeight: 600 }}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#475569" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const row = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-[#1e293b] bg-[#070d12]/95 p-3 text-xs text-slate-100 shadow-xl tabular-nums space-y-1">
                      <div className="font-bold text-emerald-400">{label}</div>
                      <div>
                        0 - 20 cm: <strong>{formatNumberPtBR(row.raw0_20)} {row.unit}</strong>
                      </div>
                      <div>
                        20 - 40 cm: <strong>{formatNumberPtBR(row.raw20_40)} {row.unit}</strong>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="prof0_20" name="Camada 0 - 20 cm" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="prof20_40" name="Camada 20 - 40 cm" fill="#06b6d4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Granulometry & Stoichiometric Cation Ratios */}
        <div className={`xl:col-span-5 p-5 rounded-2xl border flex flex-col justify-between ${cardClass}`}>
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1e293b]/70">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Granulometria & Relações Catiônicas</h3>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                {textureMetrics.texturaDominante}
              </span>
            </div>

            {/* Granulometric Stacked Composition Bar */}
            <div className="space-y-2 mb-5">
              <div className="flex items-center justify-between text-xs tabular-nums">
                <span className="font-semibold text-slate-300">Composição Textural Média</span>
                <span className="text-slate-400">
                  Argila {formatPercentPtBR(textureMetrics.argPct, 1)} • Silte{' '}
                  {formatPercentPtBR(textureMetrics.siltePct, 1)} • Areia{' '}
                  {formatPercentPtBR(textureMetrics.areiaPct, 1)}
                </span>
              </div>
              <div className="h-4 w-full rounded-full overflow-hidden flex border border-[#1e293b]">
                <div
                  style={{ width: `${textureMetrics.argPct}%` }}
                  className="bg-emerald-500 h-full"
                  title={`Argila: ${formatPercentPtBR(textureMetrics.argPct, 1)}`}
                />
                <div
                  style={{ width: `${textureMetrics.siltePct}%` }}
                  className="bg-cyan-400 h-full"
                  title={`Silte: ${formatPercentPtBR(textureMetrics.siltePct, 1)}`}
                />
                <div
                  style={{ width: `${textureMetrics.areiaPct}%` }}
                  className="bg-amber-400/80 h-full"
                  title={`Areia: ${formatPercentPtBR(textureMetrics.areiaPct, 1)}`}
                />
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Argila
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> Silte
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400/80" /> Areia
                </span>
              </div>
            </div>

            {/* Cation Ratios Grid */}
            <div className="grid grid-cols-3 gap-2.5 tabular-nums">
              <div className="p-3 rounded-xl border border-[#1e293b] bg-[#070d12]/60">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Rel. Ca/Mg</div>
                <div className="text-lg font-extrabold text-emerald-400 mt-0.5">
                  {formatNumberPtBR(textureMetrics.caMg)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Ideal: 3,0 – 5,0</div>
              </div>
              <div className="p-3 rounded-xl border border-[#1e293b] bg-[#070d12]/60">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Rel. Ca/K</div>
                <div className="text-lg font-extrabold text-cyan-400 mt-0.5">
                  {formatNumberPtBR(textureMetrics.caK)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Ideal: 10 – 25</div>
              </div>
              <div className="p-3 rounded-xl border border-[#1e293b] bg-[#070d12]/60">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Rel. Mg/K</div>
                <div className="text-lg font-extrabold text-emerald-300 mt-0.5">
                  {formatNumberPtBR(textureMetrics.mgK)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Ideal: 3,0 – 10</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e293b]/60 flex items-center justify-between text-xs tabular-nums text-slate-400">
            <span>
              CTC Média: <strong className="text-white">{formatNumberPtBR(textureMetrics.ctc)}</strong> cmolc/dm³
            </span>
            <span>
              Sat. Alumínio (m%):{' '}
              <strong
                className={
                  (textureMetrics.mPct ?? 0) > 15 ? 'text-[#fb7185]' : 'text-emerald-400'
                }
              >
                {formatPercentPtBR(textureMetrics.mPct, 1)}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
