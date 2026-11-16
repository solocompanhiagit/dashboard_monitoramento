import React, { useRef, useState } from 'react';
import {
  Activity,
  Building2,
  Calendar,
  CheckCircle2,
  Database,
  Droplets,
  FileSpreadsheet,
  Filter,
  FlaskConical,
  KeyRound,
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
  activeClient: ClientTenant | null; // null = ADMIN_ALL
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
  { id: 'SOLUÇÃO', label: 'Solução do Solo', icon: Droplets },
  { id: 'NEMATÓIDE', label: 'Nematóide', icon: Microscope, comingSoon: true },
  { id: 'BIOLÓGICA', label: 'Biológica / IQS', icon: Activity, comingSoon: true },
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

  const cardSurface = isDark
    ? 'bg-[#111827]/85 border-[#1e293b] text-slate-100'
    : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm';

  const selectSurface = isDark
    ? 'bg-[#0b131e] border-[#1e293b] text-slate-100 focus:border-emerald-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600';

  const isSolo = filters.tipoAnalise === 'SOLO';
  const isSolucao = filters.tipoAnalise === 'SOLUÇÃO';

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl border-b transition-colors duration-200 border-[#1e293b]/80 bg-opacity-90">
      <div className={`w-full border-b ${cardSurface} px-4 lg:px-6 py-3`}>
        {/* Top Row: Brand Identity + Client Portal Access Pill + Utilities */}
        <div className="max-w-[1600px] mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          {/* Brand + Active Client Portal Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center shadow-inner">
                <FlaskConical className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                    Laboratório Solo & Companhia
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight">
                  Diagnóstico Nutricional & Portal do Cliente
                </h1>
              </div>
            </div>

            {/* Client Tenant Session Switcher Pill */}
            <button
              onClick={onOpenClientPortal}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-left transition cursor-pointer ${
                activeClient
                  ? isDark
                    ? 'bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/20 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100 text-emerald-900'
                  : isDark
                  ? 'bg-cyan-500/10 border-cyan-500/40 hover:bg-cyan-500/20 text-cyan-200'
                  : 'bg-cyan-50 border-cyan-300 hover:bg-cyan-100 text-cyan-900'
              }`}
              title="Trocar cliente conectado ou alternar para Visão Administrador do Laboratório"
            >
              {activeClient ? (
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              )}
              <div className="leading-tight">
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                  {activeClient ? 'Acesso Isolado do Cliente' : 'Admin Laboratório'}
                </div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>{activeClient ? activeClient.nome : 'Todos os Clientes'}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/25 font-semibold flex items-center gap-1">
                    <KeyRound className="w-2.5 h-2.5" /> Trocar
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Dynamic Analysis Type Selector: Client Mode shows ONLY packages present in that client's DB */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0">
            {ANALYSIS_MODULES.filter((mod) => {
              const count = activeClientCounts[mod.id] ?? 0;
              if (activeClient) {
                return count > 0;
              }
              return count > 0 || mod.comingSoon;
            }).map((mod) => {
              const Icon = mod.icon;
              const isSelected = filters.tipoAnalise === mod.id;
              const recordCount = activeClientCounts[mod.id] ?? 0;

              return (
                <button
                  key={mod.id}
                  onClick={() => onUpdateFilter('tipoAnalise', mod.id)}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                      : mod.comingSoon
                      ? isDark
                        ? 'bg-[#0b131e]/50 text-slate-500 border-[#1e293b] hover:border-slate-700'
                        : 'bg-slate-100 text-slate-400 border-slate-200 hover:border-slate-300'
                      : isDark
                      ? 'bg-[#0b131e] text-slate-300 border-[#1e293b] hover:border-emerald-500/40 hover:text-white'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-emerald-500/40'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isSelected
                        ? 'text-emerald-400'
                        : mod.comingSoon
                        ? 'text-slate-500'
                        : 'text-cyan-400'
                    }`}
                  />
                  <span>{mod.label}</span>
                  {mod.comingSoon ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                      Em breve
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded ${
                        isSelected
                          ? 'bg-emerald-500/30 text-emerald-200'
                          : isDark
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {recordCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Utilities: Subtle ETL icon + Upload XLSX + Theme Toggle */}
          <div className="flex items-center justify-end gap-2">
            {!activeClient && (
              <button
                onClick={() => setShowEtlModal((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  isDark
                    ? 'bg-[#0b131e] border-[#1e293b] text-emerald-400 hover:border-emerald-500/40'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                }`}
                title="Auditoria do Motor ETL & Higienização da Planilha"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="tabular-nums text-[10px]">
                  ETL ({etlStats.discardedSerialDates + etlStats.cleanedNumericStrings})
                </span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-sm cursor-pointer"
              title="Importar nova versão da planilha .xlsx via SheetJS"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar .xlsx</span>
            </button>

            <button
              onClick={onToggleTheme}
              title={isDark ? 'Alternar para Modo Claro (#f8fafc)' : 'Alternar para Dark Mode (#070d12)'}
              className={`p-2 rounded-lg border transition cursor-pointer ${
                isDark
                  ? 'bg-[#0b131e] border-[#1e293b] text-slate-300 hover:text-emerald-400'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-emerald-700'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Second Row: Context-Aware Cascading Filters (Never shows Crop/Variety/DAE for Solo!) */}
        <div className="max-w-[1600px] mx-auto mt-3 pt-2.5 border-t border-[#1e293b]/60 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 items-end">
          {/* Slot 1: Propriedade (do Cliente) or Cultura (para Tecido/Solução) */}
          {isSolo ? (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                1. Propriedade ({activeClient ? 'Sua Fazenda' : 'Todas'})
              </label>
              <select
                value={filters.propriedade}
                onChange={(e) => onUpdateFilter('propriedade', e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border outline-none transition ${selectSurface}`}
              >
                <option value="TODOS">Todas ({propriedadeOptions.length})</option>
                {propriedadeOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label} ({p.count})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                1. Cultura
              </label>
              <select
                value={filters.cultura}
                onChange={(e) => onUpdateFilter('cultura', e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border outline-none transition ${selectSurface}`}
              >
                {culturaOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Slot 2: Classe Textural (Solo) OR Propriedade (Tecido/Solução) */}
          {isSolo ? (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                2. Classe Textural do Solo
              </label>
              <select
                value={filters.texturaSolo}
                onChange={(e) => onUpdateFilter('texturaSolo', e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border outline-none transition ${selectSurface}`}
              >
                <option value="TODOS">Todas as Texturas ({texturaOptions.length})</option>
                {texturaOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                2. Propriedade ({activeClient ? 'Do Cliente' : 'Todas'})
              </label>
              <select
                value={filters.propriedade}
                onChange={(e) => onUpdateFilter('propriedade', e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border outline-none transition ${selectSurface}`}
              >
                <option value="TODOS">Todas ({propriedadeOptions.length})</option>
                {propriedadeOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label} ({p.count})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Slot 3: Profundidade (Solo/Solução) OR Variedade (Pecíolo/Folha) */}
          {isSolo || isSolucao ? (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                {isSolo ? '3. Profundidade (cm)' : '3. Profundidade de Extração'}
              </label>
              <select
                value={filters.profundidadeSolo}
                onChange={(e) => onUpdateFilter('profundidadeSolo', e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border outline-none transition ${selectSurface}`}
              >
                <option value="ALL">Todas ({profundidadeOptions.length})</option>
                {profundidadeOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                3. Variedade / Cultivar
              </label>
              <select
                value={filters.variedade}
                onChange={(e) => onUpdateFilter('variedade', e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border outline-none transition ${selectSurface}`}
              >
                <option value="TODOS">Todas ({variedadeOptions.length})</option>
                {variedadeOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Slot 4: Estágio Fenológico (Only for Pecíolo / Folha) or Solo Context */}
          {isSolo ? (
            <div className="flex items-center px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-[11px] text-emerald-300 h-[34px]">
              <Layers className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span className="truncate">Avaliação Química & CTC</span>
            </div>
          ) : isSolucao ? (
            <div className="flex items-center px-3 py-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-[11px] text-cyan-300 h-[34px]">
              <Droplets className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span className="truncate">Solução & Extrato Aquoso</span>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                4. Estágio Fenológico (DAE)
              </label>
              <select
                value={filters.dae}
                onChange={(e) => onUpdateFilter('dae', e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border outline-none transition ${selectSurface}`}
              >
                <option value="TODOS">Todos os Estágios ({daeOptions.length})</option>
                {daeOptions.map((d) => (
                  <option key={d} value={d}>
                    Estágio {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Slot 5 & 6: Amostra (Média do grupo ou inspeção individual) */}
          <div className="sm:col-span-2 flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                {isSolo ? '4.' : isSolucao ? '4.' : '5.'} Modo de Leitura / Amostra ({sampleOptions.length} disponíveis)
              </label>
              <select
                value={filters.amostraMode}
                onChange={(e) => onUpdateFilter('amostraMode', e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold border outline-none transition ${
                  filters.amostraMode !== 'GROUP_AVG'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                    : selectSurface
                }`}
              >
                <option value="GROUP_AVG">
                  📊 Média consolidada do grupo ({contextSummary.totalFiltered} leituras)
                </option>
                {sampleOptions.map((s) => (
                  <option key={s.key} value={s.key}>
                    🔍 {s.label} — {s.subLabel}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onResetFilters}
              title="Limpar filtros de amostra/propriedade (mantém cliente conectado)"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition cursor-pointer ${
                isDark
                  ? 'bg-[#0b131e] border-[#1e293b] text-slate-300 hover:border-rose-500/40 hover:text-rose-300'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Limpar</span>
            </button>
          </div>
        </div>

        {/* Third Row: Inline Context Summary Bar */}
        <div className="max-w-[1600px] mx-auto mt-2.5 pt-2 border-t border-[#1e293b]/40 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>Cliente:</strong>{' '}
              {contextSummary.interessado}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>Município:</strong>{' '}
              {contextSummary.municipio}
            </span>
            <span className="flex items-center gap-1.5 tabular-nums">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>Área:</strong>{' '}
              {contextSummary.areaHa !== null
                ? `${formatNumberPtBR(contextSummary.areaHa, 1)} ha`
                : 'Não inf.'}
            </span>
            <span className="flex items-center gap-1.5 tabular-nums">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                Coleta / Entrada:
              </strong>{' '}
              {contextSummary.dtColeta} • {contextSummary.dtEntrada}
            </span>
            {!isSolo && !isSolucao && (contextSummary.dtPlantio !== '—' || contextSummary.dtEmergencia !== '—') && (
              <span className="hidden md:flex items-center gap-1.5 tabular-nums">
                <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                  Plantio / Emerg.:
                </strong>{' '}
                {contextSummary.dtPlantio} • {contextSummary.dtEmergencia}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {contextSummary.selectedSampleName && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <span>Inspecionando: {contextSummary.selectedSampleName}</span>
                <button
                  onClick={() => onUpdateFilter('amostraMode', 'GROUP_AVG')}
                  className="ml-1 hover:text-white underline cursor-pointer"
                >
                  (voltar à média)
                </button>
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tabular-nums bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {contextSummary.totalFiltered} amostras filtradas
            </span>
          </div>
        </div>
      </div>

      {/* ETL Hygiene Audit Modal / Popover */}
      {showEtlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`max-w-lg w-full rounded-2xl border p-5 shadow-2xl ${
              isDark
                ? 'bg-[#111827] border-[#1e293b] text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">
                  Auditoria do Motor ETL & Higienização da Planilha
                </h3>
              </div>
              <button
                onClick={() => setShowEtlModal(false)}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
                <span className="font-medium text-emerald-300">Arquivo ativo carregado:</span>
                <span className="font-bold tabular-nums text-emerald-400">
                  {etlStats.fileName} ({etlStats.loadedAt})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 tabular-nums">
                <div className="p-3 rounded-xl border border-[#1e293b] bg-[#070d12]/60">
                  <div className="text-slate-400 text-[11px]">Análises Indexadas (Star Schema)</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {etlStats.totalAnalises}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-[#1e293b] bg-[#070d12]/60">
                  <div className="text-slate-400 text-[11px]">
                    Datas Seriais Descartadas (&gt;10.000)
                  </div>
                  <div className="text-lg font-bold text-rose-400 mt-0.5">
                    {etlStats.discardedSerialDates} leituras
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-[#1e293b] bg-[#070d12]/60">
                  <div className="text-slate-400 text-[11px]">
                    Strings c/ Vírgula / Dupla Vírgula
                  </div>
                  <div className="text-lg font-bold text-cyan-400 mt-0.5">
                    {etlStats.cleanedNumericStrings} convertidas
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-[#1e293b] bg-[#070d12]/60">
                  <div className="text-slate-400 text-[11px]">
                    Culturas Corrigidas via Relatório
                  </div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">
                    {etlStats.normalizedCultures} registros
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[#1e293b] bg-[#070d12]/40 space-y-1.5 text-slate-300">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Regras de Higienização & Multi-Cliente Aplicadas:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                  <li>
                    Conversão de strings numéricas com vírgula e dupla vírgula (ex.:{' '}
                    <code>"97,,085"</code> → <code>97,09</code>).
                  </li>
                  <li>
                    Descarte de seriais de data em <code>fDAE</code> e ajuste de escala{' '}
                    <code>÷1000</code> em <code>{etlStats.scaledFolhaRecords}</code> laudos foliares.
                  </li>
                  <li>
                    Segregação automática de carteiras de clientes para controle de acesso individual.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
