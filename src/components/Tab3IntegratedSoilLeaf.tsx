import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  Compass,
  FlaskConical,
  Layers,
  Leaf,
  Scale,
  ShieldAlert,
  Sprout,
} from 'lucide-react';
import {
  DatabaseStarSchema,
  FilterState,
  NutrientStatus,
} from '../types/schema';
import {
  formatNumberPtBR,
  getStatusMeta,
} from '../utils/formatters';
import {
  evaluateNutrient,
  getReferenceBounds,
  SOLO_ELEMENTS,
  TISSUE_ELEMENTS,
} from '../utils/referenceEngine';

interface Tab3IntegratedSoilLeafProps {
  db: DatabaseStarSchema;
  filters: FilterState;
  isDark: boolean;
}

export const Tab3IntegratedSoilLeaf: React.FC<Tab3IntegratedSoilLeafProps> = ({
  db,
  filters,
  isDark,
}) => {
  // Build list of available Soil properties / samples so consultant can either auto-match by PROPRIEDADE or pick a specific Lote/Talhão
  const soilProfiles = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        propriedade: string;
        amostra: string;
        municipio: string;
        cultura: string;
        dtColeta: string;
        top0_20: Record<string, number | null>[];
        sub20_40: Record<string, number | null>[];
        classeTextural: string;
      }
    >();

    for (const s of db.fSolo) {
      const cli = db.dClienteAnalise.get(s.ID_ANALISE);
      if (filters.clienteId !== 'ADMIN_ALL' && cli?.clienteId !== filters.clienteId) {
        continue;
      }
      const prop = cli?.PROPRIEDADE || 'Propriedade Não Informada';
      const am = cli?.AMOSTRA || `Amostra #${s.ID_ANALISE}`;
      const key = `${prop}::${am}`;

      let entry = map.get(key);
      if (!entry) {
        entry = {
          key,
          propriedade: prop,
          amostra: am,
          municipio: cli?.MUNICIPIO || 'Não inf.',
          cultura: cli?.NOME_CULTURA || 'Soja',
          dtColeta: cli?.DT_COLETA || cli?.DT_ENTRADA || '—',
          top0_20: [],
          sub20_40: [],
          classeTextural: s.CLASSE_TEXTURAL,
        };
        map.set(key, entry);
      }

      if (s.PROFUNDIDADE <= 20) {
        entry.top0_20.push(s.metrics);
      } else {
        entry.sub20_40.push(s.metrics);
      }
    }

    return [...map.values()];
  }, [db, filters.clienteId]);

  const [selectedSoilKey, setSelectedSoilKey] = useState<string>('AUTO_AVG');

  // Compute averages for 0-20cm and 20-40cm
  const { avg0_20, avg20_40, soilContextLabel, matchedDirectly } = useMemo(() => {
    let targetProfiles = soilProfiles;
    let direct = false;

    if (selectedSoilKey !== 'AUTO_AVG') {
      const found = soilProfiles.filter((p) => p.key === selectedSoilKey);
      if (found.length > 0) {
        targetProfiles = found;
        direct = true;
      }
    } else if (filters.propriedade !== 'TODOS') {
      const byProp = soilProfiles.filter(
        (p) => p.propriedade.toLowerCase() === filters.propriedade.toLowerCase()
      );
      if (byProp.length > 0) {
        targetProfiles = byProp;
        direct = true;
      }
    }

    const topList = targetProfiles.flatMap((p) => p.top0_20);
    const subList = targetProfiles.flatMap((p) => p.sub20_40);

    const averageMetrics = (list: Record<string, number | null>[]) => {
      const res: Record<string, number | null> = {};
      if (list.length === 0) return res;
      const keys = Object.keys(list[0]);
      for (const k of keys) {
        let sum = 0;
        let cnt = 0;
        for (const row of list) {
          const v = row[k];
          if (v !== null && v !== undefined && Number.isFinite(v)) {
            sum += v;
            cnt += 1;
          }
        }
        res[k] = cnt > 0 ? Number((sum / cnt).toFixed(2)) : null;
      }
      return res;
    };

    const label =
      selectedSoilKey !== 'AUTO_AVG'
        ? selectedSoilKey.replace('::', ' • ')
        : direct
        ? `Propriedade ${filters.propriedade} (${topList.length + subList.length} perfis)`
        : `Perfil Consolidado da Safra (${topList.length} leituras 0-20cm | ${subList.length} leituras 20-40cm)`;

    return {
      avg0_20: averageMetrics(topList),
      avg20_40: averageMetrics(subList),
      soilContextLabel: label,
      matchedDirectly: direct,
    };
  }, [soilProfiles, selectedSoilKey, filters.propriedade]);

  // Compute Folha and Pecíolo averages strictly scoped to the active client
  const { avgFolha, avgPeciolo, folhaCount, pecioloCount } = useMemo(() => {
    const cleanCult = filters.cultura.toLowerCase();
    const cleanProp = filters.propriedade.toLowerCase();
    const isClientMatch = (id: number) => {
      if (filters.clienteId === 'ADMIN_ALL') return true;
      return db.dClienteAnalise.get(id)?.clienteId === filters.clienteId;
    };

    const clientFolha = db.fFolha.filter((f) => isClientMatch(f.ID_ANALISE));
    let folhaRows = clientFolha.filter((f) => {
      const cli = db.dClienteAnalise.get(f.ID_ANALISE);
      if (!cli) return false;
      const matchCult = cli.NOME_CULTURA.toLowerCase() === cleanCult;
      const matchProp =
        filters.propriedade === 'TODOS' ||
        cli.PROPRIEDADE.toLowerCase() === cleanProp;
      return matchCult && matchProp;
    });
    if (folhaRows.length === 0) {
      folhaRows = clientFolha.filter((f) => {
        const cli = db.dClienteAnalise.get(f.ID_ANALISE);
        return cli?.NOME_CULTURA.toLowerCase() === cleanCult;
      });
    }
    if (folhaRows.length === 0) folhaRows = clientFolha;

    const clientPeciolo = db.fDAE.filter((d) => isClientMatch(d.ID_ANALISE));
    let pecioloRows = clientPeciolo.filter((d) => {
      const cli = db.dClienteAnalise.get(d.ID_ANALISE);
      if (!cli) return false;
      const matchCult = cli.NOME_CULTURA.toLowerCase() === cleanCult;
      const matchProp =
        filters.propriedade === 'TODOS' ||
        cli.PROPRIEDADE.toLowerCase() === cleanProp;
      return matchCult && matchProp;
    });
    if (pecioloRows.length === 0) {
      pecioloRows = clientPeciolo.filter((d) => {
        const cli = db.dClienteAnalise.get(d.ID_ANALISE);
        return cli?.NOME_CULTURA.toLowerCase() === cleanCult;
      });
    }
    if (pecioloRows.length === 0) pecioloRows = clientPeciolo;

    const avgNutrients = (rows: { nutrients: Record<string, number | null> }[]) => {
      const out: Record<string, number | null> = {};
      for (const el of TISSUE_ELEMENTS) {
        let s = 0;
        let c = 0;
        for (const r of rows) {
          const v = r.nutrients[el.code];
          if (v !== null && v !== undefined && Number.isFinite(v)) {
            s += v;
            c += 1;
          }
        }
        out[el.code] = c > 0 ? Number((s / c).toFixed(2)) : null;
      }
      return out;
    };

    return {
      avgFolha: avgNutrients(folhaRows),
      avgPeciolo: avgNutrients(pecioloRows),
      folhaCount: folhaRows.length,
      pecioloCount: pecioloRows.length,
    };
  }, [db, filters.clienteId, filters.cultura, filters.propriedade]);

  // Evaluate Soil key parameters (0-20cm vs 20-40cm)
  const soilKeyCodes = [
    'pH (CaCl2)',
    'V',
    'CTC',
    'M.O',
    'P(mel)',
    'K_1',
    'Ca',
    'Mg',
    'S',
    'Ca/Mg',
    'Ca/K',
    'Mg/K',
  ];

  const soilComparisonRows = useMemo(() => {
    return soilKeyCodes.map((code) => {
      const meta =
        SOLO_ELEMENTS.find((e) => e.code === code) || {
          code,
          name: code,
          unit: '',
          group: 'MACRO' as const,
          agronomicRole: '',
        };
      const v0_20 = avg0_20[code] ?? null;
      const v20_40 = avg20_40[code] ?? null;
      const bounds = getReferenceBounds(db, 'SOLO', filters.cultura, filters.dae, code, {
        argilaPercent: avg0_20.ArgilaPercent ?? 35,
        ctc: avg0_20.CTC ?? 6,
      });

      const eval0_20 = evaluateNutrient(meta, v0_20, bounds.min, bounds.max, 1);
      const eval20_40 = evaluateNutrient(meta, v20_40, bounds.min, bounds.max, 1);

      return {
        meta,
        v0_20,
        v20_40,
        refMin: bounds.min,
        refMax: bounds.max,
        status0_20: eval0_20.status,
        status20_40: eval20_40.status,
      };
    });
  }, [avg0_20, avg20_40, db, filters.cultura, filters.dae]);

  // Cross-Diagnostic Matrix: Soil (0-20cm) x Folha x Pecíolo for Shared Nutrients (P, K, Ca, Mg, S, B, Cu, Fe, Mn, Zn)
  const crossNutrients = useMemo(() => {
    const shared = [
      { tissueCode: 'P', soilCode: 'P(mel)', name: 'Fósforo (P)' },
      { tissueCode: 'K', soilCode: 'K_1', name: 'Potássio (K)' },
      { tissueCode: 'Ca', soilCode: 'Ca', name: 'Cálcio (Ca)' },
      { tissueCode: 'Mg', soilCode: 'Mg', name: 'Magnésio (Mg)' },
      { tissueCode: 'S', soilCode: 'S', name: 'Enxofre (S)' },
      { tissueCode: 'B', soilCode: 'B', name: 'Boro (B)' },
      { tissueCode: 'Cu', soilCode: 'Cu', name: 'Cobre (Cu)' },
      { tissueCode: 'Fe', soilCode: 'Fe', name: 'Ferro (Fe)' },
      { tissueCode: 'Mn', soilCode: 'Mn', name: 'Manganês (Mn)' },
      { tissueCode: 'Zn', soilCode: 'Zn', name: 'Zinco (Zn)' },
    ];

    return shared.map((item) => {
      const tMeta = TISSUE_ELEMENTS.find((e) => e.code === item.tissueCode)!;
      const sMeta =
        SOLO_ELEMENTS.find((e) => e.code === item.soilCode) || tMeta;

      const sVal = avg0_20[item.soilCode] ?? null;
      const sBounds = getReferenceBounds(
        db,
        'SOLO',
        filters.cultura,
        filters.dae,
        item.soilCode,
        {
          argilaPercent: avg0_20.ArgilaPercent ?? 35,
          ctc: avg0_20.CTC ?? 6,
        }
      );
      const sEval = evaluateNutrient(sMeta, sVal, sBounds.min, sBounds.max, 1);

      const fVal = avgFolha[item.tissueCode] ?? null;
      const fBounds = getReferenceBounds(
        db,
        'FOLHA',
        filters.cultura,
        filters.dae,
        item.tissueCode
      );
      const fEval = evaluateNutrient(tMeta, fVal, fBounds.min, fBounds.max, folhaCount);

      const pVal = avgPeciolo[item.tissueCode] ?? null;
      const pBounds = getReferenceBounds(
        db,
        'PECÍOLO',
        filters.cultura,
        filters.dae,
        item.tissueCode
      );
      const pEval = evaluateNutrient(tMeta, pVal, pBounds.min, pBounds.max, pecioloCount);

      // Agronomic Interpretation: Real Soil Deficiency vs Uptake Blockade
      let diagnosisType: 'REAL_DEFICIENCY' | 'UPTAKE_BLOCK' | 'BALANCED' | 'LUXURY_ACCUM' =
        'BALANCED';
      let diagnosisText = 'Suprimento de solo e translocação foliar dentro do esperado.';

      const tissueDeficient = fEval.status === 'LOW' || pEval.status === 'LOW';
      if (sEval.status === 'LOW' && tissueDeficient) {
        diagnosisType = 'REAL_DEFICIENCY';
        diagnosisText =
          'Deficiência Real no Solo: Reserva insuficiente no solo (0-20cm) limitando diretamente o teor no tecido.';
      } else if (
        (sEval.status === 'IDEAL' || sEval.status === 'HIGH') &&
        tissueDeficient
      ) {
        diagnosisType = 'UPTAKE_BLOCK';
        if (item.tissueCode === 'Mg') {
          diagnosisText =
            'Bloqueio de Absorção: Solo adequado em Mg, mas baixo no tecido — verificar competição catiônica por K ou relação Ca/Mg.';
        } else if (
          item.tissueCode === 'Mn' ||
          item.tissueCode === 'Zn' ||
          item.tissueCode === 'Fe' ||
          item.tissueCode === 'Cu'
        ) {
          diagnosisText =
            'Bloqueio / Indisponibilidade: Reserva presente no solo, mas baixa absorção na seiva/folha (efeito de pH, aeração ou difusão).';
        } else {
          diagnosisText =
            'Restrição de Absorção / Translocação: Solo suprido, porém baixo fluxo para o pecíolo/folha (avaliar umidade e raiz).';
        }
      } else if (fEval.status === 'HIGH' && pEval.status === 'HIGH') {
        diagnosisType = 'LUXURY_ACCUM';
        diagnosisText = 'Alta disponibilidade no sistema solo-planta (consumo de luxo).';
      }

      return {
        ...item,
        sEval,
        fEval,
        pEval,
        diagnosisType,
        diagnosisText,
      };
    });
  }, [avg0_20, avgFolha, avgPeciolo, db, filters.cultura, filters.dae, folhaCount, pecioloCount]);

  // 4-Quadrant Scatter Data: X = Solo (0-20cm) % of Ideal, Y = Tissue (Folha or Pecíolo) % of Ideal
  const scatterData = useMemo(() => {
    return crossNutrients
      .map((row) => {
        const soloPct = row.sEval.radarNormalized;
        const tissuePct = row.fEval.radarNormalized ?? row.pEval.radarNormalized;
        if (soloPct === null || tissuePct === null) return null;

        const color =
          row.diagnosisType === 'REAL_DEFICIENCY'
            ? '#fb7185'
            : row.diagnosisType === 'UPTAKE_BLOCK'
            ? '#f59e0b'
            : row.diagnosisType === 'LUXURY_ACCUM'
            ? '#22d3ee'
            : '#10b981';

        const shortDiag =
          row.diagnosisType === 'REAL_DEFICIENCY'
            ? 'Deficiência Real no Solo'
            : row.diagnosisType === 'UPTAKE_BLOCK'
            ? 'Bloqueio de Absorção'
            : row.diagnosisType === 'LUXURY_ACCUM'
            ? 'Alta Disponibilidade'
            : 'Equilíbrio Solo-Planta';

        return {
          code: row.tissueCode,
          name: row.name,
          soloPct,
          tissuePct,
          soloVal: row.sEval.value,
          folhaVal: row.fEval.value,
          pecioloVal: row.pEval.value,
          color,
          shortDiag,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);
  }, [crossNutrients]);

  const cardClass = isDark
    ? 'bg-[#0e1726]/80 border-white/[0.07] text-slate-100'
    : 'bg-white border-slate-200/90 text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.04)]';

  const renderStatusPill = (status: NutrientStatus) => {
    const meta = getStatusMeta(status);
    return (
      <span
        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
          isDark ? meta.bgClass : meta.lightBgClass
        }`}
      >
        {meta.shortLabel}
      </span>
    );
  };

  if (soilProfiles.length === 0) {
    return (
      <div className={`p-8 rounded-2xl border max-w-2xl mx-auto my-6 text-center space-y-3 ${cardClass}`}>
        <div className="w-12 h-12 rounded-2xl mx-auto bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
          <Layers className="w-6 h-6 text-cyan-400" />
        </div>
        <h2 className="text-base sm:text-lg font-bold">
          Cliente sem Laudos de Solo nesta Safra
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          Para preservar o isolamento dos dados de cada produtor, o cruzamento <strong>Solo × Folha × Pecíolo</strong> utiliza exclusivamente as análises de solo do cliente conectado. Este cliente possui{' '}
          <strong className="text-emerald-400">{folhaCount} laudos de Folha</strong> e{' '}
          <strong className="text-emerald-400">{pecioloCount} laudos de Pecíolo</strong>, mas nenhuma amostra de Solo cadastrada.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Control & Soil Context Selector */}
      <div className={`p-4 rounded-2xl border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 ${cardClass}`}>
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold">
                Visão Integrada Solo (0-20 vs 20-40cm) × Folha × Pecíolo
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                Diagnóstico Causa × Efeito
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Distingue <strong>Deficiência Real no Solo</strong> de{' '}
              <strong>Bloqueio / Antagonismo de Absorção</strong> cruzando perfil químico do solo
              com análise foliar e seiva de pecíolo.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <label className="text-xs font-semibold text-slate-400 whitespace-nowrap">
            Perfil de Solo Referência:
          </label>
          <select
            value={selectedSoilKey}
            onChange={(e) => setSelectedSoilKey(e.target.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border outline-none ${
              isDark
                ? 'bg-[#070d12] border-[#1e293b] text-slate-100'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="AUTO_AVG">
              🔄 Cruzamento Automático ({soilContextLabel})
            </option>
            {soilProfiles.map((p) => (
              <option key={p.key} value={p.key}>
                📍 {p.propriedade} — {p.amostra} ({p.classeTextural})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 1: Compact Single-Line Soil Context Strip (0-20cm vs 20-40cm) */}
      <div className={`px-4 py-3 rounded-2xl border flex flex-wrap items-center justify-between gap-4 text-xs tabular-nums ${cardClass}`}>
        {[
          { label: 'pH (CaCl₂)', v20: avg0_20['pH (CaCl2)'], v40: avg20_40['pH (CaCl2)'], unit: '' },
          { label: 'V% Bases', v20: avg0_20.V, v40: avg20_40.V, unit: '%' },
          { label: 'CTC', v20: avg0_20.CTC, v40: avg20_40.CTC, unit: '' },
          { label: 'Ca/Mg', v20: avg0_20['Ca/Mg'], v40: avg20_40['Ca/Mg'], unit: '' },
          { label: 'Ca/K', v20: avg0_20['Ca/K'], v40: avg20_40['Ca/K'], unit: '' },
          { label: 'Mg/K', v20: avg0_20['Mg/K'], v40: avg20_40['Mg/K'], unit: '' },
        ].map((kpi) => (
          <div key={kpi.label} className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">{kpi.label}:</span>
            <span className="font-extrabold text-emerald-400">
              {formatNumberPtBR(kpi.v20)}{kpi.unit}
            </span>
            <span className="text-[11px] text-slate-500">
              (sub: {formatNumberPtBR(kpi.v40)}{kpi.unit})
            </span>
          </div>
        ))}
      </div>

      {/* Row 2: 4-Quadrant Scatter Plot (Left) + Integrated Matrix (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left 5 cols: 4-Quadrant Cause x Effect Scatter Plot */}
        <div className={`xl:col-span-5 p-5 rounded-2xl border flex flex-col ${cardClass}`}>
          <div className="flex items-center gap-2 pb-3 mb-2 border-b border-[#1e293b]/70">
            <Compass className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold">
                Quadrantes Solo × Planta (Deficiência Real vs. Bloqueio)
              </h3>
              <p className="text-[11px] text-slate-400">
                100% = Alvo ideal • Eixo X: Solo (0-20cm) • Eixo Y: Tecido Vegetal
              </p>
            </div>
          </div>

          <div className="flex-1 min-h-[320px]">
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 18, right: 20, bottom: 18, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                <XAxis
                  type="number"
                  dataKey="soloPct"
                  name="Solo (%)"
                  domain={[0, 200]}
                  unit="%"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  label={{ value: 'Disponibilidade no Solo (%)', position: 'bottom', fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="tissuePct"
                  name="Planta (%)"
                  domain={[0, 200]}
                  unit="%"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  label={{ value: 'Teor na Planta (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                />
                <ZAxis range={[120, 120]} />
                <ReferenceLine x={100} stroke="#475569" strokeDasharray="4 4" />
                <ReferenceLine y={100} stroke="#475569" strokeDasharray="4 4" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-[#1e293b] bg-[#070d12]/95 p-3 text-xs text-slate-100 shadow-xl tabular-nums space-y-1">
                        <div className="font-bold text-emerald-400">{d.name}</div>
                        <div className="font-semibold" style={{ color: d.color }}>
                          {d.shortDiag}
                        </div>
                        <div>Solo (0-20cm): <strong>{formatNumberPtBR(d.soloVal)}</strong> ({d.soloPct}%)</div>
                        {d.folhaVal !== null && <div>Folha: <strong>{formatNumberPtBR(d.folhaVal)}</strong></div>}
                        {d.pecioloVal !== null && <div>Pecíolo: <strong>{formatNumberPtBR(d.pecioloVal)}</strong></div>}
                      </div>
                    );
                  }}
                />
                <Scatter name="Nutrientes" data={scatterData}>
                  {scatterData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                  <LabelList dataKey="code" position="top" fill={isDark ? '#e2e8f0' : '#1e293b'} fontSize={11} fontWeight={700} />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-[#1e293b]/60">
            <div className="flex items-center gap-1.5 text-rose-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#fb7185] shrink-0" />
              <span>Inf. Esq.: Deficiência Real no Solo</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shrink-0" />
              <span>Inf. Dir.: Bloqueio de Absorção</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shrink-0" />
              <span>Sup. Dir.: Equilíbrio Solo-Planta</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22d3ee] shrink-0" />
              <span>Sup. Esq./Extremo: Acúmulo</span>
            </div>
          </div>
        </div>

        {/* Right 7 cols: Clean Integrated Matrix Soil (0-20cm) x Folha x Pecíolo */}
        <div className={`xl:col-span-7 p-5 rounded-2xl border ${cardClass}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-[#1e293b]/70">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold">
                  Cruzamento Solo (0-20cm) × Folha × Pecíolo
                </h3>
                <p className="text-[11px] text-slate-400">
                  Comparação direta dos teores disponíveis no solo com o absorvido pela cultura
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 tabular-nums">
              {folhaCount > 0 && (
                <span className="flex items-center gap-1">
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" /> Folha ({folhaCount})
                </span>
              )}
              {folhaCount > 0 && pecioloCount > 0 && <span>•</span>}
              {pecioloCount > 0 && (
                <span className="flex items-center gap-1">
                  <Sprout className="w-3.5 h-3.5 text-cyan-400" /> Pecíolo ({pecioloCount})
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-[#1e293b]">
                  <th className="py-2 text-left font-semibold">Elemento</th>
                  <th className="py-2 text-right font-semibold">Solo (0-20cm)</th>
                  {folhaCount > 0 && <th className="py-2 text-right font-semibold">Folha</th>}
                  {pecioloCount > 0 && <th className="py-2 text-right font-semibold">Pecíolo</th>}
                  <th className="py-2 pl-3 text-left font-semibold">Diagnóstico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/50 tabular-nums">
                {crossNutrients.map((row) => (
                  <tr
                    key={row.tissueCode}
                    className={isDark ? 'hover:bg-slate-800/35' : 'hover:bg-slate-50'}
                  >
                    <td className="py-2.5 pr-2 font-bold">{row.name}</td>
                    <td className="py-2.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-semibold">
                          {formatNumberPtBR(row.sEval.value)}
                        </span>
                        {renderStatusPill(row.sEval.status)}
                      </div>
                    </td>
                    {folhaCount > 0 && (
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-semibold">
                            {formatNumberPtBR(row.fEval.value)}
                          </span>
                          {renderStatusPill(row.fEval.status)}
                        </div>
                      </td>
                    )}
                    {pecioloCount > 0 && (
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-semibold">
                            {formatNumberPtBR(row.pEval.value)}
                          </span>
                          {renderStatusPill(row.pEval.status)}
                        </div>
                      </td>
                    )}
                    <td className="py-2.5 pl-3 font-sans">
                      {row.diagnosisType === 'REAL_DEFICIENCY' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-300">
                          <AlertCircle className="w-3.5 h-3.5 text-[#fb7185] shrink-0" />
                          Deficiência Real no Solo
                        </span>
                      )}
                      {row.diagnosisType === 'UPTAKE_BLOCK' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          Bloqueio de Absorção
                        </span>
                      )}
                      {row.diagnosisType === 'BALANCED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          Equilibrado
                        </span>
                      )}
                      {row.diagnosisType === 'LUXURY_ACCUM' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-300">
                          <FlaskConical className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          Acúmulo / Alta Disp.
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
