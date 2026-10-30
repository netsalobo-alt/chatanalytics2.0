import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { 
  getConfig, 
  getSanitizedConfig, 
  saveConfig, 
  getAllLeads, 
  getLeadById,
  upsertLead, 
  updateLeadManual,
  quickApproveLead,
  quickRejectLead,
  quickInAnalysisLead,
  deleteLead,
  toggleLeadConversion,
  updateLeadValue,
  clearDatabase,
  getAllInvestments,
  addInvestment,
  updateInvestment,
  deleteInvestment,
  getMasterStatus,
  setMasterUser,
  getInboxes,
  updateInboxSettings,
  mergeInboxesWithSavedSettings,
  cleanMockData,
  initPersistentStorage,
  generateBackup,
  restoreBackup,
  getWebhookLogs,
  clearWebhookLogs
} from './server/storage.ts';
import { validateCPF } from './server/cpf.ts';
import { 
  testChatwootConnection, 
  syncChatwootHistory, 
  handleChatwootWebhook,
  updateChatwootConversationLabels,
  forceSearchCpfForLead
} from './server/chatwoot.ts';
import { 
  computeAnalytics, 
  getDateRangeForPeriod 
} from './server/analytics.ts';
import type { AnalyticsFilter, PeriodFilter, LeadRecord } from './server/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10) || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS middleware for iframe preview & API requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Health check endpoints for Cloud Run TCP/HTTP probes and container monitors
app.get(['/healthz', '/api/health'], (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'chatwoot-analytics', timestamp: new Date().toISOString() });
});

// ==========================================
// API ROUTES
// ==========================================

// 1. Config & Connection
app.get('/api/config', (_req: Request, res: Response) => {
  const sanitized = getSanitizedConfig();
  const host = _req.get('host') || `localhost:${PORT}`;
  const protocol = _req.protocol === 'https' || _req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const webhookUrl = `${protocol}://${host}/api/chatwoot/webhook`;
  
  res.json({
    ...sanitized,
    webhook_url: webhookUrl
  });
});

// Master User status & lock
app.get('/api/auth/status', (_req: Request, res: Response) => {
  const status = getMasterStatus();
  res.json(status);
});

app.post('/api/auth/set-master', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'E-mail do administrador master obrigatório.' });
    return;
  }
  const result = setMasterUser(email);
  res.json(result);
});

app.post('/api/config', (req: Request, res: Response) => {
  const { chatwoot_url, account_id, api_token } = req.body;
  
  if (!chatwoot_url || !account_id) {
    res.status(400).json({ error: 'URL do Chatwoot e Account ID são obrigatórios.' });
    return;
  }

  const updates: any = {
    chatwoot_url: chatwoot_url.trim().replace(/\/+$/, ''),
    account_id: String(account_id).trim()
  };

  if (api_token && !api_token.includes('••••')) {
    updates.api_token = api_token.trim();
  }

  if (req.body.ad_spend !== undefined) {
    updates.ad_spend = Math.max(0, Number(req.body.ad_spend) || 0);
  }

  const updated = saveConfig(updates);
  res.json({
    success: true,
    message: 'Configurações salvas com sucesso.',
    config: getSanitizedConfig()
  });
});

app.post('/api/config/ad-spend', (req: Request, res: Response) => {
  const { ad_spend } = req.body;
  if (ad_spend === undefined || isNaN(Number(ad_spend))) {
    res.status(400).json({ error: 'Informe um valor válido para o investimento em tráfego.' });
    return;
  }

  const amount = Math.max(0, Number(ad_spend));
  saveConfig({ ad_spend: amount });

  res.json({
    success: true,
    message: `Investimento em tráfego atualizado para R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
    ad_spend: amount,
    config: getSanitizedConfig()
  });
});

// 1.1 Inboxes Management (Ligar/Desligar & Renomear internamente)
app.get('/api/inboxes', (_req: Request, res: Response) => {
  const inboxes = getInboxes();
  res.json({
    data: inboxes,
    total: inboxes.length,
    active_count: inboxes.filter(ib => ib.enabled !== false).length
  });
});

app.patch('/api/inboxes/:id', (req: Request, res: Response) => {
  const inboxId = Number(req.params.id);
  if (isNaN(inboxId)) {
    res.status(400).json({ error: 'ID da caixa de entrada inválido.' });
    return;
  }

  const { enabled, custom_name } = req.body;
  const updated = updateInboxSettings(inboxId, { enabled, custom_name });

  if (!updated) {
    res.status(404).json({ error: 'Caixa de entrada não encontrada.' });
    return;
  }

  res.json({
    success: true,
    message: `Caixa "${updated.custom_name || updated.name}" atualizada com sucesso (${updated.enabled ? 'Ligada' : 'Desligada'}).`,
    inbox: updated,
    inboxes: getInboxes()
  });
});

app.post('/api/inboxes/sync', async (_req: Request, res: Response) => {
  const config = getConfig();
  if (!config.api_token || !config.account_id || !config.chatwoot_url) {
    res.status(400).json({
      success: false,
      message: 'Configure as credenciais do Chatwoot para sincronizar caixas de entrada.'
    });
    return;
  }

  const result = await testChatwootConnection(config.chatwoot_url, config.account_id, config.api_token);
  if (result.success) {
    res.json({
      success: true,
      message: `${result.inboxes?.length || 0} caixas de entrada sincronizadas diretamente do Chatwoot.`,
      inboxes: result.inboxes || getInboxes()
    });
  } else {
    res.status(500).json({
      success: false,
      message: result.message
    });
  }
});

app.post('/api/clean-mock-data', (_req: Request, res: Response) => {
  const result = cleanMockData();
  res.json({
    success: true,
    message: result.removedCount > 0 
      ? `${result.removedCount} registros simulados removidos. Base agora conta com ${result.remainingCount} leads reais.`
      : `Base já está limpa e sincronizada com dados reais (${result.remainingCount} leads).`,
    ...result
  });
});

// 1.2 Investment Entries Management (Aportes por Data & Mês)
app.get('/api/investments', (_req: Request, res: Response) => {
  const investments = getAllInvestments();
  const totalAmount = investments.reduce((acc, inv) => acc + (inv.amount || 0), 0);
  res.json({
    data: investments,
    total_amount: totalAmount,
    count: investments.length
  });
});

app.post('/api/investments', (req: Request, res: Response) => {
  const { date, amount, channel, notes } = req.body;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Informe uma data válida no formato AAAA-MM-DD.' });
    return;
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount < 0) {
    res.status(400).json({ error: 'Informe um valor de investimento numérico válido.' });
    return;
  }

  const newEntry = addInvestment({
    date,
    amount: numAmount,
    channel: channel || 'Geral',
    notes: notes || ''
  });

  res.status(201).json({
    success: true,
    message: `Aporte de R$ ${numAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} registrado com sucesso.`,
    item: newEntry
  });
});

app.put('/api/investments/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, amount, channel, notes } = req.body;

  const updates: any = {};
  if (date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Data em formato inválido. Use AAAA-MM-DD.' });
      return;
    }
    updates.date = date;
  }

  if (amount !== undefined) {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      res.status(400).json({ error: 'Valor em formato inválido.' });
      return;
    }
    updates.amount = numAmount;
  }

  if (channel !== undefined) updates.channel = channel;
  if (notes !== undefined) updates.notes = notes;

  const updated = updateInvestment(id, updates);
  if (!updated) {
    res.status(404).json({ error: 'Lançamento de investimento não encontrado.' });
    return;
  }

  res.json({
    success: true,
    message: 'Lançamento de investimento atualizado com sucesso.',
    item: updated
  });
});

app.delete('/api/investments/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = deleteInvestment(id);
  if (!deleted) {
    res.status(404).json({ error: 'Lançamento não encontrado.' });
    return;
  }

  res.json({
    success: true,
    message: 'Lançamento de investimento removido com sucesso.'
  });
});

// ==========================================
// BACKUP EXPORT & RESTORE ENDPOINTS
// ==========================================
app.get('/api/backup/export', (_req: Request, res: Response) => {
  try {
    const backup = generateBackup();
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toISOString().slice(11, 16).replace(':', '');
    const filename = `chatanalytics-backup-${dateStr}-${timeStr}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: `Falha ao gerar arquivo de backup: ${err.message}` });
  }
});

app.post('/api/backup/import', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Conteúdo de backup inválido.' });
      return;
    }

    const result = await restoreBackup(payload);

    // If config has credentials, test/reconnect in background
    if (result.config.api_token && result.config.account_id && result.config.chatwoot_url) {
      testChatwootConnection(
        result.config.chatwoot_url,
        result.config.account_id,
        result.config.api_token
      ).then(testRes => {
        if (testRes.success) {
          saveConfig({
            connected: true,
            inboxes: testRes.inboxes || result.config.inboxes,
            last_error_message: undefined
          });
        }
      }).catch(e => console.warn('[Backup] Reconnection test error:', e));
    }

    res.json({
      success: true,
      message: result.message,
      leads_restored: result.leads_restored,
      investments_restored: result.investments_restored,
      config: getSanitizedConfig()
    });
  } catch (err: any) {
    res.status(500).json({ error: `Falha ao restaurar backup: ${err.message}` });
  }
});

app.post('/api/test-connection', async (req: Request, res: Response) => {
  const currentConfig = getConfig();
  const url = (req.body.chatwoot_url || currentConfig.chatwoot_url || '').trim();
  const accountId = String(req.body.account_id || currentConfig.account_id || '').trim();
  const token = (req.body.api_token && !req.body.api_token.includes('••••')) 
    ? req.body.api_token.trim() 
    : currentConfig.api_token;

  if (!url || !accountId || !token) {
    res.status(400).json({
      success: false,
      message: 'Preencha a URL, Account ID e o Token da API do Chatwoot para testar a conexão.'
    });
    return;
  }

  const result = await testChatwootConnection(url, accountId, token);
  
  if (result.success) {
    saveConfig({
      chatwoot_url: url,
      account_id: accountId,
      api_token: token,
      connected: true,
      inboxes: result.inboxes || currentConfig.inboxes,
      last_error_message: undefined
    });
  } else {
    saveConfig({
      connected: false,
      last_error_message: result.message
    });
  }

  res.json(result);
});

// 2. Manual & Continuous Sync
app.post('/api/sync', async (_req: Request, res: Response) => {
  const config = getConfig();
  
  if (!config.api_token || !config.account_id) {
    res.status(400).json({
      success: false,
      message: 'Chatwoot não conectado. Configure as credenciais da API em Configurações para realizar a leitura real.'
    });
    return;
  }

  saveConfig({ last_sync_status: 'syncing' });

  const syncResult = await syncChatwootHistory(
    config.chatwoot_url,
    config.account_id,
    config.api_token,
    config.inboxes
  );

  saveConfig({
    last_sync_at: new Date().toISOString(),
    last_sync_status: syncResult.success ? 'success' : 'error',
    last_error_message: syncResult.success ? undefined : syncResult.message
  });

  res.json(syncResult);
});

// Auto-Sync background scheduler
let autoSyncIntervalTimer: NodeJS.Timeout | null = null;
let isAutoSyncRunning = false;

async function executeAutoSync(triggerSource: string = 'background') {
  if (isAutoSyncRunning) {
    console.log(`[AutoSync] Sincronização anterior em andamento. Ignorando gatilho: ${triggerSource}`);
    return null;
  }

  const config = getConfig();
  if (!config.api_token || !config.account_id || !config.chatwoot_url) {
    return null;
  }

  isAutoSyncRunning = true;
  console.log(`[AutoSync] Iniciando sincronização automática com Chatwoot (${triggerSource})...`);
  
  try {
    const result = await syncChatwootHistory(
      config.chatwoot_url,
      config.account_id,
      config.api_token,
      config.inboxes
    );

    const nowIso = new Date().toISOString();
    saveConfig({
      last_sync_at: nowIso,
      last_auto_sync_at: nowIso,
      last_sync_status: result.success ? 'success' : 'error',
      last_error_message: result.success ? undefined : result.message,
      last_auto_sync_result: {
        paid_leads_found: result.paid_leads_found,
        ganhamos_found: result.ganhamos_found,
        conversions_updated: result.conversions_updated,
        message: result.message
      }
    });

    console.log(`[AutoSync] Concluído com sucesso: ${result.message}`);
    return result;
  } catch (err: any) {
    console.error(`[AutoSync] Falha no sincronismo:`, err);
    saveConfig({
      last_auto_sync_at: new Date().toISOString(),
      last_error_message: err.message
    });
    return null;
  } finally {
    isAutoSyncRunning = false;
  }
}

function initAutoSyncScheduler() {
  if (autoSyncIntervalTimer) {
    clearInterval(autoSyncIntervalTimer);
  }

  // Periodic check every 15 seconds so 1 min and 2 min intervals trigger promptly on time
  autoSyncIntervalTimer = setInterval(async () => {
    const config = getConfig();
    if (!config.auto_sync_enabled || !config.api_token || !config.account_id) {
      return;
    }

    const intervalMinutes = Math.max(1, config.auto_sync_interval_minutes || 10);
    const intervalMs = intervalMinutes * 60 * 1000;
    const lastSyncTime = config.last_auto_sync_at ? new Date(config.last_auto_sync_at).getTime() : 0;
    const timeSinceLast = Date.now() - lastSyncTime;

    if (timeSinceLast >= intervalMs) {
      console.log(`[AutoSyncScheduler] Intervalo de ${intervalMinutes} min atingido (${Math.round(timeSinceLast / 1000)}s decorridos). Sincronizando com Chatwoot...`);
      await executeAutoSync('interval_timer');
    }
  }, 15000);
}

// 2.1 Auto-Sync Configuration Route
app.post('/api/config/auto-sync', async (req: Request, res: Response) => {
  const { enabled, interval_minutes, trigger_now } = req.body;
  const updates: any = {};

  if (typeof enabled === 'boolean') {
    updates.auto_sync_enabled = enabled;
  }

  if (typeof interval_minutes === 'number' && interval_minutes > 0) {
    updates.auto_sync_interval_minutes = Math.max(1, Math.min(1440, interval_minutes));
  }

  if (Object.keys(updates).length > 0) {
    saveConfig(updates);
    initAutoSyncScheduler(); // Re-arm scheduler with new interval settings
  }

  let syncResult = null;
  if (trigger_now) {
    syncResult = await executeAutoSync('manual_trigger');
  }

  res.json({
    success: true,
    message: trigger_now 
      ? (syncResult?.message || 'Sincronismo disparado com sucesso.')
      : 'Configurações de sincronismo automático salvas.',
    config: getSanitizedConfig(),
    result: syncResult
  });
});

// 3. Chatwoot Inbound Webhook
app.post('/api/chatwoot/webhook', async (req: Request, res: Response) => {
  const config = getConfig();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip;
  try {
    const result = await handleChatwootWebhook(req.body, config.account_id, config.chatwoot_url, clientIp);
    res.json({ status: 'received', ...result });
  } catch (err: any) {
    console.error('[WebhookError]', err);
    res.status(500).json({ status: 'error', error: err?.message || 'Erro interno no processamento do webhook' });
  }
});

// 3.1 Webhook Execution Logs (Last 50 triggers)
app.get('/api/webhook/logs', (req: Request, res: Response) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
  const logs = getWebhookLogs(limit);
  const lastReceived = logs.length > 0 ? logs[0].received_at : undefined;
  res.json({
    data: logs,
    count: logs.length,
    last_received_at: lastReceived
  });
});

app.delete('/api/webhook/logs', (_req: Request, res: Response) => {
  clearWebhookLogs();
  res.json({ success: true, message: 'Logs de webhook limpos com sucesso.' });
});

// 3.2 Webhook Test Simulation (Disparo de teste para verificar se o sistema recebe)
app.post('/api/webhook/test', async (req: Request, res: Response) => {
  const config = getConfig();
  const sampleCpf = req.body.cpf || '529.982.247-25';
  const sampleName = req.body.contact_name || 'Lead Teste Webhook';
  const samplePhone = req.body.contact_phone || '+5591988887777';
  const sampleConvId = Math.floor(80000 + Math.random() * 19999);
  const sampleContactId = Math.floor(30000 + Math.random() * 19999);

  const inboxesList = getInboxes();
  const activeInbox = inboxesList.find(i => i.enabled !== false) || inboxesList[0];

  const testPayload = {
    event: 'message_created',
    id: Math.floor(900000 + Math.random() * 99999),
    content: `Olá, segue meu CPF para simulação: ${sampleCpf}`,
    message_type: 'incoming',
    created_at: new Date().toISOString(),
    account: {
      id: config.account_id || 1
    },
    conversation: {
      id: sampleConvId,
      inbox_id: activeInbox?.id || 1,
      status: 'open',
      channel: 'Channel::Whatsapp',
      contact: {
        id: sampleContactId,
        name: sampleName,
        phone_number: samplePhone
      }
    },
    sender: {
      id: sampleContactId,
      name: sampleName,
      phone_number: samplePhone,
      type: 'contact'
    }
  };

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const result = await handleChatwootWebhook(testPayload, config.account_id, config.chatwoot_url, `${clientIp} (Simulação Teste)`);

  res.json({
    success: true,
    message: `Disparo de teste simulado com sucesso! Lead "${sampleName}" registrado e CPF ${sampleCpf} extraído.`,
    result,
    test_payload: testPayload
  });
});

// 4. Analytics Summary & Indicators
app.get('/api/stats', (req: Request, res: Response) => {
  try {
    const allLeads = getAllLeads();
    const allInvestments = getAllInvestments();
    
    const filter: AnalyticsFilter = {
      period: (req.query.period as PeriodFilter) || 'this_month',
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      channel: req.query.channel as string,
      inboxId: req.query.inboxId ? Number(req.query.inboxId) : undefined,
      status: (req.query.status as any) || 'all',
      vendeu: (req.query.vendeu as any) || 'all',
      loja: req.query.loja as string,
      vendedor: req.query.vendedor as string,
      search: req.query.search as string
    };

    const config = getConfig();
    const summary = computeAnalytics(allLeads, filter, config.ad_spend || 0, allInvestments);
    res.json(summary);
  } catch (err: any) {
    console.error('Error in /api/stats:', err);
    res.status(500).json({ error: 'Falha ao processar estatísticas de análise.' });
  }
});

// 4.1 Leads Metadata (available stores & salespeople)
app.get('/api/leads/meta', (_req: Request, res: Response) => {
  const allLeads = getAllLeads();
  const lojasSet = new Set<string>();
  const vendedoresSet = new Set<string>();
  let withCpfCount = 0;

  allLeads.forEach(l => {
    if (l.loja && l.loja.trim()) lojasSet.add(l.loja.trim());
    if (l.vendedor && l.vendedor.trim()) vendedoresSet.add(l.vendedor.trim());
    if (l.cpf && l.cpf.trim()) withCpfCount++;
  });

  res.json({
    lojas: Array.from(lojasSet).sort(),
    vendedores: Array.from(vendedoresSet).sort(),
    total_leads: allLeads.length,
    leads_with_cpf: withCpfCount
  });
});

// 5. Leads Table, Search, Filters & Ordering (ChatAnalytics 2.0)
app.get('/api/leads', (req: Request, res: Response) => {
  try {
    const allLeads = getAllLeads();
    const period = (req.query.period as PeriodFilter) || 'all';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const channel = req.query.channel as string;
    const inboxId = req.query.inboxId ? Number(req.query.inboxId) : undefined;
    const status = req.query.status as string;
    const vendeu = req.query.vendeu as string;
    const loja = req.query.loja as string;
    const vendedor = req.query.vendedor as string;
    const search = req.query.search as string;
    const sort = (req.query.sort as string) || 'date_desc';
    const onlyWithCpf = req.query.has_cpf === 'true' || req.query.onlyWithCpf === 'true' || req.query.only_cpf === 'true';
    const searchCpfOnly = req.query.searchCpfOnly === 'true' || req.query.cpf_only === 'true';
    const cpfParam = (req.query.cpf as string || '').trim();

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));

    const activeRange = getDateRangeForPeriod(period, startDate, endDate);

    const inboxes = getInboxes();
    const disabledInboxIds = new Set(inboxes.filter(ib => ib.enabled === false).map(ib => ib.id));
    const inboxMap = new Map(inboxes.map(ib => [ib.id, ib]));

    // Filter leads
    let filtered = allLeads.filter(l => {
      // Exclude leads from disabled inboxes unless user explicitly requested a specific inboxId filter
      if (!inboxId && l.inbox_id && disabledInboxIds.has(l.inbox_id)) {
        return false;
      }

      if (period !== 'all') {
        const entryTime = new Date(l.entry_date).getTime();
        if (entryTime < activeRange.start.getTime() || entryTime > activeRange.end.getTime()) {
          return false;
        }
      }

      if (channel && channel !== 'all' && channel !== 'Todos') {
        const inboxObj = l.inbox_id ? inboxMap.get(l.inbox_id) : undefined;
        const customName = inboxObj?.custom_name;
        const match = 
          l.channel === channel || 
          l.channel_detail === channel || 
          l.inbox_name === channel ||
          customName === channel ||
          String(l.inbox_id) === channel;
        if (!match) return false;
      }

      if (inboxId && inboxId !== 0) {
        if (l.inbox_id !== inboxId) return false;
      }

      if (status && status !== 'all' && status !== 'Todos') {
        if (l.status !== status) return false;
      }

      if (vendeu && vendeu !== 'all') {
        const isSold = vendeu === 'sim' || vendeu === 'true';
        if (Boolean(l.vendeu) !== isSold) return false;
      }

      if (loja && loja !== 'all' && loja !== 'Todas') {
        if (l.loja !== loja) return false;
      }

      if (vendedor && vendedor !== 'all' && vendedor !== 'Todos') {
        if (l.vendedor !== vendedor) return false;
      }

      // Filter: only leads with captured CPF
      if (onlyWithCpf) {
        if (!l.cpf || !l.cpf.trim()) return false;
      }

      // Explicit CPF parameter match
      if (cpfParam) {
        const cleanCpfParam = cpfParam.replace(/\D/g, '');
        const leadDigits = (l.cpf || '').replace(/\D/g, '');
        if (cleanCpfParam.length > 0) {
          if (!leadDigits.includes(cleanCpfParam)) return false;
        } else if (!l.cpf?.toLowerCase().includes(cpfParam.toLowerCase())) {
          return false;
        }
      }

      // Search query handling
      if (search && search.trim().length > 0) {
        const q = search.toLowerCase().trim();
        const searchDigits = q.replace(/\D/g, '');

        if (searchCpfOnly) {
          // Dedicated CPF-only search mode: require CPF and match digits or formatted string
          if (!l.cpf || !l.cpf.trim()) return false;
          const leadDigits = l.cpf.replace(/\D/g, '');
          const matchDigits = searchDigits.length > 0 && leadDigits.includes(searchDigits);
          const matchFormatted = l.cpf.toLowerCase().includes(q);
          if (!matchDigits && !matchFormatted) return false;
        } else {
          // General search
          const leadCpfDigits = (l.cpf || '').replace(/\D/g, '');
          const matchCpfDigits = searchDigits.length >= 3 && leadCpfDigits.includes(searchDigits);
          const matchName = l.contact_name?.toLowerCase().includes(q);
          const matchEmail = l.contact_email?.toLowerCase().includes(q);
          const matchPhone = l.contact_phone?.toLowerCase().includes(q);
          const matchCpf = (l.cpf && l.cpf.toLowerCase().includes(q)) || matchCpfDigits;
          const matchVendedor = l.vendedor?.toLowerCase().includes(q);
          const matchLoja = l.loja?.toLowerCase().includes(q);
          const matchObs = l.observacao?.toLowerCase().includes(q);
          const matchReason = l.motivo_reprovacao?.toLowerCase().includes(q);
          const matchId = `cw-${l.conversation_id}`.toLowerCase().includes(q) || 
                          String(l.conversation_id).includes(q) || 
                          String(l.contact_id).includes(q);
          
          if (!matchName && !matchEmail && !matchPhone && !matchCpf && !matchVendedor && !matchLoja && !matchObs && !matchReason && !matchId) {
            return false;
          }
        }
      }

      return true;
    });

    // Ordering
    switch (sort) {
      case 'date_asc':
        filtered.sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime());
        break;
      case 'last_interaction_desc':
        filtered.sort((a, b) => new Date(b.last_interaction_at || b.entry_date).getTime() - new Date(a.last_interaction_at || a.entry_date).getTime());
        break;
      case 'last_interaction_asc':
        filtered.sort((a, b) => new Date(a.last_interaction_at || a.entry_date).getTime() - new Date(b.last_interaction_at || b.entry_date).getTime());
        break;
      case 'name_asc':
        filtered.sort((a, b) => (a.contact_name || '').localeCompare(b.contact_name || ''));
        break;
      case 'value_desc':
        filtered.sort((a, b) => (b.valor_venda || b.value || 0) - (a.valor_venda || a.value || 0));
        break;
      case 'date_desc':
      default:
        filtered.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
        break;
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    // Specific counts
    const novosCount = filtered.filter(l => l.status === 'NOVO LEAD').length;
    const emAnaliseCount = filtered.filter(l => l.status === 'EM ANÁLISE').length;
    const pendentesCount = filtered.filter(l => l.status === 'PENDENTE').length;
    const aprovadosCount = filtered.filter(l => l.status === 'APROVADO').length;
    const reprovadosCount = filtered.filter(l => l.status === 'REPROVADO').length;
    const soldCount = filtered.filter(l => Boolean(l.vendeu)).length;
    const withCpfCount = filtered.filter(l => Boolean(l.cpf && l.cpf.trim())).length;
    const totalAllWithCpf = allLeads.filter(l => Boolean(l.cpf && l.cpf.trim())).length;

    res.json({
      data: items,
      pagination: {
        total,
        page,
        limit,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      },
      metrics: {
        total,
        novos_leads: novosCount,
        em_analise: emAnaliseCount,
        pendentes: pendentesCount,
        aprovados: aprovadosCount,
        reprovados: reprovadosCount,
        vendas: soldCount,
        leads_with_cpf: withCpfCount,
        total_all_with_cpf: totalAllWithCpf,
        taxa_aprovacao: (aprovadosCount + reprovadosCount) > 0 ? Number(((aprovadosCount / (aprovadosCount + reprovadosCount)) * 100).toFixed(1)) : 0,
        taxa_conversao: total > 0 ? Number(((soldCount / total) * 100).toFixed(1)) : 0
      }
    });
  } catch (err: any) {
    console.error('Error in /api/leads:', err);
    res.status(500).json({ error: 'Falha ao buscar listagem de leads.', data: [], pagination: { total: 0, page: 1, limit: 10, total_pages: 1 } });
  }
});

// 5.1 Single Lead Details
app.get('/api/leads/:id', (req: Request, res: Response) => {
  const lead = getLeadById(req.params.id);
  if (!lead) {
    res.status(404).json({ error: 'Lead não encontrado.' });
    return;
  }
  res.json(lead);
});

// 5.2 Manual Lead Creation (SDR)
app.post('/api/leads', (req: Request, res: Response) => {
  const {
    nome,
    telefone,
    cpf,
    birth_date,
    nascimento,
    cnh,
    status,
    vendedor,
    loja,
    vendeu,
    valor_venda,
    observacao,
    motivo_reprovacao,
    channel,
    conversation_id
  } = req.body;

  const contactName = (nome || req.body.contact_name || '').trim();
  if (!contactName) {
    res.status(400).json({ error: 'Nome do lead é obrigatório.' });
    return;
  }

  const config = getConfig();
  const contactId = Math.floor(100000 + Math.random() * 900000);
  const convId = conversation_id || Math.floor(50000 + Math.random() * 40000);
  const now = new Date().toISOString();

  const effectiveCpf = (cpf || '').trim();
  const cpfValid = effectiveCpf ? validateCPF(effectiveCpf) : undefined;
  const initialStatus = status || 'NOVO LEAD';

  const newLead = {
    account_id: config.account_id || '1',
    contact_id: contactId,
    conversation_id: convId,
    contact_name: contactName,
    contact_phone: (telefone || req.body.contact_phone || '').trim(),
    contact_email: (req.body.email || req.body.contact_email || '').trim(),
    entry_date: now,
    last_interaction_at: now,
    cpf: effectiveCpf || undefined,
    cpf_valid: cpfValid,
    birth_date: birth_date || nascimento || undefined,
    cnh: cnh || undefined,
    status: initialStatus,
    vendedor: vendedor || undefined,
    loja: loja || undefined,
    vendeu: Boolean(vendeu),
    valor_venda: Math.max(0, Number(valor_venda) || 0),
    observacao: observacao || undefined,
    motivo_reprovacao: motivo_reprovacao || undefined,
    channel: channel || 'WhatsApp',
    channel_detail: req.body.channel_detail || (req.body.inbox_id ? getInboxes().find(ib => ib.id === Number(req.body.inbox_id))?.custom_name || getInboxes().find(ib => ib.id === Number(req.body.inbox_id))?.name : getInboxes().find(ib => ib.enabled !== false)?.custom_name || getInboxes().find(ib => ib.enabled !== false)?.name) || `${channel || 'WhatsApp'} Direct`,
    inbox_id: req.body.inbox_id ? Number(req.body.inbox_id) : (getInboxes().find(ib => ib.enabled !== false)?.id || undefined),
    inbox_name: (req.body.inbox_id ? getInboxes().find(ib => ib.id === Number(req.body.inbox_id))?.custom_name || getInboxes().find(ib => ib.id === Number(req.body.inbox_id))?.name : getInboxes().find(ib => ib.enabled !== false)?.custom_name || getInboxes().find(ib => ib.enabled !== false)?.name) || 'Inbound',
    tags: ['trafego_pago'],
    sdr_modified: true,
    manual_fields: ['contact_name', 'status', 'vendedor', 'loja', 'cpf', 'vendeu', 'valor_venda'],
    chatwoot_url: `${config.chatwoot_url}/app/accounts/${config.account_id || '1'}/conversations/${convId}`
  };

  const { lead } = upsertLead(newLead);
  res.status(201).json({ success: true, lead });
});

// 5.3 Edit Lead Fields (SDR Manual Edit)
app.put('/api/leads/:id', (req: Request, res: Response) => {
  const leadId = req.params.id;
  const updates = { ...req.body };

  // Map Brazilian field aliases
  if (updates.nome && !updates.contact_name) updates.contact_name = updates.nome;
  if (updates.telefone && !updates.contact_phone) updates.contact_phone = updates.telefone;
  if (updates.nascimento && !updates.birth_date) updates.birth_date = updates.nascimento;

  const updated = updateLeadManual(leadId, updates);
  if (!updated) {
    res.status(404).json({ error: 'Lead não encontrado.' });
    return;
  }

  res.json({ success: true, message: 'Dados do lead atualizados com sucesso.', lead: updated });
});

app.patch('/api/leads/:id', (req: Request, res: Response) => {
  const leadId = req.params.id;
  const updates = { ...req.body };

  if (updates.nome && !updates.contact_name) updates.contact_name = updates.nome;
  if (updates.telefone && !updates.contact_phone) updates.contact_phone = updates.telefone;
  if (updates.nascimento && !updates.birth_date) updates.birth_date = updates.nascimento;

  const updated = updateLeadManual(leadId, updates);
  if (!updated) {
    res.status(404).json({ error: 'Lead não encontrado.' });
    return;
  }

  res.json({ success: true, message: 'Dados do lead atualizados com sucesso.', lead: updated });
});

// 5.4 Quick Actions
// Quick Action: Aprovar
app.post('/api/leads/:id/approve', (req: Request, res: Response) => {
  const leadId = req.params.id;
  const saleValue = req.body.valor_venda !== undefined ? Number(req.body.valor_venda) : undefined;
  const updated = quickApproveLead(leadId, saleValue);

  if (!updated) {
    res.status(404).json({ error: 'Lead não encontrado.' });
    return;
  }

  // Update labels in Chatwoot if available
  const config = getConfig();
  if (config.api_token && config.account_id && config.chatwoot_url && updated.conversation_id) {
    updateChatwootConversationLabels(
      config.chatwoot_url,
      config.account_id,
      config.api_token,
      updated.conversation_id,
      ['trafego_pago', 'Ganhamos', 'Aprovado']
    ).catch(err => console.warn(`[SyncLabels] Falha ao atualizar etiquetas na conversa ${updated.conversation_id}:`, err));
  }

  res.json({ success: true, message: 'Lead APROVADO com sucesso!', lead: updated });
});

// Quick Action: Reprovar
app.post('/api/leads/:id/reject', (req: Request, res: Response) => {
  const leadId = req.params.id;
  const reason = (req.body.motivo_reprovacao || req.body.reason || 'Reprovado pelo SDR').trim();
  const updated = quickRejectLead(leadId, reason);

  if (!updated) {
    res.status(404).json({ error: 'Lead não encontrado.' });
    return;
  }

  const config = getConfig();
  if (config.api_token && config.account_id && config.chatwoot_url && updated.conversation_id) {
    updateChatwootConversationLabels(
      config.chatwoot_url,
      config.account_id,
      config.api_token,
      updated.conversation_id,
      ['trafego_pago', 'Reprovado']
    ).catch(err => console.warn(`[SyncLabels] Falha ao atualizar etiquetas na conversa ${updated.conversation_id}:`, err));
  }

  res.json({ success: true, message: 'Lead REPROVADO.', lead: updated });
});

// Quick Action: Em Análise
app.post('/api/leads/:id/in-analysis', (req: Request, res: Response) => {
  const leadId = req.params.id;
  const updated = quickInAnalysisLead(leadId);

  if (!updated) {
    res.status(404).json({ error: 'Lead não encontrado.' });
    return;
  }

  res.json({ success: true, message: 'Lead movido para EM ANÁLISE.', lead: updated });
});

// Quick Action: Forçar Busca de CPF (Ações Rápidas)
app.post('/api/leads/:id/force-search-cpf', async (req: Request, res: Response) => {
  const leadId = req.params.id;
  try {
    const result = await forceSearchCpfForLead(leadId);
    if (!result.success && !result.lead) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      found: false,
      message: `Erro ao buscar CPF nas mensagens: ${err.message}`
    });
  }
});

// Quick Action: Forçar Busca e Sincronização de Dados (CPF, Nascimento, CNH)
app.post('/api/leads/:id/force-sync-data', async (req: Request, res: Response) => {
  const leadId = req.params.id;
  try {
    const result = await forceSearchCpfForLead(leadId);
    if (!result.success && !result.lead) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      found: false,
      message: `Erro ao sincronizar dados nas mensagens: ${err.message}`
    });
  }
});

// 5.5 Delete Lead (Admin Only)
app.delete('/api/leads/:id', (req: Request, res: Response) => {
  const leadId = req.params.id;
  const userRole = (req.headers['x-user-role'] || req.body?.role || req.query?.role || '') as string;

  if (userRole !== 'admin') {
    res.status(403).json({ 
      error: 'Acesso negado: Somente usuários administradores têm permissão para excluir leads.' 
    });
    return;
  }

  const success = deleteLead(leadId);
  if (!success) {
    res.status(404).json({ error: 'Lead não encontrado ou já excluído.' });
    return;
  }

  res.json({ success: true, message: 'Lead excluído permanentemente com sucesso.' });
});

// 6. Backward Compatibility Lead Action Routes
app.post('/api/leads/:id/toggle-conversion', (req: Request, res: Response) => {
  const leadId = req.params.id;
  const updated = toggleLeadConversion(leadId);
  if (!updated) {
    res.status(404).json({ error: 'Lead não encontrado.' });
    return;
  }
  res.json({ success: true, lead: updated });
});

app.post('/api/leads/:id/value', (req: Request, res: Response) => {
  const leadId = req.params.id;
  const { value } = req.body;
  if (value === undefined || isNaN(Number(value))) {
    res.status(400).json({ error: 'Informe um valor numérico válido.' });
    return;
  }

  const numVal = Math.max(0, Number(value));
  const updated = updateLeadValue(leadId, numVal);
  if (!updated) {
    res.status(404).json({ error: 'Lead não encontrado.' });
    return;
  }

  res.json({
    success: true,
    message: `Valor da venda atualizado para R$ ${numVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
    lead: updated
  });
});

app.patch('/api/leads/:id/value', (req: Request, res: Response) => {
  const leadId = req.params.id;
  const { value } = req.body;
  if (value === undefined || isNaN(Number(value))) {
    res.status(400).json({ error: 'Informe um valor numérico válido.' });
    return;
  }

  const numVal = Math.max(0, Number(value));
  const updated = updateLeadValue(leadId, numVal);
  if (!updated) {
    res.status(404).json({ error: 'Lead não encontrado.' });
    return;
  }

  res.json({
    success: true,
    message: `Valor da venda atualizado para R$ ${numVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
    lead: updated
  });
});

app.post('/api/leads/manual', (req: Request, res: Response) => {
  const { id } = req.body;
  if (id) {
    const updated = updateLeadManual(id, req.body);
    if (updated) {
      res.json({ success: true, lead: updated });
      return;
    }
  }
  const config = getConfig();
  const contactId = Math.floor(100000 + Math.random() * 900000);
  const convId = req.body.conversation_id || Math.floor(50000 + Math.random() * 40000);
  const now = new Date().toISOString();
  const { lead } = upsertLead({
    ...req.body,
    account_id: config.account_id || '1',
    contact_id: contactId,
    conversation_id: convId,
    entry_date: now,
    last_interaction_at: now,
    status: req.body.status || 'NOVO LEAD'
  });
  res.json({ success: true, lead });
});

// 7. Demo Data Reset & Database Management
app.post('/api/seed-demo', (_req: Request, res: Response) => {
  res.json({ success: false, message: 'Dados simulados foram desativados. Conecte sua conta do Chatwoot para sincronização real.' });
});

app.post('/api/clear', (_req: Request, res: Response) => {
  clearDatabase();
  res.json({ success: true, message: 'Base de dados limpa com sucesso.' });
});

app.post('/api/leads/clear', (_req: Request, res: Response) => {
  clearDatabase();
  res.json({ success: true, message: 'Todos os leads foram removidos da base de dados com sucesso.' });
});

// 8. CSV Export
app.get('/api/export/csv', (req: Request, res: Response) => {
  const allLeads = getAllLeads();
  const paidLeads = allLeads.filter(l => l.is_lead);

  // Portuguese CSV Header
  const headers = [
    'ID Conversa',
    'Contato',
    'Telefone',
    'E-mail',
    'Canal de Origem',
    'Caixa de Entrada',
    'Data de Entrada',
    'Status Comercial',
    'Convertido (Ganhamos)',
    'Data da Conversão',
    'Valor da Venda (R$)',
    'Etiquetas',
    'Link Chatwoot'
  ];

  const rows = paidLeads.map(l => [
    `#CW-${l.conversation_id}`,
    `"${(l.contact_name || '').replace(/"/g, '""')}"`,
    `"${l.contact_phone || ''}"`,
    `"${l.contact_email || ''}"`,
    `"${l.channel_detail || l.channel}"`,
    `"${l.inbox_name || ''}"`,
    new Date(l.entry_date).toLocaleString('pt-BR', { timeZone: 'America/Belem' }),
    l.status || 'NOVO LEAD',
    (l.vendeu || l.is_converted) ? 'Sim' : 'Não',
    l.conversion_date ? new Date(l.conversion_date).toLocaleString('pt-BR', { timeZone: 'America/Belem' }) : '-',
    l.valor_venda ? l.valor_venda.toFixed(2).replace('.', ',') : (l.value ? l.value.toFixed(2).replace('.', ',') : '0,00'),
    `"${(l.tags || []).join(', ')}"`,
    l.chatwoot_url || ''
  ]);

  // UTF-8 BOM for Microsoft Excel compatibility
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="chatanalytics_leads_${Date.now()}.csv"`);
  res.send(csvContent);
});

// 8.1 Printable Executive Report (HTML for printing and PDF saving)
app.get('/api/export/printable-report', (req: Request, res: Response) => {
  const allLeads = getAllLeads();
  const allInvestments = getAllInvestments();
  const filter: AnalyticsFilter = {
    period: (req.query.period as PeriodFilter) || 'this_month',
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    channel: req.query.channel as string,
    inboxId: req.query.inboxId ? Number(req.query.inboxId) : undefined,
    status: (req.query.status as any) || 'all',
    search: req.query.search as string
  };

  const config = getConfig();
  const summary = computeAnalytics(allLeads, filter, config.ad_spend || 0, allInvestments);
  const nowStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Belem' });

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Executivo Oficial - ChatAnalytics</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #002139;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      border-bottom: 2px solid #002139;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .badge {
      display: inline-block;
      background: #002139;
      color: #c1ef6d;
      font-weight: 800;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    h1 {
      margin: 8px 0 4px 0;
      font-size: 22px;
      color: #002139;
    }
    .meta { color: #64748b; font-size: 12px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      background: #f8fafc;
    }
    .card-label {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
    }
    .card-value {
      font-size: 20px;
      font-weight: 800;
      color: #002139;
      margin-top: 4px;
    }
    .card-sub { font-size: 11px; color: #059669; font-weight: 600; margin-top: 2px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 12px;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      text-align: left;
      padding: 8px 12px;
      font-weight: 700;
      border-bottom: 1px solid #cbd5e1;
      text-transform: uppercase;
      font-size: 10px;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    .print-bar {
      background: #002139;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 8px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .print-btn {
      background: #c1ef6d;
      color: #002139;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }
    @media print {
      .print-bar { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div>
      <strong>Visualização de Impressão Oficial</strong>
      <div style="font-size: 11px; opacity: 0.85;">Para salvar em PDF, escolha "Salvar como PDF" no destino da impressora.</div>
    </div>
    <button class="print-btn" onclick="window.print()">Imprimir / Salvar em PDF</button>
  </div>

  <div class="header">
    <div>
      <span class="badge">ChatAnalytics • Documento Oficial</span>
      <h1>Relatório Executivo de Performance Comercial & Mídia</h1>
      <div class="meta">
        Filtro: <strong>${filter.period}</strong> • Emitido em: ${nowStr} (Horário Oficial de Belém - America/Belem)
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Leads (trafego_pago)</div>
      <div class="card-value">${summary.filtered_leads_total.toLocaleString('pt-BR')}</div>
      <div class="card-sub">Base filtrada</div>
    </div>
    <div class="card">
      <div class="card-label">Clientes Ganhos</div>
      <div class="card-value" style="color: #059669;">${summary.filtered_leads_converted.toLocaleString('pt-BR')}</div>
      <div class="card-sub">Taxa: ${summary.filtered_conversion_rate}%</div>
    </div>
    <div class="card">
      <div class="card-label">Investimento em Tráfego</div>
      <div class="card-value">R$ ${(summary.ad_spend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
      <div class="card-sub">CPL: R$ ${(summary.cost_per_lead || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="card">
      <div class="card-label">CAC (Custo de Aquisição)</div>
      <div class="card-value" style="color: #059669;">R$ ${(summary.cac || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
      <div class="card-sub">ROAS: ${summary.roas || 0}x</div>
    </div>
  </div>

  <h3 style="font-size: 13px; color: #002139; margin-bottom: 8px;">Consolidação Mensal: Investimento, Leads, CAC e Receita</h3>
  <table>
    <thead>
      <tr>
        <th>Mês</th>
        <th class="text-right">Investimento (R$)</th>
        <th class="text-right">Leads</th>
        <th class="text-right">Ganhos</th>
        <th class="text-right">Taxa Conv.</th>
        <th class="text-right">CPL</th>
        <th class="text-right">CAC</th>
        <th class="text-right">Receita (R$)</th>
        <th class="text-right">ROAS</th>
      </tr>
    </thead>
    <tbody>
      ${summary.monthly_performance.map(m => `
        <tr>
          <td class="font-bold">${m.month_label}</td>
          <td class="text-right">R$ ${m.ad_spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td class="text-right">${m.leads_count}</td>
          <td class="text-right font-bold" style="color: #059669;">${m.conversions_count}</td>
          <td class="text-right">${m.conversion_rate}%</td>
          <td class="text-right">R$ ${m.cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td class="text-right font-bold" style="color: #059669;">R$ ${m.cac.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td class="text-right">R$ ${m.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td class="text-right font-bold">${m.roas}x</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h3 style="font-size: 13px; color: #002139; margin-bottom: 8px;">Distribuição por Canais de Atendimento</h3>
  <table>
    <thead>
      <tr>
        <th>Canal</th>
        <th class="text-right">Leads Recebidos</th>
        <th class="text-right">Convertidos (Ganhamos)</th>
        <th class="text-right">Taxa Conversão</th>
        <th class="text-right">Participação</th>
      </tr>
    </thead>
    <tbody>
      ${summary.channel_distribution.map(ch => `
        <tr>
          <td class="font-bold">${ch.channel_detail || ch.channel}</td>
          <td class="text-right">${ch.leads_received.toLocaleString('pt-BR')}</td>
          <td class="text-right font-bold" style="color: #059669;">${ch.leads_converted.toLocaleString('pt-BR')}</td>
          <td class="text-right font-bold" style="color: #059669;">${ch.conversion_rate}%</td>
          <td class="text-right">${ch.share_percentage}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <span>ChatAnalytics • Plataforma Integrada de Performance</span>
    <span>Rastreamento Oficial Chatwoot V3 • tag trafego_pago</span>
  </div>

  <script>
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// ==========================================
// VITE DEV SERVER OR STATIC PRODUCTION
// ==========================================
async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDistIndex = fs.existsSync(path.resolve(distPath, 'index.html'));
  const isProduction = process.env.NODE_ENV === 'production' || hasDistIndex;

  if (isProduction && hasDistIndex) {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.resolve(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('ChatAnalytics server is running.');
      }
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('Vite dev middleware could not be loaded, running in API mode:', err);
    }
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`ChatAnalytics server running on http://0.0.0.0:${PORT}`);
    
    // Background initialization so server port opens immediately for TCP startup probes
    initPersistentStorage()
      .then(() => {
        console.log('[ServerBoot] Armazenamento inicializado com sucesso.');
      })
      .catch((e: any) => {
        console.warn('[ServerBoot] Falha ao carregar armazenamento persistente:', e.message);
      });

    try {
      initAutoSyncScheduler();
    } catch (e) {
      console.warn('Auto sync scheduler failed to initialize:', e);
    }
  });

  server.on('error', (err: any) => {
    console.error('Server listen error:', err);
  });
}

startServer();
