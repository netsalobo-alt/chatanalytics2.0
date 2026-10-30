import { cleanCPF, validateCPF, formatCPF } from './cpf.ts';
import type { FieldOrigin, FieldOriginsMap } from './types.ts';

export interface ExtractedCPFResult {
  found: boolean;
  clean?: string;
  formatted?: string;
  valid: boolean;
  raw?: string;
}

export interface ExtractedBirthDateResult {
  found: boolean;
  raw?: string;
  formattedDate?: string; // DD/MM/AAAA
  day?: number;
  month?: number;
  year?: number;
  age?: number;
  valid: boolean;
  reason?: string;
}

export type CNHResult = 'SIM' | 'NÃO' | null;

export interface ExtractedClientData {
  cpf?: string;
  cpf_valid?: boolean;
  birth_date?: string; // DD/MM/AAAA
  cnh?: string; // "SIM" | "NÃO"
  cpf_conflict?: boolean;
  cpf_conflict_detail?: string;
  field_origins: FieldOriginsMap;
}

/**
 * Normalizes text removing diacritics and converting to lowercase
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * 1. Extract and mathematically validate CPF from text (with or without punctuation)
 * Rejects repeated sequences (e.g. 11111111111) and invalid check digits.
 */
export function extractCPFFromText(text: string): ExtractedCPFResult | null {
  if (!text || typeof text !== 'string') return null;

  // 1. First search for formatted CPFs: XXX.XXX.XXX-XX or XXX.XXX.XXX.XX
  const formattedRegex = /(?:^|\D)(\d{3}\.\d{3}\.\d{3}[-.]\d{2})(?:\D|$)/g;
  let match: RegExpExecArray | null;

  while ((match = formattedRegex.exec(text)) !== null) {
    const raw = match[1];
    const clean = cleanCPF(raw);
    const valid = validateCPF(clean);
    if (valid) {
      return {
        found: true,
        clean,
        formatted: formatCPF(clean),
        valid: true,
        raw
      };
    }
  }

  // 2. Search for 11 consecutive digits: XXXXXXXXXXX
  const unformattedRegex = /(?:^|\D)(\d{11})(?:\D|$)/g;
  while ((match = unformattedRegex.exec(text)) !== null) {
    const raw = match[1];
    const clean = raw;
    const valid = validateCPF(clean);
    if (valid) {
      return {
        found: true,
        clean,
        formatted: formatCPF(clean),
        valid: true,
        raw
      };
    }
  }

  // 3. Search for numbers separated by spaces: XXX XXX XXX XX or combinations
  const spaceRegex = /(?:^|\D)(\d{3}\s+\d{3}\s+\d{3}\s+\d{2})(?:\D|$)/g;
  while ((match = spaceRegex.exec(text)) !== null) {
    const raw = match[1];
    const clean = cleanCPF(raw);
    const valid = validateCPF(clean);
    if (valid) {
      return {
        found: true,
        clean,
        formatted: formatCPF(clean),
        valid: true,
        raw
      };
    }
  }

  // 4. Look if text contains any 11-digit sequence that was invalid
  const allElevenRegex = /(?:^|\D)(\d{11})(?:\D|$)/;
  const elevenMatch = allElevenRegex.exec(text);
  if (elevenMatch) {
    const raw = elevenMatch[1];
    return {
      found: true,
      clean: raw,
      valid: false,
      raw
    };
  }

  return null;
}

/**
 * Checks whether a given calendar date exists (including leap years)
 */
export function isValidCalendarDate(day: number, month: number, year: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const maxDaysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Leap year check for February
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const maxDay = (month === 2 && isLeapYear) ? 29 : maxDaysPerMonth[month - 1];

  return day <= maxDay;
}

/**
 * Calculates age based on reference date (defaults to current local date)
 */
export function calculateAge(day: number, month: number, year: number, referenceDate = new Date()): number {
  let age = referenceDate.getFullYear() - year;
  const m = (referenceDate.getMonth() + 1) - month;
  if (m < 0 || (m === 0 && referenceDate.getDate() < day)) {
    age--;
  }
  return age;
}

/**
 * 2. Extract Birth Date from text
 * Formats: DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA
 * Context keywords: nascimento, nasci, data de nascimento, DN, idade, etc.
 * Validates date existence and age constraint: 14 to 100 years.
 * Always saves as: DD/MM/AAAA.
 */
export function extractBirthDateFromText(text: string, referenceDate = new Date()): ExtractedBirthDateResult | null {
  if (!text || typeof text !== 'string') return null;

  const normalized = normalizeText(text);

  // Check if context word exists in the message
  const contextWords = [
    'nascimento',
    'data de nascimento',
    'nasci',
    'nasc',
    'dn',
    'd.n',
    'd/n',
    'idade',
    'aniversario'
  ];

  const hasExplicitContext = contextWords.some(w => {
    // Word boundary or separator check
    const regex = new RegExp(`(?:^|\\W)${w.replace('.', '\\.')}(?:\\W|$)`, 'i');
    return regex.test(normalized);
  });

  // Regex for DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA (allowing 4 digit year 19XX or 20XX)
  const dateRegex = /\b(0?[1-9]|[12]\d|3[01])[\/.\-](0?[1-9]|1[0-2])[\/.\-](19\d{2}|20\d{2})\b/g;
  let match: RegExpExecArray | null;

  while ((match = dateRegex.exec(text)) !== null) {
    const raw = match[0];
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // If no explicit context word in the message, check if the message is short (e.g. just the date or "15/05/1990")
    // or has immediate proximity
    const matchIndex = match.index;
    const surroundingSnippet = normalized.slice(Math.max(0, matchIndex - 35), Math.min(normalized.length, matchIndex + raw.length + 35));
    const isNearbyContext = contextWords.some(w => surroundingSnippet.includes(w));
    
    // Accept if has explicit context, nearby context, or message is essentially only the date
    const cleanMsg = normalized.replace(/[^a-z0-9]/g, '');
    const cleanDate = `${day}${month}${year}`;
    const isIsolatedDate = cleanMsg === cleanDate || cleanMsg.length <= cleanDate.length + 6;

    if (!hasExplicitContext && !isNearbyContext && !isIsolatedDate) {
      continue;
    }

    // 1. Validate calendar date
    if (!isValidCalendarDate(day, month, year)) {
      return {
        found: true,
        raw,
        valid: false,
        reason: 'Data de calendário inexistente (ex: dia inválido para o mês)'
      };
    }

    // 2. Validate age between 14 and 100 years
    const age = calculateAge(day, month, year, referenceDate);
    if (age < 14 || age > 100) {
      return {
        found: true,
        raw,
        day,
        month,
        year,
        age,
        valid: false,
        reason: `Idade calculada (${age} anos) fora do intervalo permitido (14 a 100 anos)`
      };
    }

    // Always output as DD/MM/AAAA
    const formattedDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

    return {
      found: true,
      raw,
      formattedDate,
      day,
      month,
      year,
      age,
      valid: true
    };
  }

  return null;
}

/**
 * 3. Extract CNH status from text
 * "SIM": "tenho CNH", "possuo habilitação", "sou habilitado", "tenho carteira", etc.
 * "NÃO": "não tenho CNH", "não sou habilitado", "sem habilitação", "ainda não tirei carteira", etc.
 * When uncertain: null
 */
export function extractCNHFromText(text: string): CNHResult {
  if (!text || typeof text !== 'string') return null;

  const normalized = normalizeText(text);

  // Negative expressions checked FIRST to prevent false positives with "tenho"
  const negativeExpressions = [
    'nao tenho cnh',
    'nao possuo cnh',
    'nao tenho habilitacao',
    'nao possuo habilitacao',
    'nao sou habilitado',
    'nao sou habilitada',
    'sem habilitacao',
    'sem cnh',
    'ainda nao tirei carteira',
    'ainda nao tirei cnh',
    'ainda nao tenho carteira',
    'ainda nao tenho cnh',
    'nao tenho carteira',
    'nao tenho carta',
    'nao habilitado',
    'nao habilitada',
    'sem carteira de motorista',
    'nunca tirei cnh',
    'nunca tirei habilitacao'
  ];

  for (const expr of negativeExpressions) {
    if (normalized.includes(expr)) {
      return 'NÃO';
    }
  }

  // Positive expressions
  const positiveExpressions = [
    'tenho cnh',
    'possuo habilitacao',
    'possuo cnh',
    'sou habilitado',
    'sou habilitada',
    'tenho carteira',
    'tenho carta',
    'tenho habilitacao',
    'tenho carteira de motorista',
    'cnh definitiva',
    'cnh provisoria',
    'cnh em dia',
    'carteira de motorista',
    'categoria b',
    'categoria a',
    'categoria ab',
    'categoria c',
    'categoria d',
    'carteira b',
    'cnh b',
    'habilitacao b',
    'sim tenho cnh',
    'sim, tenho cnh',
    'sim sou habilitado',
    'sim sou habilitada'
  ];

  for (const expr of positiveExpressions) {
    if (normalized.includes(expr)) {
      return 'SIM';
    }
  }

  return null;
}

export interface ClientMessageItem {
  text: string;
  timestamp: number;
  isOutgoing?: boolean;
}

/**
 * 4. Contextual Multi-Message Extraction
 * Requirements:
 * - Analyzes only incoming messages from the client.
 * - Max 20 incoming messages.
 * - Only messages from the last 10 minutes (600,000 ms).
 * - Never uses outgoing messages as client-provided data.
 * - Incremental updates: never erases existing data with empty/null.
 * - Priority: MANUAL > VALOR VALIDADO LOCALMENTE > VAZIO.
 * - Tracks field origin: MANUAL | LOCAL | IA.
 * - Flags conflict if client sends a different valid CPF when lead already has one.
 */
export function extractDataFromClientMessages(
  incomingMessages: ClientMessageItem[],
  existingLead?: {
    cpf?: string;
    cpf_valid?: boolean;
    birth_date?: string;
    cnh?: string;
    manual_fields?: string[];
    field_origins?: FieldOriginsMap;
  },
  referenceNow = Date.now()
): ExtractedClientData {
  const manualFields = new Set<string>(existingLead?.manual_fields || []);
  const existingOrigins = existingLead?.field_origins || {};

  // Ten minutes window in ms
  const tenMinutesAgo = referenceNow - 10 * 60 * 1000;

  // 1. Filter: ONLY incoming messages, within last 10 minutes, max 20 latest
  const validIncoming = incomingMessages
    .filter(m => !m.isOutgoing && m.text && (m.timestamp === undefined || m.timestamp >= tenMinutesAgo))
    .slice(-20);

  let detectedCpf: string | undefined = undefined;
  let detectedCpfValid: boolean | undefined = undefined;
  let detectedBirthDate: string | undefined = undefined;
  let detectedCnh: string | undefined = undefined;

  let cpfConflict = false;
  let cpfConflictDetail: string | undefined = undefined;

  // Process messages in chronological order (or recent to old)
  for (const item of validIncoming) {
    const text = item.text;

    // Check CPF
    if (!detectedCpf) {
      const cpfResult = extractCPFFromText(text);
      if (cpfResult && cpfResult.valid && cpfResult.formatted) {
        detectedCpf = cpfResult.formatted;
        detectedCpfValid = true;
      }
    }

    // Check Birth Date
    if (!detectedBirthDate) {
      const birthResult = extractBirthDateFromText(text, new Date(referenceNow));
      if (birthResult && birthResult.valid && birthResult.formattedDate) {
        detectedBirthDate = birthResult.formattedDate;
      }
    }

    // Check CNH
    if (!detectedCnh) {
      const cnhResult = extractCNHFromText(text);
      if (cnhResult !== null) {
        detectedCnh = cnhResult;
      }
    }
  }

  // Also check combined text of recent messages in case data was fragmented across sentences
  if (!detectedCpf || !detectedBirthDate || !detectedCnh) {
    const combinedText = validIncoming.map(m => m.text).join(' \n ');
    
    if (!detectedCpf) {
      const cpfResult = extractCPFFromText(combinedText);
      if (cpfResult && cpfResult.valid && cpfResult.formatted) {
        detectedCpf = cpfResult.formatted;
        detectedCpfValid = true;
      }
    }

    if (!detectedBirthDate) {
      const birthResult = extractBirthDateFromText(combinedText, new Date(referenceNow));
      if (birthResult && birthResult.valid && birthResult.formattedDate) {
        detectedBirthDate = birthResult.formattedDate;
      }
    }

    if (!detectedCnh) {
      const cnhResult = extractCNHFromText(combinedText);
      if (cnhResult !== null) {
        detectedCnh = cnhResult;
      }
    }
  }

  // Prepare final results with Incremental Priority Rules
  const result: ExtractedClientData = {
    field_origins: { ...existingOrigins }
  };

  // --- CPF HANDLING & CONFLICT CHECK ---
  const isCpfManual = manualFields.has('cpf') || existingOrigins.cpf === 'MANUAL';
  if (isCpfManual) {
    result.cpf = existingLead?.cpf;
    result.cpf_valid = existingLead?.cpf_valid;
    result.field_origins.cpf = 'MANUAL';
  } else if (detectedCpf) {
    const cleanExisting = cleanCPF(existingLead?.cpf);
    const cleanNew = cleanCPF(detectedCpf);

    if (existingLead?.cpf && cleanExisting && validateCPF(cleanExisting)) {
      if (cleanExisting === cleanNew) {
        // Same CPF, preserve existing
        result.cpf = existingLead.cpf;
        result.cpf_valid = true;
        result.field_origins.cpf = existingOrigins.cpf || 'LOCAL';
      } else {
        // CONFLICT! Client sent a different valid CPF than the already registered valid CPF
        cpfConflict = true;
        cpfConflictDetail = `Conflito de CPF: Lead já possui CPF ${existingLead.cpf} e cliente enviou novo CPF válido ${detectedCpf} para revisão manual.`;
        // Do NOT overwrite existing CPF automatically
        result.cpf = existingLead.cpf;
        result.cpf_valid = existingLead.cpf_valid;
        result.field_origins.cpf = existingOrigins.cpf || 'LOCAL';
      }
    } else {
      // First valid CPF found or replacing invalid/empty
      result.cpf = detectedCpf;
      result.cpf_valid = detectedCpfValid;
      result.field_origins.cpf = 'LOCAL';
    }
  } else {
    // Preserve existing (never erase with empty)
    result.cpf = existingLead?.cpf;
    result.cpf_valid = existingLead?.cpf_valid;
    if (existingOrigins.cpf) {
      result.field_origins.cpf = existingOrigins.cpf;
    }
  }

  result.cpf_conflict = cpfConflict;
  result.cpf_conflict_detail = cpfConflictDetail;

  // --- BIRTH DATE HANDLING ---
  const isBirthDateManual = manualFields.has('birth_date') || existingOrigins.birth_date === 'MANUAL';
  if (isBirthDateManual) {
    result.birth_date = existingLead?.birth_date;
    result.field_origins.birth_date = 'MANUAL';
  } else if (detectedBirthDate) {
    result.birth_date = detectedBirthDate;
    result.field_origins.birth_date = 'LOCAL';
  } else {
    // Preserve existing
    result.birth_date = existingLead?.birth_date;
    if (existingOrigins.birth_date) {
      result.field_origins.birth_date = existingOrigins.birth_date;
    }
  }

  // --- CNH HANDLING ---
  const isCnhManual = manualFields.has('cnh') || existingOrigins.cnh === 'MANUAL';
  if (isCnhManual) {
    result.cnh = existingLead?.cnh;
    result.field_origins.cnh = 'MANUAL';
  } else if (detectedCnh) {
    result.cnh = detectedCnh;
    result.field_origins.cnh = 'LOCAL';
  } else {
    // Preserve existing (null/empty does not erase)
    result.cnh = existingLead?.cnh;
    if (existingOrigins.cnh) {
      result.field_origins.cnh = existingOrigins.cnh;
    }
  }

  return result;
}
