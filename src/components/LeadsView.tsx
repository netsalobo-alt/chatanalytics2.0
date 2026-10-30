import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  Search, 
  ExternalLink, 
  MessageSquare, 
  Eye, 
  Edit3, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  RotateCcw,
  Plus,
  DollarSign,
  Building,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpDown,
  CreditCard,
  ShieldCheck,
  Calendar,
  Sparkles,
  X,
  Loader2,
  Trash2
} from 'lucide-react';
import { LeadRecord, LeadStatus, AnalyticsSummary, AppUser } from '../types.ts';
import { formatCPF } from '../lib/cpf.ts';
import { Tooltip } from './Tooltip.tsx';

interface LeadsViewProps {
  leads: LeadRecord[];
  summary: AnalyticsSummary | null;
  currentUser?: AppUser | null;
  totalLeads: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedChannel: string;
  onChannelChange: (channel: string) => void;
  selectedSort: string;
  onSortChange: (sort: string) => void;
  selectedLoja: string;
  onLojaChange: (loja: string) => void;
  selectedVendedor: string;
  onVendedorChange: (vendedor: string) => void;
  selectedVendeu: string;
  onVendeuChange: (vendeu: string) => void;
  onlyWithCpf?: boolean;
  onToggleOnlyWithCpf?: () => void;
  searchCpfOnly?: boolean;
  onToggleSearchCpfOnly?: () => void;
  onOpenDetails: (lead: LeadRecord) => void;
  onOpenNewLeadModal: () => void;
  onQuickApprove: (lead: LeadRecord) => void;
  onQuickReject: (lead: LeadRecord, reason: string) => void;
  onQuickInAnalysis: (lead: LeadRecord) => void;
  onForceSearchCpf?: (lead: LeadRecord) => Promise<any>;
  onDeleteLead?: (lead: LeadRecord) => Promise<void> | void;
  onRefresh?: () => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  leads,
  summary,
  totalLeads,
  currentPage,
  totalPages,
  onPageChange,
  selectedStatus,
  onStatusChange,
  searchQuery,
  onSearchChange,
  selectedChannel,
  onChannelChange,
  selectedSort,
  onSortChange,
  selectedLoja,
  onLojaChange,
  selectedVendedor,
  onVendedorChange,
  selectedVendeu,
  onVendeuChange,
  onlyWithCpf = false,
  onToggleOnlyWithCpf,
  searchCpfOnly = false,
  onToggleSearchCpfOnly,
  onOpenDetails,
  onOpenNewLeadModal,
  onQuickApprove,
  onQuickReject,
  onQuickInAnalysis,
  onForceSearchCpf,
  currentUser,
  onDeleteLead,
  onRefresh
}) => {
  // Delete dialog state
  const [leadToDelete, setLeadToDelete] = useState<LeadRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clear leads database dialog state
  const [isClearDbModalOpen, setIsClearDbModalOpen] = useState(false);
  const [isClearingDb, setIsClearingDb] = useState(false);

  // Reject reason dialog state
  const [rejectDialogLead, setRejectDialogLead] = useState<LeadRecord | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [searchingCpfId, setSearchingCpfId] = useState<string | null>(null);

  const handleForceSearchCpf = async (lead: LeadRecord) => {
    if (!onForceSearchCpf) return;
    setSearchingCpfId(lead.id);
    try {
      await onForceSearchCpf(lead);
    } finally {
      setSearchingCpfId(null);
    }
  };

  // Metadata for filter dropdowns
  const [availableLojas, setAvailableLojas] = useState<string[]>([]);
  const [availableVendedores, setAvailableVendedores] = useState<string[]>([]);
  const [availableCpfCount, setAvailableCpfCount] = useState<number>(0);

  useEffect(() => {
    fetch('/api/leads/meta')
      .then(res => res.json())
      .then(data => {
        if (data.lojas) setAvailableLojas(data.lojas);
        if (data.vendedores) setAvailableVendedores(data.vendedores);
        if (typeof data.leads_with_cpf === 'number') setAvailableCpfCount(data.leads_with_cpf);
      })
      .catch(e => console.warn('Could not load leads metadata:', e));
  }, [leads.length]);

  const handleClearAllLeads = async () => {
    setIsClearingDb(true);
    try {
      const res = await fetch('/api/leads/clear', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        setIsClearDbModalOpen(false);
        if (onRefresh) onRefresh();
      } else {
        alert(json.error || 'Erro ao limpar banco de leads.');
      }
    } catch (e: any) {
      alert(`Falha ao limpar: ${e.message}`);
    } finally {
      setIsClearingDb(false);
    }
  };

  const statusOptions: { id: string; label: string; count?: number; color: string }[] = [
    { id: 'all', label: 'Todos os Leads', count: totalLeads, color: 'bg-slate-100 text-slate-800' },
    { id: 'NOVO LEAD', label: 'Novo Lead', count: summary?.novos_leads, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'EM ANÁLISE', label: 'Em Análise', count: summary?.em_analise, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'PENDENTE', label: 'Pendente', count: summary?.pendentes, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'APROVADO', label: 'Aprovado', count: summary?.aprovados, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'REPROVADO', label: 'Reprovado', count: summary?.reprovados, color: 'bg-rose-50 text-rose-700 border-rose-200' }
  ];

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'APROVADO':
        return (
          <span className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 min-w-[120px] whitespace-nowrap shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>APROVADO</span>
          </span>
        );
      case 'REPROVADO':
        return (
          <span className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-800 border border-rose-200 min-w-[120px] whitespace-nowrap shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>REPROVADO</span>
          </span>
        );
      case 'EM ANÁLISE':
        return (
          <span className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 min-w-[120px] whitespace-nowrap shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>EM ANÁLISE</span>
          </span>
        );
      case 'PENDENTE':
        return (
          <span className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200 min-w-[120px] whitespace-nowrap shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>PENDENTE</span>
          </span>
        );
      case 'NOVO LEAD':
      default:
        return (
          <span className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200 min-w-[120px] whitespace-nowrap shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
            <span>NOVO LEAD</span>
          </span>
        );
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Belem' });
      const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Belem' });
      return `${dateStr} às ${timeStr}`;
    } catch {
      return isoString;
    }
  };

  const handleOpenRejectDialog = (lead: LeadRecord) => {
    setRejectDialogLead(lead);
    setRejectionReasonInput(lead.motivo_reprovacao || '');
  };

  const handleConfirmReject = () => {
    if (rejectDialogLead && rejectionReasonInput.trim()) {
      onQuickReject(rejectDialogLead, rejectionReasonInput.trim());
      setRejectDialogLead(null);
      setRejectionReasonInput('');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-[#002139] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
              Gestão de Leads
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#002139] text-[#c1ef6d]">
              ChatAnalytics 2.0
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controle integrado de qualificação, SDR, aprovação e rastreamento de vendas do Chatwoot.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tempo Real Ativo</span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Atualizar lista agora"
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all cursor-pointer shadow-2xs active:rotate-180"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
            </button>
          )}

          <button
            onClick={onOpenNewLeadModal}
            className="px-4 py-2.5 rounded-xl bg-[#002139] hover:bg-[#00375a] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer active:scale-[0.99]"
          >
            <Plus className="w-4 h-4 text-[#c1ef6d]" />
            <span>Cadastrar Novo Lead</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {statusOptions.map(st => (
          <button
            key={st.id}
            onClick={() => onStatusChange(st.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
              selectedStatus === st.id
                ? 'bg-[#002139] text-white border-[#002139] shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span>{st.label}</span>
            {st.count !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                selectedStatus === st.id ? 'bg-white/20 text-[#c1ef6d]' : 'bg-slate-100 text-slate-700'
              }`}>
                {st.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={searchCpfOnly ? "Pesquisar somente CPF (digite os números)..." : "Buscar por nome, telefone, CPF, vendedor ou loja..."}
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className={`w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border ${
                searchCpfOnly 
                  ? 'border-purple-400 bg-purple-50/40 text-purple-950 font-semibold focus:ring-2 focus:ring-purple-400/20 focus:border-purple-500' 
                  : 'border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5]'
              } focus:outline-hidden`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Vendeu Filter */}
          <div>
            <select
              value={selectedVendeu}
              onChange={e => onVendeuChange(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
            >
              <option value="all">Vendas: Todas</option>
              <option value="sim">Apenas Vendeu: Sim</option>
              <option value="nao">Apenas Vendeu: Não</option>
            </select>
          </div>

          {/* Loja Filter */}
          <div>
            <select
              value={selectedLoja}
              onChange={e => onLojaChange(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
            >
              <option value="all">Loja: Todas</option>
              {availableLojas.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Vendedor Filter */}
          <div>
            <select
              value={selectedVendedor}
              onChange={e => onVendedorChange(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
            >
              <option value="all">Vendedor: Todos</option>
              {availableVendedores.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Order By Filter */}
          <div>
            <div className="relative">
              <select
                value={selectedSort}
                onChange={e => onSortChange(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
              >
                <option value="date_desc">Entrada: Mais recentes</option>
                <option value="date_asc">Entrada: Mais antigos</option>
                <option value="last_interaction_desc">Última Interação: Recente</option>
                <option value="last_interaction_asc">Última Interação: Antiga</option>
                <option value="name_asc">Nome do Lead (A-Z)</option>
                <option value="value_desc">Maior Valor de Venda</option>
              </select>
            </div>
          </div>
        </div>

        {/* CPF Search & Filter Sub-Bar */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle: Somente Leads com CPF Capturado */}
            <button
              type="button"
              onClick={onToggleOnlyWithCpf}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                onlyWithCpf
                  ? 'bg-[#002139] text-[#c1ef6d] border-[#002139] shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <CreditCard className={`w-3.5 h-3.5 ${onlyWithCpf ? 'text-[#c1ef6d]' : 'text-[#1A94C5]'}`} />
              <span>Somente Leads com CPF Capturado</span>
              {availableCpfCount !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                  onlyWithCpf ? 'bg-white/20 text-[#c1ef6d]' : 'bg-slate-200 text-slate-700'
                }`}>
                  {availableCpfCount}
                </span>
              )}
            </button>

            {/* Toggle: Pesquisa Somente por CPF */}
            <button
              type="button"
              onClick={onToggleSearchCpfOnly}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                searchCpfOnly
                  ? 'bg-purple-900 text-purple-200 border-purple-800 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <Search className={`w-3.5 h-3.5 ${searchCpfOnly ? 'text-purple-300' : 'text-slate-400'}`} />
              <span>{searchCpfOnly ? '✓ Modo: Pesquisando Somente CPF' : 'Pesquisar Somente por CPF'}</span>
            </button>

            {/* Quick reset for CPF filters */}
            {(onlyWithCpf || searchCpfOnly) && (
              <button
                type="button"
                onClick={() => {
                  if (onlyWithCpf && onToggleOnlyWithCpf) onToggleOnlyWithCpf();
                  if (searchCpfOnly && onToggleSearchCpfOnly) onToggleSearchCpfOnly();
                  onSearchChange('');
                }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer ml-1"
              >
                Limpar filtro de CPF
              </button>
            )}
          </div>

          {/* Admin Clean/Clear Leads Database Button */}
          {currentUser?.role === 'admin' && (
            <button
              type="button"
              onClick={() => setIsClearDbModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer ml-auto"
              title="Apagar permanentemente todos os leads gravados no banco de dados"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Limpar Banco de Leads</span>
            </button>
          )}
        </div>

        {/* Active General Filters / Reset */}
        {(selectedStatus !== 'all' || (!searchCpfOnly && searchQuery) || selectedLoja !== 'all' || selectedVendedor !== 'all' || selectedVendeu !== 'all' || (selectedChannel && selectedChannel !== 'Todos')) && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Filtros comerciais aplicados na visualização.</span>
            <button
              onClick={() => {
                onStatusChange('all');
                onSearchChange('');
                onLojaChange('all');
                onVendedorChange('all');
                onVendeuChange('all');
                onChannelChange('Todos');
              }}
              className="font-bold text-[#1A94C5] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Redefinir filtros comerciais</span>
            </button>
          </div>
        )}
      </div>

      {/* Leads Table / List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {leads.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
              Nenhum lead encontrado
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedStatus !== 'all'
                ? 'Nenhum lead corresponde aos critérios de filtro informados. Experimente limpar os filtros.'
                : 'Conecte sua conta do Chatwoot nas configurações ou registre um novo lead manualmente pelo botão acima.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Lead / Contato</th>
                  <th className="py-3.5 px-4 min-w-[145px] w-40">Status</th>
                  <th className="py-3.5 px-4">Documentos (CPF / CNH)</th>
                  <th className="py-3.5 px-4">Atribuição (Vendedor & Loja)</th>
                  <th className="py-3.5 px-4">Venda Fechada</th>
                  <th className="py-3.5 px-4">Datas (Entrada / Interação)</th>
                  <th className="py-3.5 px-4 text-right min-w-[150px]">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {leads.map(lead => (
                  <tr 
                    key={lead.id} 
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onOpenDetails(lead)}
                  >
                    {/* Lead / Contato */}
                    <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#cee5ff] text-[#002139] flex items-center justify-center font-bold text-xs shrink-0">
                          {(lead.contact_name || 'L').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <button
                            onClick={() => onOpenDetails(lead)}
                            className="font-bold text-slate-900 hover:text-[#1A94C5] transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{lead.contact_name}</span>
                            {lead.sdr_modified && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Modificado manualmente pelo SDR" />
                            )}
                          </button>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                            <span>{lead.contact_phone || 'Sem telefone'}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[10px] text-slate-400">#CW-{lead.conversation_id}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 min-w-[145px]">
                      {getStatusBadge(lead.status)}
                      {lead.status === 'REPROVADO' && lead.motivo_reprovacao && (
                        <p className="text-[10px] text-rose-600 mt-1 max-w-[160px] truncate" title={lead.motivo_reprovacao}>
                          {lead.motivo_reprovacao}
                        </p>
                      )}
                    </td>

                    {/* Documentos & Qualificação Automática */}
                    <td className="py-4 px-4 text-xs">
                      {lead.cpf ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-slate-800 font-semibold">{formatCPF(lead.cpf)}</span>
                          {lead.cpf_valid === true && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800" title="CPF com dígitos verificadores válidos">
                              ✓ Válido
                            </span>
                          )}
                          {lead.cpf_valid === false && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800" title="CPF inválido">
                              ✕ Inválido
                            </span>
                          )}
                          {lead.field_origins?.cpf && (
                            <span className={`text-[9px] font-bold px-1 rounded ${
                              lead.field_origins.cpf === 'LOCAL' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              lead.field_origins.cpf === 'MANUAL' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              'bg-sky-50 text-sky-700 border border-sky-200'
                            }`} title={`Origem do CPF: ${lead.field_origins.cpf}`}>
                              {lead.field_origins.cpf}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">CPF não inf.</span>
                      )}

                      {lead.cpf_conflict && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title={lead.cpf_conflict_detail || 'Conflito de CPF detectado'}>
                            <AlertCircle className="w-3 h-3 text-amber-700 shrink-0" />
                            Conflito CPF
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                        {lead.birth_date && (
                          <span className="font-mono text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                            DN: {lead.birth_date}
                          </span>
                        )}
                        {lead.cnh && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            lead.cnh === 'SIM' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            CNH: {lead.cnh}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Vendedor & Loja */}
                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-800 block">
                          {lead.vendedor || <span className="text-slate-400 italic font-normal">Não atribuído</span>}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {lead.loja || <span className="text-slate-400 italic font-normal">Sem loja</span>}
                        </span>
                      </div>
                    </td>

                    {/* Venda Fechada */}
                    <td className="py-4 px-4">
                      {lead.vendeu ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Sim
                          </span>
                          {(lead.valor_venda || lead.value) ? (
                            <span className="block font-bold text-emerald-800 tabular-nums">
                              R$ {(lead.valor_venda || lead.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Não</span>
                      )}
                    </td>

                    {/* Datas */}
                    <td className="py-4 px-4 text-[11px] text-slate-500">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Entrada:</span>
                        <span className="font-medium text-slate-700">{formatDateTime(lead.entry_date)}</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-400 block text-[10px]">Última Interação:</span>
                        <span className="font-medium text-slate-700">{formatDateTime(lead.last_interaction_at)}</span>
                      </div>
                    </td>

                    {/* Ações Rápidas (Agrupadas em 2 fileiras) */}
                    <td className="py-2.5 px-4 text-right min-w-[150px]" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-col items-end gap-1.5">
                        {/* Fileira 1: Decisão de Status (Aprovar, Reprovar, Em análise) */}
                        <div className="flex items-center gap-1.5">
                          {/* Quick Approve */}
                          <Tooltip content="Aprovar Lead" position="top">
                            <button
                              type="button"
                              onClick={() => onQuickApprove(lead)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                lead.status === 'APROVADO'
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                  : 'bg-white hover:bg-emerald-50 text-emerald-700 border-slate-200 hover:border-emerald-300'
                              }`}
                              aria-label="Aprovar Lead"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>

                          {/* Quick Reject */}
                          <Tooltip content="Reprovar Lead" position="top">
                            <button
                              type="button"
                              onClick={() => handleOpenRejectDialog(lead)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                lead.status === 'REPROVADO'
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                  : 'bg-white hover:bg-rose-50 text-rose-700 border-slate-200 hover:border-rose-300'
                              }`}
                              aria-label="Reprovar Lead"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>

                          {/* Quick In Analysis */}
                          <Tooltip content="Colocar Lead em Análise" position="top">
                            <button
                              type="button"
                              onClick={() => onQuickInAnalysis(lead)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                lead.status === 'EM ANÁLISE'
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                                  : 'bg-white hover:bg-amber-50 text-amber-700 border-slate-200 hover:border-amber-300'
                              }`}
                              aria-label="Colocar Lead em Análise"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        </div>

                        {/* Fileira 2: Ferramentas & Gestão (Buscar Dados, Detalhes, Chatwoot, Excluir) */}
                        <div className="flex items-center gap-1.5">
                          {/* Quick Force Search CPF, Birth Date & CNH */}
                          <Tooltip content="Buscar dados (CPF, Nascimento, CNH)" position="top">
                            <button
                              type="button"
                              onClick={() => handleForceSearchCpf(lead)}
                              disabled={searchingCpfId === lead.id}
                              className="p-1.5 rounded-lg border bg-white hover:bg-sky-50 text-[#1A94C5] border-slate-200 hover:border-sky-300 transition-all cursor-pointer disabled:opacity-50"
                              aria-label="Buscar dados do lead nas mensagens (CPF, Nascimento, CNH)"
                            >
                              {searchingCpfId === lead.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1A94C5]" />
                              ) : (
                                <Search className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </Tooltip>

                          {/* Ver / Editar Detalhes */}
                          <Tooltip content="Ver e Editar Detalhes" position="top">
                            <button
                              type="button"
                              onClick={() => onOpenDetails(lead)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                              aria-label="Ver e Editar Detalhes do Lead"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>

                          {/* Abrir no Chatwoot */}
                          {lead.chatwoot_url && (
                            <Tooltip content="Abrir Conversa no Chatwoot" position="top">
                              <a
                                href={lead.chatwoot_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-[#c1ef6d]/20 text-slate-700 hover:text-[#002139] hover:border-[#c1ef6d] transition-all cursor-pointer inline-flex items-center justify-center"
                                aria-label="Abrir conversa no Chatwoot"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-[#002139]" />
                              </a>
                            </Tooltip>
                          )}

                          {/* Excluir Lead (Apenas Administrador) */}
                          {currentUser?.role === 'admin' && (
                            <Tooltip content="Deletar Lead permanentemente" position="top">
                              <button
                                type="button"
                                onClick={() => setLeadToDelete(lead)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer"
                                aria-label="Deletar Lead permanentemente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalLeads > 0 && (
          <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
            <div>
              Exibindo <strong>{leads.length}</strong> de <strong>{totalLeads}</strong> leads cadastrados
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-800 px-2">
                Página {currentPage} de {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Reason Confirmation Modal */}
      {rejectDialogLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-rose-800 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                Reprovar Lead: {rejectDialogLead.contact_name}
              </h3>
              <button 
                onClick={() => setRejectDialogLead(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Motivo da Reprovação *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Ex: Não atende aos critérios financeiros, score baixo, desistência..."
                value={rejectionReasonInput}
                onChange={e => setRejectionReasonInput(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectDialogLead(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!rejectionReasonInput.trim()}
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
              >
                Confirmar Reprovação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Lead Confirmation Modal */}
      {leadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Excluir Lead Permanentemente</h3>
                <p className="text-xs text-slate-500">Esta ação não poderá ser revertida.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
              <p><strong>Nome:</strong> {leadToDelete.contact_name}</p>
              {leadToDelete.contact_phone && <p><strong>Telefone:</strong> {leadToDelete.contact_phone}</p>}
              {leadToDelete.cpf && <p><strong>CPF:</strong> {leadToDelete.cpf}</p>}
              <p><strong>Status:</strong> {leadToDelete.status}</p>
              {leadToDelete.vendedor && <p><strong>Vendedor:</strong> {leadToDelete.vendedor}</p>}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setLeadToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!onDeleteLead) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteLead(leadToDelete);
                    setLeadToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Excluindo...' : 'Sim, Excluir Lead'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Database Modal */}
      {isClearDbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Limpar Banco de Leads</h3>
                <p className="text-xs text-rose-600 font-semibold">Ação destrutiva e permanente</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Você está prestes a <strong>apagar todos os leads gravados no banco de dados</strong> (.bd local e persistência remota). Esta operação é ideal para reiniciar a captação após testes ou antes de ir para produção.
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                As configurações de canais e tokens não serão afetadas, apenas os registros de leads.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isClearingDb}
                onClick={() => setIsClearDbModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isClearingDb}
                onClick={handleClearAllLeads}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isClearingDb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isClearingDb ? 'Limpando banco...' : 'Confirmar Limpeza Total'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
