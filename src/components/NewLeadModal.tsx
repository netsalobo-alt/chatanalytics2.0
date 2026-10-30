import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  User, 
  Phone, 
  Mail, 
  DollarSign, 
  Building, 
  CreditCard, 
  FileText,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { LeadStatus } from '../types.ts';
import { validateCPF, formatCPF } from '../lib/cpf.ts';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    nome: string;
    telefone?: string;
    email?: string;
    cpf?: string;
    birth_date?: string;
    cnh?: string;
    status: LeadStatus;
    vendedor?: string;
    loja?: string;
    vendeu?: boolean;
    valor_venda?: number;
    observacao?: string;
    channel: 'WhatsApp' | 'Instagram' | 'Facebook' | 'Webchat' | 'Outros';
    channel_detail?: string;
  }) => Promise<void>;
}

export const NewLeadModal: React.FC<NewLeadModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [cpfValid, setCpfValid] = useState<boolean | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [cnh, setCnh] = useState('');
  const [status, setStatus] = useState<LeadStatus>('NOVO LEAD');
  const [vendedor, setVendedor] = useState('');
  const [loja, setLoja] = useState('');
  const [vendeu, setVendeu] = useState(false);
  const [valorVenda, setValorVenda] = useState('');
  const [observacao, setObservacao] = useState('');
  const [channel, setChannel] = useState<'WhatsApp' | 'Instagram' | 'Facebook' | 'Webchat' | 'Outros'>('WhatsApp');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatCPF(raw);
    const valid = raw.replace(/\D/g, '').length === 11 ? validateCPF(raw) : (raw.trim() === '' ? null : false);
    setCpf(formatted);
    setCpfValid(valid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
        cpf: cpf.trim() || undefined,
        birth_date: birthDate || undefined,
        cnh: cnh.trim() || undefined,
        status,
        vendedor: vendedor.trim() || undefined,
        loja: loja.trim() || undefined,
        vendeu,
        valor_venda: valorVenda ? Math.max(0, parseFloat(valorVenda.replace(',', '.')) || 0) : 0,
        observacao: observacao.trim() || undefined,
        channel,
        channel_detail: `${channel} Inbound`
      });

      // Reset form
      setNome('');
      setTelefone('');
      setEmail('');
      setCpf('');
      setCpfValid(null);
      setBirthDate('');
      setCnh('');
      setStatus('NOVO LEAD');
      setVendedor('');
      setLoja('');
      setVendeu(false);
      setValorVenda('');
      setObservacao('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full my-8 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 bg-[#002139] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#c1ef6d]">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans',sans-serif]">
                Cadastrar Novo Lead
              </h3>
              <p className="text-xs text-slate-300">
                Todo novo lead inicia com o status <strong className="text-[#c1ef6d]">NOVO LEAD</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome do Lead *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Amanda Ferreira"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Telefone / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="(11) 98765-4321"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  CPF
                </label>
                {cpfValid !== null && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    cpfValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {cpfValid ? 'CPF Válido' : 'CPF Inválido'}
                  </span>
                )}
              </div>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  value={cpf}
                  onChange={handleCpfChange}
                  className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Data de Nascimento (DD/MM/AAAA)
              </label>
              <input
                type="text"
                placeholder="DD/MM/AAAA"
                maxLength={10}
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                CNH (Possui Habilitação?)
              </label>
              <select
                value={cnh}
                onChange={e => setCnh(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
              >
                <option value="">Não informado</option>
                <option value="SIM">SIM (Possui Habilitação)</option>
                <option value="NÃO">NÃO (Não Possui Habilitação)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status Inicial
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as LeadStatus)}
                className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
              >
                <option value="NOVO LEAD">NOVO LEAD (Padrão)</option>
                <option value="EM ANÁLISE">EM ANÁLISE</option>
                <option value="PENDENTE">PENDENTE</option>
                <option value="APROVADO">APROVADO</option>
                <option value="REPROVADO">REPROVADO</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Canal de Atendimento
              </label>
              <select
                value={channel}
                onChange={e => setChannel(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
              >
                <option value="WhatsApp">WhatsApp</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="Webchat">Webchat</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Vendedor / SDR
              </label>
              <input
                type="text"
                placeholder="Ex: Carlos Mendes"
                value={vendedor}
                onChange={e => setVendedor(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Loja / Unidade
              </label>
              <input
                type="text"
                placeholder="Ex: Matriz - Centro"
                value={loja}
                onChange={e => setLoja(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Vendeu?
              </label>
              <select
                value={vendeu ? 'sim' : 'nao'}
                onChange={e => setVendeu(e.target.value === 'sim')}
                className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
              >
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Valor da Venda (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="text"
                  placeholder="0,00"
                  value={valorVenda}
                  onChange={e => setValorVenda(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Observações Iniciais
              </label>
              <textarea
                rows={2}
                placeholder="Detalhes adicionais, interesse em produto/serviço..."
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1A94C5]/20 focus:border-[#1A94C5] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !nome.trim()}
              className="px-5 py-2 text-xs font-bold text-[#002139] bg-[#c1ef6d] hover:bg-[#b2e25b] rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvando...' : 'Cadastrar Lead'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
