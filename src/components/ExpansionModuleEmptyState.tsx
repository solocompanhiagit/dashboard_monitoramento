import React from 'react';
import { Activity, ArrowLeft, CheckCircle2, Microscope, Sparkles } from 'lucide-react';
import { AnalysisType } from '../types/schema';

interface ExpansionModuleEmptyStateProps {
  tipoAnalise: AnalysisType;
  onSelectActiveModule: (type: AnalysisType) => void;
  isDark: boolean;
}

export const ExpansionModuleEmptyState: React.FC<ExpansionModuleEmptyStateProps> = ({
  tipoAnalise,
  onSelectActiveModule,
  isDark,
}) => {
  const isBio = tipoAnalise === 'BIOLÓGICA' || tipoAnalise === 'IQS';

  return (
    <div
      className={`p-8 rounded-2xl border max-w-3xl mx-auto my-6 text-center space-y-5 ${
        isDark
          ? 'bg-[#111827]/85 border-[#1e293b] text-slate-100'
          : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}
    >
      <div className="w-14 h-14 rounded-2xl mx-auto bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center">
        {isBio ? (
          <Activity className="w-7 h-7 text-emerald-400" />
        ) : (
          <Microscope className="w-7 h-7 text-cyan-400" />
        )}
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
          Módulo Preparado para Expansão • Safra 2021
        </span>
        <h2 className="text-xl font-extrabold mt-2">
          {isBio
            ? 'Bioanálise de Solo & Índice de Qualidade (fBio / IQS)'
            : 'Diagnóstico Fitopatológico de Nematóides (fNematoides)'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
          {isBio
            ? 'A arquitetura Star Schema já está conectada às tabelas fBio e dElementoBioRef (enzimas Beta-Glicosidase e Arilsulfatase). Na planilha SOLOECIA_BI SAFRA 2021.xlsx atual, a aba fBio encontra-se com 0 registros.'
            : 'A arquitetura Star Schema já está conectada à tabela fNematoides. Na planilha SOLOECIA_BI SAFRA 2021.xlsx atual, a aba fNematoides encontra-se com 0 registros.'}
        </p>
      </div>

      {isBio && (
        <div className="p-4 rounded-xl border border-[#1e293b] bg-[#070d12]/60 text-left max-w-lg mx-auto space-y-2 text-xs">
          <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Faixas de Referência Carregadas (dElementoBioRef):</span>
          </div>
          <div className="grid grid-cols-2 gap-2 tabular-nums text-slate-300 pt-1">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="font-bold text-white">β-Glicosidase</div>
              <div className="text-[11px] text-slate-400">
                Baixo: &lt; 66 • Médio: 66–115 • Adequado: &gt; 115 mg/kg
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="font-bold text-white">Arilsulfatase</div>
              <div className="text-[11px] text-slate-400">
                Baixo: &lt; 40 • Médio: 40–90 • Adequado: &gt; 90 mg/kg
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
        <button
          onClick={() => onSelectActiveModule('PECÍOLO')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Explorar Pecíolo (1.796 leituras)</span>
        </button>
        <button
          onClick={() => onSelectActiveModule('FOLHA')}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer"
        >
          Explorar Folha (1.231 leituras)
        </button>
        <button
          onClick={() => onSelectActiveModule('SOLO')}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition cursor-pointer"
        >
          Explorar Solo (541 leituras)
        </button>
        <button
          onClick={() => onSelectActiveModule('SOLUÇÃO')}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition cursor-pointer"
        >
          Explorar Solução do Solo (85 leituras)
        </button>
      </div>

      <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
        <span>
          Basta importar uma planilha .xlsx com linhas em fBio ou fNematoides para ativar os
          gráficos automaticamente.
        </span>
      </div>
    </div>
  );
};
