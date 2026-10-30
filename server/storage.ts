import fs from 'fs';
import path from 'path';
import type { ChatwootConfig, ChatwootInbox, LeadRecord, InvestmentRecord, LeadStatus, FieldOrigin, FieldOriginsMap, WebhookLogEntry } from './types.ts';
import { validateCPF } from './cpf.ts';
import { extractDataFromClientMessages } from './localExtractor.ts';
import { 
  loadAppDataFromFirestore, 
  saveAllAppDataToFirestore, 
  saveConfigToFirestore, 
  saveInvestmentsToFirestore, 
  saveLeadsToFirestore 
} from './firestoreDb.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'chatanalytics_db.json');

interface DatabaseSchema {
  config: ChatwootConfig;
  leads: Record<string, LeadRecord>; // keyed by `${account_id}_${contact_id}`
  investments: InvestmentRecord[];
  processed_message_ids?: string[];
  webhook_logs?: WebhookLogEntry[];
}

const DEFAULT_CONFIG: ChatwootConfig = {
  chatwoot_url: 'https://app.chatwoot.com',
  account_id: '',
  api_token: process.env.CHATWOOT_API_TOKEN || '',
  connected: false,
  last_sync_at: null,
  last_sync_count: 0,
  last_sync_status: 'idle',
  inboxes: [],
  auto_sync_enabled: true,
  auto_sync_interval_minutes: 10,
  last_auto_sync_at: null,
  last_auto_sync_result: undefined,
  ad_spend: 0,
  has_master_user: false
};

function ensureDbExists(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.leads === 'object') {
        parsed.config = { ...DEFAULT_CONFIG, ...(parsed.config || {}) };
        parsed.investments = Array.isArray(parsed.investments) ? parsed.investments : [];
        parsed.processed_message_ids = Array.isArray(parsed.processed_message_ids) ? parsed.processed_message_ids : [];
        parsed.webhook_logs = Array.isArray(parsed.webhook_logs) ? parsed.webhook_logs : [];
        return parsed;
      }
    } catch (e) {
      console.warn('Erro ao ler chatanalytics_db.json, inicializando base limpa...', e);
    }
  }

  const initialDb: DatabaseSchema = {
    config: DEFAULT_CONFIG,
    leads: {},
    investments: [],
    processed_message_ids: [],
    webhook_logs: []
  };

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write initial db file:', err);
  }
  return initialDb;
}

let dbCache: DatabaseSchema | null = null;

function getDb(): DatabaseSchema {
  if (!dbCache) {
    dbCache = ensureDbExists();
  }
  if (!dbCache.processed_message_ids) {
    dbCache.processed_message_ids = [];
  }
  if (!dbCache.webhook_logs) {
    dbCache.webhook_logs = [];
  }
  return dbCache;
}

let remoteSyncTimer: NodeJS.Timeout | null = null;
let isRemoteSyncInProgress = false;
let pendingRemoteSync = false;

function debouncedRemoteSync(db: DatabaseSchema) {
  pendingRemoteSync = true;
  if (remoteSyncTimer) {
    clearTimeout(remoteSyncTimer);
  }

  remoteSyncTimer = setTimeout(async () => {
    if (isRemoteSyncInProgress) {
      return;
    }
    isRemoteSyncInProgress = true;
    pendingRemoteSync = false;
    try {
      await saveAllAppDataToFirestore(db);
    } catch (err: any) {
      console.warn('[FirestorePersistence] Erro ao sincronizar com Firestore:', err.message);
    } finally {
      isRemoteSyncInProgress = false;
      if (pendingRemoteSync) {
        debouncedRemoteSync(db);
      }
    }
  }, 2500);
}

function saveDb(db: DatabaseSchema, syncToRemote = true) {
  dbCache = db;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist database to disk:', err);
  }

  if (syncToRemote) {
    debouncedRemoteSync(db);
  }
}

export function getConfig(): ChatwootConfig {
  return getDb().config;
}

export function getSanitizedConfig() {
  const config = getConfig();
  return {
    ...config,
    api_token: config.api_token ? `${config.api_token.slice(0, 4)}••••••••${config.api_token.slice(-3)}` : '',
    has_token: Boolean(config.api_token)
  };
}

export function saveConfig(updates: Partial<ChatwootConfig>): ChatwootConfig {
  const db = getDb();
  if (updates.api_token && updates.api_token.includes('••••')) {
    delete updates.api_token;
  }
  db.config = {
    ...db.config,
    ...updates
  };
  saveDb(db);
  return db.config;
}

export function getMasterStatus() {
  const config = getConfig();
  return {
    has_master_user: Boolean(config.has_master_user),
    master_user_email: config.master_user_email || undefined
  };
}

export function setMasterUser(email: string) {
  const current = getConfig();
  if (current.has_master_user) {
    return { success: false, message: 'Usuário master já definido.' };
  }
  saveConfig({
    has_master_user: true,
    master_user_email: email
  });
  return { success: true, message: 'Usuário master registrado com sucesso.' };
}

// ==========================================
// INBOXES MANAGEMENT: Enable/Disable & Custom Rename
// ==========================================
export function getInboxes(): ChatwootInbox[] {
  const config = getConfig();
  const rawList = Array.isArray(config.inboxes) ? config.inboxes : [];
  return rawList.map(ib => ({
    ...ib,
    enabled: ib.enabled !== false, // default to enabled (ligada)
    custom_name: ib.custom_name?.trim() || undefined
  }));
}

export function mergeInboxesWithSavedSettings(
  freshInboxes: Array<{ id: number; name: string; channel_type: string; phone_number?: string | null }>
): ChatwootInbox[] {
  const currentInboxes = getInboxes();
  const currentMap = new Map<number, ChatwootInbox>();
  currentInboxes.forEach(ib => currentMap.set(ib.id, ib));

  const merged: ChatwootInbox[] = freshInboxes.map(fresh => {
    const existing = currentMap.get(fresh.id);
    return {
      id: fresh.id,
      name: fresh.name,
      channel_type: fresh.channel_type,
      phone_number: fresh.phone_number || null,
      enabled: existing ? existing.enabled !== false : true,
      custom_name: existing?.custom_name?.trim() || undefined
    };
  });

  // Retain previously discovered inboxes if any were temporarily not returned
  for (const existing of currentInboxes) {
    if (!merged.some(m => m.id === existing.id)) {
      merged.push(existing);
    }
  }

  saveConfig({ inboxes: merged });
  return merged;
}

export function updateInboxSettings(
  inboxId: number, 
  updates: { enabled?: boolean; custom_name?: string }
): ChatwootInbox | null {
  const inboxes = getInboxes();
  const index = inboxes.findIndex(ib => ib.id === inboxId);
  if (index === -1) return null;

  const target = { ...inboxes[index] };
  if (typeof updates.enabled === 'boolean') {
    target.enabled = updates.enabled;
  }
  if (updates.custom_name !== undefined) {
    target.custom_name = updates.custom_name.trim() || undefined;
  }

  inboxes[index] = target;
  saveConfig({ inboxes });
  return target;
}

// ==========================================
// DEDUPLICATION: Message ID Tracking
// ==========================================
export function isMessageProcessed(messageId: string | number): boolean {
  if (!messageId) return false;
  const db = getDb();
  const idStr = String(messageId);
  return (db.processed_message_ids || []).includes(idStr);
}

export function markMessageProcessed(messageId: string | number): void {
  if (!messageId) return;
  const db = getDb();
  const idStr = String(messageId);
  if (!db.processed_message_ids) {
    db.processed_message_ids = [];
  }
  if (!db.processed_message_ids.includes(idStr)) {
    db.processed_message_ids.push(idStr);
    // Keep bounded to last 5000 IDs
    if (db.processed_message_ids.length > 5000) {
      db.processed_message_ids = db.processed_message_ids.slice(-5000);
    }
    saveDb(db, false);
  }
}

// ==========================================
// WEBHOOK LOGS: Recording at least 50 triggers
// ==========================================
export function addWebhookLogEntry(entry: Omit<WebhookLogEntry, 'id' | 'received_at'>): WebhookLogEntry {
  const db = getDb();
  if (!db.webhook_logs) {
    db.webhook_logs = [];
  }
  const id = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const fullEntry: WebhookLogEntry = {
    id,
    received_at: new Date().toISOString(),
    ...entry
  };

  // Prepend to array (newest first)
  db.webhook_logs.unshift(fullEntry);

  // Keep at least 50 (cap at 100 to save memory while providing ample history)
  if (db.webhook_logs.length > 100) {
    db.webhook_logs = db.webhook_logs.slice(0, 100);
  }

  saveDb(db, false);
  return fullEntry;
}

export function getWebhookLogs(limit: number = 50): WebhookLogEntry[] {
  const db = getDb();
  const list = db.webhook_logs || [];
  return list.slice(0, Math.max(1, limit));
}

export function clearWebhookLogs(): void {
  const db = getDb();
  db.webhook_logs = [];
  saveDb(db, false);
}

// ==========================================
// LEADS MANAGEMENT: ChatAnalytics 2.0
// ==========================================

export function getAllLeads(): LeadRecord[] {
  const db = getDb();
  return Object.values(db.leads);
}

export function getLeadById(id: string): LeadRecord | undefined {
  return getDb().leads[id];
}

/**
 * Normalizes lead status into ChatAnalytics 2.0 standard
 */
export function normalizeLeadStatus(rawStatus?: string, isConverted?: boolean): LeadStatus {
  if (rawStatus === 'APROVADO' || rawStatus === 'converted' || isConverted) return 'APROVADO';
  if (rawStatus === 'REPROVADO' || rawStatus === 'not_converted') return 'REPROVADO';
  if (rawStatus === 'EM ANÁLISE') return 'EM ANÁLISE';
  if (rawStatus === 'PENDENTE') return 'PENDENTE';
  return 'NOVO LEAD';
}

/**
 * Core upsert function for leads
 * Priority Rule: If lead was manually modified by SDR, manual fields are protected
 * and NEVER overwritten by automated webhook payloads.
 */
export function upsertLead(lead: Partial<LeadRecord> & { 
  account_id: string; 
  contact_id: number; 
  conversation_id: number;
  incoming_message?: {
    text: string;
    timestamp: number;
    message_id?: string | number;
  };
}, saveNow: boolean = true): { lead: LeadRecord; isNew: boolean } {
  const db = getDb();
  
  // Composite key: account_id + contact_id
  const accountId = String(lead.account_id || db.config.account_id || '1');
  const contactId = Number(lead.contact_id || 0);
  const id = `${accountId}_${contactId}`;
  
  // Also check if an existing lead was previously saved with conversation_id key or contact key
  const existing = db.leads[id] || Object.values(db.leads).find(l => 
    l.account_id === accountId && 
    (l.contact_id === contactId || (l.contact_phone && lead.contact_phone && l.contact_phone === lead.contact_phone))
  );

  const nowIso = new Date().toISOString();
  const nowEpoch = Date.now();
  const entryDate = existing ? existing.entry_date : (lead.entry_date || nowIso);
  const lastInteraction = lead.last_interaction_at || nowIso;

  // Protect manual fields from being overwritten by webhook
  const isSdrModified = Boolean(existing?.sdr_modified);
  const manualFields = new Set<string>(existing?.manual_fields || []);
  const origins: FieldOriginsMap = { ...(existing?.field_origins || {}) };

  // 1. Maintain Recent Incoming Client Messages (last 10 minutes, max 20 messages)
  const existingRecent = Array.isArray(existing?.recent_client_messages) ? existing.recent_client_messages : [];
  let updatedRecent: Array<{ text: string; timestamp: number; message_id?: string | number }> = [...existingRecent];

  if (Array.isArray(lead.recent_client_messages)) {
    for (const msg of lead.recent_client_messages) {
      if (msg && msg.text && !updatedRecent.some(m => m.text === msg.text)) {
        updatedRecent.push(msg);
      }
    }
  }

  const incomingMsg = lead.incoming_message || (lead.last_message ? { text: lead.last_message, timestamp: nowEpoch } : undefined);

  if (incomingMsg && incomingMsg.text) {
    const isDup = updatedRecent.some(m => 
      (incomingMsg.message_id && m.message_id === incomingMsg.message_id) ||
      (m.text === incomingMsg.text && Math.abs(m.timestamp - incomingMsg.timestamp) < 2000)
    );
    if (!isDup) {
      updatedRecent.push(incomingMsg);
    }
  }

  // Keep up to 50 client messages in conversation history
  updatedRecent = updatedRecent.slice(-50);

  // 2. Extract client data (CPF, birth date, CNH) using local rule-based extractor
  const extracted = extractDataFromClientMessages(updatedRecent, existing, nowEpoch);

  // 3. Determine status: SDR manual status takes absolute precedence
  let finalStatus: LeadStatus = 'NOVO LEAD';
  if (existing) {
    if (manualFields.has('status') || isSdrModified) {
      finalStatus = existing.status;
    } else if (lead.status) {
      finalStatus = normalizeLeadStatus(lead.status, lead.vendeu);
    } else {
      finalStatus = existing.status;
    }
  } else {
    finalStatus = normalizeLeadStatus(lead.status || 'NOVO LEAD', lead.vendeu);
  }

  // 4. Resolve CPF with priority & conflict handling
  let cpf: string | undefined = existing?.cpf;
  let cpfValid: boolean | undefined = existing?.cpf_valid;
  let cpfConflict = existing?.cpf_conflict || false;
  let cpfConflictDetail = existing?.cpf_conflict_detail;

  if (manualFields.has('cpf') && existing) {
    cpf = existing.cpf;
    cpfValid = existing.cpf_valid;
    origins.cpf = 'MANUAL';
  } else if (lead.cpf !== undefined && lead.cpf !== '') {
    cpf = lead.cpf;
    cpfValid = validateCPF(lead.cpf);
    origins.cpf = 'MANUAL';
  } else if (extracted.cpf) {
    cpf = extracted.cpf;
    cpfValid = extracted.cpf_valid;
    origins.cpf = extracted.field_origins.cpf || 'LOCAL';
  }

  if (extracted.cpf_conflict) {
    cpfConflict = true;
    cpfConflictDetail = extracted.cpf_conflict_detail;
  }

  // 5. Resolve Birth Date (always formatted DD/MM/AAAA)
  let birthDate: string | undefined = existing?.birth_date;
  if (manualFields.has('birth_date') && existing) {
    birthDate = existing.birth_date;
    origins.birth_date = 'MANUAL';
  } else if (lead.birth_date !== undefined && lead.birth_date !== '') {
    birthDate = lead.birth_date;
    origins.birth_date = 'MANUAL';
  } else if (extracted.birth_date) {
    birthDate = extracted.birth_date;
    origins.birth_date = extracted.field_origins.birth_date || 'LOCAL';
  }

  // 6. Resolve CNH ("SIM" | "NÃO")
  let cnh: string | undefined = existing?.cnh;
  if (manualFields.has('cnh') && existing) {
    cnh = existing.cnh;
    origins.cnh = 'MANUAL';
  } else if (lead.cnh !== undefined && lead.cnh !== '') {
    cnh = lead.cnh;
    origins.cnh = 'MANUAL';
  } else if (extracted.cnh) {
    cnh = extracted.cnh;
    origins.cnh = extracted.field_origins.cnh || 'LOCAL';
  }

  // Vendeu & Valor da Venda
  let vendeu = existing ? existing.vendeu : Boolean(lead.vendeu);
  if (manualFields.has('vendeu') && existing) {
    vendeu = existing.vendeu;
  } else if (lead.vendeu !== undefined) {
    vendeu = Boolean(lead.vendeu);
  } else if (finalStatus === 'APROVADO') {
    vendeu = true;
  }

  let valorVenda = existing ? (existing.valor_venda || 0) : (Number(lead.valor_venda) || 0);
  if (manualFields.has('valor_venda') && existing) {
    valorVenda = existing.valor_venda;
  } else if (lead.valor_venda !== undefined && Number(lead.valor_venda) > 0) {
    valorVenda = Number(lead.valor_venda);
  } else if (lead.value !== undefined && Number(lead.value) > 0) {
    valorVenda = Number(lead.value);
  }

  // Chatwoot conversation URL
  const config = getConfig();
  const convId = lead.conversation_id || existing?.conversation_id || 0;
  const chatwootUrl = lead.chatwoot_url || 
    existing?.chatwoot_url || 
    `${config.chatwoot_url}/app/accounts/${accountId}/conversations/${convId}`;

  const record: LeadRecord = {
    id,
    account_id: accountId,
    contact_id: contactId,
    conversation_id: convId,

    contact_name: (manualFields.has('contact_name') && existing) ? existing.contact_name : (lead.contact_name || existing?.contact_name || 'Lead sem nome'),
    contact_phone: (manualFields.has('contact_phone') && existing) ? existing.contact_phone : (lead.contact_phone || existing?.contact_phone || ''),
    contact_email: (manualFields.has('contact_email') && existing) ? existing.contact_email : (lead.contact_email || existing?.contact_email),
    contact_avatar: lead.contact_avatar || existing?.contact_avatar,

    entry_date: entryDate,
    last_interaction_at: lastInteraction,

    cpf,
    cpf_valid: cpfValid,
    birth_date: birthDate,
    cnh,

    status: finalStatus,
    vendedor: (manualFields.has('vendedor') && existing) ? existing.vendedor : (lead.vendedor || existing?.vendedor || ''),
    loja: (manualFields.has('loja') && existing) ? existing.loja : (lead.loja || existing?.loja || ''),
    vendeu,
    valor_venda: valorVenda,
    observacao: (manualFields.has('observacao') && existing) ? existing.observacao : (lead.observacao ?? existing?.observacao ?? ''),
    motivo_reprovacao: (manualFields.has('motivo_reprovacao') && existing) ? existing.motivo_reprovacao : (lead.motivo_reprovacao ?? existing?.motivo_reprovacao ?? ''),
    chatwoot_url: chatwootUrl,

    channel: lead.channel || existing?.channel || 'WhatsApp',
    channel_detail: lead.channel_detail || existing?.channel_detail || `${lead.channel || 'WhatsApp'} Direct`,
    inbox_id: lead.inbox_id ?? existing?.inbox_id,
    inbox_name: lead.inbox_name ?? existing?.inbox_name,
    tags: Array.from(new Set([...(lead.tags || []), ...(existing?.tags || [])])),
    last_message: lead.last_message || existing?.last_message,

    sdr_modified: isSdrModified || Boolean(lead.sdr_modified),
    manual_fields: Array.from(manualFields),
    field_origins: origins,
    cpf_conflict: cpfConflict,
    cpf_conflict_detail: cpfConflictDetail,
    recent_client_messages: updatedRecent,

    // Backward compatibility
    is_lead: true,
    is_converted: vendeu || finalStatus === 'APROVADO',
    value: valorVenda,
    conversion_date: vendeu ? (existing?.conversion_date || nowIso) : undefined,
    first_identified_at: existing?.first_identified_at || entryDate,
    has_confirmed_timestamp: true
  };

  db.leads[id] = record;
  if (saveNow) {
    saveDb(db);
  }

  return { lead: record, isNew: !existing };
}

/**
 * Updates a lead manually from the SDR UI (view/edit lead fields)
 * Records manual fields to prevent webhook overwrite.
 */
export function updateLeadManual(id: string, updates: Partial<LeadRecord>): LeadRecord | null {
  const db = getDb();
  const existing = db.leads[id];
  if (!existing) return null;

  const manualFields = new Set<string>(existing.manual_fields || []);
  const origins: FieldOriginsMap = { ...(existing.field_origins || {}) };

  Object.keys(updates).forEach(key => {
    if (key !== 'id' && key !== 'account_id' && key !== 'contact_id' && key !== 'entry_date') {
      manualFields.add(key);
      origins[key] = 'MANUAL';
    }
  });

  const cpf = updates.cpf !== undefined ? updates.cpf : existing.cpf;
  const cpfValid = cpf ? validateCPF(cpf) : (updates.cpf === '' ? undefined : existing.cpf_valid);

  // If SDR manually sets or updates CPF, resolve any pending conflict flag
  let cpfConflict = existing.cpf_conflict;
  let cpfConflictDetail = existing.cpf_conflict_detail;
  if (updates.cpf !== undefined) {
    cpfConflict = false;
    cpfConflictDetail = undefined;
    origins.cpf = 'MANUAL';
  }

  if (updates.birth_date !== undefined) origins.birth_date = 'MANUAL';
  if (updates.cnh !== undefined) origins.cnh = 'MANUAL';

  const status = updates.status ? normalizeLeadStatus(updates.status, updates.vendeu) : existing.status;
  const vendeu = updates.vendeu !== undefined ? Boolean(updates.vendeu) : (status === 'APROVADO' ? true : existing.vendeu);
  const valorVenda = updates.valor_venda !== undefined 
    ? Math.max(0, Number(updates.valor_venda) || 0) 
    : (updates.value !== undefined ? Math.max(0, Number(updates.value) || 0) : existing.valor_venda);

  const updatedRecord: LeadRecord = {
    ...existing,
    ...updates,
    id: existing.id,
    account_id: existing.account_id,
    contact_id: existing.contact_id,
    entry_date: existing.entry_date, // NEVER change original entry date
    status,
    cpf,
    cpf_valid: cpfValid,
    cpf_conflict: cpfConflict,
    cpf_conflict_detail: cpfConflictDetail,
    vendeu,
    valor_venda: valorVenda,
    value: valorVenda,
    is_converted: vendeu,
    conversion_date: vendeu ? (existing.conversion_date || new Date().toISOString()) : undefined,
    sdr_modified: true,
    manual_fields: Array.from(manualFields),
    field_origins: origins
  };

  db.leads[id] = updatedRecord;
  saveDb(db);
  return updatedRecord;
}

/**
 * Quick Action: Aprovar
 */
export function quickApproveLead(id: string, saleValue?: number): LeadRecord | null {
  const existing = getLeadById(id);
  if (!existing) return null;

  return updateLeadManual(id, {
    status: 'APROVADO',
    vendeu: true,
    valor_venda: saleValue !== undefined ? Math.max(0, Number(saleValue) || 0) : (existing.valor_venda || 0),
    motivo_reprovacao: '' // clear any previous rejection
  });
}

/**
 * Quick Action: Reprovar
 */
export function quickRejectLead(id: string, reason: string): LeadRecord | null {
  const existing = getLeadById(id);
  if (!existing) return null;

  return updateLeadManual(id, {
    status: 'REPROVADO',
    motivo_reprovacao: reason || 'Reprovado pelo SDR',
    vendeu: false
  });
}

/**
 * Quick Action: Em Análise
 */
export function quickInAnalysisLead(id: string): LeadRecord | null {
  const existing = getLeadById(id);
  if (!existing) return null;

  return updateLeadManual(id, {
    status: 'EM ANÁLISE'
  });
}

/**
 * Updates qualification data (CPF, birth date, CNH) and conflict status from local scanning
 */
export function updateLeadLocalData(
  id: string,
  data: {
    cpf?: string;
    cpf_valid?: boolean;
    cpf_conflict?: boolean;
    cpf_conflict_detail?: string;
    birth_date?: string;
    cnh?: string;
    origin_cpf?: FieldOrigin;
    origin_birth_date?: FieldOrigin;
    origin_cnh?: FieldOrigin;
    conversation_id?: number;
    chatwoot_url?: string;
  }
): LeadRecord | null {
  const db = getDb();
  const existing = db.leads[id];
  if (!existing) return null;

  const origins: FieldOriginsMap = { ...(existing.field_origins || {}) };
  if (data.origin_cpf) {
    origins.cpf = data.origin_cpf;
  }
  if (data.origin_birth_date) {
    origins.birth_date = data.origin_birth_date;
  }
  if (data.origin_cnh) {
    origins.cnh = data.origin_cnh;
  }

  const updatedRecord: LeadRecord = {
    ...existing,
    ...(data.cpf !== undefined ? { cpf: data.cpf } : {}),
    ...(data.cpf_valid !== undefined ? { cpf_valid: data.cpf_valid } : {}),
    ...(data.cpf_conflict !== undefined ? { cpf_conflict: data.cpf_conflict } : {}),
    ...(data.cpf_conflict_detail !== undefined ? { cpf_conflict_detail: data.cpf_conflict_detail } : {}),
    ...(data.birth_date !== undefined ? { birth_date: data.birth_date } : {}),
    ...(data.cnh !== undefined ? { cnh: data.cnh } : {}),
    ...(data.conversation_id !== undefined ? { conversation_id: data.conversation_id } : {}),
    ...(data.chatwoot_url !== undefined ? { chatwoot_url: data.chatwoot_url } : {}),
    field_origins: origins
  };

  db.leads[id] = updatedRecord;
  saveDb(db);
  return updatedRecord;
}

export const updateLeadLocalCpf = updateLeadLocalData;

/**
 * Backward compatibility helpers
 */
export function toggleLeadConversion(leadId: string): LeadRecord | null {
  const existing = getLeadById(leadId);
  if (!existing) return null;
  const willBeApproved = existing.status !== 'APROVADO';
  if (willBeApproved) {
    return quickApproveLead(leadId);
  } else {
    return updateLeadManual(leadId, {
      status: 'EM ANÁLISE',
      vendeu: false
    });
  }
}

export function updateLeadValue(leadId: string, value: number): LeadRecord | null {
  return updateLeadManual(leadId, {
    valor_venda: value,
    value: value
  });
}

export function bulkUpsertLeads(leads: LeadRecord[]): { added: number; updated: number; totalConverted: number } {
  let added = 0;
  let updated = 0;

  for (const l of leads) {
    const { isNew } = upsertLead(l, false);
    if (isNew) added++; else updated++;
  }

  const db = getDb();
  const totalConverted = Object.values(db.leads).filter(l => l.vendeu || l.status === 'APROVADO').length;
  db.config.last_sync_at = new Date().toISOString();
  db.config.last_sync_count = Object.keys(db.leads).length;
  db.config.last_sync_status = 'success';
  saveDb(db);

  return { added, updated, totalConverted };
}

export function deleteLead(leadId: string): boolean {
  const db = getDb();
  if (!db.leads[leadId]) {
    const foundKey = Object.keys(db.leads).find(k => k === leadId || db.leads[k].id === leadId);
    if (!foundKey) return false;
    delete db.leads[foundKey];
  } else {
    delete db.leads[leadId];
  }
  db.config.last_sync_count = Object.keys(db.leads).length;
  saveDb(db);
  return true;
}

export function clearDatabase(): void {
  const db = getDb();
  db.leads = {};
  db.processed_message_ids = [];
  db.config.last_sync_count = 0;
  db.config.last_sync_at = null;
  db.config.last_sync_status = 'idle';
  saveDb(db, false);
  saveLeadsToFirestore({}).catch(err => {
    console.warn('[Storage] Erro ao sincronizar limpeza de leads com Firestore:', err);
  });
}

export function cleanMockData(): { removedCount: number; remainingCount: number } {
  const db = getDb();
  const inboxes = getInboxes();
  const validInboxIds = new Set(inboxes.map(ib => ib.id));
  
  let removedCount = 0;
  const cleanedLeads: Record<string, LeadRecord> = {};

  for (const [key, lead] of Object.entries(db.leads)) {
    // Check if this lead is attached to an invalid/simulated inbox or is a mock demo lead
    const isSimulatedId = String(lead.conversation_id).startsWith('demo_') || 
                          String(lead.contact_id).startsWith('demo_') ||
                          lead.id.includes('demo') ||
                          lead.id.includes('simulado');
    const isInvalidInbox = lead.inbox_id === 101 && !validInboxIds.has(101);

    if (isSimulatedId || isInvalidInbox) {
      removedCount++;
    } else {
      cleanedLeads[key] = lead;
    }
  }

  db.leads = cleanedLeads;
  db.config.last_sync_count = Object.keys(cleanedLeads).length;
  saveDb(db);

  return {
    removedCount,
    remainingCount: Object.keys(cleanedLeads).length
  };
}

// ==========================================
// INVESTMENTS MANAGEMENT
// ==========================================
export function getAllInvestments(): InvestmentRecord[] {
  const db = getDb();
  const list = db.investments || [];
  return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getInvestmentById(id: string): InvestmentRecord | undefined {
  const db = getDb();
  return (db.investments || []).find(inv => inv.id === id);
}

export function addInvestment(data: {
  date: string;
  amount: number;
  channel?: string;
  notes?: string;
}): InvestmentRecord {
  const db = getDb();
  if (!db.investments) {
    db.investments = [];
  }

  const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record: InvestmentRecord = {
    id,
    date: data.date,
    amount: Math.max(0, Number(data.amount) || 0),
    channel: data.channel?.trim() || 'Geral',
    notes: data.notes?.trim() || '',
    created_at: new Date().toISOString()
  };

  db.investments.push(record);
  saveDb(db);
  return record;
}

export function updateInvestment(
  id: string,
  updates: Partial<{ date: string; amount: number; channel?: string; notes?: string }>
): InvestmentRecord | null {
  const db = getDb();
  if (!db.investments) return null;

  const index = db.investments.findIndex(inv => inv.id === id);
  if (index === -1) return null;

  const current = db.investments[index];
  const updated: InvestmentRecord = {
    ...current,
    date: updates.date !== undefined ? updates.date : current.date,
    amount: updates.amount !== undefined ? Math.max(0, Number(updates.amount) || 0) : current.amount,
    channel: updates.channel !== undefined ? updates.channel.trim() : current.channel,
    notes: updates.notes !== undefined ? updates.notes.trim() : current.notes
  };

  db.investments[index] = updated;
  saveDb(db);
  return updated;
}

export function deleteInvestment(id: string): boolean {
  const db = getDb();
  if (!db.investments) return false;

  const initialLen = db.investments.length;
  db.investments = db.investments.filter(inv => inv.id !== id);
  if (db.investments.length !== initialLen) {
    saveDb(db);
    return true;
  }
  return false;
}

// ==========================================
// PERSISTENT FIRESTORE RESTORE & BACKUP
// ==========================================
export async function initPersistentStorage(): Promise<void> {
  const db = getDb();
  try {
    const remote = await loadAppDataFromFirestore();
    if (remote) {
      if (remote.config && Object.keys(remote.config).length > 0) {
        db.config = {
          ...DEFAULT_CONFIG,
          ...db.config,
          ...remote.config,
          api_token: db.config.api_token || '', // respect cleared token
          connected: Boolean(db.config.api_token && (remote.config.connected ?? db.config.connected))
        };
      }
      if (remote.investments && Array.isArray(remote.investments) && remote.investments.length > 0) {
        db.investments = remote.investments;
      }
      if (remote.leads && typeof remote.leads === 'object' && Object.keys(remote.leads).length > 0) {
        db.leads = { ...remote.leads, ...db.leads };
      }
      saveDb(db, false);
      console.log(`[Storage] Armazenamento persistente inicializado: ${Object.keys(db.leads).length} leads, ${(db.investments || []).length} aportes.`);
    } else {
      await saveAllAppDataToFirestore(db);
      console.log('[Storage] Dados locais sincronizados com o Firestore.');
    }
  } catch (err: any) {
    console.warn('[Storage] Falha ao sincronizar dados persistentes do Firestore:', err.message);
  }
}

export interface BackupData {
  version: string;
  exported_at: string;
  system: string;
  config: ChatwootConfig;
  leads_count: number;
  leads: Record<string, LeadRecord>;
  investments_count: number;
  investments: InvestmentRecord[];
}

export function generateBackup(): BackupData {
  const db = getDb();
  return {
    version: '2.0',
    exported_at: new Date().toISOString(),
    system: 'ChatAnalytics 2.0',
    config: {
      ...db.config
    },
    leads_count: Object.keys(db.leads).length,
    leads: db.leads,
    investments_count: (db.investments || []).length,
    investments: db.investments || []
  };
}

export async function restoreBackup(backup: any): Promise<{
  success: boolean;
  message: string;
  leads_restored: number;
  investments_restored: number;
  config: ChatwootConfig;
}> {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Arquivo de backup inválido ou ilegível.');
  }

  const db = getDb();

  if (backup.config && typeof backup.config === 'object') {
    const rawCfg = backup.config;
    db.config = {
      ...DEFAULT_CONFIG,
      ...db.config,
      ...rawCfg,
      connected: Boolean(rawCfg.connected)
    };
  }

  let leadsCount = 0;
  if (backup.leads && typeof backup.leads === 'object') {
    db.leads = { ...db.leads, ...backup.leads };
    leadsCount = Object.keys(db.leads).length;
    db.config.last_sync_count = leadsCount;
  }

  let investmentsCount = 0;
  if (Array.isArray(backup.investments)) {
    db.investments = backup.investments;
    investmentsCount = db.investments.length;
  }

  saveDb(db, false);
  await saveAllAppDataToFirestore(db);

  return {
    success: true,
    message: `Backup restaurado com sucesso! ${leadsCount} leads e ${investmentsCount} lançamentos recuperados.`,
    leads_restored: leadsCount,
    investments_restored: investmentsCount,
    config: db.config
  };
}
