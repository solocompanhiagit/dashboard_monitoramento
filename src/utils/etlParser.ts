import * as XLSX from 'xlsx';
import {
  AnalysisType,
  AnaliseRefRow,
  BioRow,
  ChuvaRow,
  ClienteAnaliseRow,
  ClientTenant,
  DAEMappingRow,
  DAERow,
  DatabaseStarSchema,
  ElementoFolhaRefRow,
  ElementoSoloRefRow,
  ElementoSolucaoRefRow,
  EstagioRow,
  ETLStats,
  FolhaRow,
  NematoideRow,
  SoloRow,
  SolucaoSoloRow,
} from '../types/schema';

export function parseWorkbookBuffer(
  buffer: ArrayBuffer,
  fileName = 'SOLOECIA_BI SAFRA 2021.xlsx'
): DatabaseStarSchema {
  const wb = XLSX.read(buffer, { type: 'array' });

  const stats: ETLStats = {
    fileName,
    loadedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    totalAnalises: 0,
    cleanedNumericStrings: 0,
    discardedSerialDates: 0,
    normalizedCultures: 0,
    normalizedTypes: 0,
    scaledFolhaRecords: 0,
    countsByType: {
      'PECÍOLO': 0,
      FOLHA: 0,
      SOLO: 0,
      'SOLUÇÃO': 0,
      'NEMATÓIDE': 0,
      'BIOLÓGICA': 0,
      IQS: 0,
    },
  };

  const getRows = <T = Record<string, unknown>>(sheetName: string): T[] => {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json<T>(sheet, { defval: null });
  };

  const safeNumber = (
    raw: unknown,
    options?: { discardAbove10k?: boolean; maxReasonable?: number }
  ): number | null => {
    if (raw === null || raw === undefined || raw === '') return null;

    let num: number;
    if (typeof raw === 'number') {
      num = raw;
    } else if (typeof raw === 'string') {
      const trimmed = raw.trim().replace(/^["']+|["']+$/g, '');
      if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'null') return null;
      // Handle double comma typos like "97,,085" and standard BR comma decimals "115,04"
      const normalized = trimmed.replace(/,+/g, '.').replace(/\s+/g, '');
      num = Number(normalized);
      if (Number.isFinite(num)) {
        stats.cleanedNumericStrings += 1;
      }
    } else {
      return null;
    }

    if (!Number.isFinite(num)) return null;

    // Rule 3.2: Discard serial dates pasted by mistake in nutrient columns (> 10,000)
    if (options?.discardAbove10k && num > 10000) {
      stats.discardedSerialDates += 1;
      return null;
    }

    if (options?.maxReasonable && num > options.maxReasonable) {
      stats.discardedSerialDates += 1;
      return null;
    }

    return num;
  };

  const normalizeElementCode = (raw: unknown): string => {
    if (raw === null || raw === undefined) return '';
    return String(raw).trim();
  };

  const normalizeTipoAnalise = (rawTipo: unknown, relatorioRaw: unknown): AnalysisType => {
    const str = String(rawTipo ?? '').trim().toUpperCase();
    const rel = String(relatorioRaw ?? '').trim().toUpperCase();

    if (str !== String(rawTipo ?? '') || str === 'PECIOLO' || str === 'FOLHA') {
      stats.normalizedTypes += 1;
    }

    if (str.includes('PEC') || rel.includes('PECÍOLO') || rel.includes('PECIOLO')) {
      return 'PECÍOLO';
    }
    if (str.includes('FOLHA') || rel.includes('FOLIAR') || rel.includes('FOLHA')) {
      return 'FOLHA';
    }
    if (str.includes('SOLU') || rel.includes('SOLUÇÃO') || rel.includes('SOLUCAO')) {
      return 'SOLUÇÃO';
    }
    if (str.includes('NEMAT')) {
      return 'NEMATÓIDE';
    }
    if (str.includes('IQS')) {
      return 'IQS';
    }
    if (str.includes('BIO') || str.includes('MICRO')) {
      return 'BIOLÓGICA';
    }
    if (str.includes('SOLO') || rel.includes('SOLO')) {
      return 'SOLO';
    }
    return 'PECÍOLO';
  };

  // Rule 3.4: Use RELATORIO_ANALISE as tie-breaker when NOME_CULTURA is divergent
  const resolveCultura = (rawCultura: unknown, relatorioRaw: unknown): string => {
    const cult = String(rawCultura ?? '').trim();
    const rel = String(relatorioRaw ?? '').trim().toUpperCase();

    let resolved = cult || 'Soja';
    if (rel.includes('ALGODÃO') || rel.includes('ALGODAO')) {
      resolved = 'Algodão';
    } else if (rel.includes('TOMATE')) {
      resolved = 'Tomate';
    } else if (rel.includes('FEIJÃO') || rel.includes('FEIJAO')) {
      resolved = 'Feijão';
    } else if (rel.includes('MILHO')) {
      resolved = 'Milho';
    } else if (rel.includes('BATATA')) {
      resolved = 'Batata';
    } else if (rel.includes('UVA')) {
      resolved = 'Uva';
    } else if (rel.includes('MAMÃO') || rel.includes('MAMAO')) {
      resolved = 'Mamão';
    } else if (rel.includes('ALHO')) {
      resolved = 'Alho';
    } else if (rel.includes('SOJA')) {
      resolved = 'Soja';
    }

    if (resolved.toLowerCase() !== cult.toLowerCase() && cult !== '') {
      stats.normalizedCultures += 1;
    }
    return resolved;
  };

  // Rule 3.4: Parse Excel serial dates, YYYY-MM-DD, DD/MM/YYYY, and fix year typos
  const parseCleanDate = (raw: unknown): string | null => {
    if (raw === null || raw === undefined || raw === '') return null;

    if (typeof raw === 'number') {
      // Excel serial date range (approx 1995 to 2035 -> 35000 to 50000)
      if (raw > 30000 && raw < 60000) {
        const utcDays = Math.floor(raw - 25569);
        const date = new Date(utcDays * 86400 * 1000);
        const d = String(date.getUTCDate()).padStart(2, '0');
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        let y = date.getUTCFullYear();
        if (y > 2025 && y <= 2035) y = 2024; // Clamp accidental future year drag-fills in sheet
        return `${d}/${m}/${y}`;
      }
      return null;
    }

    const str = String(raw).trim();
    if (!str) return null;

    // YYYY-MM-DD or YYYY-MM-DD HH:mm:ss
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      let y = Number(isoMatch[1]);
      const m = String(Math.min(12, Math.max(1, Number(isoMatch[2])))).padStart(2, '0');
      const d = String(Math.min(31, Math.max(1, Number(isoMatch[3])))).padStart(2, '0');
      if (y < 2000) y = 2024;
      if (y > 2025) y = 2024;
      return `${d}/${m}/${y}`;
    }

    // DD/MM/YYYY with typo fixes (e.g. 28/102/2024, 16/07/224, 7/8/0204)
    const brMatch = str.match(/^(\d{1,2})\/(\d{1,3})\/(\d{2,4})/);
    if (brMatch) {
      const d = String(Math.min(31, Math.max(1, Number(brMatch[1])))).padStart(2, '0');
      let mNum = Number(brMatch[2]);
      if (mNum === 102) mNum = 10;
      if (mNum > 12) mNum = Number(String(mNum).slice(0, 2));
      if (mNum > 12 || mNum < 1) mNum = 1;
      const m = String(mNum).padStart(2, '0');

      let yStr = brMatch[3];
      if (yStr === '224' || yStr === '0204' || yStr === '204') yStr = '2024';
      let y = Number(yStr);
      if (y < 100) y += 2000;
      if (y < 2015 || y > 2025) y = 2024;
      return `${d}/${m}/${y}`;
    }

    return str;
  };

  const normalizeDAEStage = (rawDae: unknown): string => {
    if (rawDae === null || rawDae === undefined || rawDae === '') return 'Não Inf.';
    const s = String(rawDae).trim().toUpperCase().replace(',', '.');
    if (!s) return 'Não Inf.';
    return s;
  };

  // 1. Parse dCultura & dProfundidade
  const rawCulturas = getRows<Record<string, unknown>>('dCultura');
  const culturaById = new Map<number, string>();
  rawCulturas.forEach((r) => {
    const id = safeNumber(r.ID_CULTURA);
    const nome = String(r.NOME_CULTURA ?? '').trim();
    if (id !== null && nome) culturaById.set(id, nome);
  });

  const rawProf = getRows<Record<string, unknown>>('dProfundidade');
  const profByVal = new Map<number, string>();
  rawProf.forEach((r) => {
    const p = safeNumber(r.PROFUNDIDADE);
    const desc = String(r.DESCRICAO ?? '').trim();
    if (p !== null && desc) profByVal.set(p, desc);
  });

  // Rule 3.5: Multi-client tenant & property attribution
  // Preserves real INTERESSADO / PROPRIEDADE when present; segments anonymized ('CLIENTE'/'TESTE') rows deterministically
  const assignClientAndProperty = (
    rawInteressado: unknown,
    rawPropriedade: unknown,
    rawMunicipio: unknown,
    id: number,
    amostra: string,
    variedade: string,
    material: string,
    cultura: string
  ): { clienteId: string; interessado: string; propriedade: string; municipio: string; isAnonymized: boolean } => {
    const intStr = String(rawInteressado ?? '').trim();
    const propStr = String(rawPropriedade ?? '').trim();
    const munStr = String(rawMunicipio ?? '').trim();

    const isPlaceholder =
      (!intStr || intStr.toUpperCase() === 'CLIENTE' || intStr.toUpperCase() === 'NÃO INFORMADO') &&
      (!propStr || propStr.toUpperCase() === 'TESTE' || propStr.toUpperCase() === 'NÃO INFORMADA');

    if (!isPlaceholder) {
      const clienteNome = intStr || propStr || 'Cliente Padrão';
      const clienteId = `CLI-${clienteNome
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_|_$/g, '')}`;
      return {
        clienteId,
        interessado: clienteNome,
        propriedade: propStr || clienteNome,
        municipio: munStr || 'Não Informado',
        isAnonymized: false,
      };
    }

    const amUp = amostra.toUpperCase();
    const varUp = variedade.toUpperCase();
    const matUp = material.toUpperCase();

    // 1. Estação de Pesquisa Grower (Rio Verde - GO): T1..T25, GUEPARDO, SETOR, NUT, ID >= 4800
    if (
      /^T\d+/i.test(amUp) ||
      varUp.includes('GUEPARDO') ||
      amUp.includes('SETOR') ||
      matUp.includes('NUT') ||
      id >= 4800
    ) {
      return {
        clienteId: 'CLI-GROWER',
        interessado: 'Estação de Pesquisa Grower',
        propriedade: amUp.includes('SETOR') ? 'Setor 9 Qd. 6 a 8' : 'Estação Grower • Gleba Experimental',
        municipio: 'Rio Verde - GO',
        isAnonymized: true,
      };
    }

    // 2. Consórcio Experimental CESB (Goiânia - GO): EXPERIMENTO, CURVA, CESB, TESTEMUNHA
    if (
      amUp.includes('CESB') ||
      amUp.includes('EXPERIMENTO') ||
      amUp.includes('CURVA') ||
      amUp.includes('TESTEMUNHA')
    ) {
      return {
        clienteId: 'CLI-CESB',
        interessado: 'Consórcio Experimental CESB',
        propriedade: amUp.includes('EXPERIMENTO') ? 'Campo Experimental 34' : 'Área Referência CESB',
        municipio: 'Goiânia - GO',
        isAnonymized: true,
      };
    }

    // 3. Agropecuária Boa Vista (Cristalina - GO): Pivôs (inclui Pecíolo, Folha, Solo e Solução do Solo)
    if (amUp.includes('PIVÔ') || amUp.includes('PIVO') || /^P\d{2}/i.test(amUp)) {
      const numMatch = amUp.match(/(\d+)/);
      const pNum = numMatch ? Number(numMatch[1]) : 1;
      return {
        clienteId: 'CLI-BOAVISTA',
        interessado: 'Agropecuária Boa Vista',
        propriedade: pNum <= 15 ? 'Fazenda Boa Vista • Pivôs Norte' : 'Fazenda Água Limpa • Pivôs Sul',
        municipio: 'Cristalina - GO',
        isAnonymized: true,
      };
    }

    // 4. Grupo Santa Fé (Jataí - GO): Lotes, Talhões, Glebas, A13..D17, CALCINHA (inclui Solo + Folha + Pecíolo)
    if (
      amUp.includes('LOTE') ||
      amUp.includes('TALH') ||
      amUp.includes('GLEBA') ||
      amUp.includes('CALCINHA') ||
      /^[ABCD]\d+/i.test(amUp) ||
      /^B\d+/i.test(amUp)
    ) {
      return {
        clienteId: 'CLI-SANTAFE',
        interessado: 'Grupo Agrícola Santa Fé',
        propriedade: amUp.includes('TALH') ? 'Fazenda São José • Talhões' : 'Fazenda Santa Fé • Matrizes',
        municipio: 'Jataí - GO',
        isAnonymized: true,
      };
    }

    // 5. Fazenda Chapadão Agrícola (Montividiu - GO): Culturas diversificadas e demais amostras
    return {
      clienteId: 'CLI-CHAPADAO',
      interessado: 'Fazenda Chapadão Agrícola',
      propriedade:
        cultura === 'Algodão' || cultura === 'Tomate' || cultura === 'Batata'
          ? 'Fazenda Horizonte • Irrigada'
          : 'Fazenda Chapadão • Sede',
      municipio: 'Montividiu - GO',
      isAnonymized: true,
    };
  };

  // 2. Parse Central Dimension dClienteAnalise
  const rawClientes = getRows<Record<string, unknown>>('dClienteAnalise');
  const dClienteAnalise = new Map<number, ClienteAnaliseRow>();

  rawClientes.forEach((r) => {
    const id = safeNumber(r.ID_ANALISE);
    if (id === null) return;

    const relatorio = String(r.RELATORIO_ANALISE ?? '').trim();
    const tipoAnalise = normalizeTipoAnalise(r.TIPO_ANALISE, relatorio);
    const nomeCultura = resolveCultura(r.NOME_CULTURA, relatorio);
    const material = String(r.MATERIAL ?? '').trim() || 'Todos';
    const variedade = String(r.VARIEDADE ?? '').trim() || 'Não Informada';
    const amostra = String(r.AMOSTRA ?? `Amostra #${id}`).trim() || `Amostra #${id}`;

    const clientInfo = assignClientAndProperty(
      r.INTERESSADO,
      r.PROPRIEDADE,
      r.MUNICIPIO,
      id,
      amostra,
      variedade,
      material,
      nomeCultura
    );

    const row: ClienteAnaliseRow = {
      ID_ANALISE: id,
      clienteId: clientInfo.clienteId,
      INTERESSADO: clientInfo.interessado,
      PROPRIEDADE: clientInfo.propriedade,
      MUNICIPIO: clientInfo.municipio,
      REMETENTE: String(r.REMETENTE ?? '').trim(),
      NOME_CULTURA: nomeCultura,
      CULTURA_RAW: String(r.NOME_CULTURA ?? '').trim(),
      TIPO_ANALISE: tipoAnalise,
      MATERIAL: material,
      VARIEDADE: variedade,
      AMOSTRA: amostra,
      DAE: normalizeDAEStage(r.DAE),
      AREA_HA: safeNumber(r['AREA(ha)']),
      DT_PLANTIO: parseCleanDate(r.DT_PLANTIO),
      DT_EMERGENCIA: parseCleanDate(r.DT_EMERGENCIA),
      DT_ENTRADA: parseCleanDate(r.DT_ENTRADA),
      DT_EMISSAO: parseCleanDate(r.DT_EMISSAO),
      DT_COLETA: parseCleanDate(r.DT_COLETA),
      N_LABORATORIO: r.N_LABORATORIO !== null && r.N_LABORATORIO !== undefined ? String(r.N_LABORATORIO).trim() : null,
      RELATORIO_ANALISE: relatorio,
    };

    dClienteAnalise.set(id, row);
    stats.totalAnalises += 1;
    stats.countsByType[tipoAnalise] = (stats.countsByType[tipoAnalise] || 0) + 1;
  });

  // 3. Parse fDAE (Pecíolo)
  const rawFDAE = getRows<Record<string, unknown>>('fDAE');
  const pecioloElements = ['N', 'P', 'K', 'Ca', 'Mg', 'S', 'B', 'Cu', 'Fe', 'Mn', 'Zn'];
  const fDAE: DAERow[] = [];

  rawFDAE.forEach((r) => {
    const id = safeNumber(r.ID_ANALISE);
    if (id === null) return;

    const cliente = dClienteAnalise.get(id);
    const daeStage = normalizeDAEStage(r.DAE ?? cliente?.DAE);
    if (cliente && (cliente.DAE === 'Não Inf.' || !cliente.DAE) && daeStage !== 'Não Inf.') {
      cliente.DAE = daeStage;
    }

    const nutrients: Record<string, number | null> = {};
    let hasValid = false;

    for (const el of pecioloElements) {
      const val = safeNumber(r[el], { discardAbove10k: true });
      nutrients[el] = val;
      if (val !== null) hasValid = true;
    }

    if (hasValid) {
      fDAE.push({
        ID_ANALISE: id,
        DAE: daeStage,
        nutrients,
      });
    }
  });

  // 4. Parse fFolha (Folha)
  const rawFFolha = getRows<Record<string, unknown>>('fFolha');
  const folhaElements = [
    'N',
    'P',
    'K',
    'Ca',
    'Mg',
    'S',
    'B',
    'Cu',
    'Fe',
    'Mn',
    'Zn',
    'Mo',
    'Co',
    'Ni',
    'Al',
    'Si',
    'Na',
  ];
  const fFolha: FolhaRow[] = [];

  rawFFolha.forEach((r) => {
    const id = safeNumber(r.ID_ANALISE);
    if (id === null) return;

    const nutrients: Record<string, number | null> = {};
    let hasValid = false;

    // Detect unit scale factor x1000 in Folha (e.g. IDs 4356-4375 where N > 10000 and P > 1000)
    const rawN = safeNumber(r.N);
    const rawK = safeNumber(r.K);
    const isScaledBy1000 =
      (rawN !== null && rawN > 1000 && rawN < 150000) &&
      (rawK !== null && rawK > 1000 && rawK < 150000);

    if (isScaledBy1000) {
      stats.scaledFolhaRecords += 1;
    }

    for (const el of folhaElements) {
      let val = safeNumber(r[el], { discardAbove10k: !isScaledBy1000 });
      if (val !== null && isScaledBy1000) {
        val = Number((val / 1000).toFixed(3));
      }
      nutrients[el] = val;
      if (val !== null) hasValid = true;
    }

    if (hasValid) {
      fFolha.push({
        ID_ANALISE: id,
        nutrients,
      });
    }
  });

  // 5. Parse fSolo (Solo)
  const rawFSolo = getRows<Record<string, unknown>>('fSolo');
  const fSolo: SoloRow[] = [];

  rawFSolo.forEach((r) => {
    const id = safeNumber(r.ID_ANALISE);
    if (id === null) return;

    const profNum = safeNumber(r.PROFUNDIDADE) ?? 20;
    const profDesc = profByVal.get(profNum) || (profNum <= 20 ? '0 - 20cm' : '20 - 40cm');
    const classeTextural = String(r['Classe Textural'] ?? '').trim() || 'Não Classificada';

    const pCaCl2 = safeNumber(r['pH (CaCl2)']);
    const pH2O = safeNumber(r['pH(H2O)']);
    const pMel = safeNumber(r['P(mel)']);
    const pRes = safeNumber(r['P(res)']);
    const pRem = safeNumber(r['P(rem)']);
    const kCmolc = safeNumber(r['K - Calculado']);
    const kMg = safeNumber(r.K_1);
    const ca = safeNumber(r.Ca);
    const mg = safeNumber(r.Mg);
    const s = safeNumber(r.S);
    const so4 = safeNumber(r['(SO4)-2']);
    const cu = safeNumber(r.Cu);
    const fe = safeNumber(r.Fe);
    const mn = safeNumber(r.Mn);
    const zn = safeNumber(r.Zn);
    const b = safeNumber(r.B);
    const al = safeNumber(r['Al+3']);
    const hAl = safeNumber(r['H+Al']);
    const ctc = safeNumber(r['CTC - Calculado']);
    const sb = safeNumber(r['SB - Calculado']);
    const vPercent = safeNumber(r['V - Calculado']);
    const mPercent = safeNumber(r['m - Calculado']);
    const mo = safeNumber(r['M.O']);
    const co = safeNumber(r['C.O - Calculado']);

    const caMg = safeNumber(r['Ca/Mg - Calculado']) ?? (ca !== null && mg && mg > 0 ? ca / mg : null);
    const caK = safeNumber(r['Ca/K - Calculado']) ?? (ca !== null && kCmolc && kCmolc > 0 ? ca / kCmolc : null);
    const mgK = safeNumber(r['Mg/K - Calculado']) ?? (mg !== null && kCmolc && kCmolc > 0 ? mg / kCmolc : null);
    const caMgK =
      safeNumber(r['Ca+Mg/K - Calculado']) ??
      (ca !== null && mg !== null && kCmolc && kCmolc > 0 ? (ca + mg) / kCmolc : null);

    const caCtc = safeNumber(r['Ca/CTC - Calculado']);
    const mgCtc = safeNumber(r['Mg/CTC - Calculado']);
    const kCtc = safeNumber(r['K/CTC - Calculado']);
    const hAlCtc = safeNumber(r['H+Al/CTC - Calculado']);

    const argila = safeNumber(r.Argila);
    const silte = safeNumber(r['Silite - Calculado']);
    const areia = safeNumber(r.Areia);

    // Note: In fSolo, Argila is sometimes in g/kg (e.g., 490) and in dElementoSoloRef thresholds are in % (15, 35, 60)
    const argilaPercent = argila !== null ? (argila > 100 ? argila / 10 : argila) : null;

    const metrics: Record<string, number | null> = {
      'pH (CaCl2)': pCaCl2,
      'pH(H2O)': pH2O,
      'P(mel)': pMel,
      'P(res)': pRes,
      'P(rem)': pRem,
      K_1: kMg,
      K: kCmolc,
      Ca: ca,
      Mg: mg,
      S: s,
      '(SO4)-2': so4,
      Cu: cu,
      Fe: fe,
      Mn: mn,
      Zn: zn,
      B: b,
      'Al+3': al,
      'H+Al': hAl,
      CTC: ctc,
      SB: sb,
      V: vPercent,
      m: mPercent,
      'M.O': mo,
      'C.O': co,
      'Ca/Mg': caMg,
      'Ca/K': caK,
      'Mg/K': mgK,
      'Ca+Mg/K': caMgK,
      'Ca/CTC': caCtc,
      'Mg/CTC': mgCtc,
      'K/CTC': kCtc,
      'H+Al/CTC': hAlCtc,
      Argila: argila,
      ArgilaPercent: argilaPercent,
      Silte: silte,
      Areia: areia,
      Cd: safeNumber(r.Cd),
      Cr: safeNumber(r.Cr),
      Ni: safeNumber(r.Ni),
      Pb: safeNumber(r.Pb),
    };

    fSolo.push({
      ID_ANALISE: id,
      PROFUNDIDADE: profNum,
      PROFUNDIDADE_DESC: profDesc,
      CLASSE_TEXTURAL: classeTextural,
      metrics,
    });
  });

  // 6. Parse fSolucaoSolo (Solução do Solo)
  const rawFSolucao = getRows<Record<string, unknown>>('fSolucaoSolo');
  const solucaoCols = [
    'pH',
    'C. E.',
    'RAS',
    'Na %',
    'NO3',
    'NO2',
    'H2PO4',
    'SO4',
    'Cl 1-',
    'Na1+',
    'K1+',
    'Ca2+',
    'Mg2+',
    'Fe3+',
    'Zn2+',
    'Cu2+',
    'Mn4+',
    'B3+',
  ];
  const fSolucaoSolo: SolucaoSoloRow[] = [];

  rawFSolucao.forEach((r) => {
    const id = safeNumber(r.ID_ANALISE);
    if (id === null) return;

    const profNum = safeNumber(r.Profundidade) ?? 20;
    const profDesc = profByVal.get(profNum) || (profNum <= 20 ? '0 - 20cm' : '20 - 40cm');

    const metrics: Record<string, number | null> = {};
    let hasValid = false;
    for (const col of solucaoCols) {
      const val = safeNumber(r[col], { discardAbove10k: true });
      metrics[col] = val;
      if (val !== null) hasValid = true;
    }

    if (hasValid) {
      fSolucaoSolo.push({
        ID_ANALISE: id,
        PROFUNDIDADE: profNum,
        PROFUNDIDADE_DESC: profDesc,
        metrics,
      });
    }
  });

  // 7. Parse Expansion Modules (fChuvas, fBio, fNematoides)
  const rawChuvas = getRows<Record<string, unknown>>('fChuvas');
  const fChuvas: ChuvaRow[] = rawChuvas
    .map((r) => ({
      ID_ANALISE: safeNumber(r.ID_ANALISE) ?? undefined,
      DT_CHUVA: parseCleanDate(r.DT_CHUVA) ?? '',
      MM_CHUVA: safeNumber(r.MM_CHUVA) ?? 0,
    }))
    .filter((r) => r.DT_CHUVA !== '');

  const rawBio = getRows<Record<string, unknown>>('fBio');
  const fBio: BioRow[] = rawBio
    .map((r) => ({
      ID_ANALISE: safeNumber(r.ID_ANALISE) ?? 0,
      betaGlicosidase: safeNumber(r['b-Glicosidase'] ?? r.BETA_GLICOSIDASE),
      arilsulfatase: safeNumber(r.Arilsulfatase ?? r.ARILSULFATASE),
      iqs: safeNumber(r.IQS),
    }))
    .filter((r) => r.ID_ANALISE !== 0);

  const rawNem = getRows<Record<string, unknown>>('fNematoides');
  const fNematoides: NematoideRow[] = rawNem
    .map((r) => ({
      ID_ANALISE: safeNumber(r.ID_ANALISE) ?? 0,
      especie: String(r.ESPECIE ?? 'Nematóide').trim(),
      populacao: safeNumber(r.POPULACAO),
    }))
    .filter((r) => r.ID_ANALISE !== 0);

  // 8. Parse Reference Tables
  const rawAnaliseRef = getRows<Record<string, unknown>>('dAnaliseRef');
  const dAnaliseRef: AnaliseRefRow[] = rawAnaliseRef
    .map((r) => ({
      ID_REFERENCIA: safeNumber(r.ID_REFERENCIA) ?? 0,
      NOME_CULTURA: String(r.NOME_CULTURA ?? '').trim(),
      TIPO_ANALISE: String(r.TIPO_ANALISE ?? '').trim(),
      ELEMENTO: normalizeElementCode(r.ELEMENTO),
      REF_MIN: safeNumber(r.REF_MIN) ?? 0,
      REF_MAX: safeNumber(r.REF_MAX) ?? 0,
      MEDIDA: String(r.MEDIDA ?? 'g/kg').trim(),
      DAE: safeNumber(r.DAE) ?? 7,
    }))
    .filter((r) => r.ELEMENTO !== '');

  const rawDDAE = getRows<Record<string, unknown>>('dDAE');
  const dDAE: DAEMappingRow[] = rawDDAE
    .map((r) => ({
      ID_DAE: safeNumber(r.ID_DAE) ?? 7,
      NOME_CULTURA: String(r.NOME_CULTURA ?? '').trim(),
      DAE: normalizeDAEStage(r.DAE),
    }))
    .filter((r) => r.NOME_CULTURA !== '');

  const rawEstagios = getRows<Record<string, unknown>>('dEstagios');
  const dEstagios: EstagioRow[] = rawEstagios.map((r) => {
    const idCult = safeNumber(r.ID_CULTURA) ?? 2;
    return {
      ID_ESTAGIO: safeNumber(r.ID_ESTAGIO) ?? 0,
      ID_CULTURA: idCult,
      NOME_CULTURA: culturaById.get(idCult) || (idCult === 1 ? 'Algodão' : 'Soja'),
      FASE: String(r.FASE ?? '').trim(),
      ESTAGIOS: String(r['ESTÁGIOS'] ?? r.ESTAGIOS ?? '').trim(),
      DIAS: safeNumber(r.DIAS),
    };
  });

  const rawFolhaRef = getRows<Record<string, unknown>>('dElementoFolhaRef');
  const dElementoFolhaRef: ElementoFolhaRefRow[] = rawFolhaRef
    .map((r) => ({
      CULTURA: String(r.CULTURA ?? '').trim(),
      ID_ELEMENTO: safeNumber(r.ID_ELEMENTO) ?? 0,
      ELEMENTO: normalizeElementCode(r.ELEMENTO),
      NOME_ELEMENTO: String(r.NOME_ELEMENTO ?? '').trim(),
      UND: String(r.UND ?? 'g/Kg').trim(),
      CATEGORIA: safeNumber(r.Categoria) ?? 1,
      REF: safeNumber(r.REF) ?? 1,
      VALOR: safeNumber(r.VALOR),
    }))
    .filter((r) => r.ELEMENTO !== '');

  const rawSoloRef = getRows<Record<string, unknown>>('dElementoSoloRef');
  const dElementoSoloRef: ElementoSoloRefRow[] = rawSoloRef
    .map((r) => ({
      ID_ELEMENTO: safeNumber(r.ID_ELEMENTO) ?? 0,
      ELEMENTO: normalizeElementCode(r.ELEMENTO),
      NOME_ELEMENTO: String(r.NOME_ELEMENTO ?? '').trim(),
      UND: String(r.UND ?? '').trim(),
      CATEGORIA: String(r.Categoria ?? '').trim(),
      ARGILA: safeNumber(r.ARGILA) ?? -1,
      CTC: safeNumber(r.CTC) ?? -1,
      REF: safeNumber(r.Ref) ?? -1,
      VALOR: safeNumber(r.Valor),
    }))
    .filter((r) => r.ELEMENTO !== '');

  const solucaoCodeMap: Record<string, string> = {
    pH: 'pH',
    'Condutividade Elétrica': 'C. E.',
    'Relação de Adsorção de Sódio - RAS': 'RAS',
    'Porcentagem de Sódio Intercambiável (%)': 'Na %',
    'Nitratos NO3': 'NO3',
    'Nitratos NO4': 'NO3',
    'Nitritos NO2': 'NO2',
    'Fosfato Diácido H2PO4': 'H2PO4',
    'Fosfato Diácido H2PO5': 'H2PO4',
    'Sulfatos SO4': 'SO4',
    'Cloretos Cl 1-': 'Cl 1-',
    'Sódio Na1+': 'Na1+',
    'Potássio K1+': 'K1+',
    'Cálcio Ca2+': 'Ca2+',
    'Magnésio Mg2+': 'Mg2+',
    'Ferro Fe3+': 'Fe3+',
    'Zinco Zn2+': 'Zn2+',
    'Cobre Cu2+': 'Cu2+',
    'Manganês Mn4+': 'Mn4+',
    'Boro B3+': 'B3+',
  };

  const rawSolucaoRef = getRows<Record<string, unknown>>('dElementoSolucaoSoloRef');
  const dElementoSolucaoSoloRef: ElementoSolucaoRefRow[] = rawSolucaoRef
    .map((r) => {
      const elName = String(r.ELEMENTO ?? '').trim();
      return {
        ELEMENTO: elName,
        CODIGO: solucaoCodeMap[elName] || elName,
        CATEGORIA: safeNumber(r.CATEGORIA) ?? 0,
        REF: safeNumber(r.REF) ?? -1,
        VALOR: safeNumber(r.VALOR),
      };
    })
    .filter((r) => r.ELEMENTO !== '');

  // 9. Build isolated ClientTenant directory from fact tables + dClienteAnalise
  const clientMap = new Map<
    string,
    {
      id: string;
      nome: string;
      codigoAcesso: string;
      municipioBase: string;
      propriedadesSet: Set<string>;
      countsByType: Record<AnalysisType, number>;
      totalLaudos: number;
    }
  >();

  const ensureClient = (cli: ClienteAnaliseRow) => {
    let entry = clientMap.get(cli.clienteId);
    if (!entry) {
      const cleanCode = cli.clienteId.replace(/^CLI-/, '').slice(0, 8);
      entry = {
        id: cli.clienteId,
        nome: cli.INTERESSADO,
        codigoAcesso: `SOLO-${cleanCode}`,
        municipioBase: cli.MUNICIPIO,
        propriedadesSet: new Set<string>(),
        countsByType: {
          'PECÍOLO': 0,
          FOLHA: 0,
          SOLO: 0,
          'SOLUÇÃO': 0,
          'NEMATÓIDE': 0,
          'BIOLÓGICA': 0,
          IQS: 0,
        },
        totalLaudos: 0,
      };
      clientMap.set(cli.clienteId, entry);
    }
    if (cli.PROPRIEDADE) entry.propriedadesSet.add(cli.PROPRIEDADE);
    return entry;
  };

  const countFact = (idAnalise: number, type: AnalysisType) => {
    const cli = dClienteAnalise.get(idAnalise);
    if (!cli) return;
    const entry = ensureClient(cli);
    entry.countsByType[type] = (entry.countsByType[type] || 0) + 1;
    entry.totalLaudos += 1;
  };

  fDAE.forEach((r) => countFact(r.ID_ANALISE, 'PECÍOLO'));
  fFolha.forEach((r) => countFact(r.ID_ANALISE, 'FOLHA'));
  fSolo.forEach((r) => countFact(r.ID_ANALISE, 'SOLO'));
  fSolucaoSolo.forEach((r) => countFact(r.ID_ANALISE, 'SOLUÇÃO'));
  fBio.forEach((r) => countFact(r.ID_ANALISE, 'BIOLÓGICA'));
  fNematoides.forEach((r) => countFact(r.ID_ANALISE, 'NEMATÓIDE'));

  const clients: ClientTenant[] = [...clientMap.values()]
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      codigoAcesso: c.codigoAcesso,
      municipioBase: c.municipioBase,
      propriedades: [...c.propriedadesSet].sort(),
      countsByType: c.countsByType,
      totalLaudos: c.totalLaudos,
    }))
    .sort((a, b) => b.totalLaudos - a.totalLaudos);

  // Sync top-level stats.countsByType with actual fact row counts so UI badges are exact
  stats.countsByType['PECÍOLO'] = fDAE.length;
  stats.countsByType.FOLHA = fFolha.length;
  stats.countsByType.SOLO = fSolo.length;
  stats.countsByType['SOLUÇÃO'] = fSolucaoSolo.length;
  stats.countsByType['NEMATÓIDE'] = fNematoides.length;
  stats.countsByType['BIOLÓGICA'] = fBio.length;

  return {
    dClienteAnalise,
    clients,
    fDAE,
    fFolha,
    fSolo,
    fSolucaoSolo,
    fChuvas,
    fBio,
    fNematoides,
    dAnaliseRef,
    dDAE,
    dEstagios,
    dElementoFolhaRef,
    dElementoSoloRef,
    dElementoSolucaoSoloRef,
    etlStats: stats,
  };
}
