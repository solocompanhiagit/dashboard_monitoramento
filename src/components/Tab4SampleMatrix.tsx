import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  Search,
  Table2,
} from 'lucide-react';
import {
  AnalysisType,
  DatabaseStarSchema,
  FilterState,
  NutrientStatus,
} from '../types/schema';
import { formatNumberPtBR, getStatusMeta } from '../utils/formatters';
import {
  evaluateNutrient,
  getReferenceBounds,
  SOLO_ELEMENTS,
  SOLUCAO_ELEMENTS,
  TISSUE_ELEMENTS,
} from '../utils/referenceEngine';

export interface MatrixSampleItem {
  sampleKey: string;
  idAnalise: number;
  amostra: string;
  propriedade: string;
  interessado: string;
  variedade: string;
  cultura: string;
  dae: string;
  dtColeta: string;
  nutrients: Record<string, number | null>;
}

interface Tab4SampleMatrixProps {
  db: DatabaseStarSchema;
  filters: FilterState;
  rows: MatrixSampleItem[];
  onInspectSample: (sampleKey: string) => void;
  isDark: boolean;
}

export const Tab4SampleMatrix: React.FC<Tab4SampleMatrixProps> = ({
  db,
  filters,
  rows,
  onInspectSample,
  isDark,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<string>('amostra');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [pageSize, setPageSize] = useState<number>(50);

  const columns = useMemo(() => {
    if (filters.tipoAnalise === 'SOLO') return SOLO_ELEMENTS.slice(0, 12);
    if (filters.tipoAnalise === 'SOLUÇÃO') return SOLUCAO_ELEMENTS.slice(0, 12);
    return TISSUE_ELEMENTS;
  }, [filters.tipoAnalise]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc((v) => !v);
    } else {
      setSortCol(col);
      setSortAsc(col === 'amostra' || col === 'propriedade' || col === 'dae');
    }
  };

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? rows.filter(
          (r) =>
            r.amostra.toLowerCase().includes(q) ||
            r.variedade.toLowerCase().includes(q) ||
            r.propriedade.toLowerCase().includes(q) ||
            r.dae.toLowerCase().includes(q) ||
            String(r.idAnalise).includes(q)
        )
      : rows;

    return [...filtered].sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortCol === 'amostra') {
        return a.amostra.localeCompare(b.amostra, 'pt-BR', { numeric: true }) * dir;
      }
      if (sortCol === 'propriedade') {
        return a.propriedade.localeCompare(b.propriedade, 'pt-BR') * dir;
      }
      if (sortCol === 'variedade') {
        return a.variedade.localeCompare(b.variedade, 'pt-BR') * dir;
      }
      if (sortCol === 'dae') {
        return a.dae.localeCompare(b.dae, 'pt-BR', { numeric: true }) * dir;
      }
      const va = a.nutrients[sortCol];
      const vb = b.nutrients[sortCol];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      return (va - vb) * dir;
    });
  }, [rows, searchQuery, sortCol, sortAsc]);

  const visibleRows = filteredAndSorted.slice(0, pageSize);

  const getCellStatus = (
    row: MatrixSampleItem,
    code: string,
    val: number | null
  ): NutrientStatus => {
    if (val === null || val === undefined) return 'NO_REF';
    const meta = columns.find((c) => c.code === code) || columns[0];
    const bounds = getReferenceBounds(
      db,
      filters.tipoAnalise,
      row.cultura || filters.cultura,
      row.dae || filters.dae,
      code,
      {
        argilaPercent: row.nutrients.ArgilaPercent ?? 35,
        ctc: row.nutrients.CTC ?? 6,
      }
    );
    return evaluateNutrient(meta, val, bounds.min, bounds.max, 1).status;
  };

  const cardClass = isDark
    ? 'bg-[#111827]/80 border-[#1e293b] text-slate-100 backdrop-blur-md'
    : 'bg-white border-slate-200 text-slate-900 shadow-sm';

  return (
    <div className={`p-5 rounded-2xl border space-y-4 ${cardClass}`}>
      {/* Header & Instant Search */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-[#1e293b]/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Table2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold">
              Matriz Interativa de Amostras ({filteredAndSorted.length} registros)
            </h2>
            <p className="text-xs text-slate-400">
              Clique em qualquer linha da matriz para selecionar a amostra e abrir o diagnóstico
              completo na <strong>Aba 1 (Visão Geral & Bullet Charts)</strong>.
            </p>
          </div>
        </div>

        {/* Search + Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Legend Pills */}
          <div className="hidden sm:flex items-center gap-3 text-xs px-3 py-1.5 rounded-xl border border-[#1e293b] bg-[#070d12]/50">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#fb7185]" />
              Abaixo do Mín.
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
              Faixa Ideal
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22d3ee]" />
              Acima do Máx.
            </span>
          </div>

          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                filters.tipoAnalise === 'SOLO'
                  ? 'Buscar lote, textura, profundidade...'
                  : filters.tipoAnalise === 'SOLUÇÃO'
                  ? 'Buscar ponto, profundidade, cultura...'
                  : 'Buscar amostra, variedade, propriedade, DAE...'
              }
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border outline-none transition ${
                isDark
                  ? 'bg-[#070d12] border-[#1e293b] text-slate-100 focus:border-emerald-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Interactive Table */}
      <div className="overflow-x-auto rounded-xl border border-[#1e293b]/80">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr
              className={
                isDark
                  ? 'bg-[#070d12] text-slate-300 border-b border-[#1e293b]'
                  : 'bg-slate-100 text-slate-700 border-b border-slate-200'
              }
            >
              <th
                onClick={() => handleSort('amostra')}
                className="py-3 px-3 text-left font-bold cursor-pointer hover:text-emerald-400 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Amostra</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('propriedade')}
                className="py-3 px-3 text-left font-bold cursor-pointer hover:text-emerald-400 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Propriedade</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('variedade')}
                className="py-3 px-3 text-left font-bold cursor-pointer hover:text-emerald-400 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>
                    {filters.tipoAnalise === 'SOLO'
                      ? 'Classe Textural'
                      : filters.tipoAnalise === 'SOLUÇÃO'
                      ? 'Cultura'
                      : 'Variedade'}
                  </span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('dae')}
                className="py-3 px-2.5 text-center font-bold cursor-pointer hover:text-emerald-400 whitespace-nowrap"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>
                    {filters.tipoAnalise === 'SOLO' || filters.tipoAnalise === 'SOLUÇÃO'
                      ? 'Prof.'
                      : 'DAE'}
                  </span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>

              {columns.map((col) => {
                const isSorted = sortCol === col.code;
                return (
                  <th
                    key={col.code}
                    onClick={() => handleSort(col.code)}
                    className="py-3 px-2.5 text-right font-bold cursor-pointer hover:text-emerald-400 whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{col.code}</span>
                      <span className="text-[10px] font-normal text-slate-400">
                        ({col.unit})
                      </span>
                      {isSorted ? (
                        sortAsc ? (
                          <ArrowUp className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-emerald-400" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-35" />
                      )}
                    </div>
                  </th>
                );
              })}

              <th className="py-3 px-3 text-right font-bold whitespace-nowrap">Ação</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#1e293b]/60 tabular-nums">
            {visibleRows.map((row) => {
              const isSelected = filters.amostraMode === row.sampleKey;
              return (
                <tr
                  key={row.sampleKey}
                  onClick={() => onInspectSample(row.sampleKey)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/15 hover:bg-emerald-500/20'
                      : isDark
                      ? 'hover:bg-slate-800/60'
                      : 'hover:bg-emerald-50/60'
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">#{row.idAnalise}</span>
                      <span>{row.amostra}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 max-w-[180px] truncate">
                    {row.propriedade}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 max-w-[160px] truncate">
                    {row.variedade}
                  </td>
                  <td className="py-2.5 px-2.5 text-center">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 text-[11px] font-semibold">
                      {row.dae}
                    </span>
                  </td>

                  {columns.map((col) => {
                    const val = row.nutrients[col.code] ?? null;
                    const status = getCellStatus(row, col.code, val);
                    const statusMeta = getStatusMeta(status);

                    return (
                      <td
                        key={col.code}
                        className="py-2.5 px-2.5 text-right whitespace-nowrap"
                      >
                        {val !== null ? (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${statusMeta.dotClass}`}
                              title={statusMeta.label}
                            />
                            <span
                              className={`font-semibold ${
                                status === 'LOW'
                                  ? 'text-[#fb7185]'
                                  : status === 'HIGH'
                                  ? 'text-[#22d3ee]'
                                  : isDark
                                  ? 'text-slate-100'
                                  : 'text-slate-800'
                              }`}
                            >
                              {formatNumberPtBR(val)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300">
                      <span>Diagnosticar</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination / Load More Footer */}
      {filteredAndSorted.length > pageSize && (
        <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
          <span>
            Exibindo {visibleRows.length} de {filteredAndSorted.length} amostras filtradas
          </span>
          <button
            onClick={() => setPageSize((p) => p + 100)}
            className="px-4 py-1.5 rounded-xl font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition cursor-pointer"
          >
            Carregar +100 amostras
          </button>
        </div>
      )}
    </div>
  );
};
