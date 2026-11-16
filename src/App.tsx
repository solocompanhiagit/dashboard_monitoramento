import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Compass,
  Droplets,
  Layers,
  Leaf,
  Loader2,
  Sprout,
  Table2,
} from 'lucide-react';
import {
  ActiveTab,
  AnalysisType,
  DatabaseStarSchema,
  FilterState,
  NutrientEvaluation,
} from './types/schema';
import { parseWorkbookBuffer } from './utils/etlParser';
import {
  evaluateNutrient,
  getReferenceBounds,
  getStageOrderScore,
  SOLO_ELEMENTS,
  SOLUCAO_ELEMENTS,
  TISSUE_ELEMENTS,
} from './utils/referenceEngine';
import { HeaderBar } from './components/HeaderBar';
import { ClientPortalModal } from './components/ClientPortalModal';
import { Tab1OverviewBullet } from './components/Tab1OverviewBullet';
import { Tab2FoliarBalance } from './components/Tab2FoliarBalance';
import { Tab2RadarPhenology } from './components/Tab2RadarPhenology';
import { Tab2SoilFertilityProfile } from './components/Tab2SoilFertilityProfile';
import { Tab2SoilSolutionBalance } from './components/Tab2SoilSolutionBalance';
import { Tab3IntegratedSoilLeaf } from './components/Tab3IntegratedSoilLeaf';
import { MatrixSampleItem, Tab4SampleMatrix } from './components/Tab4SampleMatrix';
import { ExpansionModuleEmptyState } from './components/ExpansionModuleEmptyState';

export const App: React.FC = () => {
  const [db, setDb] = useState<DatabaseStarSchema | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('OVERVIEW');
  const [clientModalOpen, setClientModalOpen] = useState<boolean>(false);

  const [filters, setFilters] = useState<FilterState>({
    clienteId: 'CLI-BOAVISTA',
    tipoAnalise: 'PECÍOLO',
    cultura: 'Soja',
    propriedade: 'TODOS',
    variedade: 'TODOS',
    texturaSolo: 'TODOS',
    dae: 'TODOS',
    amostraMode: 'GROUP_AVG',
    profundidadeSolo: 'ALL',
  });

  // Load default dataset SOLOECIA_BI_SAFRA_2021.xlsx on mount
  useEffect(() => {
    let mounted = true;
    const loadDefault = async () => {
      try {
        setLoading(true);
        const res = await fetch('/SOLOECIA_BI_SAFRA_2021.xlsx');
        if (!res.ok) {
          throw new Error(`Falha ao carregar planilha padrão (${res.status})`);
        }
        const buf = await res.arrayBuffer();
        const parsed = parseWorkbookBuffer(buf, 'SOLOECIA_BI SAFRA 2021.xlsx');
        if (mounted) {
          setDb(parsed);
          // Pick best default client (prefer one with Pecíolo + Folha + Solo, or first available)
          const defaultClient =
            parsed.clients.find((c) => c.id === 'CLI-BOAVISTA') ||
            parsed.clients[0];
          if (defaultClient) {
            const firstType: AnalysisType =
              defaultClient.countsByType['PECÍOLO'] > 0
                ? 'PECÍOLO'
                : defaultClient.countsByType.FOLHA > 0
                ? 'FOLHA'
                : defaultClient.countsByType.SOLO > 0
                ? 'SOLO'
                : 'SOLUÇÃO';
            setFilters((prev) => ({
              ...prev,
              clienteId: defaultClient.id,
              tipoAnalise: firstType,
            }));
          }
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Erro ao processar planilha.');
          setLoading(false);
        }
      }
    };
    loadDefault();
    return () => {
      mounted = false;
    };
  }, []);

  // Handle user uploading a new .xlsx file in the browser
  const handleUploadFile = async (file: File) => {
    try {
      setLoading(true);
      const buf = await file.arrayBuffer();
      const parsed = parseWorkbookBuffer(buf, file.name);
      setDb(parsed);
      const firstClient = parsed.clients[0];
      const nextClientId = firstClient ? firstClient.id : 'ADMIN_ALL';
      const nextType: AnalysisType =
        firstClient && firstClient.countsByType['PECÍOLO'] > 0
          ? 'PECÍOLO'
          : firstClient && firstClient.countsByType.FOLHA > 0
          ? 'FOLHA'
          : firstClient && firstClient.countsByType.SOLO > 0
          ? 'SOLO'
          : 'PECÍOLO';

      setFilters({
        clienteId: nextClientId,
        tipoAnalise: nextType,
        cultura: 'Soja',
        propriedade: 'TODOS',
        variedade: 'TODOS',
        texturaSolo: 'TODOS',
        dae: 'TODOS',
        amostraMode: 'GROUP_AVG',
        profundidadeSolo: 'ALL',
      });
      setLoading(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível ler o arquivo Excel enviado.'
      );
      setLoading(false);
    }
  };

  // Switch active client tenant safely
  const handleSelectClient = (clientId: string) => {
    if (!db) return;
    if (clientId === 'ADMIN_ALL') {
      setFilters((prev) => ({
        ...prev,
        clienteId: 'ADMIN_ALL',
        propriedade: 'TODOS',
        variedade: 'TODOS',
        texturaSolo: 'TODOS',
        dae: 'TODOS',
        amostraMode: 'GROUP_AVG',
        profundidadeSolo: 'ALL',
      }));
      return;
    }

    const client = db.clients.find((c) => c.id === clientId);
    let nextTipo = filters.tipoAnalise;
    if (client && (client.countsByType[nextTipo] ?? 0) === 0) {
      const order: AnalysisType[] = ['PECÍOLO', 'FOLHA', 'SOLO', 'SOLUÇÃO'];
      nextTipo = order.find((t) => client.countsByType[t] > 0) || 'PECÍOLO';
    }

    setFilters((prev) => ({
      ...prev,
      clienteId: clientId,
      tipoAnalise: nextTipo,
      propriedade: 'TODOS',
      variedade: 'TODOS',
      texturaSolo: 'TODOS',
      dae: 'TODOS',
      amostraMode: 'GROUP_AVG',
      profundidadeSolo: 'ALL',
    }));
  };

  // Update filter with cascading resets
  const handleUpdateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'tipoAnalise') {
        next.propriedade = 'TODOS';
        next.variedade = 'TODOS';
        next.texturaSolo = 'TODOS';
        next.dae = 'TODOS';
        next.amostraMode = 'GROUP_AVG';
        next.profundidadeSolo = 'ALL';
      } else if (key === 'cultura') {
        next.propriedade = 'TODOS';
        next.variedade = 'TODOS';
        next.dae = 'TODOS';
        next.amostraMode = 'GROUP_AVG';
      } else if (key === 'propriedade') {
        next.variedade = 'TODOS';
        next.texturaSolo = 'TODOS';
        next.amostraMode = 'GROUP_AVG';
      } else if (
        key === 'variedade' ||
        key === 'texturaSolo' ||
        key === 'dae' ||
        key === 'profundidadeSolo'
      ) {
        next.amostraMode = 'GROUP_AVG';
      }
      return next;
    });
  };

  const handleResetFilters = () => {
    setFilters((prev) => ({
      ...prev,
      propriedade: 'TODOS',
      variedade: 'TODOS',
      texturaSolo: 'TODOS',
      dae: 'TODOS',
      amostraMode: 'GROUP_AVG',
      profundidadeSolo: 'ALL',
    }));
  };

  const activeClient = useMemo(() => {
    if (!db || filters.clienteId === 'ADMIN_ALL') return null;
    return db.clients.find((c) => c.id === filters.clienteId) || null;
  }, [db, filters.clienteId]);

  const activeClientCounts = useMemo<Record<AnalysisType, number>>(() => {
    if (!db) {
      return {
        'PECÍOLO': 0,
        FOLHA: 0,
        SOLO: 0,
        'SOLUÇÃO': 0,
        'NEMATÓIDE': 0,
        'BIOLÓGICA': 0,
        IQS: 0,
      };
    }
    if (activeClient) return activeClient.countsByType;
    return db.etlStats.countsByType;
  }, [db, activeClient]);

  // Integrated Tab 3 only exists if this client (or admin view) has BOTH Soil AND Leaf/Petiole data!
  const hasIntegratedSoilTissue =
    activeClientCounts.SOLO > 0 &&
    (activeClientCounts.FOLHA > 0 || activeClientCounts['PECÍOLO'] > 0);

  useEffect(() => {
    if (activeTab === 'INTEGRATED_SOIL' && !hasIntegratedSoilTissue) {
      setActiveTab('OVERVIEW');
    }
  }, [activeTab, hasIntegratedSoilTissue]);

  // Build unified records STRICTLY scoped to active clienteId and tipoAnalise
  const baseRecordsForType = useMemo<MatrixSampleItem[]>(() => {
    if (!db) return [];

    const matchesClient = (idAnalise: number): boolean => {
      if (filters.clienteId === 'ADMIN_ALL') return true;
      const cli = db.dClienteAnalise.get(idAnalise);
      return cli?.clienteId === filters.clienteId;
    };

    if (filters.tipoAnalise === 'PECÍOLO') {
      return db.fDAE
        .filter((r) => matchesClient(r.ID_ANALISE))
        .map((r, idx) => {
          const cli = db.dClienteAnalise.get(r.ID_ANALISE);
          const dae = r.DAE !== 'Não Inf.' ? r.DAE : cli?.DAE || 'R1';
          return {
            sampleKey: `PEC::${r.ID_ANALISE}::${idx}`,
            idAnalise: r.ID_ANALISE,
            amostra: cli?.AMOSTRA || `Amostra #${r.ID_ANALISE}`,
            propriedade: cli?.PROPRIEDADE || 'Não Informada',
            interessado: cli?.INTERESSADO || 'Não Informado',
            variedade: cli?.VARIEDADE || 'Não Informada',
            cultura: cli?.NOME_CULTURA || 'Soja',
            dae,
            dtColeta: cli?.DT_COLETA || cli?.DT_ENTRADA || '—',
            nutrients: r.nutrients,
          };
        });
    }

    if (filters.tipoAnalise === 'FOLHA') {
      return db.fFolha
        .filter((r) => matchesClient(r.ID_ANALISE))
        .map((r, idx) => {
          const cli = db.dClienteAnalise.get(r.ID_ANALISE);
          return {
            sampleKey: `FOL::${r.ID_ANALISE}::${idx}`,
            idAnalise: r.ID_ANALISE,
            amostra: cli?.AMOSTRA || `Amostra #${r.ID_ANALISE}`,
            propriedade: cli?.PROPRIEDADE || 'Não Informada',
            interessado: cli?.INTERESSADO || 'Não Informado',
            variedade: cli?.VARIEDADE || 'Não Informada',
            cultura: cli?.NOME_CULTURA || 'Soja',
            dae: cli?.DAE || 'R1',
            dtColeta: cli?.DT_COLETA || cli?.DT_ENTRADA || '—',
            nutrients: r.nutrients,
          };
        });
    }

    if (filters.tipoAnalise === 'SOLO') {
      return db.fSolo
        .filter((r) => matchesClient(r.ID_ANALISE))
        .map((r, idx) => {
          const cli = db.dClienteAnalise.get(r.ID_ANALISE);
          return {
            sampleKey: `SOL::${r.ID_ANALISE}::${r.PROFUNDIDADE}::${idx}`,
            idAnalise: r.ID_ANALISE,
            amostra: `${cli?.AMOSTRA || `Lote #${r.ID_ANALISE}`} (${r.PROFUNDIDADE_DESC})`,
            propriedade: cli?.PROPRIEDADE || 'Não Informada',
            interessado: cli?.INTERESSADO || 'Não Informado',
            variedade: r.CLASSE_TEXTURAL || 'Não Classificada', // Stores Soil Texture Class for Solo
            cultura: cli?.NOME_CULTURA || 'Solo',
            dae: r.PROFUNDIDADE_DESC, // Stores Depth Class for Solo
            dtColeta: cli?.DT_COLETA || cli?.DT_ENTRADA || '—',
            nutrients: r.metrics,
          };
        });
    }

    if (filters.tipoAnalise === 'SOLUÇÃO') {
      return db.fSolucaoSolo
        .filter((r) => matchesClient(r.ID_ANALISE))
        .map((r, idx) => {
          const cli = db.dClienteAnalise.get(r.ID_ANALISE);
          return {
            sampleKey: `SSOL::${r.ID_ANALISE}::${idx}`,
            idAnalise: r.ID_ANALISE,
            amostra: cli?.AMOSTRA || `Solução #${r.ID_ANALISE}`,
            propriedade: cli?.PROPRIEDADE || 'Não Informada',
            interessado: cli?.INTERESSADO || 'Não Informado',
            variedade: cli?.NOME_CULTURA || 'Cultura Geral',
            cultura: cli?.NOME_CULTURA || 'Soja',
            dae: r.PROFUNDIDADE_DESC,
            dtColeta: cli?.DT_COLETA || cli?.DT_ENTRADA || '—',
            nutrients: r.metrics,
          };
        });
    }

    return [];
  }, [db, filters.clienteId, filters.tipoAnalise]);

  // Cascading Filter Options
  const culturaOptions = useMemo(() => {
    const set = new Set<string>();
    baseRecordsForType.forEach((r) => {
      if (r.cultura) set.add(r.cultura);
    });
    const list = [...set];
    return list.length > 0 ? list : ['Soja'];
  }, [baseRecordsForType]);

  useEffect(() => {
    if (
      filters.tipoAnalise !== 'SOLO' &&
      culturaOptions.length > 0 &&
      !culturaOptions.includes(filters.cultura)
    ) {
      setFilters((prev) => ({ ...prev, cultura: culturaOptions[0] }));
    }
  }, [culturaOptions, filters.cultura, filters.tipoAnalise]);

  // Step 1 filter: by Cultura (skipped for SOLO because Soil chemistry is independent of cultivar)
  const recordsAfterCultura = useMemo(() => {
    if (filters.tipoAnalise === 'SOLO') return baseRecordsForType;
    return baseRecordsForType.filter(
      (r) => r.cultura.toLowerCase() === filters.cultura.toLowerCase()
    );
  }, [baseRecordsForType, filters.cultura, filters.tipoAnalise]);

  const propriedadeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    recordsAfterCultura.forEach((r) => {
      counts.set(r.propriedade, (counts.get(r.propriedade) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);
  }, [recordsAfterCultura]);

  const recordsAfterPropriedade = useMemo(() => {
    if (filters.propriedade === 'TODOS') return recordsAfterCultura;
    return recordsAfterCultura.filter((r) => r.propriedade === filters.propriedade);
  }, [recordsAfterCultura, filters.propriedade]);

  // Textural classes (for SOLO) & Varieties (for PECÍOLO/FOLHA)
  const texturaOptions = useMemo(() => {
    if (filters.tipoAnalise !== 'SOLO') return [];
    const set = new Set<string>();
    recordsAfterPropriedade.forEach((r) => {
      if (r.variedade) set.add(r.variedade);
    });
    return [...set].sort();
  }, [recordsAfterPropriedade, filters.tipoAnalise]);

  const variedadeOptions = useMemo(() => {
    if (filters.tipoAnalise === 'SOLO') return [];
    const set = new Set<string>();
    recordsAfterPropriedade.forEach((r) => {
      if (r.variedade && r.variedade !== 'Não Informada') set.add(r.variedade);
    });
    return [...set].sort();
  }, [recordsAfterPropriedade, filters.tipoAnalise]);

  const recordsAfterAttribute = useMemo(() => {
    if (filters.tipoAnalise === 'SOLO') {
      if (filters.texturaSolo === 'TODOS') return recordsAfterPropriedade;
      return recordsAfterPropriedade.filter((r) => r.variedade === filters.texturaSolo);
    }
    if (filters.variedade === 'TODOS') return recordsAfterPropriedade;
    return recordsAfterPropriedade.filter((r) => r.variedade === filters.variedade);
  }, [recordsAfterPropriedade, filters.tipoAnalise, filters.texturaSolo, filters.variedade]);

  const profundidadeOptions = useMemo(() => {
    if (filters.tipoAnalise !== 'SOLO' && filters.tipoAnalise !== 'SOLUÇÃO') return [];
    const set = new Set<string>();
    recordsAfterAttribute.forEach((r) => {
      if (r.dae) set.add(r.dae);
    });
    return [...set].sort();
  }, [recordsAfterAttribute, filters.tipoAnalise]);

  const daeOptions = useMemo(() => {
    if (filters.tipoAnalise === 'SOLO' || filters.tipoAnalise === 'SOLUÇÃO') return [];
    const set = new Set<string>();
    recordsAfterAttribute.forEach((r) => {
      if (r.dae && r.dae !== 'Não Inf.') set.add(r.dae);
    });
    return [...set].sort((a, b) => getStageOrderScore(a) - getStageOrderScore(b));
  }, [recordsAfterAttribute, filters.tipoAnalise]);

  useEffect(() => {
    if (
      filters.dae !== 'TODOS' &&
      daeOptions.length > 0 &&
      !daeOptions.includes(filters.dae)
    ) {
      setFilters((prev) => ({ ...prev, dae: 'TODOS' }));
    }
  }, [daeOptions, filters.dae]);

  // Final filtered group records (before single-sample inspection)
  const filteredGroupRecords = useMemo(() => {
    let list = recordsAfterAttribute;
    if (filters.tipoAnalise === 'SOLO' || filters.tipoAnalise === 'SOLUÇÃO') {
      if (filters.profundidadeSolo !== 'ALL') {
        list = list.filter((r) => r.dae === filters.profundidadeSolo);
      }
    } else if (filters.dae !== 'TODOS') {
      list = list.filter((r) => r.dae === filters.dae);
    }
    return list;
  }, [
    recordsAfterAttribute,
    filters.tipoAnalise,
    filters.profundidadeSolo,
    filters.dae,
  ]);

  // Active records for KPIs & Bullet Charts (either single sample or group average)
  const activeRecords = useMemo(() => {
    if (filters.amostraMode === 'GROUP_AVG') return filteredGroupRecords;
    const exact = filteredGroupRecords.find((r) => r.sampleKey === filters.amostraMode);
    if (exact) return [exact];
    const globalExact = baseRecordsForType.find((r) => r.sampleKey === filters.amostraMode);
    return globalExact ? [globalExact] : filteredGroupRecords;
  }, [filteredGroupRecords, baseRecordsForType, filters.amostraMode]);

  const sampleOptions = useMemo(() => {
    return filteredGroupRecords.slice(0, 250).map((r) => ({
      key: r.sampleKey,
      label: `#${r.idAnalise} • ${r.amostra}`,
      subLabel: `${r.propriedade} (${r.dae})`,
    }));
  }, [filteredGroupRecords]);

  // Inline Context Summary
  const contextSummary = useMemo(() => {
    if (!db || activeRecords.length === 0) {
      return {
        municipio: activeClient?.municipioBase || '—',
        interessado: activeClient?.nome || 'Todos os Clientes',
        areaHa: null,
        dtColeta: '—',
        dtEntrada: '—',
        dtPlantio: '—',
        dtEmergencia: '—',
        totalFiltered: 0,
        selectedSampleName: null,
      };
    }

    const first = activeRecords[0];
    const cli = db.dClienteAnalise.get(first.idAnalise);

    const municipios = new Set<string>();
    const interessados = new Set<string>();
    let totalArea = 0;
    let hasArea = false;

    activeRecords.forEach((r) => {
      const c = db.dClienteAnalise.get(r.idAnalise);
      if (c?.MUNICIPIO && c.MUNICIPIO !== 'Não Informado') municipios.add(c.MUNICIPIO);
      if (c?.INTERESSADO && c.INTERESSADO !== 'Não Informado')
        interessados.add(c.INTERESSADO);
      if (c?.AREA_HA !== null && c?.AREA_HA !== undefined && c.AREA_HA > 0) {
        totalArea = Math.max(totalArea, c.AREA_HA);
        hasArea = true;
      }
    });

    return {
      municipio:
        municipios.size === 1
          ? [...municipios][0]
          : municipios.size > 1
          ? `${[...municipios][0]} +${municipios.size - 1}`
          : cli?.MUNICIPIO || activeClient?.municipioBase || '—',
      interessado:
        activeClient?.nome ||
        (interessados.size === 1
          ? [...interessados][0]
          : `${[...interessados][0] || 'Cliente'} (+${interessados.size - 1})`),
      areaHa: hasArea ? totalArea : cli?.AREA_HA ?? null,
      dtColeta: cli?.DT_COLETA || '—',
      dtEntrada: cli?.DT_ENTRADA || '—',
      dtPlantio: cli?.DT_PLANTIO || '—',
      dtEmergencia: cli?.DT_EMERGENCIA || '—',
      totalFiltered: filteredGroupRecords.length,
      selectedSampleName:
        filters.amostraMode !== 'GROUP_AVG'
          ? `#${first.idAnalise} ${first.amostra}`
          : null,
    };
  }, [db, activeClient, activeRecords, filteredGroupRecords.length, filters.amostraMode]);

  // Helper to evaluate a record set against references
  const evaluateRecordSet = (records: MatrixSampleItem[]): NutrientEvaluation[] => {
    if (!db) return [];
    const metaList =
      filters.tipoAnalise === 'SOLO'
        ? SOLO_ELEMENTS
        : filters.tipoAnalise === 'SOLUÇÃO'
        ? SOLUCAO_ELEMENTS
        : TISSUE_ELEMENTS;

    let avgArgila = 35;
    let avgCtc = 6;
    if (filters.tipoAnalise === 'SOLO' && records.length > 0) {
      const argVals = records
        .map((r) => r.nutrients.ArgilaPercent)
        .filter((v): v is number => v !== null && v !== undefined);
      const ctcVals = records
        .map((r) => r.nutrients.CTC)
        .filter((v): v is number => v !== null && v !== undefined);
      if (argVals.length > 0)
        avgArgila = argVals.reduce((a, b) => a + b, 0) / argVals.length;
      if (ctcVals.length > 0)
        avgCtc = ctcVals.reduce((a, b) => a + b, 0) / ctcVals.length;
    }

    const effectiveDae =
      filters.dae !== 'TODOS'
        ? filters.dae
        : records[0]?.dae || 'R1';

    return metaList.map((meta) => {
      let sum = 0;
      let count = 0;
      for (const rec of records) {
        const v = rec.nutrients[meta.code];
        if (v !== null && v !== undefined && Number.isFinite(v)) {
          sum += v;
          count += 1;
        }
      }

      const avgVal = count > 0 ? Number((sum / count).toFixed(2)) : null;
      const bounds = getReferenceBounds(
        db,
        filters.tipoAnalise,
        filters.cultura,
        effectiveDae,
        meta.code,
        { argilaPercent: avgArgila, ctc: avgCtc }
      );

      return evaluateNutrient(meta, avgVal, bounds.min, bounds.max, count);
    });
  };

  const evaluations = useMemo(
    () => evaluateRecordSet(activeRecords),
    [db, filters.tipoAnalise, filters.cultura, filters.dae, activeRecords]
  );

  const groupEvaluations = useMemo(
    () => evaluateRecordSet(filteredGroupRecords),
    [db, filters.tipoAnalise, filters.cultura, filters.dae, filteredGroupRecords]
  );

  // Handle clicking a sample row in Tab 4 Matrix -> Select sample & open Tab 1
  const handleInspectSampleFromMatrix = (sampleKey: string) => {
    setFilters((prev) => ({
      ...prev,
      amostraMode: sampleKey,
    }));
    setActiveTab('OVERVIEW');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070d12] text-slate-100 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <h2 className="text-lg font-bold">
          Processando Star Schema & Higienizando Base Laboratorial...
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          SOLOECIA_BI SAFRA 2021.xlsx • Isolando carteiras de clientes, estágios e referências
        </p>
      </div>
    );
  }

  if (error || !db) {
    return (
      <div className="min-h-screen bg-[#070d12] text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md p-6 rounded-2xl border border-rose-500/40 bg-[#111827] text-center space-y-3">
          <h2 className="text-lg font-bold text-rose-400">Erro ao Carregar Planilha</h2>
          <p className="text-xs text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  const isExpansionModule =
    filters.tipoAnalise === 'NEMATÓIDE' ||
    filters.tipoAnalise === 'BIOLÓGICA' ||
    filters.tipoAnalise === 'IQS';

  const isSingleSample = filters.amostraMode !== 'GROUP_AVG' && activeRecords.length === 1;

  // Dynamic Tab 2 Title appropriate for the selected AnalysisType & Sample Mode!
  const tab2Label =
    filters.tipoAnalise === 'SOLO'
      ? '2. Complexo Sortivo (CTC) & Perfil'
      : filters.tipoAnalise === 'SOLUÇÃO'
      ? '2. Balanço Iônico & Salinidade'
      : filters.tipoAnalise === 'FOLHA'
      ? '2. Balanço Foliar (DRIS) & Relações'
      : isSingleSample
      ? '2. Radar & Diagnóstico da Amostra'
      : '2. Radar & Curva Fenológica';

  const Tab2Icon =
    filters.tipoAnalise === 'SOLO'
      ? Layers
      : filters.tipoAnalise === 'SOLUÇÃO'
      ? Droplets
      : filters.tipoAnalise === 'FOLHA'
      ? Leaf
      : Compass;

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isDark ? 'bg-[#070d12] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
      }`}
    >
      {/* Unified Compact Header & Client-Scoped Cascading Filter Bar */}
      <HeaderBar
        filters={filters}
        onUpdateFilter={handleUpdateFilter}
        onResetFilters={handleResetFilters}
        activeClient={activeClient}
        activeClientCounts={activeClientCounts}
        onOpenClientPortal={() => setClientModalOpen(true)}
        culturaOptions={culturaOptions}
        propriedadeOptions={propriedadeOptions}
        variedadeOptions={variedadeOptions}
        texturaOptions={texturaOptions}
        daeOptions={daeOptions}
        profundidadeOptions={profundidadeOptions}
        sampleOptions={sampleOptions}
        contextSummary={contextSummary}
        etlStats={db.etlStats}
        onUploadFile={handleUploadFile}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
      />

      {/* Client Isolation Access Modal */}
      <ClientPortalModal
        isOpen={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        clients={db.clients}
        activeClientId={filters.clienteId}
        onSelectClient={handleSelectClient}
        isDark={isDark}
      />

      {/* Main Content Container */}
      <main className="max-w-[1600px] mx-auto px-4 lg:px-6 py-5">
        {isExpansionModule ? (
          <ExpansionModuleEmptyState
            tipoAnalise={filters.tipoAnalise}
            onSelectActiveModule={(t) => handleUpdateFilter('tipoAnalise', t)}
            isDark={isDark}
          />
        ) : baseRecordsForType.length === 0 ? (
          <div
            className={`p-8 rounded-2xl border max-w-2xl mx-auto my-8 text-center space-y-4 ${
              isDark
                ? 'bg-[#111827]/85 border-[#1e293b] text-slate-100'
                : 'bg-white border-slate-200 text-slate-900 shadow-sm'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl mx-auto bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Sprout className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold">
              {activeClient ? activeClient.nome : 'Cliente'} não possui laudos de {filters.tipoAnalise}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Por segurança e privacidade multi-cliente, apenas os módulos com laudos vinculados a
              este cliente são exibidos. Selecione outro tipo de análise disponível para esta conta:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {(['PECÍOLO', 'FOLHA', 'SOLO', 'SOLUÇÃO'] as AnalysisType[])
                .filter((t) => activeClientCounts[t] > 0)
                .map((t) => (
                  <button
                    key={t}
                    onClick={() => handleUpdateFilter('tipoAnalise', t)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition cursor-pointer"
                  >
                    Ver {t} ({activeClientCounts[t]})
                  </button>
                ))}
            </div>
          </div>
        ) : (
          <>
            {/* 4-Tab Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <nav
                aria-label="Abas analíticas"
                className={`inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border ${
                  isDark
                    ? 'bg-[#111827]/90 border-[#1e293b]'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                {[
                  {
                    id: 'OVERVIEW' as ActiveTab,
                    label: '1. Visão Geral & Bullet Charts',
                    icon: BarChart3,
                  },
                  {
                    id: 'RADAR_PHENOLOGY' as ActiveTab,
                    label: tab2Label,
                    icon: Tab2Icon,
                  },
                  ...(hasIntegratedSoilTissue
                    ? [
                        {
                          id: 'INTEGRATED_SOIL' as ActiveTab,
                          label: '3. Quadrantes Solo × Planta',
                          icon: Layers,
                        },
                      ]
                    : []),
                  {
                    id: 'SAMPLE_MATRIX' as ActiveTab,
                    label: `${hasIntegratedSoilTissue ? '4' : '3'}. Matriz de Amostras (${filteredGroupRecords.length})`,
                    icon: Table2,
                  },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : isDark
                          ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Quick Semantic Legend Pill */}
              <div
                className={`hidden xl:flex items-center gap-4 px-3.5 py-2 rounded-xl border text-xs ${
                  isDark
                    ? 'bg-[#111827]/70 border-[#1e293b] text-slate-300'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fb7185]" />
                  <span>Abaixo da Ref. Mínima</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span>Na Faixa Ideal (REF_MIN – REF_MAX)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22d3ee]" />
                  <span>Acima da Ref. Máxima</span>
                </span>
              </div>
            </div>

            {/* Active Tab View */}
            {activeTab === 'OVERVIEW' && (
              <Tab1OverviewBullet
                evaluations={evaluations}
                tipoAnalise={filters.tipoAnalise}
                cultura={filters.tipoAnalise === 'SOLO' ? 'Solo Agrícola' : filters.cultura}
                daeLabel={
                  filters.tipoAnalise === 'SOLO' || filters.tipoAnalise === 'SOLUÇÃO'
                    ? filters.profundidadeSolo === 'ALL'
                      ? '0-20 e 20-40cm'
                      : filters.profundidadeSolo
                    : filters.dae
                }
                isDark={isDark}
                totalSamples={activeRecords.length}
              />
            )}

            {activeTab === 'RADAR_PHENOLOGY' && filters.tipoAnalise === 'SOLO' && (
              <Tab2SoilFertilityProfile
                filters={filters}
                evaluations={evaluations}
                clientSoilRecords={recordsAfterAttribute}
                activeRecords={activeRecords}
                isDark={isDark}
              />
            )}

            {activeTab === 'RADAR_PHENOLOGY' && filters.tipoAnalise === 'SOLUÇÃO' && (
              <Tab2SoilSolutionBalance
                filters={filters}
                evaluations={evaluations}
                clientSolutionRecords={recordsAfterAttribute}
                activeRecords={activeRecords}
                isDark={isDark}
              />
            )}

            {activeTab === 'RADAR_PHENOLOGY' && filters.tipoAnalise === 'FOLHA' && (
              <Tab2FoliarBalance
                db={db}
                filters={filters}
                evaluations={evaluations}
                groupRecords={recordsAfterAttribute}
                activeRecords={activeRecords}
                isDark={isDark}
              />
            )}

            {activeTab === 'RADAR_PHENOLOGY' && filters.tipoAnalise === 'PECÍOLO' && (
              <Tab2RadarPhenology
                db={db}
                filters={filters}
                evaluations={evaluations}
                groupEvaluations={groupEvaluations}
                groupRecords={recordsAfterAttribute}
                activeRecords={activeRecords}
                isDark={isDark}
              />
            )}

            {activeTab === 'INTEGRATED_SOIL' && (
              <Tab3IntegratedSoilLeaf db={db} filters={filters} isDark={isDark} />
            )}

            {activeTab === 'SAMPLE_MATRIX' && (
              <Tab4SampleMatrix
                db={db}
                filters={filters}
                rows={filteredGroupRecords}
                onInspectSample={handleInspectSampleFromMatrix}
                isDark={isDark}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer
        className={`mt-10 border-t py-4 px-6 text-xs ${
          isDark
            ? 'border-[#1e293b] bg-[#070d12] text-slate-500'
            : 'border-slate-200 bg-white text-slate-500'
        }`}
      >
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              <strong>Laboratório Solo & Companhia</strong> (@soloecompanhia) • CrescIT Gestão de
              Precisão • Contato: (62) 3261-4562
            </span>
          </div>
          <div className="tabular-nums">
            {activeClient
              ? `Sessão Isolada: ${activeClient.nome} (${activeClient.totalLaudos} laudos)`
              : `Visão Admin Global • ${db.etlStats.totalAnalises} análises processadas`}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
