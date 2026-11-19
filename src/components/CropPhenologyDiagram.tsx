import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Info, Sprout } from 'lucide-react';
import { EstagioRow } from '../types/schema';

export interface PhenologyStageGroup {
  id: string;
  code: string;
  title: string;
  phase: 'Vegetativa' | 'Reprodutiva' | 'Maturação';
  daysHint: string;
  demandFocus: string;
  description: string;
  matchDae: (dae: string) => boolean;
  illustration: 'seed' | 'sprout' | 'vegetative' | 'flowering' | 'podding' | 'filling' | 'maturity';
}

interface CropPhenologyDiagramProps {
  cultura: string;
  selectedDae: string; // 'TODOS' or specific DAE like 'R1', 'V5', '48'
  availableDaes: string[];
  stageCounts: Record<string, number>; // Map of DAE -> sample count
  onSelectDae: (dae: string) => void;
  estagiosRef: EstagioRow[];
  isDark: boolean;
}

const SOJA_STAGES: PhenologyStageGroup[] = [
  {
    id: 'VE_VC',
    code: 'VE – VC',
    title: 'Emergência',
    phase: 'Vegetativa',
    daysHint: '0–7 DAE',
    demandFocus: 'Fósforo (P) e Cálcio (Ca) para arranque radicular',
    description: 'Da germinação da semente até a abertura completa dos cotilédones acima do solo.',
    matchDae: (d) => /^(VE|VC|0)$/i.test(d),
    illustration: 'seed',
  },
  {
    id: 'V1_V2',
    code: 'V1 – V2',
    title: 'Inicial',
    phase: 'Vegetativa',
    daysHint: '8–18 DAE',
    demandFocus: 'Estabelecimento da nodulação (Co, Mo, S) e enraizamento',
    description: 'Primeiro nó com folhas unifolioladas e abertura do primeiro trifólio.',
    matchDae: (d) => /^V[12]$/i.test(d),
    illustration: 'sprout',
  },
  {
    id: 'V3_VN',
    code: 'V3 – Vn',
    title: 'Vegetativo',
    phase: 'Vegetativa',
    daysHint: '19–38 DAE',
    demandFocus: 'Crescimento foliar acelerado: Nitrogênio (N), Potássio (K), Mg e Mn',
    description: 'Emissão contínua de trifólios, definição da arquitetura e nós produtivos.',
    matchDae: (d) => /^V([3-9]|1\d|N)$/i.test(d),
    illustration: 'vegetative',
  },
  {
    id: 'R1_R2',
    code: 'R1 – R2',
    title: 'Floração',
    phase: 'Reprodutiva',
    daysHint: '39–55 DAE',
    demandFocus: 'Pico de Boro (B), Cálcio (Ca) e Fósforo (P) para pegamento floral',
    description: 'Início da floração até florescimento pleno nos racemos superiores.',
    matchDae: (d) => /^R[12](\.\d+)?$/i.test(d),
    illustration: 'flowering',
  },
  {
    id: 'R3_R4',
    code: 'R3 – R4',
    title: 'Canivete',
    phase: 'Reprodutiva',
    daysHint: '56–72 DAE',
    demandFocus: 'Forte translocação de N, K, S e Zinco (Zn) para formação das vagens',
    description: 'Formação e alongamento das vagens no terço superior (2 a 4 cm).',
    matchDae: (d) => /^R[34](\.\d+)?$/i.test(d),
    illustration: 'podding',
  },
  {
    id: 'R5_R6',
    code: 'R5 – R6',
    title: 'Granação',
    phase: 'Reprodutiva',
    daysHint: '73–100 DAE',
    demandFocus: 'Demanda máxima de Potássio (K) e Nitrogênio (N) para peso de grãos',
    description: 'Enchimento de grãos (R5.1 a R5.5) até granação completa em vagens verdes (R6).',
    matchDae: (d) => /^R[56](\.\d+)?$/i.test(d),
    illustration: 'filling',
  },
  {
    id: 'R7_R9',
    code: 'R7 – R9',
    title: 'Maturação',
    phase: 'Maturação',
    daysHint: '101–125 DAE',
    demandFocus: 'Senescência foliar e redistribuição final de reservas para a semente',
    description: 'Início do amarelecimento (R7), desfolha (R8) até ponto de colheita (R9).',
    matchDae: (d) => /^R[789](\.\d+)?$/i.test(d),
    illustration: 'maturity',
  },
];

const ALGODAO_STAGES: PhenologyStageGroup[] = [
  {
    id: 'ALG_1',
    code: '0 – 15 DAE',
    title: 'Emergência',
    phase: 'Vegetativa',
    daysHint: '0–15 dias',
    demandFocus: 'Fósforo (P), Cálcio (Ca) e arranque radicular',
    description: 'Germinação e emissão das folhas cotiledonares.',
    matchDae: (d) => {
      const n = parseFloat(d);
      return Number.isFinite(n) && n >= 0 && n <= 15;
    },
    illustration: 'seed',
  },
  {
    id: 'ALG_2',
    code: '16 – 40 DAE',
    title: 'Botão Floral',
    phase: 'Vegetativa',
    daysHint: '16–40 dias',
    demandFocus: 'Nitrogênio (N), Boro (B) e equilíbrio vegetativo',
    description: 'Desenvolvimento vegetativo até o aparecimento dos primeiros botões florais.',
    matchDae: (d) => {
      const n = parseFloat(d);
      return Number.isFinite(n) && n > 15 && n <= 40;
    },
    illustration: 'vegetative',
  },
  {
    id: 'ALG_3',
    code: '41 – 60 DAE',
    title: 'Início Florada',
    phase: 'Reprodutiva',
    daysHint: '41–60 dias',
    demandFocus: 'Boro (B), Potássio (K) e Cálcio (Ca) na fixação de estruturas',
    description: 'Abertura das primeiras flores e intenso acúmulo de matéria seca.',
    matchDae: (d) => {
      const n = parseFloat(d);
      return Number.isFinite(n) && n > 40 && n <= 60;
    },
    illustration: 'flowering',
  },
  {
    id: 'ALG_4',
    code: '61 – 85 DAE',
    title: 'Pico Florada',
    phase: 'Reprodutiva',
    daysHint: '61–85 dias',
    demandFocus: 'Máxima demanda de N, K e S no enchimento das maçãs',
    description: 'Quarta semana de florescimento com alta retenção de maçãs.',
    matchDae: (d) => {
      const n = parseFloat(d);
      return Number.isFinite(n) && n > 60 && n <= 85;
    },
    illustration: 'podding',
  },
  {
    id: 'ALG_5',
    code: '86 – 110 DAE',
    title: 'Abertura Frutos',
    phase: 'Reprodutiva',
    daysHint: '86–110 dias',
    demandFocus: 'Potássio (K) para qualidade e micronaire da fibra',
    description: 'Maturação das maçãs e primeira semana de abertura dos capulhos.',
    matchDae: (d) => {
      const n = parseFloat(d);
      return Number.isFinite(n) && n > 85 && n <= 110;
    },
    illustration: 'filling',
  },
  {
    id: 'ALG_6',
    code: '111+ DAE',
    title: 'Maturação',
    phase: 'Maturação',
    daysHint: '111–160 dias',
    demandFocus: 'Redução de N e preparo de colheita',
    description: 'Abertura plena dos capulhos e maturação final.',
    matchDae: (d) => {
      const n = parseFloat(d);
      return Number.isFinite(n) && n > 110;
    },
    illustration: 'maturity',
  },
];

// Minimalist handcrafted botanical SVG illustrations for each stage
const PlantStageSVG: React.FC<{
  type: PhenologyStageGroup['illustration'];
  active: boolean;
  isDark: boolean;
}> = ({ type, active, isDark }) => {
  const leafMain = active ? '#10b981' : isDark ? '#34d399' : '#16a34a';
  const leafLight = active ? '#6ee7b7' : isDark ? '#4ade80' : '#4ade80';
  const leafGold = '#eab308';
  const leafAmber = '#ca8a04';
  const stem = active ? '#10b981' : isDark ? '#64748b' : '#65a30d';
  const soil = isDark ? '#334155' : '#94a3b8';
  const flower = '#a855f7';

  return (
    <svg viewBox="0 0 84 96" className="w-16 h-[74px] sm:w-[74px] sm:h-[84px] overflow-visible">
      {/* Subtle Soil Mound */}
      <path
        d="M 12 88 Q 42 74 72 88 Z"
        fill={soil}
        opacity={active ? 0.55 : 0.3}
      />

      {type === 'seed' && (
        <g>
          {/* Germinating seed inside mound */}
          <ellipse cx="42" cy="83" rx="6.5" ry="5" fill="#facc15" stroke="#ca8a04" strokeWidth="1.2" />
          <path d="M 38 82 Q 30 78 33 72" fill="none" stroke={leafLight} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 43 87 Q 45 92 42 94" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        </g>
      )}

      {type === 'sprout' && (
        <g>
          <path d="M 42 82 L 42 64" stroke={stem} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M 42 66 Q 31 58 27 63 Q 33 69 42 67 Z" fill={leafMain} />
          <path d="M 42 66 Q 53 58 57 63 Q 51 69 42 67 Z" fill={leafLight} />
        </g>
      )}

      {type === 'vegetative' && (
        <g>
          <path d="M 42 82 L 42 42" stroke={stem} strokeWidth="2.6" strokeLinecap="round" />
          {/* Lower pair */}
          <path d="M 42 66 L 28 57" stroke={stem} strokeWidth="1.8" strokeLinecap="round" />
          <ellipse cx="24" cy="55" rx="7" ry="4.2" transform="rotate(-24 24 55)" fill={leafMain} />
          <path d="M 42 66 L 56 57" stroke={stem} strokeWidth="1.8" strokeLinecap="round" />
          <ellipse cx="60" cy="55" rx="7" ry="4.2" transform="rotate(24 60 55)" fill={leafLight} />
          {/* Upper trifoliate */}
          <path d="M 42 50 L 31 40" stroke={stem} strokeWidth="1.8" strokeLinecap="round" />
          <ellipse cx="27" cy="38" rx="7" ry="4.5" transform="rotate(-30 27 38)" fill={leafMain} />
          <path d="M 42 50 L 53 40" stroke={stem} strokeWidth="1.8" strokeLinecap="round" />
          <ellipse cx="57" cy="38" rx="7" ry="4.5" transform="rotate(30 57 38)" fill={leafMain} />
          <ellipse cx="42" cy="33" rx="5.5" ry="7.5" fill={leafLight} />
        </g>
      )}

      {type === 'flowering' && (
        <g>
          <path d="M 42 82 L 42 20" stroke={stem} strokeWidth="2.8" strokeLinecap="round" />
          {/* Branches & lush foliage */}
          {[
            { y: 66, x: 24, rot: -22, f: leafMain },
            { y: 66, x: 60, rot: 22, f: leafMain },
            { y: 50, x: 22, rot: -26, f: leafLight },
            { y: 50, x: 62, rot: 26, f: leafMain },
            { y: 34, x: 27, rot: -28, f: leafMain },
            { y: 34, x: 57, rot: 28, f: leafLight },
          ].map((b, i) => (
            <g key={i}>
              <path d={`M 42 ${b.y + 4} L ${b.x} ${b.y}`} stroke={stem} strokeWidth="1.7" />
              <ellipse cx={b.x} cy={b.y} rx="8" ry="4.8" transform={`rotate(${b.rot} ${b.x} ${b.y})`} fill={b.f} />
            </g>
          ))}
          <ellipse cx="42" cy="17" rx="6" ry="8" fill={leafLight} />
          {/* Purple Flowers (R1-R2) */}
          <circle cx="37" cy="46" r="3.4" fill={flower} />
          <circle cx="47" cy="38" r="3.4" fill="#c084fc" />
          <circle cx="46" cy="56" r="3.1" fill={flower} />
          <circle cx="38" cy="29" r="2.8" fill="#c084fc" />
        </g>
      )}

      {type === 'podding' && (
        <g>
          <path d="M 42 82 L 42 15" stroke={stem} strokeWidth="3" strokeLinecap="round" />
          {[
            { y: 66, x: 22, rot: -22, f: leafMain },
            { y: 66, x: 62, rot: 22, f: leafMain },
            { y: 49, x: 20, rot: -25, f: leafLight },
            { y: 49, x: 64, rot: 25, f: leafMain },
            { y: 31, x: 24, rot: -26, f: leafMain },
            { y: 31, x: 60, rot: 26, f: leafLight },
          ].map((b, i) => (
            <g key={i}>
              <path d={`M 42 ${b.y + 4} L ${b.x} ${b.y}`} stroke={stem} strokeWidth="1.7" />
              <ellipse cx={b.x} cy={b.y} rx="8.5" ry="5" transform={`rotate(${b.rot} ${b.x} ${b.y})`} fill={b.f} />
            </g>
          ))}
          <ellipse cx="42" cy="13" rx="6.5" ry="8.5" fill={leafLight} />
          {/* Young Green Pods (R3-R4) */}
          <rect x="35" y="42" width="4" height="10" rx="2" transform="rotate(18 37 47)" fill="#84cc16" stroke="#15803d" strokeWidth="0.8" />
          <rect x="45" y="34" width="4" height="10" rx="2" transform="rotate(-18 47 39)" fill="#84cc16" stroke="#15803d" strokeWidth="0.8" />
          <rect x="44" y="53" width="4" height="10" rx="2" transform="rotate(-15 46 58)" fill="#84cc16" stroke="#15803d" strokeWidth="0.8" />
          <circle cx="38" cy="24" r="2.5" fill="#c084fc" />
        </g>
      )}

      {type === 'filling' && (
        <g>
          <path d="M 42 82 L 42 15" stroke={stem} strokeWidth="3" strokeLinecap="round" />
          {[
            { y: 66, x: 22, rot: -22, f: leafMain },
            { y: 66, x: 62, rot: 22, f: '#84cc16' },
            { y: 49, x: 20, rot: -25, f: '#84cc16' },
            { y: 49, x: 64, rot: 25, f: leafMain },
            { y: 31, x: 24, rot: -26, f: leafMain },
            { y: 31, x: 60, rot: 26, f: '#a3e635' },
          ].map((b, i) => (
            <g key={i}>
              <path d={`M 42 ${b.y + 4} L ${b.x} ${b.y}`} stroke={stem} strokeWidth="1.7" />
              <ellipse cx={b.x} cy={b.y} rx="8.5" ry="5" transform={`rotate(${b.rot} ${b.x} ${b.y})`} fill={b.f} />
            </g>
          ))}
          <ellipse cx="42" cy="13" rx="6.5" ry="8.5" fill="#a3e635" />
          {/* Plump Filling Pods (R5-R6) */}
          <rect x="33" y="40" width="5.2" height="12" rx="2.6" transform="rotate(20 35 46)" fill="#bef264" stroke="#4d7c0f" strokeWidth="1" />
          <rect x="45" y="31" width="5.2" height="12" rx="2.6" transform="rotate(-20 47 37)" fill="#bef264" stroke="#4d7c0f" strokeWidth="1" />
          <rect x="45" y="51" width="5.2" height="12" rx="2.6" transform="rotate(-15 47 57)" fill="#bef264" stroke="#4d7c0f" strokeWidth="1" />
          <rect x="34" y="57" width="5" height="11" rx="2.5" transform="rotate(15 36 62)" fill="#bef264" stroke="#4d7c0f" strokeWidth="1" />
        </g>
      )}

      {type === 'maturity' && (
        <g>
          <path d="M 42 82 L 42 18" stroke={leafAmber} strokeWidth="3" strokeLinecap="round" />
          {[
            { y: 66, x: 23, rot: -20, f: leafAmber },
            { y: 66, x: 61, rot: 20, f: leafGold },
            { y: 49, x: 21, rot: -24, f: leafGold },
            { y: 49, x: 63, rot: 24, f: leafAmber },
            { y: 32, x: 25, rot: -26, f: leafGold },
            { y: 32, x: 59, rot: 26, f: '#d97706' },
          ].map((b, i) => (
            <g key={i}>
              <path d={`M 42 ${b.y + 4} L ${b.x} ${b.y}`} stroke={leafAmber} strokeWidth="1.7" />
              <ellipse cx={b.x} cy={b.y} rx="8" ry="4.6" transform={`rotate(${b.rot} ${b.x} ${b.y})`} fill={b.f} opacity="0.9" />
            </g>
          ))}
          <ellipse cx="42" cy="16" rx="6" ry="7.5" fill={leafGold} />
          {/* Golden Mature Pods (R7-R9) */}
          <rect x="34" y="41" width="5.2" height="12" rx="2.6" transform="rotate(18 36 47)" fill="#fde047" stroke="#a16207" strokeWidth="1" />
          <rect x="45" y="33" width="5.2" height="12" rx="2.6" transform="rotate(-18 47 39)" fill="#fde047" stroke="#a16207" strokeWidth="1" />
          <rect x="45" y="52" width="5.2" height="12" rx="2.6" transform="rotate(-14 47 58)" fill="#fde047" stroke="#a16207" strokeWidth="1" />
        </g>
      )}
    </svg>
  );
};

export const CropPhenologyDiagram: React.FC<CropPhenologyDiagramProps> = ({
  cultura,
  selectedDae,
  availableDaes,
  stageCounts,
  onSelectDae,
  isDark,
}) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [hoveredStageId, setHoveredStageId] = useState<string | null>(null);

  const stages = useMemo(() => {
    const clean = (cultura || 'Soja').toLowerCase();
    if (clean.includes('algod')) return ALGODAO_STAGES;
    return SOJA_STAGES;
  }, [cultura]);

  // Compute sample counts & matching DAEs per visual stage group
  const stageStats = useMemo(() => {
    return stages.map((st) => {
      const matchingDaes = availableDaes.filter((d) => st.matchDae(d));
      const count = matchingDaes.reduce((sum, d) => sum + (stageCounts[d] || 0), 0);
      const isSelected = selectedDae !== 'TODOS' && st.matchDae(selectedDae);
      return {
        ...st,
        matchingDaes,
        count,
        isSelected,
      };
    });
  }, [stages, availableDaes, stageCounts, selectedDae]);

  const focusedStage = useMemo(() => {
    if (hoveredStageId) {
      return stageStats.find((s) => s.id === hoveredStageId) || null;
    }
    const active = stageStats.find((s) => s.isSelected);
    if (active) return active;
    // Default highlight: stage with most samples
    return [...stageStats].sort((a, b) => b.count - a.count)[0] || stageStats[3];
  }, [hoveredStageId, stageStats]);

  const handleClickStage = (stage: (typeof stageStats)[number]) => {
    if (stage.isSelected) {
      onSelectDae('TODOS');
      return;
    }
    if (stage.matchingDaes.length > 0) {
      // Pick the stage with the most samples inside this group
      const bestDae = [...stage.matchingDaes].sort(
        (a, b) => (stageCounts[b] || 0) - (stageCounts[a] || 0)
      )[0];
      onSelectDae(bestDae);
    }
  };

  const surfaceClass = isDark
    ? 'bg-[#0e1726]/80 border-white/[0.07] text-slate-100'
    : 'bg-white border-slate-200/90 text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.04)]';

  return (
    <section className={`rounded-2xl border transition-all overflow-hidden ${surfaceClass}`}>
      {/* Slim Header Bar */}
      <div className="px-5 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/12 text-emerald-500 flex items-center justify-center">
            <Sprout className="w-4 h-4" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xs sm:text-sm font-semibold tracking-tight">
              Fases Fenológicas — {cultura}
            </h2>
            {selectedDae !== 'TODOS' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                Estágio ativo: {selectedDae}
                <button
                  onClick={() => onSelectDae('TODOS')}
                  className="ml-1 underline hover:opacity-80 cursor-pointer"
                >
                  ver ciclo todo
                </button>
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                Clique em uma fase com amostras para filtrar o painel
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg transition cursor-pointer ${
            isDark
              ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <span>{expanded ? 'Recolher' : 'Expandir ciclo'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div
          className={`px-5 pb-4 pt-2 border-t ${
            isDark ? 'border-white/[0.05]' : 'border-slate-100'
          }`}
        >
          {/* Horizontal Growth Stage Progression */}
          <div className="relative overflow-x-auto pb-2">
            <div className="min-w-[660px] grid grid-cols-7 gap-2 relative" style={{ gridTemplateColumns: `repeat(${stageStats.length}, minmax(0, 1fr))` }}>
              {/* Continuous subtle soil horizon line */}
              <div
                className={`pointer-events-none absolute left-4 right-4 top-[84px] h-[2px] rounded-full ${
                  isDark
                    ? 'bg-gradient-to-r from-slate-800 via-emerald-500/35 to-amber-500/35'
                    : 'bg-gradient-to-r from-slate-200 via-emerald-400/50 to-amber-400/50'
                }`}
              />

              {stageStats.map((stage) => {
                const hasSamples = stage.count > 0;
                const isActive = stage.isSelected;
                const isHovered = hoveredStageId === stage.id;

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onMouseEnter={() => setHoveredStageId(stage.id)}
                    onMouseLeave={() => setHoveredStageId(null)}
                    onClick={() => handleClickStage(stage)}
                    disabled={!hasSamples && !isActive}
                    className={`group relative flex flex-col items-center rounded-xl px-2 py-2.5 transition-all text-center ${
                      isActive
                        ? isDark
                          ? 'bg-emerald-500/12 ring-1 ring-emerald-500/50'
                          : 'bg-emerald-50/90 ring-1 ring-emerald-500/50'
                        : hasSamples
                        ? isDark
                          ? 'hover:bg-white/[0.04] cursor-pointer'
                          : 'hover:bg-slate-50 cursor-pointer'
                        : 'opacity-50 cursor-default'
                    }`}
                  >
                    {/* Sample Count Pill Top */}
                    <div className="h-5 flex items-center justify-center mb-0.5">
                      {hasSamples ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded-full transition ${
                            isActive
                              ? 'bg-emerald-500 text-slate-950'
                              : isDark
                              ? 'bg-slate-800/90 text-emerald-400 group-hover:bg-emerald-500/20'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                          }`}
                        >
                          {isActive && <Check className="w-2.5 h-2.5" />}
                          {stage.count} {stage.count === 1 ? 'laudo' : 'laudos'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500/70">—</span>
                      )}
                    </div>

                    {/* Botanical SVG Illustration */}
                    <div
                      className={`transition-transform duration-300 ${
                        isActive || isHovered ? 'scale-105 -translate-y-0.5' : ''
                      }`}
                    >
                      <PlantStageSVG
                        type={stage.illustration}
                        active={isActive || isHovered}
                        isDark={isDark}
                      />
                    </div>

                    {/* Stage Code & Title */}
                    <div className="mt-1.5">
                      <div
                        className={`text-xs font-bold tracking-tight ${
                          isActive
                            ? 'text-emerald-500'
                            : isDark
                            ? 'text-slate-100'
                            : 'text-slate-800'
                        }`}
                      >
                        {stage.code}
                      </div>
                      <div className="text-[11px] font-medium text-slate-400 leading-tight">
                        {stage.title}
                      </div>
                      <div className="text-[10px] text-slate-500 tabular-nums mt-0.5">
                        {stage.daysHint}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Focused Stage Agronomic Detail Bar */}
          {focusedStage && (
            <div
              className={`mt-2 px-3.5 py-2.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs ${
                isDark
                  ? 'bg-[#070d12]/70 border border-white/[0.05]'
                  : 'bg-slate-50 border border-slate-200/70'
              }`}
            >
              <div className="flex items-start sm:items-center gap-2">
                <Info className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <span className="font-semibold text-emerald-500">
                    {focusedStage.code} ({focusedStage.title})
                  </span>
                  <span className="mx-1.5 text-slate-500">•</span>
                  <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                    {focusedStage.description}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-cyan-500 font-medium md:text-right shrink-0">
                Demanda chave: {focusedStage.demandFocus}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
