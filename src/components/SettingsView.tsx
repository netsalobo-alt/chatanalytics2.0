import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  Key, 
  Globe, 
  Hash, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  Database, 
  Trash2, 
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Radio,
  Clock,
  DollarSign,
  TrendingUp,
  Tag,
  CheckCircle2,
  Download,
  Upload,
  FileJson,
  ShieldCheck,
  HardDrive,
  Cloud,
  Activity,
  Code,
  Eye,
  Send,
  MessageSquare,
  Filter,
  CheckCheck,
  XCircle,
  Play
} from 'lucide-react';
import { ChatwootConfig, WebhookLogEntry } from '../types.ts';

interface SettingsViewProps {
  config: ChatwootConfig | null;
  onSaveConfig: (url: string, accountId: string, token: string) => Promise<{ success: boolean; message: string }>;
  onTestConnection: (url: string, accountId: string, token: string) => Promise<{ success: boolean; message: string; inboxes?: any[]; latency_ms?: number }>;
  onManualSync: () => Promise<void>;
  isSyncing: boolean;
  onClearDb: () => Promise<void>;
  onCleanMockData?: () => Promise<any>;
  onUpdateAutoSync: (enabled?: boolean, intervalMinutes?: number, triggerNow?: boolean) => Promise<any>;
  onUpdateAdSpend?: (amount: number) => Promise<void>;
  onBackupRestored?: (message: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onSaveConfig,
  onTestConnection,
  onManualSync,
  isSyncing,
  onClearDb,
  onCleanMockData,
  onUpdateAutoSync,
  onUpdateAdSpend,
  onBackupRestored
}) => {
  const [url, setUrl] = useState(config?.chatwoot_url || 'https://app.chatwoot.com');
  const [accountId, setAccountId] = useState(config?.account_id || '1');
  const [apiToken, setApiToken] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency_ms?: number; inboxes?: any[] } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Backup & Restore State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [backupFileName, setBackupFileName] = useState('');
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);
  const [backupErrorMessage, setBackupErrorMessage] = useState<string | null>(null);
  const [backupPreview, setBackupPreview] = useState<{
    exportedAt: string;
    version: string;
    chatwootUrl: string;
    accountId: string;
    hasToken: boolean;
    totalLeads: number;
    convertedLeads: number;
    totalInvestments: number;
    rawPayload: any;
  } | null>(null);

  // Auto-Sync local controls
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(config?.auto_sync_enabled ?? true);
  const [autoSyncInterval, setAutoSyncInterval] = useState(config?.auto_sync_interval_minutes ?? 10);
  const [isUpdatingAutoSync, setIsUpdatingAutoSync] = useState(false);

  // Traffic Investment (Ad Spend)
  const [adSpendInput, setAdSpendInput] = useState(config?.ad_spend ? String(config.ad_spend) : '0');
  const [isSavingAdSpend, setIsSavingAdSpend] = useState(false);
  const [adSpendMessage, setAdSpendMessage] = useState<string | null>(null);

  // Webhook Logs State (Last 50 triggers)
  const [webhookLogs, setWebhookLogs] = useState<WebhookLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'processed' | 'ignored' | 'cpf'>('all');
  const [selectedPayloadLog, setSelectedPayloadLog] = useState<WebhookLogEntry | null>(null);
  const [testWebhookSuccessMessage, setTestWebhookSuccessMessage] = useState<string | null>(null);
  const [testWebhookErrorMessage, setTestWebhookErrorMessage] = useState<string | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const fetchWebhookLogs = async () => {
    try {
      const res = await fetch('/api/webhook/logs?limit=50');
      if (res.ok) {
        const data = await res.json();
        setWebhookLogs(Array.isArray(data.data) ? data.data : []);
      }
    } catch (e) {
      console.warn('Erro ao carregar logs de webhook:', e);
    }
  };

  useEffect(() => {
    fetchWebhookLogs();
    const timer = setInterval(() => {
      fetchWebhookLogs();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    setTestWebhookSuccessMessage(null);
    setTestWebhookErrorMessage(null);
    try {
      const res = await fetch('/api/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: 'Lead Teste Webhook',
          cpf: '529.982.247-25'
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestWebhookSuccessMessage(data.message || 'Webhook de teste simulado com sucesso!');
        await fetchWebhookLogs();
        setTimeout(() => setTestWebhookSuccessMessage(null), 6000);
      } else {
        throw new Error(data.message || 'Falha ao testar webhook');
      }
    } catch (err: any) {
      setTestWebhookErrorMessage(err.message || 'Erro ao simular webhook');
      setTimeout(() => setTestWebhookErrorMessage(null), 6000);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleClearWebhookLogs = async () => {
    if (!confirm('Deseja realmente limpar todos os registros de webhook?')) return;
    try {
      const res = await fetch('/api/webhook/logs', { method: 'DELETE' });
      if (res.ok) {
        setWebhookLogs([]);
      }
    } catch (e: any) {
      alert(`Falha ao limpar logs: ${e.message}`);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection(url, accountId, apiToken);
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setActionMessage(null);
    try {
      const res = await onSaveConfig(url, accountId, apiToken);
      setActionMessage(res.message);
      setApiToken(''); // clear plain input after save
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAutoSync = async () => {
    const nextState = !autoSyncEnabled;
    setAutoSyncEnabled(nextState);
    setIsUpdatingAutoSync(true);
    try {
      await onUpdateAutoSync(nextState, autoSyncInterval, false);
    } finally {
      setIsUpdatingAutoSync(false);
    }
  };

  const handleChangeInterval = async (minutes: number) => {
    setAutoSyncInterval(minutes);
    setIsUpdatingAutoSync(true);
    try {
      await onUpdateAutoSync(autoSyncEnabled, minutes, false);
    } finally {
      setIsUpdatingAutoSync(false);
    }
  };

  const handleTriggerAutoSyncNow = async () => {
    setIsUpdatingAutoSync(true);
    try {
      await onUpdateAutoSync(autoSyncEnabled, autoSyncInterval, true);
    } finally {
      setIsUpdatingAutoSync(false);
    }
  };

  const handleCopyWebhook = () => {
    if (config?.webhook_url) {
      navigator.clipboard.writeText(config.webhook_url);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  const handleExportBackup = async () => {
    setIsExportingBackup(true);
    setBackupSuccessMessage(null);
    setBackupErrorMessage(null);
    try {
      const res = await fetch('/api/backup/export');
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Falha ao gerar arquivo de backup');
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const now = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      a.download = `chatanalytics-backup-${now}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setBackupSuccessMessage('Backup exportado com sucesso! Arquivo .json baixado para o seu computador.');
      setTimeout(() => setBackupSuccessMessage(null), 5000);
    } catch (err: any) {
      setBackupErrorMessage(err.message || 'Erro ao exportar backup');
      setTimeout(() => setBackupErrorMessage(null), 5000);
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupFileName(file.name);
    setBackupErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed || (!parsed.config && !parsed.leads)) {
          throw new Error('Arquivo de backup inválido: não contém estrutura reconhecida do ChatAnalytics.');
        }
        setBackupPreview({
          exportedAt: parsed.exported_at || parsed.created_at || 'Data não identificada',
          version: parsed.app_version || '1.0.0',
          chatwootUrl: parsed.config?.chatwoot_url || 'Não configurado',
          accountId: parsed.config?.account_id || 'Não informado',
          hasToken: !!parsed.config?.api_token,
          totalLeads: Array.isArray(parsed.leads) ? parsed.leads.length : 0,
          convertedLeads: Array.isArray(parsed.leads) ? parsed.leads.filter((l: any) => l.is_converted).length : 0,
          totalInvestments: Array.isArray(parsed.investments) ? parsed.investments.length : 0,
          rawPayload: parsed
        });
        setIsRestoreModalOpen(true);
      } catch (err: any) {
        setBackupErrorMessage(err.message || 'Erro ao processar arquivo JSON');
        setTimeout(() => setBackupErrorMessage(null), 6000);
      }
    };
    reader.onerror = () => {
      setBackupErrorMessage('Falha ao ler o arquivo selecionado.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!backupPreview?.rawPayload) return;
    setIsRestoringBackup(true);
    setBackupErrorMessage(null);
    try {
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup: backupPreview.rawPayload })
      });
      const json = await res.json();
      if (json.success) {
        setIsRestoreModalOpen(false);
        setBackupSuccessMessage(json.message || 'Backup restaurado e sincronizado com sucesso!');
        setTimeout(() => setBackupSuccessMessage(null), 6000);
        if (onBackupRestored) {
          onBackupRestored(json.message);
        }
        if (backupPreview.rawPayload.config?.chatwoot_url) {
          setUrl(backupPreview.rawPayload.config.chatwoot_url);
        }
        if (backupPreview.rawPayload.config?.account_id) {
          setAccountId(backupPreview.rawPayload.config.account_id);
        }
      } else {
        throw new Error(json.error || json.message || 'Falha ao restaurar backup');
      }
    } catch (err: any) {
      setBackupErrorMessage(err.message || 'Erro ao restaurar backup');
    } finally {
      setIsRestoringBackup(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl w-full mx-auto">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#00375a]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#002139] font-['Plus_Jakarta_Sans',sans-serif]">
              Configurações da Integração com Chatwoot
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Conecte sua instalação em nuvem ou auto-hospedada para extração automática de leads e conversões.
            </p>
          </div>
        </div>
      </div>

      {/* Main Connection Form */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-[#002139] flex items-center gap-2 border-b border-slate-100 pb-3">
          <Globe className="w-4 h-4 text-[#1A94C5]" />
          Credenciais da API do Chatwoot
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* URL */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              URL da Instalação do Chatwoot
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                required
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://app.chatwoot.com ou https://chatwoot.suaempresa.com.br"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1A94C5] focus:bg-white transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              URL raiz do seu servidor Chatwoot sem barra final.
            </p>
          </div>

          {/* Account ID */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              ID da Conta (account_id)
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                placeholder="Ex: 1"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1A94C5] focus:bg-white transition-all font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Encontrado na URL da sua conta: /app/accounts/<span className="font-bold">1</span>/conversations
            </p>
          </div>

          {/* API Access Token */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Token de Acesso à API
            </label>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                placeholder={config?.has_token ? "Token salvo no servidor (••••••••)" : "Cole seu User API Token"}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1A94C5] focus:bg-white transition-all font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Chatwoot &gt; Configurações do Perfil &gt; Token de Acesso da API.
            </p>
          </div>
        </div>

        {/* Action Buttons: Test Connection & Save */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || (!apiToken && !config?.has_token)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#1A94C5] ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testando Conexão...' : 'Testar Conexão com Chatwoot'}</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#00375a] hover:bg-[#002139] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <span>{isSaving ? 'Salvando...' : 'Salvar Configurações'}</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {actionMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {testResult && (
          <div className={`p-4 rounded-xl border text-xs flex flex-col gap-2 ${
            testResult.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center gap-2 font-bold">
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{testResult.message}</span>
              {testResult.latency_ms && (
                <span className="text-[10px] font-mono text-slate-500 font-normal ml-auto">
                  Latência: {testResult.latency_ms}ms
                </span>
              )}
            </div>

            {testResult.inboxes && testResult.inboxes.length > 0 && (
              <div className="mt-2 pt-2 border-t border-emerald-200/60">
                <span className="text-[11px] font-bold block mb-1">Caixas de Entrada Mapeadas:</span>
                <div className="flex flex-wrap gap-1.5">
                  {testResult.inboxes.map(ib => (
                    <span key={ib.id} className="px-2 py-0.5 rounded bg-white text-emerald-800 text-[11px] font-medium border border-emerald-200">
                      #{ib.id} {ib.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </form>

      {/* AUTOMATIC SYNCHRONIZATION SECTION */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#1A94C5] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#002139]">
                Sincronismo Automático com o Chatwoot
              </h3>
              <p className="text-[11px] text-slate-400">
                O servidor consulta periodicamente conversas com as etiquetas <span className="font-mono text-[#00375a] font-semibold">trafego_pago</span> e <span className="font-mono text-emerald-700 font-semibold">Ganhamos</span>.
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">
              {autoSyncEnabled ? 'Ativado' : 'Desativado'}
            </span>
            <button
              type="button"
              onClick={handleToggleAutoSync}
              disabled={isUpdatingAutoSync}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoSyncEnabled ? 'bg-[#00375a]' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Interval Selector & Quick Run */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Intervalo de Consulta Periódica
            </label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 5, 10, 15, 30, 60].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleChangeInterval(mins)}
                  disabled={!autoSyncEnabled || isUpdatingAutoSync}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    autoSyncInterval === mins
                      ? 'bg-[#00375a] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40'
                  }`}
                  title={mins === 1 ? 'Consulta em tempo real a cada 1 minuto' : `Consulta a cada ${mins} minutos`}
                >
                  {mins === 1 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${autoSyncInterval === 1 ? 'bg-[#c1ef6d] animate-pulse' : 'bg-emerald-500'}`} />
                  )}
                  <span>{mins} min</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex sm:justify-end items-center gap-2 pt-2 sm:pt-0">
            <button
              type="button"
              onClick={handleTriggerAutoSyncNow}
              disabled={isUpdatingAutoSync || isSyncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#002139] text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#1A94C5] ${isUpdatingAutoSync ? 'animate-spin' : ''}`} />
              <span>{isUpdatingAutoSync ? 'Consultando...' : 'Executar Sincronismo Automático Agora'}</span>
            </button>
          </div>
        </div>

        {/* Auto-Sync Status Card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between text-xs gap-2">
            <span className="text-slate-500 font-medium">Última Execução do Sincronismo Automático:</span>
            <span className="font-bold text-[#002139] font-mono">
              {config?.last_auto_sync_at 
                ? new Date(config.last_auto_sync_at).toLocaleString('pt-BR', { timeZone: 'America/Belem' })
                : 'Aguardando primeiro ciclo periódico'}
            </span>
          </div>

          {config?.last_auto_sync_result && (
            <div className="text-xs text-slate-600 pt-2 border-t border-slate-200/60 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{config.last_auto_sync_result.message}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 mt-1">
                <span>Leads Auditados: <strong>{config.last_auto_sync_result.paid_leads_found}</strong></span>
                <span>Conversões 'Ganhamos': <strong>{config.last_auto_sync_result.conversions_updated}</strong></span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* PAID TRAFFIC INVESTMENT (AD SPEND) SECTION */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#002139]">
              Investimento em Tráfego Pago & Cálculo de CAC / CPL
            </h3>
            <p className="text-[11px] text-slate-400">
              Informe o valor total investido em mídia para calcular o Custo por Lead (CPL) e o Custo de Aquisição de Clientes (CAC).
            </p>
          </div>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!onUpdateAdSpend) return;
          setIsSavingAdSpend(true);
          setAdSpendMessage(null);
          try {
            const parsed = Math.max(0, parseFloat(adSpendInput.replace(',', '.')) || 0);
            await onUpdateAdSpend(parsed);
            setAdSpendMessage(`Investimento em tráfego atualizado para R$ ${parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
          } finally {
            setIsSavingAdSpend(false);
          }
        }} className="space-y-3">
          <div className="space-y-1.5 max-w-sm">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Valor Investido em Tráfego (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={adSpendInput}
                onChange={e => setAdSpendInput(e.target.value)}
                placeholder="Ex: 5000.00"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1A94C5] focus:bg-white transition-all font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isSavingAdSpend}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00375a] hover:bg-[#002139] text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 text-[#c1ef6d]" />
              <span>{isSavingAdSpend ? 'Salvando...' : 'Salvar Investimento'}</span>
            </button>
            {adSpendMessage && (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {adSpendMessage}
              </span>
            )}
          </div>
        </form>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
          <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">Fórmulas Oficiais Aplicadas:</span>
          <p>• <strong>CPL (Custo por Lead):</strong> Investimento ÷ Total de Leads que entraram em contato com tag <span className="font-mono text-[#00375a]">trafego_pago</span>.</p>
          <p>• <strong>CAC (Custo de Aquisição de Clientes):</strong> Investimento ÷ Total de Vendas fechadas com tag <span className="font-mono text-emerald-700">Ganhamos</span>.</p>
        </div>
      </section>

      {/* REVENUE ATTRIBUTION CARD - "DE ONDE O SISTEMA CAPTURA A RECEITA?" */}
      <section className="bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 p-6 rounded-2xl border border-emerald-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-emerald-100 pb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#002139] flex items-center gap-2">
              De onde o ChatAnalytics captura a Receita das Vendas?
            </h3>
            <p className="text-xs text-slate-500">
              Entenda como os valores monetários são extraídos do Chatwoot sem nenhum dado fictício.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-700 space-y-3 leading-relaxed">
          <p>
            O Chatwoot não possui um carrinho de compras nativo. Por isso, o ChatAnalytics captura o valor da venda diretamente dos <strong>Atributos Personalizados (*Custom Attributes*)</strong> da conversa ou do contato no Chatwoot.
          </p>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs space-y-2">
            <span className="font-bold text-slate-800 block text-xs">
              Chaves reconhecidas automaticamente pelo ChatAnalytics:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div className="p-2 rounded bg-slate-50 border border-slate-200 text-center font-bold text-[#00375a]">
                valor
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200 text-center font-bold text-[#00375a]">
                deal_value
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200 text-center font-bold text-[#00375a]">
                receita
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200 text-center font-bold text-[#00375a]">
                valor_venda
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Também são aceitas: <span className="font-mono">value</span>, <span className="font-mono">amount</span> e <span className="font-mono">preco</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                Como configurar no seu Chatwoot:
              </span>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                <li>No Chatwoot, vá em <strong>Configurações &gt; Atributos Personalizados</strong>.</li>
                <li>Clique em <strong>Adicionar Atributo</strong>.</li>
                <li>Selecione Tipo: <strong>Conversa</strong>.</li>
                <li>Nome: <strong>Valor da Venda</strong> | Chave: <strong className="font-mono">valor</strong> ou <strong className="font-mono">deal_value</strong>.</li>
                <li>Tipo de dado: <strong>Número</strong> ou <strong>Moeda</strong>.</li>
              </ol>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                Regras de Integridade Financeira:
              </span>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                <li><strong>Sem dados inventados:</strong> Se a conversa convertida não tiver o atributo preenchido no Chatwoot, a receita é calculada estritamente como <strong>R$ 0,00</strong>.</li>
                <li><strong>Edição Manual no ChatAnalytics:</strong> Você pode clicar em qualquer lead na tabela e preencher ou ajustar o valor da venda a qualquer momento.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Manual Sync & Connection Status */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-[#002139] flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#1A94C5]" />
            Sincronização Manual & Base de Dados
          </h3>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
            config?.connected 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${config?.connected ? 'bg-emerald-600' : 'bg-amber-500'}`}></span>
            {config?.connected ? 'Conexão Ativa' : 'Desconectado'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-slate-400 block text-[11px]">Última Sincronização:</span>
            <span className="font-bold text-[#002139] text-sm mt-0.5 block">
              {config?.last_sync_at 
                ? new Date(config.last_sync_at).toLocaleString('pt-BR', { timeZone: 'America/Belem' })
                : 'Nenhuma sincronização executada'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-slate-400 block text-[11px]">Total de Leads no Banco:</span>
            <span className="font-bold text-[#002139] text-sm mt-0.5 block">
              {(config?.last_sync_count ?? 0).toLocaleString('pt-BR')} registros únicos
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500 max-w-md">
            Consulta imediata de todas as páginas da API do Chatwoot buscando conversas com <span className="font-mono text-[#00375a] font-bold">trafego_pago</span> e <span className="font-mono text-emerald-700 font-bold">Ganhamos</span>.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onManualSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00375a] hover:bg-[#002139] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#c1ef6d] ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Manualmente Agora'}</span>
            </button>
            {onCleanMockData && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Deseja realmente remover dados simulados/mock e garantir apenas leitura real do Chatwoot?')) {
                    await onCleanMockData();
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
                title="Remove conversas fictícias/simuladas e recarrega os dados reais das caixas configuradas"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                <span>Limpar Dados Simulados</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClearDb}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Dados</span>
            </button>
          </div>
        </div>
      </section>

      {/* Gerador de Backup & Migração de Dados */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-[#002139] flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#1A94C5]" />
              Gerador de Backup & Restauração de Dados
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Exporte ou restaure suas configurações completas, token da API, leads, conversões manuais e investimentos em tráfego.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-semibold w-fit">
            <Cloud className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>Persistência Ativa (Firestore)</span>
          </div>
        </div>

        {/* Informative banner about Cloud Run and persistence */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-800">
              Proteção contra perda de dados no Google Cloud Run:
            </p>
            <p>
              O ChatAnalytics agora sincroniza automaticamente todas as configurações e registros com o <strong>Google Cloud Firestore</strong>. Mesmo quando o container suspende ou é recriado após inatividade, seus dados são recarregados na inicialização.
            </p>
            <p className="text-slate-500">
              Utilize o botão de <strong>Exportar Backup</strong> para salvar uma cópia offline com todas as credenciais em formato <span className="font-mono font-semibold">.json</span> e restaurá-la com 1 clique sempre que necessário.
            </p>
          </div>
        </div>

        {/* Action feedback notifications */}
        {backupSuccessMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{backupSuccessMessage}</span>
          </div>
        )}
        {backupErrorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{backupErrorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Export Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <FileJson className="w-4 h-4 text-[#00375a]" />
                <span>Exportar Backup Completo</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Gera um arquivo <span className="font-mono font-semibold text-slate-700">.json</span> com a URL do Chatwoot, Token de API, canais, lista completa de leads e histórico de investimentos.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={isExportingBackup}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00375a] hover:bg-[#002139] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 text-[#c1ef6d] ${isExportingBackup ? 'animate-bounce' : ''}`} />
              <span>{isExportingBackup ? 'Gerando Backup...' : 'Baixar Arquivo de Backup (.json)'}</span>
            </button>
          </div>

          {/* Import Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <Upload className="w-4 h-4 text-[#1A94C5]" />
                <span>Restaurar / Importar Backup</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Selecione um arquivo de backup previamente exportado para recuperar todas as integrações e banco de dados instantaneamente.
              </p>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRestoringBackup}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5 text-[#1A94C5]" />
                <span>Selecionar Arquivo para Restaurar</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Webhook Configuration for Continuous Real-Time Updates */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#1A94C5] flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#002139]">
                Webhook para Leitura de Conversas & Extração de CPF em Tempo Real
              </h3>
              <p className="text-[11px] text-slate-400">
                Receba eventos instantâneos do Chatwoot no exato segundo em que o cliente enviar mensagem ou CPF.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
              webhookLogs.length > 0 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-slate-100 text-slate-600'
            }`}>
              <span className={`w-2 h-2 rounded-full ${webhookLogs.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{webhookLogs.length > 0 ? `${webhookLogs.length} acionamentos salvos` : 'Aguardando primeiro acionamento'}</span>
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Cadastre o endereço abaixo no seu Chatwoot. Assim que um cliente enviar o CPF, data de nascimento ou CNH, o ChatAnalytics processa e atualiza a ficha do lead automaticamente.
        </p>

        {/* Webhook URL Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            URL do Webhook do ChatAnalytics (Copie e cole no Chatwoot)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={config?.webhook_url || 'https://seu-dominio.run.app/api/chatwoot/webhook'}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 select-all"
            />
            <button
              type="button"
              onClick={handleCopyWebhook}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer shadow-2xs shrink-0"
            >
              {copiedWebhook ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copiedWebhook ? 'Copiado!' : 'Copiar URL'}</span>
            </button>
          </div>
        </div>

        {/* How to configure in Chatwoot */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs text-slate-700 space-y-2">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#1A94C5]" />
            Como configurar no Chatwoot para leitura em tempo real:
          </span>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
            <li>No painel do Chatwoot, vá em <strong>Configurações &gt; Integrações &gt; Webhooks</strong>.</li>
            <li>Clique em <strong>Adicionar novo webhook</strong> e cole a URL acima no campo <em>URL do Webhook</em>.</li>
            <li>
              Marque os eventos obrigatórios:
              <span className="ml-1 font-semibold text-[#00375a]">Message Created</span> (essencial para ler mensagens e CPF),
              <span className="ml-1 font-semibold text-[#00375a]">Conversation Created</span> e 
              <span className="ml-1 font-semibold text-[#00375a]">Conversation Updated</span>.
            </li>
            <li>Clique em <strong>Criar Webhook</strong> para salvar.</li>
          </ol>
        </div>

        {/* Real-Time Webhook Logs & Diagnostic Monitor (Last 50 triggers) */}
        <div className="mt-6 pt-5 border-t border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-[#002139]">
                  Log de Registros do Webhook (Últimos 50 Acionamentos)
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Verifique aqui em tempo real se o Chatwoot está enviando os disparos e se o CPF está sendo identificado.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={isTestingWebhook}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                title="Simula um acionamento de webhook recebido com CPF de teste para verificar se o sistema está pronto"
              >
                <Play className={`w-3.5 h-3.5 text-[#c1ef6d] ${isTestingWebhook ? 'animate-spin' : ''}`} />
                <span>{isTestingWebhook ? 'Simulando...' : 'Testar Recebimento (Simular)'}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setIsLoadingLogs(true);
                  await fetchWebhookLogs();
                  setIsLoadingLogs(false);
                }}
                disabled={isLoadingLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="Atualizar lista de acionamentos agora"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#1A94C5] ${isLoadingLogs ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>

              {webhookLogs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearWebhookLogs}
                  className="p-1.5 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors cursor-pointer"
                  title="Limpar histórico de logs de webhook"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Test Action Notifications */}
          {testWebhookSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{testWebhookSuccessMessage}</span>
            </div>
          )}
          {testWebhookErrorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-900 border border-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{testWebhookErrorMessage}</span>
            </div>
          )}

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setLogFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                logFilter === 'all'
                  ? 'bg-[#00375a] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({webhookLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setLogFilter('processed')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                logFilter === 'processed'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Processados ({webhookLogs.filter(l => l.status === 'processed').length})
            </button>
            <button
              type="button"
              onClick={() => setLogFilter('cpf')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                logFilter === 'cpf'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Com CPF Detectado ({webhookLogs.filter(l => Boolean(l.cpf_detected)).length})
            </button>
            <button
              type="button"
              onClick={() => setLogFilter('ignored')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                logFilter === 'ignored'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ignorados ({webhookLogs.filter(l => l.status === 'ignored').length})
            </button>
          </div>

          {/* Log Table / List */}
          {webhookLogs.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
              <Activity className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">
                Nenhum disparo de webhook recebido ainda.
              </p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                Assim que você enviar uma mensagem no Chatwoot ou clicar no botão <strong>"Testar Recebimento (Simular)"</strong>, os registros detalhados com data, conversa e CPF aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
                {webhookLogs
                  .filter(item => {
                    if (logFilter === 'processed') return item.status === 'processed';
                    if (logFilter === 'ignored') return item.status === 'ignored';
                    if (logFilter === 'cpf') return Boolean(item.cpf_detected);
                    return true;
                  })
                  .slice(0, 50)
                  .map((log) => {
                    const timeFormatted = new Date(log.received_at).toLocaleTimeString('pt-BR', {
                      timeZone: 'America/Belem',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    });
                    const dateFormatted = new Date(log.received_at).toLocaleDateString('pt-BR', {
                      timeZone: 'America/Belem',
                      day: '2-digit',
                      month: '2-digit'
                    });

                    return (
                      <div key={log.id} className="p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Timestamp */}
                            <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {dateFormatted} {timeFormatted}
                            </span>

                            {/* Status badge */}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                              log.status === 'processed' 
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                                : (log.status === 'ignored' 
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                    : 'bg-rose-100 text-rose-900 border border-rose-300')
                            }`}>
                              {log.status === 'processed' && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                              {log.status === 'ignored' && <AlertCircle className="w-3 h-3 text-amber-700" />}
                              {log.status === 'error' && <XCircle className="w-3 h-3 text-rose-700" />}
                              <span>{log.status === 'processed' ? 'Processado' : (log.status === 'ignored' ? 'Ignorado' : 'Erro')}</span>
                            </span>

                            {/* Event badge */}
                            <span className="font-mono text-[10px] font-semibold text-[#00375a] bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                              {log.event}
                            </span>

                            {/* CPF Highlight Badge */}
                            {log.cpf_detected && (
                              <span className="font-mono text-[11px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded shadow-2xs flex items-center gap-1">
                                <CheckCheck className="w-3 h-3 text-[#c1ef6d]" />
                                CPF: {log.cpf_detected}
                              </span>
                            )}

                            {/* Conversation / Contact ID */}
                            {log.conversation_id && (
                              <span className="text-[11px] text-slate-500 font-medium">
                                Conversa: <strong className="text-[#002139]">#{log.conversation_id}</strong>
                              </span>
                            )}
                            {log.contact_name && (
                              <span className="text-[11px] text-slate-600 truncate max-w-[160px]">
                                • {log.contact_name}
                              </span>
                            )}
                          </div>

                          {/* Action summary */}
                          <div className="text-[11px] font-medium text-slate-800">
                            {log.action_summary}
                          </div>

                          {/* Message Preview */}
                          {log.content_preview && (
                            <div className="text-[11px] text-slate-500 italic bg-white p-1.5 rounded border border-slate-200/60 max-w-xl truncate">
                              "{log.content_preview}"
                            </div>
                          )}
                        </div>

                        {/* Action buttons: Payload inspector */}
                        <div className="flex items-center gap-1.5 shrink-0 sm:self-center">
                          {log.raw_payload && (
                            <button
                              type="button"
                              onClick={() => setSelectedPayloadLog(log)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Ver payload JSON bruto recebido do Chatwoot"
                            >
                              <Code className="w-3.5 h-3.5 text-[#1A94C5]" />
                              <span>Ver JSON</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Rules Constitution Card */}
      <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
        <h3 className="text-sm font-bold text-[#002139] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-700" />
          Regras de Negócio e Consistência Implementadas
        </h3>
        <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
          <li><strong>Lead de Tráfego Pago:</strong> Controlado exclusivamente pela etiqueta <span className="font-mono font-bold text-[#00375a]">trafego_pago</span>.</li>
          <li><strong>Conversão em Venda:</strong> Controlado pela combinação de <span className="font-mono font-bold text-[#00375a]">trafego_pago</span> + <span className="font-mono font-bold text-emerald-700">Ganhamos</span>.</li>
          <li><strong>Chave Única Idempotente:</strong> <span className="font-mono font-bold">account_id + conversation_id</span> garante contagem única mesmo com novas mensagens ou sincronizações repetidas.</li>
          <li><strong>Fuso Horário Estrito:</strong> Todos os períodos são calculados em <span className="font-mono font-bold text-slate-800">America/Belem</span> (UTC-3), com a semana de Segunda a Domingo.</li>
          <li><strong>Receita Real:</strong> Obtida de atributos personalizados (<span className="font-mono">valor</span>, <span className="font-mono">deal_value</span>) ou informada pelo usuário, sem dados inventados.</li>
        </ul>
      </section>

      {/* Modal de Confirmação de Restauração */}
      {isRestoreModalOpen && backupPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1A94C5] flex items-center justify-center font-bold">
                  <FileJson className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#002139]">Confirmar Restauração de Backup</h4>
                  <p className="text-xs text-slate-500 truncate max-w-[280px]">{backupFileName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                O arquivo de backup foi validado. Confira os dados que serão restaurados no sistema:
              </p>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Data do Backup:</span>
                  <span className="font-semibold text-slate-800">
                    {backupPreview.exportedAt !== 'Data não identificada' 
                      ? new Date(backupPreview.exportedAt).toLocaleString('pt-BR') 
                      : 'Data não informada'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Servidor Chatwoot:</span>
                  <span className="font-mono font-semibold text-slate-800 truncate max-w-[220px]">{backupPreview.chatwootUrl}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Account ID:</span>
                  <span className="font-mono font-semibold text-slate-800">{backupPreview.accountId}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Token de API:</span>
                  <span className="font-semibold text-emerald-700">
                    {backupPreview.hasToken ? '✓ Incluso e configurado' : 'Não incluso'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Total de Leads:</span>
                  <span className="font-semibold text-slate-800">
                    {backupPreview.totalLeads} ({backupPreview.convertedLeads} convertidos)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Histórico de Investimentos:</span>
                  <span className="font-semibold text-slate-800">{backupPreview.totalInvestments} registros</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] leading-relaxed">
                <strong>Atenção:</strong> A restauração irá atualizar a memória local e sincronizará imediatamente estes dados com o Cloud Firestore. O token de API será reconectado automaticamente ao Chatwoot.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                disabled={isRestoringBackup}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoringBackup}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00375a] hover:bg-[#002139] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
              >
                {isRestoringBackup && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isRestoringBackup ? 'Restaurando...' : 'Confirmar e Restaurar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Inspeção do Payload do Webhook (JSON Bruto) */}
      {selectedPayloadLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#1A94C5] flex items-center justify-center font-bold">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#002139]">
                    Payload do Webhook #{selectedPayloadLog.id.slice(0, 10)}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Evento: <strong className="font-mono text-[#00375a]">{selectedPayloadLog.event}</strong> • {new Date(selectedPayloadLog.received_at).toLocaleString('pt-BR', { timeZone: 'America/Belem' })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayloadLog(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
                <span className={`font-bold ${selectedPayloadLog.status === 'processed' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {selectedPayloadLog.status.toUpperCase()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Conversa</span>
                <span className="font-mono font-bold text-[#002139]">
                  {selectedPayloadLog.conversation_id ? `#${selectedPayloadLog.conversation_id}` : 'N/A'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Tipo Msg</span>
                <span className="font-mono font-bold text-slate-700">
                  {selectedPayloadLog.message_type || 'N/A'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">CPF Detectado</span>
                <span className="font-mono font-bold text-emerald-700">
                  {selectedPayloadLog.cpf_detected || 'Nenhum'}
                </span>
              </div>
            </div>

            {/* JSON Code Viewer */}
            <div className="flex-1 min-h-[220px] max-h-[380px] overflow-auto bg-[#001726] rounded-xl p-4 border border-slate-800 text-xs font-mono text-emerald-400">
              <pre className="whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(selectedPayloadLog.raw_payload || selectedPayloadLog, null, 2)}
              </pre>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedPayloadLog.raw_payload || selectedPayloadLog, null, 2));
                  setCopiedPayload(true);
                  setTimeout(() => setCopiedPayload(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedPayload ? 'JSON Copiado!' : 'Copiar JSON Completo'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPayloadLog(null)}
                className="px-4 py-2 rounded-xl bg-[#00375a] hover:bg-[#002139] text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
