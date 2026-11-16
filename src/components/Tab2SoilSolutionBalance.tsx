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
import { Activity, Droplets, Zap } from 'lucide-react';
import { FilterState, NutrientEvaluation } from '../types/schema';
import { formatNumberPtBR, formatPercentPtBR } from '../utils/formatters';
import { MatrixSampleItem } from './Tab4SampleMatrix';

interface Tab2SoilSolutionBalanceProps {
  filters: FilterState;
  evaluations: NutrientEvaluation[];
  clientSolutionRecords: MatrixSampleItem[];
  activeRecords: MatrixSampleItem[];
  isDark: boolean;
}

export const Tab2SoilSolutionBalance: React.FC<Tab2SoilSolutionBalanceProps> = ({
  filters,
  evaluations,
  clientSolutionRecords,
  activeRecords,
  isDark,
}) => {
  const isSingleSample = filters.amostraMode !== 'GROUP_AVG' && activeRecords.length === 1;

  const avg = (rows: MatrixSampleItem[], code: string): number | null => {
    let s = 0;
    let c = 0;
    for (const r of rows) {
      const v = r.nutrients[code];
      if (v !== null && v !== undefined && Number.isFinite(v)) {
        s += v;
        c += 1;
      }
    }
    return c > 0 ? Number((s / c).toFixed(2)) : null;
  };

  // 1. Solution Radar
  const radarData = useMemo(() => {
    return evaluations
      .filter((e) => e.radarNormalized !== null && e.refMin !== null && e.refMax !== null)
      .map((e) => ({
        subject: e.code,
        fullName: e.name,
        unit: e.unit,
        measuredPct: e.radarNormalized ?? 0,
        idealCenterPct: 100,
        rawVal: e.value,
        refMin: e.refMin,
        refMax: e.refMax,
      }));
  }, [evaluations]);

  // 2. Cation vs Anion Balance (mg/L)
  const ionicBalanceData = useMemo(() => {
    const ions = [
      { code: 'K1+', label: 'Potássio (K⁺)', type: 'Cátion', color: '#10b981' },
      { code: 'Ca2+', label: 'Cálcio (Ca²⁺)', type: 'Cátion', color: '#34d399' },
      { code: 'Mg2+', label: 'Magnésio (Mg²⁺)', type: 'Cátion', color: '#22d3ee' },
      { code: 'Na1+', label: 'Sódio (Na⁺)', type: 'Cátion', color: '#fb7185' },
      { code: 'NO3', label: 'Nitrato (NO₃⁻)', type: 'Ânion', color: '#06b6d4' },
      { code: 'SO4', label: 'Sulfato (SO₄²⁻)', type: 'Ânion', color: '#38bdf8' },
      { code: 'H2PO4', label: 'Fosfato (H₂PO₄⁻)', type: 'Ânion', color: '#a78bfa' },
    ];
    return ions.map((ion) => ({
      ...ion,
      valor: avg(activeRecords, ion.code) ?? 0,
    }));
  }, [activeRecords]);

  // 3. pH & C.E. comparison across client's sampling points
  const pointsSalinityData = useMemo(() => {
    return clientSolutionRecords.slice(0, 20).map((r) => ({
      amostra: `${r.amostra} (#${r.idAnalise})`,
      ce: r.nutrients['C. E.'] ?? 0,
      ph: r.nutrients.pH ?? 0,
      no3: r.nutrients.NO3 ?? 0,
      isSelected: isSingleSample && r.sampleKey === activeRecords[0].sampleKey,
    }));
  }, [clientSolutionRecords, activeRecords, isSingleSample]);

  const cardClass = isDark
    ? 'bg-[#111827]/80 border-[#1e293b] text-slate-100 backdrop-blur-md'
    : 'bg-white border-slate-200 text-slate-900 shadow-sm';

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardClass}`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold">
              Balanço Iônico da Solução do Solo, Salinidade (C.E.) & Disponibilidade Imediata
            </h2>
            <p className="text-xs text-slate-400">
              Monitoramento de extratores de solução na zona radicular (cátions, ânions, pH e
              condutividade elétrica sem escala fenológica).
            </p>
          </div>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold tabular-nums self-start sm:self-auto">
          {isSingleSample
            ? `Ponto: ${activeRecords[0].amostra}`
            : `Grupo: ${activeRecords.length} leituras na solução`}
        </span>
      </div>

      {/* Top Row: Radar (5 cols) + Cation/Anion Balance (7 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className={`xl:col-span-5 p-5 rounded-2xl border flex flex-col ${cardClass}`}>
          <div className="flex items-center gap-2 pb-3 border-b border-[#1e293b]/70">
            <Activity className="w-4 h-4 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold">Radar de Concentração na Solução</h3>
              <p className="text-[11px] text-slate-400">
                100% = ponto médio ideal (dElementoSolucaoSoloRef)
              </p>
            </div>
          </div>

          <div className="flex-1 min-h-[300px] mt-2">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart cx="50%" cy="50%" outerRadius="74%" data={radarData}>
                  <PolarGrid stroke={isDark ? '#1e293b' : '#cbd5e1'} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: isDark ? '#e2e8f0' : '#1e293b', fontSize: 11, fontWeight: 700 }}
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
                    strokeDasharray="4 4"
                    fill="#10b981"
                    fillOpacity={0.12}
                  />
                  <Radar
                    name="Solução Medida (%)"
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
                          <div className="font-bold text-cyan-400 mb-1">{d.fullName}</div>
                          <div>
                            Valor Medido: <strong>{formatNumberPtBR(d.rawVal)} {d.unit}</strong>
                          </div>
                          <div>
                            Faixa Ideal: {formatNumberPtBR(d.refMin)} – {formatNumberPtBR(d.refMax)} {d.unit}
                          </div>
                          <div className="mt-1 text-emerald-300 font-semibold">
                            Índice: {formatPercentPtBR(d.measuredPct, 1)}
                          </div>
                        </div>
                      );
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sem parâmetros com referência para compor o radar.
              </div>
            )}
          </div>
        </div>

        {/* Cation vs Anion Chart */}
        <div className={`xl:col-span-7 p-5 rounded-2xl border flex flex-col ${cardClass}`}>
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]/70">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold">Balanço Iônico: Cátions × Ânions (mg/L)</h3>
                <p className="text-[11px] text-slate-400">
                  Concentração iônica na solução extratora (monitorar K⁺, Ca²⁺, NO₃⁻ e risco de Na⁺)
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[290px] mt-3">
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={ionicBalanceData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                <XAxis
                  dataKey="code"
                  tick={{ fill: isDark ? '#e2e8f0' : '#334155', fontSize: 11, fontWeight: 700 }}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" mg/L" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const row = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-[#1e293b] bg-[#070d12]/95 p-3 text-xs text-slate-100 shadow-xl tabular-nums">
                        <div className="font-bold text-emerald-400">
                          {row.label} ({row.type})
                        </div>
                        <div className="mt-1">
                          Concentração: <strong>{formatNumberPtBR(row.valor)} mg/L</strong>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="valor" name="Concentração (mg/L)" radius={[6, 6, 0, 0]} barSize={36}>
                  {ionicBalanceData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Salinity (C.E.) & pH across sampling points */}
      <div className={`p-5 rounded-2xl border ${cardClass}`}>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1e293b]/70">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold">
                Condutividade Elétrica (C.E. dS/m) & pH por Ponto de Coleta
              </h3>
              <p className="text-[11px] text-slate-400">
                Faixa ideal de C.E.: 1,50 a 3,00 dS/m • Faixa ideal de pH: 5,70 a 7,50
              </p>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={pointsSalinityData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
            <XAxis
              dataKey="amostra"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={55}
            />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <ReferenceLine y={1.5} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'C.E. Mín (1,5)', fill: '#10b981', fontSize: 10 }} />
            <ReferenceLine y={3.0} stroke="#fb7185" strokeDasharray="3 3" label={{ value: 'C.E. Máx (3,0)', fill: '#fb7185', fontSize: 10 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-xl border border-[#1e293b] bg-[#070d12]/95 p-3 text-xs text-slate-100 shadow-xl tabular-nums space-y-1">
                    <div className="font-bold text-cyan-300">{d.amostra}</div>
                    <div>Condutividade Elétrica: <strong>{formatNumberPtBR(d.ce)} dS/m</strong></div>
                    <div>pH Solução: <strong>{formatNumberPtBR(d.ph)}</strong></div>
                    <div>Nitrato (NO₃⁻): <strong>{formatNumberPtBR(d.no3)} mg/L</strong></div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="ce" name="Condutividade Elétrica (dS/m)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            <Bar dataKey="ph" name="pH Solução" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
