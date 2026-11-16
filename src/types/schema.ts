export type AnalysisType =
  | 'PECÍOLO'
  | 'FOLHA'
  | 'SOLO'
  | 'SOLUÇÃO'
  | 'NEMATÓIDE'
  | 'BIOLÓGICA'
  | 'IQS';

export type NutrientStatus = 'LOW' | 'IDEAL' | 'HIGH' | 'NO_REF';

export interface ClienteAnaliseRow {
  ID_ANALISE: number;
  clienteId: string;
  INTERESSADO: string;
  PROPRIEDADE: string;
  MUNICIPIO: string;
  REMETENTE: string;
  NOME_CULTURA: string;
  CULTURA_RAW: string;
  TIPO_ANALISE: AnalysisType;
  MATERIAL: string;
  VARIEDADE: string;
  AMOSTRA: string;
  DAE: string;
  AREA_HA: number | null;
  DT_PLANTIO: string | null;
  DT_EMERGENCIA: string | null;
  DT_ENTRADA: string | null;
  DT_EMISSAO: string | null;
  DT_COLETA: string | null;
  N_LABORATORIO: string | null;
  RELATORIO_ANALISE: string;
}

export interface ClientTenant {
  id: string;
  nome: string;
  codigoAcesso: string;
  municipioBase: string;
  propriedades: string[];
  countsByType: Record<AnalysisType, number>;
  totalLaudos: number;
  isAnonymizedSegment?: boolean;
}

export interface DAERow {
  ID_ANALISE: number;
  DAE: string;
  nutrients: Record<string, number | null>;
}

export interface FolhaRow {
  ID_ANALISE: number;
  nutrients: Record<string, number | null>;
}

export interface SoloRow {
  ID_ANALISE: number;
  PROFUNDIDADE: number;
  PROFUNDIDADE_DESC: string;
  CLASSE_TEXTURAL: string;
  metrics: Record<string, number | null>;
}

export interface SolucaoSoloRow {
  ID_ANALISE: number;
  PROFUNDIDADE: number;
  PROFUNDIDADE_DESC: string;
  metrics: Record<string, number | null>;
}

export interface ChuvaRow {
  ID_ANALISE?: number;
  DT_CHUVA: string;
  MM_CHUVA: number;
}

export interface BioRow {
  ID_ANALISE: number;
  betaGlicosidase: number | null;
  arilsulfatase: number | null;
  iqs: number | null;
}

export interface NematoideRow {
  ID_ANALISE: number;
  especie: string;
  populacao: number | null;
}

export interface AnaliseRefRow {
  ID_REFERENCIA: number;
  NOME_CULTURA: string;
  TIPO_ANALISE: string;
  ELEMENTO: string;
  REF_MIN: number;
  REF_MAX: number;
  MEDIDA: string;
  DAE: number;
}

export interface DAEMappingRow {
  ID_DAE: number;
  NOME_CULTURA: string;
  DAE: string;
}

export interface EstagioRow {
  ID_ESTAGIO: number;
  ID_CULTURA: number;
  NOME_CULTURA: string;
  FASE: string;
  ESTAGIOS: string;
  DIAS: number | null;
}

export interface ElementoFolhaRefRow {
  CULTURA: string;
  ID_ELEMENTO: number;
  ELEMENTO: string;
  NOME_ELEMENTO: string;
  UND: string;
  CATEGORIA: number; // 1 = Macro, 2 = Micro, 3 = Outros
  REF: number; // 1 = Min, 2 = Max
  VALOR: number | null;
}

export interface ElementoSoloRefRow {
  ID_ELEMENTO: number;
  ELEMENTO: string;
  NOME_ELEMENTO: string;
  UND: string;
  CATEGORIA: string;
  ARGILA: number;
  CTC: number;
  REF: number; // 0..4
  VALOR: number | null;
}

export interface ElementoSolucaoRefRow {
  ELEMENTO: string;
  CODIGO: string;
  CATEGORIA: number;
  REF: number; // 1 = Min, 2 = Max
  VALOR: number | null;
}

export interface ETLStats {
  fileName: string;
  loadedAt: string;
  totalAnalises: number;
  cleanedNumericStrings: number;
  discardedSerialDates: number;
  normalizedCultures: number;
  normalizedTypes: number;
  scaledFolhaRecords: number;
  countsByType: Record<AnalysisType, number>;
}

export interface DatabaseStarSchema {
  dClienteAnalise: Map<number, ClienteAnaliseRow>;
  clients: ClientTenant[];
  fDAE: DAERow[];
  fFolha: FolhaRow[];
  fSolo: SoloRow[];
  fSolucaoSolo: SolucaoSoloRow[];
  fChuvas: ChuvaRow[];
  fBio: BioRow[];
  fNematoides: NematoideRow[];
  dAnaliseRef: AnaliseRefRow[];
  dDAE: DAEMappingRow[];
  dEstagios: EstagioRow[];
  dElementoFolhaRef: ElementoFolhaRefRow[];
  dElementoSoloRef: ElementoSoloRefRow[];
  dElementoSolucaoSoloRef: ElementoSolucaoRefRow[];
  etlStats: ETLStats;
}

export interface NutrientEvaluation {
  code: string;
  name: string;
  unit: string;
  group: 'MACRO' | 'MICRO' | 'COMPLEMENTAR';
  value: number | null;
  refMin: number | null;
  refMax: number | null;
  refMid: number | null;
  status: NutrientStatus;
  deficitPercent: number; // > 0 when below refMin
  excessPercent: number; // > 0 when above refMax
  radarNormalized: number | null; // 100% = ideal midpoint, capped 0..200%
  sampleCount: number;
}

export interface FilterState {
  clienteId: string; // 'ADMIN_ALL' for Lab Admin mode or specific clientId
  tipoAnalise: AnalysisType;
  cultura: string;
  propriedade: string;
  variedade: string;
  texturaSolo: string;
  dae: string;
  amostraMode: 'GROUP_AVG' | string; // 'GROUP_AVG' or specific sampleKey
  profundidadeSolo: string; // 'ALL' | '0 - 20cm' | '20 - 40cm'
}

export type ActiveTab = 'OVERVIEW' | 'RADAR_PHENOLOGY' | 'INTEGRATED_SOIL' | 'SAMPLE_MATRIX';
