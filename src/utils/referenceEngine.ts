import {
  AnalysisType,
  DatabaseStarSchema,
  NutrientEvaluation,
  NutrientStatus,
} from '../types/schema';
import { safeDivide } from './formatters';

export interface ElementMetadata {
  code: string;
  name: string;
  unit: string;
  group: 'MACRO' | 'MICRO' | 'COMPLEMENTAR';
  agronomicRole: string;
}

export const TISSUE_ELEMENTS: ElementMetadata[] = [
  {
    code: 'N',
    name: 'Nitrogênio',
    unit: 'g/kg',
    group: 'MACRO',
    agronomicRole: 'Síntese proteica, clorofila e vigor vegetativo.',
  },
  {
    code: 'P',
    name: 'Fósforo',
    unit: 'g/kg',
    group: 'MACRO',
    agronomicRole: 'Transferência de energia (ATP), enraizamento e pegamento floral.',
  },
  {
    code: 'K',
    name: 'Potássio',
    unit: 'g/kg',
    group: 'MACRO',
    agronomicRole: 'Regulação osmótica, translocação de fotoassimilados e enchimento de grãos.',
  },
  {
    code: 'Ca',
    name: 'Cálcio',
    unit: 'g/kg',
    group: 'MACRO',
    agronomicRole: 'Estrutura de parede celular, crescimento radicular e integridade de tecidos.',
  },
  {
    code: 'Mg',
    name: 'Magnésio',
    unit: 'g/kg',
    group: 'MACRO',
    agronomicRole: 'Átomo central da clorofila e ativação enzimática da fotossíntese.',
  },
  {
    code: 'S',
    name: 'Enxofre',
    unit: 'g/kg',
    group: 'MACRO',
    agronomicRole: 'Aminoácidos sulfurados, nodulação (FBN) e síntese proteica.',
  },
  {
    code: 'B',
    name: 'Boro',
    unit: 'mg/kg',
    group: 'MICRO',
    agronomicRole: 'Germinação do tubo polínico, fecundação floral e transporte de açúcares.',
  },
  {
    code: 'Cu',
    name: 'Cobre',
    unit: 'mg/kg',
    group: 'MICRO',
    agronomicRole: 'Lignificação celular, cadeia de transporte de elétrons e resistência a patógenos.',
  },
  {
    code: 'Fe',
    name: 'Ferro',
    unit: 'mg/kg',
    group: 'MICRO',
    agronomicRole: 'Biossíntese de clorofila, ferredoxina e respiração celular.',
  },
  {
    code: 'Mn',
    name: 'Manganês',
    unit: 'mg/kg',
    group: 'MICRO',
    agronomicRole: 'Fotólise da água (Fotossistema II) e síntese de lignina/fenóis.',
  },
  {
    code: 'Zn',
    name: 'Zinco',
    unit: 'mg/kg',
    group: 'MICRO',
    agronomicRole: 'Síntese de auxinas (AIA), alongamento de entrenós e metabolismo de RNA.',
  },
];

export const SOLO_ELEMENTS: ElementMetadata[] = [
  {
    code: 'pH (CaCl2)',
    name: 'pH (CaCl₂)',
    unit: 'un',
    group: 'MACRO',
    agronomicRole: 'Acidez ativa e disponibilidade química de macro e micronutrientes.',
  },
  {
    code: 'P(mel)',
    name: 'Fósforo (Mehlich)',
    unit: 'mg/dm³',
    group: 'MACRO',
    agronomicRole: 'Reserva lábil de fósforo ajustada ao tampão de argila do solo.',
  },
  {
    code: 'K_1',
    name: 'Potássio (K)',
    unit: 'mg/dm³',
    group: 'MACRO',
    agronomicRole: 'Potássio trocável disponível na solução e complexo sortivo.',
  },
  {
    code: 'Ca',
    name: 'Cálcio (Ca²⁺)',
    unit: 'cmolc/dm³',
    group: 'MACRO',
    agronomicRole: 'Base estruturante da CTC e neutralização de impedimentos químicos.',
  },
  {
    code: 'Mg',
    name: 'Magnésio (Mg²⁺)',
    unit: 'cmolc/dm³',
    group: 'MACRO',
    agronomicRole: 'Equilíbrio catiônico Ca:Mg:K na CTC efetiva.',
  },
  {
    code: 'S',
    name: 'Enxofre (S)',
    unit: 'mg/dm³',
    group: 'MACRO',
    agronomicRole: 'Disponibilidade de sulfato no perfil radicular.',
  },
  {
    code: 'V',
    name: 'Saturação por Bases (V%)',
    unit: '%',
    group: 'MACRO',
    agronomicRole: 'Proporção da CTC ocupada por bases trocáveis (Ca, Mg, K).',
  },
  {
    code: 'CTC',
    name: 'CTC a pH 7,0',
    unit: 'cmolc/dm³',
    group: 'MACRO',
    agronomicRole: 'Capacidade total de retenção de cátions do solo.',
  },
  {
    code: 'M.O',
    name: 'Matéria Orgânica',
    unit: 'dag/kg',
    group: 'MACRO',
    agronomicRole: 'Tampão físico-químico, retenção hídrica e atividade biológica.',
  },
  {
    code: 'B',
    name: 'Boro (B)',
    unit: 'mg/dm³',
    group: 'MICRO',
    agronomicRole: 'Boro disponível no solo (alta mobilidade e risco de lixiviação).',
  },
  {
    code: 'Cu',
    name: 'Cobre (Cu)',
    unit: 'mg/dm³',
    group: 'MICRO',
    agronomicRole: 'Cobre disponível no complexo organomineral.',
  },
  {
    code: 'Fe',
    name: 'Ferro (Fe)',
    unit: 'mg/dm³',
    group: 'MICRO',
    agronomicRole: 'Ferro disponível por extração ácida/quelante.',
  },
  {
    code: 'Mn',
    name: 'Manganês (Mn)',
    unit: 'mg/dm³',
    group: 'MICRO',
    agronomicRole: 'Manganês disponível (sensível a calagem excessiva na superfície).',
  },
  {
    code: 'Zn',
    name: 'Zinco (Zn)',
    unit: 'mg/dm³',
    group: 'MICRO',
    agronomicRole: 'Zinco disponível (antagonismo com altos teores de P e pH elevado).',
  },
  {
    code: 'Ca/Mg',
    name: 'Relação Ca/Mg',
    unit: 'rel',
    group: 'MICRO',
    agronomicRole: 'Balanço competitivo entre Cálcio e Magnésio nos sítios de absorção.',
  },
  {
    code: 'Ca/K',
    name: 'Relação Ca/K',
    unit: 'rel',
    group: 'MICRO',
    agronomicRole: 'Balanço entre Cálcio e Potássio na solução do solo.',
  },
  {
    code: 'Mg/K',
    name: 'Relação Mg/K',
    unit: 'rel',
    group: 'MICRO',
    agronomicRole: 'Prevenção de inibição competitiva de Mg por excesso de K.',
  },
];

export const SOLUCAO_ELEMENTS: ElementMetadata[] = [
  {
    code: 'pH',
    name: 'pH Solução',
    unit: 'un',
    group: 'MACRO',
    agronomicRole: 'pH potenciométrico direto da solução na zona radicular.',
  },
  {
    code: 'C. E.',
    name: 'Condutividade Elétrica',
    unit: 'dS/m',
    group: 'MACRO',
    agronomicRole: 'Pressão osmótica e concentração total de sais solúveis.',
  },
  {
    code: 'NO3',
    name: 'Nitrato (NO₃⁻)',
    unit: 'mg/L',
    group: 'MACRO',
    agronomicRole: 'Nitrogênio nítrico prontamente assimilável no fluxo de massa.',
  },
  {
    code: 'H2PO4',
    name: 'Fosfato (H₂PO₄⁻)',
    unit: 'mg/L',
    group: 'MACRO',
    agronomicRole: 'Fósforo solúvel imediato na solução.',
  },
  {
    code: 'K1+',
    name: 'Potássio (K⁺)',
    unit: 'mg/L',
    group: 'MACRO',
    agronomicRole: 'Potássio livre na solução do solo.',
  },
  {
    code: 'Ca2+',
    name: 'Cálcio (Ca²⁺)',
    unit: 'mg/L',
    group: 'MACRO',
    agronomicRole: 'Cálcio solúvel disponível para fluxo transpiratório.',
  },
  {
    code: 'Mg2+',
    name: 'Magnésio (Mg²⁺)',
    unit: 'mg/L',
    group: 'MACRO',
    agronomicRole: 'Magnésio solúvel na solução do solo.',
  },
  {
    code: 'SO4',
    name: 'Sulfato (SO₄²⁻)',
    unit: 'mg/L',
    group: 'MACRO',
    agronomicRole: 'Enxofre solúvel disponível.',
  },
  {
    code: 'B3+',
    name: 'Boro (B³⁺)',
    unit: 'mg/L',
    group: 'MICRO',
    agronomicRole: 'Boro na solução do solo.',
  },
  {
    code: 'Cu2+',
    name: 'Cobre (Cu²⁺)',
    unit: 'mg/L',
    group: 'MICRO',
    agronomicRole: 'Cobre livre na solução.',
  },
  {
    code: 'Fe3+',
    name: 'Ferro (Fe³⁺)',
    unit: 'mg/L',
    group: 'MICRO',
    agronomicRole: 'Ferro na solução.',
  },
  {
    code: 'Mn4+',
    name: 'Manganês (Mn)',
    unit: 'mg/L',
    group: 'MICRO',
    agronomicRole: 'Manganês na solução.',
  },
  {
    code: 'Zn2+',
    name: 'Zinco (Zn²⁺)',
    unit: 'mg/L',
    group: 'MICRO',
    agronomicRole: 'Zinco na solução.',
  },
  {
    code: 'Na1+',
    name: 'Sódio (Na⁺)',
    unit: 'mg/L',
    group: 'MICRO',
    agronomicRole: 'Monitoramento de salinidade sódica.',
  },
];

// Maps stage label + culture to ID_DAE in dAnaliseRef
export function resolvePecioloIdDAE(
  db: DatabaseStarSchema,
  cultura: string,
  daeLabel: string
): number {
  const cleanCult = (cultura || 'Soja').trim().toLowerCase();
  const cleanDae = (daeLabel || 'R1').trim().toUpperCase();

  // Check exact match in dDAE first
  const exact = db.dDAE.find(
    (m) =>
      m.NOME_CULTURA.toLowerCase() === cleanCult &&
      String(m.DAE).toUpperCase() === cleanDae
  );

  // Special semantic mapping for Soja per prompt specification:
  // 7 = vegetativo (VC..V10), 8 = R1/R2, 9 = R3, 10 = R4, 11 = R5..R9
  if (cleanCult === 'soja' || !cleanCult.includes('algod')) {
    if (cleanDae.startsWith('V')) return 7;
    if (cleanDae === 'R1' || cleanDae === 'R2' || cleanDae === 'R1/R2') return 8;
    if (cleanDae === 'R3') return 9;
    if (cleanDae === 'R4') return 10;
    if (cleanDae.startsWith('R5') || cleanDae.startsWith('R6') || cleanDae.startsWith('R7') || cleanDae.startsWith('R8') || cleanDae.startsWith('R9')) {
      return 11;
    }
    if (exact) return exact.ID_DAE;
    return 8; // Default reproductive stage R1/R2 for Soja when 'TODOS' is selected
  }

  // Algodão numeric days mapping (1..6)
  if (exact) return exact.ID_DAE;
  const numDays = parseFloat(cleanDae.replace(/[^\d.]/g, ''));
  if (Number.isFinite(numDays)) {
    if (numDays <= 15) return 1;
    if (numDays <= 40) return 2;
    if (numDays <= 60) return 3;
    if (numDays <= 85) return 4;
    if (numDays <= 110) return 5;
    return 6;
  }
  return 3; // Mid-flowering default for Algodão
}

export function getReferenceBounds(
  db: DatabaseStarSchema,
  tipoAnalise: AnalysisType,
  cultura: string,
  daeLabel: string,
  elementCode: string,
  soilContext?: { argilaPercent?: number | null; ctc?: number | null }
): { min: number | null; max: number | null } {
  const code = elementCode.trim();

  if (tipoAnalise === 'PECÍOLO') {
    // Check if culture exists in dAnaliseRef (Soja or Algodão); fallback to Soja if another crop
    const refCultura =
      cultura.toLowerCase().includes('algod') ? 'Algodão' : 'Soja';
    const idDae = resolvePecioloIdDAE(db, refCultura, daeLabel);

    const row =
      db.dAnaliseRef.find(
        (r) =>
          r.NOME_CULTURA.toLowerCase() === refCultura.toLowerCase() &&
          r.ELEMENTO.toLowerCase() === code.toLowerCase() &&
          r.DAE === idDae
      ) ||
      db.dAnaliseRef.find(
        (r) =>
          r.NOME_CULTURA.toLowerCase() === refCultura.toLowerCase() &&
          r.ELEMENTO.toLowerCase() === code.toLowerCase()
      );

    if (row) {
      return { min: row.REF_MIN, max: row.REF_MAX };
    }
  }

  if (tipoAnalise === 'FOLHA') {
    const cleanCult = (cultura || 'Soja').trim().toLowerCase();
    let matches = db.dElementoFolhaRef.filter(
      (r) =>
        r.CULTURA.toLowerCase() === cleanCult &&
        r.ELEMENTO.toLowerCase() === code.toLowerCase()
    );
    if (matches.length === 0) {
      matches = db.dElementoFolhaRef.filter(
        (r) =>
          r.CULTURA.toLowerCase() === 'soja' &&
          r.ELEMENTO.toLowerCase() === code.toLowerCase()
      );
    }
    const minRow = matches.find((r) => r.REF === 1);
    const maxRow = matches.find((r) => r.REF === 2);
    return {
      min: minRow?.VALOR ?? null,
      max: maxRow?.VALOR ?? null,
    };
  }

  if (tipoAnalise === 'SOLO') {
    const rows = db.dElementoSoloRef.filter(
      (r) => r.ELEMENTO.toLowerCase() === code.toLowerCase() && r.REF >= 0 && r.VALOR !== null
    );
    if (rows.length === 0) return { min: null, max: null };

    // Filter by ARGILA segment if applicable
    const argila = soilContext?.argilaPercent ?? 35;
    const ctc = soilContext?.ctc ?? 6;

    let filtered = rows;
    const distinctArgilas = [...new Set(rows.map((r) => r.ARGILA))].filter((a) => a > 0).sort((a, b) => a - b);
    if (distinctArgilas.length > 0) {
      let targetArg = distinctArgilas[distinctArgilas.length - 1];
      for (const threshold of distinctArgilas) {
        if (argila <= threshold) {
          targetArg = threshold;
          break;
        }
      }
      filtered = rows.filter((r) => Math.abs(r.ARGILA - targetArg) < 0.5);
    }

    const distinctCtcs = [...new Set(filtered.map((r) => r.CTC))].filter((c) => c > 0).sort((a, b) => a - b);
    if (distinctCtcs.length > 0) {
      const targetCtc = ctc < 4 ? distinctCtcs[0] : distinctCtcs[distinctCtcs.length - 1];
      filtered = filtered.filter((r) => Math.abs(r.CTC - targetCtc) < 0.05);
    }

    // In dElementoSoloRef, Ref 0 = Muito Baixo, Ref 1 = Baixo/Mínimo Ideal, Ref 2 = Médio/Bom, Ref 3 = Alto/Máximo Ideal
    const sorted = [...filtered].sort((a, b) => a.REF - b.REF);
    const ref1 = sorted.find((r) => r.REF === 1) ?? sorted[0];
    const ref3 = sorted.find((r) => r.REF === 3) ?? sorted.find((r) => r.REF === 2) ?? sorted[sorted.length - 1];
    return {
      min: ref1?.VALOR ?? null,
      max: ref3?.VALOR ?? null,
    };
  }

  if (tipoAnalise === 'SOLUÇÃO') {
    const matches = db.dElementoSolucaoSoloRef.filter(
      (r) => r.CODIGO.toLowerCase() === code.toLowerCase() && r.REF > 0
    );
    const minRow = matches.find((r) => r.REF === 1);
    const maxRow = matches.find((r) => r.REF === 2);
    return {
      min: minRow?.VALOR ?? null,
      max: maxRow?.VALOR ?? null,
    };
  }

  return { min: null, max: null };
}

export function evaluateNutrient(
  meta: ElementMetadata,
  value: number | null,
  refMin: number | null,
  refMax: number | null,
  sampleCount: number
): NutrientEvaluation {
  if (value === null || !Number.isFinite(value)) {
    return {
      code: meta.code,
      name: meta.name,
      unit: meta.unit,
      group: meta.group,
      value: null,
      refMin,
      refMax,
      refMid: refMin !== null && refMax !== null ? (refMin + refMax) / 2 : null,
      status: 'NO_REF',
      deficitPercent: 0,
      excessPercent: 0,
      radarNormalized: null,
      sampleCount,
    };
  }

  if (refMin === null || refMax === null || (refMin === 0 && refMax === 0)) {
    return {
      code: meta.code,
      name: meta.name,
      unit: meta.unit,
      group: meta.group,
      value,
      refMin: null,
      refMax: null,
      refMid: null,
      status: 'NO_REF',
      deficitPercent: 0,
      excessPercent: 0,
      radarNormalized: null,
      sampleCount,
    };
  }

  const refMid = (refMin + refMax) / 2;
  let status: NutrientStatus = 'IDEAL';
  let deficitPercent = 0;
  let excessPercent = 0;

  if (value < refMin) {
    status = 'LOW';
    if (refMin > 0) {
      deficitPercent = Math.max(0, ((refMin - value) / refMin) * 100);
    }
  } else if (value > refMax) {
    status = 'HIGH';
    if (refMax > 0) {
      excessPercent = Math.max(0, ((value - refMax) / refMax) * 100);
    }
  } else {
    status = 'IDEAL';
  }

  // Radar normalization: 100% = ideal midpoint ((REF_MIN + REF_MAX) / 2), capped at 200%
  const rawRadar = safeDivide(value * 100, refMid, null);
  const radarNormalized =
    rawRadar !== null ? Math.min(200, Math.max(0, Number(rawRadar.toFixed(1)))) : null;

  return {
    code: meta.code,
    name: meta.name,
    unit: meta.unit,
    group: meta.group,
    value,
    refMin,
    refMax,
    refMid,
    status,
    deficitPercent,
    excessPercent,
    radarNormalized,
    sampleCount,
  };
}

// Biological ordering of phenological stages (VC -> V1..V10 -> R1 -> R2 -> R3 -> R4 -> R5..R9 or numeric DAE)
export function getStageOrderScore(stage: string): number {
  const s = (stage || '').trim().toUpperCase();
  if (s === 'VC') return 1;
  const vMatch = s.match(/^V(\d+(\.\d+)?)/);
  if (vMatch) return 10 + parseFloat(vMatch[1]);
  const rMatch = s.match(/^R(\d+(\.\d+)?)/);
  if (rMatch) return 100 + parseFloat(rMatch[1]) * 10;
  const numMatch = s.match(/^(\d+(\.\d+)?)/);
  if (numMatch) return 500 + parseFloat(numMatch[1]);
  return 999;
}
