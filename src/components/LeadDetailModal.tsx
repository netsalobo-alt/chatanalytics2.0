import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  CheckCircle, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
  Building,
  CheckCircle2,
  XCircle,
  Save,
  HelpCircle,
  ShieldAlert,
  CreditCard,
  Search,
  Loader2,
  Trash2
} from 'lucide-react';
import { LeadRecord, LeadStatus, AppUser } from '../types.ts';
import { validateCPF, formatCPF } from '../lib/cpf.ts';
import { Tooltip } from './Tooltip.tsx';

interface LeadDetailModalProps {
  lead: LeadRecord | null;
  currentUser?: AppUser | null;
  onClose: () => void;
  onSaveLead: (leadId: string, updates: Partial<LeadRecord>) => Promise<void>;
  onApprove: (lead: LeadRecord) => Promise<void>;
  onReject: (lead: LeadRecord, reason: string) => Promise<void>;
  onInAnalysis: (lead: LeadRecord) => Promise<void>;
  onDeleteLead?: (lead: LeadRecord) => Promise<void>;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  currentUser,
  onClose,
  onSaveLead,
  onApprove,
  onReject,
  onInAnalysis,
  onDeleteLead
}) => {
  const [formData, setFormData] = useState<Partial<LeadRecord>>({});
  const [cpfValidation, setCpfValidation] = useState<boolean | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingCpf, setIsSearchingCpf] = useState(false);
  const [searchCpfFeedback, setSearchCpfFeedback] = useState<{
    type: 'success' | 'warning' | 'info' | 'error';
    message: string;
  } | null>(null);
  const [isRejectPromptOpen, setIsRejectPromptOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({
        contact_name: lead.contact_name || '',
        contact_phone: lead.contact_phone || '',
        cpf: lead.cpf || '',
        birth_date: lead.birth_date || '',
        cnh: lead.cnh || '',
        status: lead.status || 'NOVO LEAD',
        vendedor: lead.vendedor || '',
        loja: lead.loja || '',
        vendeu: Boolean(lead.vendeu),
        valor_venda: lead.valor_venda ?? lead.value ?? 0,
        observacao: lead.observacao || '',
        motivo_reprovacao: lead.motivo_reprovacao || ''
      });
      setCpfValidation(lead.cpf ? validateCPF(lead.cpf) : null);
      setRejectionReason(lead.motivo_reprovacao || '');
      setIsRejectPromptOpen(false);
      setSaveSuccess(false);
    }
  }, [lead]);

  if (!lead) return null;

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatCPF(raw);
    const valid = raw.replace(/\D/g, '').length === 11 ? validateCPF(raw) : (raw.trim() === '' ? null : false);
    setFormData(prev => ({ ...prev, cpf: formatted }));
    setCpfValidation(valid);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await onSaveLead(lead.id, {
        ...formData,
        cpf_valid: formData.cpf ? validateCPF(formData.cpf) : undefined,
        valor_venda: Number(formData.valor_venda) || 0,
        vendeu: Boolean(formData.vendeu)
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickApprove = async () => {
    setIsSaving(true);
    try {
      await onApprove(lead);
      setFormData(prev => ({ ...prev, status: 'APROVADO', vendeu: true }));
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickInAnalysis = async () => {
    setIsSaving(true);
    try {
      await onInAnalysis(lead);
      setFormData(prev => ({ ...prev, status: 'EM ANÁLISE' }));
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) return;
    setIsSaving(true);
    try {
      await onReject(lead, rejectionReason.trim());
      setFormData(prev => ({ ...prev, status: 'REPROVADO', motivo_reprovacao: rejectionReason.trim(), vendeu: false }));
      setIsRejectPromptOpen(false);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleForceSearchCpf = async () => {
    if (!lead) return;
    setIsSearchingCpf(true);
    setSearchCpfFeedback(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/force-search-cpf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.found && data.lead) {
        setFormData(prev => ({
          ...prev,
          cpf: data.lead.cpf || prev.cpf,
          cpf_valid: data.lead.cpf_valid,
          cpf_conflict: data.lead.cpf_conflict,
          cpf_conflict_detail: data.lead.cpf_conflict_detail,
          birth_date: data.lead.birth_date || prev.birth_date,
          cnh: data.lead.cnh || prev.cnh
        }));
        if (data.lead.cpf) {
          setCpfValidation(data.lead.cpf_valid ?? null);
        }
        setSearchCpfFeedback({
          type: data.conflict ? 'warning' : 'success',
          message: data.message
        });
        await onSaveLead(lead.id, data.lead);
      } else {
        setSearchCpfFeedback({
          type: 'info',
          message: data.message || 'Nenhum CPF, data de nascimento ou CNH foi localizado nas mensagens enviadas pelo cliente.'
        });
      }
    } catch (err: any) {
      setSearchCpfFeedback({
        type: 'error',
        message: `Falha ao sincronizar dados do lead: ${err.message}`
      });
    } finally {
      setIsSearchingCpf(false);
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleString('pt-BR', { timeZone: 'America/Belem' });
    } catch {
      return isoString;
    }
  };

  const getOriginBadge = (origin?: 'MANUAL' | 'LOCAL' | 'IA') => {
    if (!origin) return null;
    switch (origin) {
      case 'LOCAL':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200" title="Extraído automaticamente via regras locais">
            LOCAL
          </span>
        );
      case 'MANUAL':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200" title="Preenchido / editado manualmente pelo SDR">
            MANUAL
          </span>
        );
      case 'IA':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200" title="Identificado via IA">
            IA
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-6 bg-[#002139] text-white flex items-start justify-between relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#1A94C5]/20 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 text-[#c1ef6d] flex items-center justify-center font-bold text-lg font-['Plus_Jakarta_Sans',sans-serif]">
              {(lead.contact_name || 'L').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans',sans-serif]">
                  {lead.contact_name}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                  ID: {lead.id}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
                <span>Conversa CW #{lead.conversation_id}</span>
                <span>•</span>
                <span>Contato #{lead.contact_id}</span>
                <span>•</span>
                <span>Conta #{lead.account_id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            {lead.chatwoot_url && (
              <Tooltip content="Abrir conversa diretamente no Chatwoot" position="bottom">
                <a
                  href={lead.chatwoot_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#c1ef6d] text-[#002139] hover:bg-[#b0df5c] text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <span>Abrir no Chatwoot</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Tooltip>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Action Ribbon */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ações Rápidas:</span>
            
            <Tooltip content="Aprovar Lead comercialmente">
              <button
                type="button"
                onClick={handleQuickApprove}
                disabled={isSaving || isSearchingCpf}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Aprovar</span>
              </button>
            </Tooltip>

            <Tooltip content="Reprovar Lead">
              <button
                type="button"
                onClick={() => setIsRejectPromptOpen(true)}
                disabled={isSaving || isSearchingCpf}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reprovar</span>
              </button>
            </Tooltip>

            <Tooltip content="Colocar Lead em Análise">
              <button
                type="button"
                onClick={handleQuickInAnalysis}
                disabled={isSaving || isSearchingCpf}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Em Análise</span>
              </button>
            </Tooltip>

            <Tooltip content="Buscar dados (CPF, Nascimento, CNH)">
              <button
                type="button"
                onClick={handleForceSearchCpf}
                disabled={isSearchingCpf || isSaving}
                className="p-2 rounded-lg text-xs font-bold bg-[#1A94C5] hover:bg-[#157fa8] text-white flex items-center justify-center shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                aria-label="Buscar dados do lead nas mensagens (CPF, Nascimento, CNH)"
              >
                {isSearchingCpf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>
            </Tooltip>
          </div>

          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" /> Salvo com sucesso!
            </span>
          )}
        </div>

        {/* Search CPF Feedback Banner */}
        {searchCpfFeedback && (
          <div className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between border-b animate-in fade-in ${
            searchCpfFeedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : searchCpfFeedback.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : searchCpfFeedback.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-sky-50 text-sky-800 border-sky-200'
          }`}>
            <div className="flex items-center gap-2">
              {searchCpfFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {searchCpfFeedback.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
              {searchCpfFeedback.type === 'info' && <Search className="w-4 h-4 text-sky-600 shrink-0" />}
              {searchCpfFeedback.type === 'error' && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{searchCpfFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSearchCpfFeedback(null)}
              className="text-slate-400 hover:text-slate-600 ml-4 font-bold cursor-pointer"
              title="Fechar aviso"
            >
              ✕
            </button>
          </div>
        )}

        {/* Reprovação Prompt Modal Overlay */}
        {isRejectPromptOpen && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-xs text-rose-900 space-y-2 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-rose-800">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Informe o motivo da reprovação deste lead:
              </span>
              <button 
                onClick={() => setIsRejectPromptOpen(false)}
                className="text-rose-500 hover:text-rose-800 font-bold"
              >
                Cancelar
              </button>
            </div>
            <textarea
              required
              rows={2}
              placeholder="Ex: Score insuficiente, CNH vencida, desistência do cliente..."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-rose-300 bg-white text-xs focus:ring-2 focus:ring-rose-400 focus:outline-hidden"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRejectPromptOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer disabled:opacity-50"
              >
                Confirmar Reprovação
              </button>
            </div>
          </div>
        )}

        {/* Modal Body Form */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* CPF Conflict Warning Banner */}
          {lead.cpf_conflict && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-xs text-amber-900 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-amber-950 flex items-center gap-1.5">
                  ⚠️ Conflito de CPF Detectado para Revisão Manual
                </span>
                <p className="mt-1 text-amber-800 leading-relaxed">
                  {lead.cpf_conflict_detail || 'O cliente enviou um CPF válido diferente do que já estava salvo no lead. O sistema preservou o CPF anterior e requer validação manual pelo SDR.'}
                </p>
                <p className="mt-1 text-[11px] text-amber-700 italic">
                  * Ao salvar uma alteração manual no CPF abaixo, a bandeira de conflito será resolvida.
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Identification & Lead Info */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#1A94C5]" />
              Dados do Lead & Contato
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.contact_name || ''}
                  onChange={e => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.contact_phone || ''}
                  onChange={e => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      CPF
                    </label>
                    {getOriginBadge(lead.field_origins?.cpf)}
                  </div>
                  {cpfValidation !== null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      cpfValidation ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {cpfValidation ? 'CPF Válido' : 'CPF Inválido'}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={formData.cpf || ''}
                  onChange={handleCpfChange}
                  maxLength={14}
                  className={`w-full px-3 py-2 text-xs rounded-xl border font-mono focus:ring-2 focus:outline-hidden ${
                    cpfValidation === true 
                      ? 'border-emerald-300 bg-emerald-50/30 focus:ring-emerald-200' 
                      : cpfValidation === false 
                        ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-200' 
                        : 'border-slate-200 bg-slate-50 focus:bg-white focus:ring-[#1A94C5]/20'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Data de Nascimento
                    </label>
                    {getOriginBadge(lead.field_origins?.birth_date)}
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={formData.birth_date || ''}
                  onChange={e => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                  maxLength={10}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      CNH (Habilitação)
                    </label>
                    {getOriginBadge(lead.field_origins?.cnh)}
                  </div>
                </div>
                <select
                  value={formData.cnh || ''}
                  onChange={e => setFormData(prev => ({ ...prev, cnh: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
                >
                  <option value="">Não informado</option>
                  <option value="SIM">SIM (Possui Habilitação)</option>
                  <option value="NÃO">NÃO (Não Possui Habilitação)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Canal de Entrada
                </label>
                <input
                  type="text"
                  disabled
                  value={lead.channel_detail || lead.channel || 'Chatwoot'}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Section 2: SDR Qualification, Status, Store & Sales */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#1A94C5]" />
              Gestão Comercial & SDR
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status do Lead *
                </label>
                <select
                  value={formData.status || 'NOVO LEAD'}
                  onChange={e => {
                    const st = e.target.value as LeadStatus;
                    setFormData(prev => ({
                      ...prev,
                      status: st,
                      vendeu: st === 'APROVADO' ? true : prev.vendeu
                    }));
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
                >
                  <option value="NOVO LEAD">NOVO LEAD</option>
                  <option value="EM ANÁLISE">EM ANÁLISE</option>
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="APROVADO">APROVADO</option>
                  <option value="REPROVADO">REPROVADO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vendedor / SDR
                </label>
                <input
                  type="text"
                  placeholder="Nome do operador"
                  value={formData.vendedor || ''}
                  onChange={e => setFormData(prev => ({ ...prev, vendedor: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loja / Unidade
                </label>
                <input
                  type="text"
                  placeholder="Filial / Loja"
                  value={formData.loja || ''}
                  onChange={e => setFormData(prev => ({ ...prev, loja: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vendeu? (Sim / Não)
                </label>
                <select
                  value={formData.vendeu ? 'sim' : 'nao'}
                  onChange={e => setFormData(prev => ({ ...prev, vendeu: e.target.value === 'sim' }))}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
                >
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor da Venda (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={formData.valor_venda ?? 0}
                    onChange={e => setFormData(prev => ({ ...prev, valor_venda: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Observações & Motivo de Reprovação */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observações do SDR
              </label>
              <textarea
                rows={2}
                placeholder="Anotações comerciais, perfil de compra, preferências..."
                value={formData.observacao || ''}
                onChange={e => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
              />
            </div>

            {(formData.status === 'REPROVADO' || formData.motivo_reprovacao) && (
              <div>
                <label className="block text-xs font-semibold text-rose-800 mb-1">
                  Motivo da Reprovação
                </label>
                <textarea
                  rows={2}
                  placeholder="Justificativa da reprovação..."
                  value={formData.motivo_reprovacao || ''}
                  onChange={e => setFormData(prev => ({ ...prev, motivo_reprovacao: e.target.value }))}
                  className="w-full p-3 text-xs rounded-xl border border-rose-200 bg-rose-50/50 text-rose-900 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Section 4: Audit & Timestamps */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-[11px] text-slate-500 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            <div>
              <span className="block text-slate-400 font-semibold uppercase text-[10px]">Data de Entrada</span>
              <span className="font-medium text-slate-700">{formatDateTime(lead.entry_date)}</span>
            </div>
            <div>
              <span className="block text-slate-400 font-semibold uppercase text-[10px]">Última Interação</span>
              <span className="font-medium text-slate-700">{formatDateTime(lead.last_interaction_at)}</span>
            </div>
            {lead.sdr_modified && (
              <div className="col-span-2 text-[10px] text-slate-500 italic">
                * Este lead possui alterações manuais salvas pelo SDR (protegidas contra sobreposição por webhooks).
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
            {currentUser?.role === 'admin' ? (
              <Tooltip content="Deletar Lead permanentemente" position="top">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Lead</span>
                </button>
              </Tooltip>
            ) : <div />}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#002139] hover:bg-[#00375a] rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-[#c1ef6d]" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Sub-modal */}
        {isConfirmingDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Excluir Lead</h4>
                  <p className="text-[11px] text-slate-500">Confirma a exclusão permanente deste registro?</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <p><strong>Lead:</strong> {lead.contact_name}</p>
                {lead.contact_phone && <p><strong>Telefone:</strong> {lead.contact_phone}</p>}
                {lead.cpf && <p><strong>CPF:</strong> {lead.cpf}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
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
                      await onDeleteLead(lead);
                      setIsConfirmingDelete(false);
                      onClose();
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
