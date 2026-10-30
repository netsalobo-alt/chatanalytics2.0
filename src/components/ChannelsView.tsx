import React, { useState } from 'react';
import { 
  Radio, 
  TrendingUp, 
  MessageSquare, 
  DollarSign, 
  BarChart, 
  ArrowUpRight,
  Sparkles,
  Layers,
  Globe,
  Share2,
  Power,
  Edit2,
  Check,
  X,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Settings2,
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { AnalyticsSummary, ChannelPerformance, ChatwootConfig, ChatwootInbox } from '../types.ts';

interface ChannelsViewProps {
  summary: AnalyticsSummary | null;
  config: ChatwootConfig | null;
  onFilterByChannel: (channel: string) => void;
  onUpdateInbox?: (inboxId: number, updates: { enabled?: boolean; custom_name?: string }) => Promise<any>;
  onSyncInboxes?: () => Promise<any>;
  onCleanMockData?: () => Promise<any>;
}

export const ChannelsView: React.FC<ChannelsViewProps> = ({
  summary,
  config,
  onFilterByChannel,
  onUpdateInbox,
  onSyncInboxes,
  onCleanMockData
}) => {
  const [editingInboxId, setEditingInboxId] = useState<number | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [isUpdatingInbox, setIsUpdatingInbox] = useState<number | null>(null);
  const [isSyncingInboxes, setIsSyncingInboxes] = useState(false);
  const [isCleaningMock, setIsCleaningMock] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!summary) return null;

  const channels = summary.channel_distribution || [];
  const inboxes: ChatwootInbox[] = (config?.inboxes || []).map(ib => ({
    ...ib,
    enabled: ib.enabled !== false
  }));

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setStatusMessage({ type, message });
    setTimeout(() => {
      setStatusMessage(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Helper to determine the aesthetic channel type and badge
  const getChannelBadge = (ch: { channel_type?: string; channel?: string }) => {
    const rawType = (ch.channel_type || '').toLowerCase();
    const name = (ch.channel || '').toLowerCase();

    if (rawType.includes('whatsapp') || name.includes('whatsapp') || name.includes('zap') || name.includes('wpp')) {
      return {
        label: 'WhatsApp',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500'
      };
    }
    if (rawType.includes('instagram') || name.includes('instagram') || name.includes('ig')) {
      return {
        label: 'Instagram Direct',
        color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
        dot: 'bg-fuchsia-500'
      };
    }
    if (rawType.includes('facebook') || name.includes('facebook') || name.includes('fb')) {
      return {
        label: 'Facebook Leads',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500'
      };
    }
    if (rawType.includes('webchat') || rawType.includes('webwidget') || name.includes('site') || name.includes('web')) {
      return {
        label: 'Webchat / Site',
        color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        dot: 'bg-cyan-500'
      };
    }
    if (rawType.includes('api') || name.includes('api')) {
      return {
        label: 'API Oficial',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dot: 'bg-indigo-500'
      };
    }
    return {
      label: ch.channel_type || 'Canal Integrado',
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-500'
    };
  };

  const handleToggleInbox = async (inbox: ChatwootInbox) => {
    if (!onUpdateInbox) return;
    const nextState = !inbox.enabled;
    setIsUpdatingInbox(inbox.id);
    try {
      await onUpdateInbox(inbox.id, { enabled: nextState });
      showFeedback('success', `Caixa "${inbox.custom_name || inbox.name}" ${nextState ? 'LIGADA (Ativa no monitoramento)' : 'DESLIGADA (Leitura suspensa)'}.`);
    } catch (err: any) {
      showFeedback('error', `Falha ao alterar caixa: ${err.message}`);
    } finally {
      setIsUpdatingInbox(null);
    }
  };

  const handleStartRename = (inbox: ChatwootInbox) => {
    setEditingInboxId(inbox.id);
    setEditNameValue(inbox.custom_name || inbox.name || '');
  };

  const handleSaveRename = async (inboxId: number) => {
    if (!onUpdateInbox) return;
    setIsUpdatingInbox(inboxId);
    try {
      const trimmed = editNameValue.trim();
      await onUpdateInbox(inboxId, { custom_name: trimmed });
      setEditingInboxId(null);
      showFeedback('success', `Apelido interno salvo com sucesso: "${trimmed || 'Nome original restaurado'}".`);
    } catch (err: any) {
      showFeedback('error', `Falha ao salvar apelido: ${err.message}`);
    } finally {
      setIsUpdatingInbox(null);
    }
  };

  const handleSyncInboxesClick = async () => {
    if (!onSyncInboxes) return;
    setIsSyncingInboxes(true);
    try {
      const res = await onSyncInboxes();
      showFeedback('success', res?.message || 'Caixas de entrada sincronizadas diretamente do Chatwoot.');
    } catch (err: any) {
      showFeedback('error', `Falha ao sincronizar caixas: ${err.message}`);
    } finally {
      setIsSyncingInboxes(false);
    }
  };

  const handleCleanMockClick = async () => {
    if (!onCleanMockData) return;
    const confirmed = window.confirm('Deseja limpar todos os dados simulados e garantir somente a leitura real do Chatwoot?');
    if (!confirmed) return;

    setIsCleaningMock(true);
    try {
      const res = await onCleanMockData();
      showFeedback('success', res?.message || 'Dados simulados removidos com sucesso. Apenas leitura real ativa.');
    } catch (err: any) {
      showFeedback('error', `Falha ao limpar dados: ${err.message}`);
    } finally {
      setIsCleaningMock(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#002139] text-[#c1ef6d] flex items-center justify-center font-bold">
              <Radio className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-[#002139] font-['Plus_Jakarta_Sans',sans-serif]">
              Atribuição e Desempenho por Canal de Entrada
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 max-w-2xl">
            Mapeamento dinâmico e individualizado por cada Caixa de Entrada herdada do Chatwoot. Ligue ou desligue caixas de entrada e defina apelidos internos para cada canal.
          </p>
        </div>
        
        {/* Actions header buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onSyncInboxes && (
            <button
              onClick={handleSyncInboxesClick}
              disabled={isSyncingInboxes}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Re-consulta as caixas reais ativas na API do Chatwoot"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#1A94C5] ${isSyncingInboxes ? 'animate-spin' : ''}`} />
              <span>{isSyncingInboxes ? 'Consultando...' : 'Sincronizar Caixas'}</span>
            </button>
          )}

          {onCleanMockData && (
            <button
              onClick={handleCleanMockClick}
              disabled={isCleaningMock}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-50 text-rose-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              title="Remove registros de teste/simulados e assegura 100% de leitura real"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isCleaningMock ? 'Limpando...' : 'Limpar Dados Simulados'}</span>
            </button>
          )}

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Canais Detectados:</span>
            <span className="font-bold text-[#002139] text-sm tabular-nums">{channels.length}</span>
          </div>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2 font-semibold">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.message}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SEÇÃO 1: GERENCIAMENTO DE CAIXAS DE ENTRADA (LIGAR / DESLIGAR / RENOMEAR) */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#00375a] flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-[#1A94C5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#002139]">
                Gerenciamento de Caixas de Entrada (Leitura Real Chatwoot)
              </h3>
              <p className="text-xs text-slate-500">
                Ative ou desative a captura de leads por caixa e personalize o nome interno exibido no painel.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{inboxes.filter(ib => ib.enabled !== false).length} ligadas</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400">{inboxes.filter(ib => ib.enabled === false).length} desligadas</span>
          </div>
        </div>

        {inboxes.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 space-y-2">
            <Radio className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">
              Nenhuma caixa de entrada detectada no Chatwoot ainda.
            </p>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              Certifique-se de configurar a URL e o Token de API em <strong>Configurações</strong> e clique em "Sincronizar Caixas".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {inboxes.map(inbox => {
              const isEditing = editingInboxId === inbox.id;
              const isSaving = isUpdatingInbox === inbox.id;
              const badge = getChannelBadge({ channel_type: inbox.channel_type, channel: inbox.name });
              const isEnabled = inbox.enabled !== false;

              // Find current channel metric from distribution
              const matchedMetric = channels.find(ch => ch.inbox_id === inbox.id);

              return (
                <div 
                  key={inbox.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isEnabled 
                      ? 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300' 
                      : 'bg-slate-50/70 border-slate-200 opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: IDs, Type Badge and Switch */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isEnabled ? badge.dot : 'bg-slate-300'}`} />
                        <span className="text-[11px] font-mono font-bold text-slate-400">
                          #{inbox.id}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                        {inbox.phone_number && (
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[130px]">
                            {inbox.phone_number}
                          </span>
                        )}
                      </div>

                      {/* Toggle Liga / Desliga */}
                      <button
                        type="button"
                        onClick={() => handleToggleInbox(inbox)}
                        disabled={isSaving}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isEnabled
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                        title={isEnabled ? 'Clique para desligar esta caixa' : 'Clique para ligar esta caixa'}
                      >
                        <Power className={`w-3 h-3 ${isEnabled ? 'text-emerald-600' : 'text-slate-500'}`} />
                        <span>{isEnabled ? 'Ligada' : 'Desligada'}</span>
                      </button>
                    </div>

                    {/* Middle: Name & Internal Renaming */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Nome no Chatwoot: <strong className="text-slate-700 font-mono">{inbox.name}</strong>
                      </div>

                      {isEditing ? (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            value={editNameValue}
                            onChange={e => setEditNameValue(e.target.value)}
                            placeholder="Apelido interno (ex: WhatsApp Comercial)"
                            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1A94C5] focus:bg-white"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveRename(inbox.id);
                              if (e.key === 'Escape') setEditingInboxId(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(inbox.id)}
                            disabled={isSaving}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
                            title="Salvar Apelido Interno"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingInboxId(null)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-bold text-[#002139] truncate">
                              {inbox.custom_name ? inbox.custom_name : inbox.name}
                            </span>
                            {inbox.custom_name && (
                              <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded shrink-0">
                                Apelido Interno
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStartRename(inbox)}
                            className="text-xs font-semibold text-slate-500 hover:text-[#00375a] flex items-center gap-1 cursor-pointer shrink-0"
                            title="Renomear internamente esta caixa"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Renomear</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Stats Preview */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>Leads: <strong className="text-slate-800">{matchedMetric ? matchedMetric.leads_received : 0}</strong></span>
                      <span>Vendas: <strong className="text-emerald-700">{matchedMetric ? matchedMetric.leads_converted : 0}</strong></span>
                      <span>Conv.: <strong className="text-[#00375a]">{matchedMetric ? `${matchedMetric.conversion_rate}%` : '0%'}</strong></span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onFilterByChannel(inbox.custom_name || inbox.name)}
                      className="text-xs font-bold text-[#00375a] hover:underline cursor-pointer"
                    >
                      Filtrar Leads →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Channel Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {channels.map((ch, idx) => {
          const isTop = ch.channel === summary.top_converting_channel.name || ch.channel_detail === summary.top_converting_channel.name;
          const badge = getChannelBadge(ch);
          const uniqueKey = ch.inbox_id ? `inbox_${ch.inbox_id}` : `${ch.channel}_${idx}`;

          return (
            <div 
              key={uniqueKey} 
              className={`bg-white rounded-2xl p-5 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                isTop ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200/90'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${badge.dot}`} />
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                      {ch.inbox_id && (
                        <span className="text-[10px] font-mono text-slate-400">
                          #{ch.inbox_id}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[#002139] truncate" title={ch.channel}>
                      {ch.channel}
                    </h3>
                    {ch.original_name && ch.original_name !== ch.channel && (
                      <span className="text-[10px] text-slate-400 block truncate">
                        Origem: {ch.original_name}
                      </span>
                    )}
                  </div>

                  {isTop && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                      <Sparkles className="w-3 h-3" />
                      Maior Conversão
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Recebidos
                    </span>
                    <span className="text-xl font-extrabold text-[#002139] tabular-nums">
                      {ch.leads_received.toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                      Convertidos
                    </span>
                    <span className="text-xl font-extrabold text-emerald-800 tabular-nums">
                      {ch.leads_converted.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Progress bar of volume share */}
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Participação no Volume:</span>
                    <span className="font-bold text-[#00375a]">{ch.share_percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isTop ? 'bg-emerald-600' : 'bg-[#00375a]'}`} 
                      style={{ width: `${Math.min(100, ch.share_percentage)}%` }}
                    />
                  </div>
                </div>

                {/* Revenue stats if available */}
                {ch.total_revenue > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100/70 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Receita Total:</span>
                    <span className="font-bold text-slate-900">
                      R$ {ch.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Taxa de Conversão</span>
                  <span className="text-base font-bold text-[#002139]">{ch.conversion_rate}%</span>
                </div>
                <button
                  onClick={() => onFilterByChannel(ch.channel)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#00375a] bg-slate-100 hover:bg-[#00375a] hover:text-white transition-all cursor-pointer shadow-2xs"
                >
                  Filtrar Leads
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* Consolidated Channels Comparison Table */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#002139]">
              Matriz Comparativa Oficial dos Canais Chatwoot
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Contabilização exata de leads com etiqueta <span className="font-mono text-[#00375a] font-semibold">trafego_pago</span> e conversões com <span className="font-mono text-emerald-700 font-semibold">Ganhamos</span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 h-10">
                <th className="px-6">Canal / Caixa Chatwoot</th>
                <th className="px-6 text-right">Leads Recebidos</th>
                <th className="px-6 text-right">Leads Convertidos</th>
                <th className="px-6 text-right">Não Convertidos</th>
                <th className="px-6 text-right">Conversão (%)</th>
                <th className="px-6 text-right">Participação (%)</th>
                <th className="px-6 text-right">Receita Total</th>
                <th className="px-6 text-right">Ticket Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {channels.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    Nenhum canal com leads de tráfego pago registrado no momento.
                  </td>
                </tr>
              ) : (
                channels.map((ch, idx) => {
                  const badge = getChannelBadge(ch);
                  const uniqueKey = ch.inbox_id ? `table_inbox_${ch.inbox_id}` : `table_${ch.channel}_${idx}`;
                  return (
                    <tr key={uniqueKey} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${badge.dot}`} />
                          <div className="flex flex-col">
                            <span className="font-bold text-[#002139]">{ch.channel}</span>
                            <span className="text-[10px] text-slate-400">
                              {badge.label} {ch.inbox_id ? `· Inbox #${ch.inbox_id}` : ''} {ch.original_name && ch.original_name !== ch.channel ? `(${ch.original_name})` : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-800 tabular-nums">
                        {ch.leads_received.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-800 tabular-nums">
                        {ch.leads_converted.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 tabular-nums">
                        {ch.not_converted.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {ch.conversion_rate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-700 tabular-nums">
                        {ch.share_percentage}%
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 tabular-nums">
                        R$ {(ch.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-600 tabular-nums">
                        R$ {(ch.average_ticket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
