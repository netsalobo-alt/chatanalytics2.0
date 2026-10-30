import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  Plus, 
  Calendar, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  DollarSign, 
  TrendingUp, 
  Layers, 
  Search,
  AlertCircle
} from 'lucide-react';
import { InvestmentRecord, AnalyticsSummary } from '../types.ts';

interface InvestmentsViewProps {
  summary: AnalyticsSummary | null;
  onRefreshStats: () => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const InvestmentsView: React.FC<InvestmentsViewProps> = ({
  summary,
  onRefreshStats,
  showToast
}) => {
  const [investments, setInvestments] = useState<InvestmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<InvestmentRecord | null>(null);

  // Form states
  const [formDate, setFormDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [formAmount, setFormAmount] = useState('');
  const [formChannel, setFormChannel] = useState('Meta Ads');
  const [formNotes, setFormNotes] = useState('');

  // Filters
  const [searchNotes, setSearchNotes] = useState('');
  const [filterChannel, setFilterChannel] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  // Deletion modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchInvestments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/investments');
      if (res.ok) {
        const json = await res.json();
        setInvestments(json.data || []);
      } else {
        showToast('error', 'Falha ao carregar registros de investimento.');
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Erro de conexão ao buscar investimentos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const openNewModal = () => {
    setEditingItem(null);
    const today = new Date();
    setFormDate(today.toISOString().split('T')[0]);
    setFormAmount('');
    setFormChannel('Meta Ads');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: InvestmentRecord) => {
    setEditingItem(item);
    setFormDate(item.date);
    setFormAmount(String(item.amount));
    setFormChannel(item.channel || 'Geral');
    setFormNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(formAmount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('error', 'Informe um valor numérico válido maior que zero.');
      return;
    }

    if (!formDate) {
      showToast('error', 'Selecione a data do investimento.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        // Update
        const res = await fetch(`/api/investments/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: formDate,
            amount: numAmount,
            channel: formChannel,
            notes: formNotes
          })
        });
        if (res.ok) {
          showToast('success', 'Lançamento atualizado com sucesso!');
          setIsModalOpen(false);
          await fetchInvestments();
          onRefreshStats();
        } else {
          const err = await res.json();
          showToast('error', err.error || 'Erro ao atualizar investimento.');
        }
      } else {
        // Create
        const res = await fetch('/api/investments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: formDate,
            amount: numAmount,
            channel: formChannel,
            notes: formNotes
          })
        });
        if (res.ok) {
          showToast('success', 'Investimento registrado com sucesso!');
          setIsModalOpen(false);
          await fetchInvestments();
          onRefreshStats();
        } else {
          const err = await res.json();
          showToast('error', err.error || 'Erro ao criar lançamento.');
        }
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Erro ao salvar investimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/investments/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('success', 'Lançamento excluído com sucesso.');
        setDeletingId(null);
        await fetchInvestments();
        onRefreshStats();
      } else {
        showToast('error', 'Falha ao excluir o lançamento.');
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Erro ao processar exclusão.');
    }
  };

  // Month options for filter
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    investments.forEach(inv => {
      if (inv.date && inv.date.length >= 7) {
        monthsSet.add(inv.date.slice(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [investments]);

  // Filtered investments
  const filteredInvestments = useMemo(() => {
    return investments.filter(inv => {
      if (filterChannel !== 'all' && inv.channel !== filterChannel) {
        return false;
      }
      if (selectedMonth !== 'all' && !inv.date.startsWith(selectedMonth)) {
        return false;
      }
      if (searchNotes.trim()) {
        const query = searchNotes.toLowerCase();
        const matchesNote = (inv.notes || '').toLowerCase().includes(query);
        const matchesChannel = (inv.channel || '').toLowerCase().includes(query);
        if (!matchesNote && !matchesChannel) return false;
      }
      return true;
    });
  }, [investments, filterChannel, selectedMonth, searchNotes]);

  // Aggregate stats
  const totalAllTime = useMemo(() => {
    return investments.reduce((acc, inv) => acc + (inv.amount || 0), 0);
  }, [investments]);

  const currentYearStr = new Date().getFullYear().toString();
  const currentMonthKey = new Date().toISOString().slice(0, 7);

  const totalThisMonth = useMemo(() => {
    return investments
      .filter(inv => inv.date?.startsWith(currentMonthKey))
      .reduce((acc, inv) => acc + (inv.amount || 0), 0);
  }, [investments, currentMonthKey]);

  const totalThisYear = useMemo(() => {
    return investments
      .filter(inv => inv.date?.startsWith(currentYearStr))
      .reduce((acc, inv) => acc + (inv.amount || 0), 0);
  }, [investments, currentYearStr]);

  const monthCount = availableMonths.length || 1;
  const averageMonthlySpend = totalAllTime / monthCount;

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getMonthName = (monthKey: string) => {
    const [y, m] = monthKey.split('-').map(Number);
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[m - 1] || monthKey} / ${y}`;
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Top Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1A94C5]"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Gestão Financeira & Mídia
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#002139] mt-1 font-['Plus_Jakarta_Sans',sans-serif]">
            Investimento em Tráfego Pago
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registre os aportes com data específica para apurar o investimento mensal, CPL (Custo por Lead) e CAC real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#002139] hover:bg-[#00375a] text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-[#c1ef6d]" />
            <span>Novo Investimento</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Mês Atual ({getMonthName(currentMonthKey)})
            </span>
            <Calendar className="w-4 h-4 text-[#1A94C5]" />
          </div>
          <span className="text-2xl font-extrabold text-[#002139] mt-2 block tabular-nums">
            R$ {totalThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            {investments.filter(i => i.date?.startsWith(currentMonthKey)).length} aportes cadastrados
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Ano Atual ({currentYearStr})
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-extrabold text-[#002139] mt-2 block tabular-nums">
            R$ {totalThisYear.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            Acumulado no ano civil
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Média Mensal
            </span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-extrabold text-[#002139] mt-2 block tabular-nums">
            R$ {averageMonthlySpend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            Média histórica por mês
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Acumulado
            </span>
            <Wallet className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 mt-2 block tabular-nums">
            R$ {totalAllTime.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            {investments.length} lançamentos no histórico
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por notas ou canal..."
              value={searchNotes}
              onChange={e => setSearchNotes(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#1A94C5] bg-slate-50/50"
            />
          </div>

          <select
            value={filterChannel}
            onChange={e => setFilterChannel(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-[#1A94C5]"
          >
            <option value="all">Todos os Canais</option>
            <option value="Meta Ads">Meta Ads (Instagram / FB)</option>
            <option value="Google Ads">Google Ads</option>
            <option value="TikTok Ads">TikTok Ads</option>
            <option value="YouTube Ads">YouTube Ads</option>
            <option value="Geral">Geral / Mídia Mista</option>
          </select>

          {availableMonths.length > 0 && (
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-[#1A94C5]"
            >
              <option value="all">Todos os Meses</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>
                  {getMonthName(m)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Mostrando <strong className="text-slate-800">{filteredInvestments.length}</strong> de {investments.length} lançamentos
        </div>
      </div>

      {/* Table of Investments */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 h-10">
                <th className="px-6">Data</th>
                <th className="px-6">Mês de Competência</th>
                <th className="px-6">Canal de Mídia</th>
                <th className="px-6">Notas / Campanha</th>
                <th className="px-6 text-right">Valor Investido</th>
                <th className="px-6 text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-slate-300 border-t-[#002139] rounded-full animate-spin"></div>
                      <span>Carregando lançamentos...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInvestments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 px-4">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Nenhum investimento registrado</h4>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        Cadastre os aportes com a respectiva data para que o sistema consiga calcular o CAC e o CPL mês a mês.
                      </p>
                      <button
                        onClick={openNewModal}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#002139] text-white text-xs font-bold hover:bg-[#00375a] transition-all cursor-pointer shadow-xs"
                      >
                        <Plus className="w-4 h-4 text-[#c1ef6d]" />
                        <span>Cadastrar Primeiro Aporte</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvestments.map(inv => {
                  const monthLabel = inv.date?.length >= 7 ? getMonthName(inv.date.slice(0, 7)) : '-';
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-[#002139] tabular-nums">
                        {formatDateLabel(inv.date)}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">
                        {monthLabel}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200/80">
                          {inv.channel || 'Geral'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 max-w-xs truncate" title={inv.notes}>
                        {inv.notes || <span className="text-slate-300 italic">Sem observações</span>}
                      </td>
                      <td className="px-6 py-3.5 text-right font-extrabold text-[#002139] tabular-nums text-sm">
                        R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(inv)}
                            title="Editar lançamento"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(inv.id)}
                            title="Excluir lançamento"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredInvestments.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t border-slate-200">
                  <td colSpan={4} className="px-6 py-3 text-slate-700 uppercase tracking-wider text-[11px]">
                    Total da Seleção
                  </td>
                  <td className="px-6 py-3 text-right text-emerald-800 text-sm tabular-nums">
                    R$ {filteredInvestments.reduce((acc, i) => acc + (i.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal New / Edit Investment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#002139] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#c1ef6d]" />
                <h3 className="font-bold text-base font-['Plus_Jakarta_Sans',sans-serif]">
                  {editingItem ? 'Editar Investimento' : 'Novo Investimento em Tráfego'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Data do Investimento *
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-[#1A94C5] focus:ring-2 focus:ring-[#1A94C5]/20 bg-slate-50/50 font-medium"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Define o mês de competência para o cálculo do CPL e CAC.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Valor do Aporte (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0,00"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-hidden focus:border-[#1A94C5] focus:ring-2 focus:ring-[#1A94C5]/20 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Canal / Origem do Tráfego
                </label>
                <select
                  value={formChannel}
                  onChange={e => setFormChannel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-[#1A94C5] focus:ring-2 focus:ring-[#1A94C5]/20 bg-slate-50/50"
                >
                  <option value="Meta Ads">Meta Ads (Instagram & Facebook)</option>
                  <option value="Google Ads">Google Ads (Search & Performance Max)</option>
                  <option value="TikTok Ads">TikTok Ads</option>
                  <option value="YouTube Ads">YouTube Ads</option>
                  <option value="LinkedIn Ads">LinkedIn Ads</option>
                  <option value="Geral">Geral / Outros Canais</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notas / Campanha
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Campanha de captação WhatsApp Março 2026..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#1A94C5] focus:ring-2 focus:ring-[#1A94C5]/20 bg-slate-50/50 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#002139] hover:bg-[#00375a] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : (editingItem ? 'Salvar Alterações' : 'Registrar Investimento')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Excluir Lançamento?</h3>
            </div>
            <p className="text-xs text-slate-500">
              Esta ação removerá o registro de investimento permanentemente e recalculará o CAC e CPL dos períodos afetados.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
