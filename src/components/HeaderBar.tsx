import React, { useRef, useState } from 'react';
import {
  Activity,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Droplets,
  FileSpreadsheet,
  FlaskConical,
  Layers,
  Leaf,
  Lock,
  MapPin,
  Microscope,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sprout,
  Sun,
  Upload,
} from 'lucide-react';
import { AnalysisType, ClientTenant, ETLStats, FilterState } from '../types/schema';
import { formatNumberPtBR } from '../utils/formatters';

interface SampleOption {
  key: string;
  label: string;
  subLabel: string;
}

interface ContextSummary {
  municipio: string;
  interessado: string;
  areaHa: number | null;
  dtColeta: string;
  dtEntrada: string;
  dtPlantio: string;
  dtEmergencia: string;
  totalFiltered: number;
  selectedSampleName: string | null;
}

interface HeaderBarProps {
  filters: FilterState;
  onUpdateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onResetFilters: () => void;
  activeClient: ClientTenant | null;
  activeClientCounts: Record<AnalysisType, number>;
  onOpenClientPortal: () => void;
  culturaOptions: string[];
  propriedadeOptions: { value: string; label: string; count: number }[];
  variedadeOptions: string[];
  texturaOptions: string[];
  daeOptions: string[];
  profundidadeOptions: string[];
  sampleOptions: SampleOption[];
  contextSummary: ContextSummary;
  etlStats: ETLStats;
  onUploadFile: (file: File) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const ANALYSIS_MODULES: {
  id: AnalysisType;
  label: string;
  icon: React.FC<{ className?: string }>;
  comingSoon?: boolean;
}[] = [
  { id: 'PECÍOLO', label: 'Pecíolo', icon: Sprout },
  { id: 'FOLHA', label: 'Folha', icon: Leaf },
  { id: 'SOLO', label: 'Solo', icon: Layers },
  { id: 'SOLUÇÃO', label: 'Solução', icon: Droplets },
  { id: 'NEMATÓIDE', label: 'Nematóide', icon: Microscope, comingSoon: true },
  { id: 'BIOLÓGICA', label: 'Biológica', icon: Activity, comingSoon: true },
];

export const HeaderBar: React.FC<HeaderBarProps> = ({
  filters,
  onUpdateFilter,
  onResetFilters,
  activeClient,
  activeClientCounts,
  onOpenClientPortal,
  culturaOptions,
  propriedadeOptions,
  variedadeOptions,
  texturaOptions,
  daeOptions,
  profundidadeOptions,
  sampleOptions,
  contextSummary,
  etlStats,
  onUploadFile,
  isDark,
  onToggleTheme,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showEtlModal, setShowEtlModal] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      e.target.value = '';
    }
  };

  const isSolo = filters.tipoAnalise === 'SOLO';
  const isSolucao = filters.tipoAnalise === 'SOLUÇÃO';

  const selectClass = isDark
    ? 'bg-[#0e1726] border-white/[0.08] text-slate-100 hover:border-white/[0.16] focus:border-emerald-500/70'
    : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 focus:border-emerald-600 shadow-[0_1px_2px_rgba(15,23,42,0.03)]';

  const visibleModules = ANALYSIS_MODULES.filter((mod) => {
    const count = activeClientCounts[mod.id] ?? 0;
    if (activeClient) return count > 0;
    return count > 0 || mod.comingSoon;
  });

  return (
    <>
      {/* SLIM STICKY TOP NAVBAR (~58px) */}
      <nav
        className={`sticky top-0 z-30 backdrop-blur-xl border-b transition-colors ${
          isDark
            ? 'bg-[#070d12]/85 border-white/[0.06] text-slate-100'
            : 'bg-white/90 border-slate-200/80 text-slate-900'
        }`}
      >
        <div className="max-w-[1480px] mx-auto px-4 lg:px-8 h-14 flex items-center justify-between gap-4">
          {/* Left: Brand + Compact Client Tenant Pill */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <FlaskConical className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="hidden sm:block leading-none">
                <span className="text-[13px] font-bold tracking-tight block">
                  Solo & Companhia
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Monitoramento Agronômico
                </span>
              </div>
            </div>

            <div className={`h-5 w-px hidden sm:block ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            <button
              onClick={onOpenClientPortal}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer truncate max-w-[230px] sm:max-w-[280px] border ${
                isDark
                  ? 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-slate-200'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
              }`}
              title="Trocar cliente conectado ou alternar para visão Admin"
            >
              {activeClient ? (
                <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              )}
              <span className="truncate font-semibold">
                {activeClient ? activeClient.nome : 'Admin • Todos'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
          </div>

          {/* Center: Clean Segmented Module Switcher */}
          <div
            className={`hidden md:flex items-center gap-0.5 p-1 rounded-xl border ${
              isDark
                ? 'bg-[#0e1726]/90 border-white/[0.07]'
                : 'bg-slate-100/90 border-slate-200/80'
            }`}
          >
            {visibleModules.map((mod) => {
              const Icon = mod.icon;
              const isSelected = filters.tipoAnalise === mod.id;
              const recordCount = activeClientCounts[mod.id] ?? 0;

              return (
                <button
                  key={mod.id}
                  onClick={() => onUpdateFilter('tipoAnalise', mod.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? isDark
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'bg-white text-emerald-700 shadow-sm'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{mod.label}</span>
                  {!mod.comingSoon && (
                    <span
                      className={`text-[10px] tabular-nums px-1.5 rounded-full ${
                        isSelected
                          ? isDark
                            ? 'bg-black/15 text-slate-950'
                            : 'bg-emerald-50 text-emerald-700'
                          : isDark
                          ? 'bg-white/[0.06] text-slate-400'
                          : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {recordCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Clean Utilities */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!activeClient && (
              <button
                onClick={() => setShowEtlModal((v) => !v)}
                className={`p-2 rounded-lg border transition cursor-pointer ${
                  isDark
                    ? 'bg-white/[0.03] border-white/[0.08] text-emerald-400 hover:bg-white/[0.07]'
                    : 'bg-slate-50 border-slate-200 text-emerald-700 hover:bg-slate-100'
                }`}
                title={`Auditoria ETL (${etlStats.discardedSerialDates + etlStats.cleanedNumericStrings} ajustes)`}
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                isDark
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              }`}
              title="Importar nova planilha .xlsx"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Importar .xlsx</span>
            </button>

            <button
              onClick={onToggleTheme}
              title={isDark ? 'Modo Claro' : 'Modo Escuro'}
              className={`p-2 rounded-lg border transition cursor-pointer ${
                isDark
                  ? 'bg-white/[0.03] border-white/[0.08] text-slate-300 hover:text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Module Bar */}
        <div className="md:hidden px-4 pb-2 flex items-center gap-1.5 overflow-x-auto">
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            const isSelected = filters.tipoAnalise === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => onUpdateFilter('tipoAnalise', mod.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap border ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                    : isDark
                    ? 'bg-[#0e1726] text-slate-300 border-white/[0.08]'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{mod.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* SCROLLABLE CLEAN FILTER & CONTEXT STRIP (Does not eat screen height on scroll) */}
      <div
        className={`border-b transition-colors ${
          isDark
            ? 'bg-[#0a111a]/70 border-white/[0.05]'
            : 'bg-slate-50/80 border-slate-200/70'
        }`}
      >
        <div className="max-w-[1480px] mx-auto px-4 lg:px-8 py-3 space-y-2.5">
          {/* Compact Inline Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter 1: Cultura (non-Solo) or Propriedade (Solo) */}
            {!isSolo && (
              <select
                aria-label="Cultura"
                value={filters.cultura}
                onChange={(e) => onUpdateFilter('cultura', e.target.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border outline-none transition ${selectClass}`}
              >
                {culturaOptions.map((c) => (
                  <option key={c} value={c}>
                    Cultura: {c}
                  </option>
                ))}
              </select>
            )}

            {/* Propriedade */}
            <select
              aria-label="Propriedade"
              value={filters.propriedade}
              onChange={(e) => onUpdateFilter('propriedade', e.target.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border outline-none transition max-w-[240px] ${selectClass}`}
            >
              <option value="TODOS">
                Propriedade: Todas ({propriedadeOptions.length})
              </option>
              {propriedadeOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} ({p.count})
                </option>
              ))}
            </select>

            {/* Textura (Solo) or Variedade (Tecido) */}
            {isSolo ? (
              <select
                aria-label="Classe Textural"
                value={filters.texturaSolo}
                onChange={(e) => onUpdateFilter('texturaSolo', e.target.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border outline-none transition ${selectClass}`}
              >
                <option value="TODOS">Textura: Todas</option>
                {texturaOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            ) : !isSolucao && variedadeOptions.length > 0 ? (
              <select
                aria-label="Variedade"
                value={filters.variedade}
                onChange={(e) => onUpdateFilter('variedade', e.target.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border outline-none transition max-w-[200px] ${selectClass}`}
              >
                <option value="TODOS">Variedade: Todas</option>
                {variedadeOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : null}

            {/* Profundidade (Solo/Solução) or Estágio DAE (Pecíolo/Folha) */}
            {isSolo || isSolucao ? (
              <select
                aria-label="Profundidade"
                value={filters.profundidadeSolo}
                onChange={(e) => onUpdateFilter('profundidadeSolo', e.target.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border outline-none transition ${selectClass}`}
              >
                <option value="ALL">Profundidade: Todas</option>
                {profundidadeOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            ) : (
              <select
                aria-label="Estágio Fenológico"
                value={filters.dae}
                onChange={(e) => onUpdateFilter('dae', e.target.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border outline-none transition ${
                  filters.dae !== 'TODOS'
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                    : selectClass
                }`}
              >
                <option value="TODOS">Estágio: Todos ({daeOptions.length})</option>
                {daeOptions.map((d) => (
                  <option key={d} value={d}>
                    Estágio {d}
                  </option>
                ))}
              </select>
            )}

            {/* Sample / Reading Mode */}
            <select
              aria-label="Modo de Leitura"
              value={filters.amostraMode}
              onChange={(e) => onUpdateFilter('amostraMode', e.target.value)}
              className={`flex-1 min-w-[220px] max-w-[360px] px-3 py-1.5 rounded-lg text-xs font-medium border outline-none transition ${
                filters.amostraMode !== 'GROUP_AVG'
                  ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-400 font-semibold'
                  : selectClass
              }`}
            >
              <option value="GROUP_AVG">
                Média do grupo ({contextSummary.totalFiltered} amostras)
              </option>
              {sampleOptions.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label} — {s.subLabel}
                </option>
              ))}
            </select>

            {(filters.propriedade !== 'TODOS' ||
              filters.variedade !== 'TODOS' ||
              filters.texturaSolo !== 'TODOS' ||
              filters.dae !== 'TODOS' ||
              filters.profundidadeSolo !== 'ALL' ||
              filters.amostraMode !== 'GROUP_AVG') && (
              <button
                onClick={onResetFilters}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                  isDark
                    ? 'text-slate-400 hover:text-rose-300 hover:bg-white/[0.04]'
                    : 'text-slate-500 hover:text-rose-600 hover:bg-slate-200/60'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>

          {/* Subtle Single-Line Context Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-500/80" />
                {contextSummary.municipio}
              </span>
              {contextSummary.areaHa !== null && (
                <span className="tabular-nums">
                  Área: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{formatNumberPtBR(contextSummary.areaHa, 1)} ha</strong>
                </span>
              )}
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Calendar className="w-3 h-3 text-cyan-500/80" />
                Coleta: {contextSummary.dtColeta}
              </span>
            </div>

            <div className="flex items-center gap-2 tabular-nums">
              {contextSummary.selectedSampleName && (
                <button
                  onClick={() => onUpdateFilter('amostraMode', 'GROUP_AVG')}
                  className="text-cyan-400 hover:underline font-medium cursor-pointer"
                >
                  Amostra {contextSummary.selectedSampleName} • Voltar à média
                </button>
              )}
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                {contextSummary.totalFiltered} {contextSummary.totalFiltered === 1 ? 'laudo filtrado' : 'laudos filtrados'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ETL Hygiene Audit Modal */}
      {showEtlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`max-w-lg w-full rounded-2xl border p-5 shadow-2xl ${
              isDark
                ? 'bg-[#0e1726] border-white/10 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-sm">Auditoria ETL & Higienização</h3>
              </div>
              <button
                onClick={() => setShowEtlModal(false)}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="font-medium text-emerald-400">Arquivo ativo:</span>
                <span className="font-bold tabular-nums text-emerald-400">
                  {etlStats.fileName} ({etlStats.loadedAt})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 tabular-nums">
                <div className={`p-3 rounded-xl border ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="text-slate-400 text-[11px]">Análises Indexadas</div>
                  <div className="text-lg font-bold mt-0.5">{etlStats.totalAnalises}</div>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="text-slate-400 text-[11px]">Seriais Descartados (&gt;10k)</div>
                  <div className="text-lg font-bold text-[#fb7185] mt-0.5">
                    {etlStats.discardedSerialDates}
                  </div>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="text-slate-400 text-[11px]">Strings Numéricas Limpas</div>
                  <div className="text-lg font-bold text-[#22d3ee] mt-0.5">
                    {etlStats.cleanedNumericStrings}
                  </div>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="text-slate-400 text-[11px]">Culturas Normalizadas</div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">
                    {etlStats.normalizedCultures}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  Ajuste automático de escala ÷1000 aplicado em {etlStats.scaledFolhaRecords} laudos foliares.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
