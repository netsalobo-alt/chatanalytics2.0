import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  Percent, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Radio,
  Building
} from 'lucide-react';
import { AnalyticsSummary, LeadRecord } from '../types.ts';

interface DashboardViewProps {
  summary: AnalyticsSummary | null;
  recentLeads: LeadRecord[];
  onNavigateToLeads: (statusFilter?: string) => void;
  onOpenLeadDetails: (lead: LeadRecord) => void;
  onNavigateToInvestments?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  recentLeads,
  onNavigateToLeads,
  onOpenLeadDetails,
  onNavigateToInvestments
}) => {
  const [chartDaysRange, setChartDaysRange] = useState<7 | 14 | 30>(7);

  if (!summary) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-2 border-[#002139] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold">Carregando indicadores do ChatAnalytics 2.0...</span>
        </div>
      </div>
    );
  }

  // Daily series dynamic values
  const allDailySeries = summary.daily_series || [];
  const dailySeries = allDailySeries.slice(-chartDaysRange);
  const maxDailyReceived = Math.max(1, ...dailySeries.map(d => d.leads_received));

  const totalPeriodLeads = summary.filtered_leads_total || summary.leads_total_historical || 0;

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Platform Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-[#002139] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
              Visão Geral • Dashboard
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#002139] text-[#c1ef6d]">
              ChatAnalytics 2.0
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Métricas de captação de leads, funil de qualificação e conversão integradas ao Chatwoot em tempo real.
          </p>
        </div>

        <button
          onClick={() => onNavigateToLeads()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-[#002139] hover:border-slate-300 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <span>Gerenciar Leads</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ==================================================== */}
      {/* ROW 1: PRIMARY VOLUME & SALES INDICATORS             */}
      {/* ==================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Leads Hoje */}
        <article className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Leads Hoje
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-3xl font-black text-[#002139] tabular-nums font-['Plus_Jakarta_Sans',sans-serif]">
              {summary.leads_today}
            </span>
            <span className="text-xs font-bold text-slate-500">
              Ontem: {summary.leads_yesterday}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Últimos 7 dias:</span>
            <strong className="text-slate-800">{summary.leads_last_7_days} leads</strong>
          </div>
        </article>

        {/* Card 2: Esta Semana */}
        <article className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Esta Semana
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-3xl font-black text-[#002139] tabular-nums font-['Plus_Jakarta_Sans',sans-serif]">
              {summary.leads_this_week}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Segunda a Domingo
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Média diária:</span>
            <strong className="text-slate-800">
              {summary.leads_this_week > 0 ? (summary.leads_this_week / 7).toFixed(1) : '0'} leads/dia
            </strong>
          </div>
        </article>

        {/* Card 3: Este Mês */}
        <article className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Este Mês
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#002139] flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-3xl font-black text-[#002139] tabular-nums font-['Plus_Jakarta_Sans',sans-serif]">
              {summary.leads_this_month.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Mês ant: {summary.leads_last_month}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Total acumulado no ano:</span>
            <strong className="text-slate-800">{summary.leads_this_year.toLocaleString('pt-BR')}</strong>
          </div>
        </article>

        {/* Card 4: Vendas e Faturamento */}
        <article className="bg-white p-5 rounded-3xl border border-emerald-200 bg-emerald-50/20 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Vendas Fechadas
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-3xl font-black text-emerald-800 tabular-nums font-['Plus_Jakarta_Sans',sans-serif]">
              {summary.vendas}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              R$ {summary.total_vendas_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="pt-2 border-t border-emerald-100 flex items-center justify-between text-[11px] text-emerald-700">
            <span>Ticket Médio:</span>
            <strong className="font-bold">
              R$ {summary.vendas > 0 ? (summary.total_vendas_valor / summary.vendas).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0,00'}
            </strong>
          </div>
        </article>
      </section>

      {/* ==================================================== */}
      {/* ROW 2: FORMULA-BASED CONVERSION & APPROVAL RATES     */}
      {/* ==================================================== */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Taxa de Aprovação */}
        <article className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Taxa de Aprovação
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Fórmula: Aprovados ÷ (Aprovados + Reprovados) × 100
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#002139] text-[#c1ef6d] flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-baseline gap-3 my-2">
            <span className="text-4xl font-black text-[#002139] tabular-nums font-['Plus_Jakarta_Sans',sans-serif]">
              {summary.taxa_aprovacao}%
            </span>
            <span className="text-xs font-semibold text-slate-600">
              ({summary.aprovados} aprovados de {summary.aprovados + summary.reprovados} avaliados)
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden my-3">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary.taxa_aprovacao)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Aprovados: {summary.aprovados}
            </span>
            <span className="flex items-center gap-1.5 text-rose-700 font-bold">
              <XCircle className="w-3.5 h-3.5" /> Reprovados: {summary.reprovados}
            </span>
          </div>
        </article>

        {/* Taxa de Conversão */}
        <article className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Taxa de Conversão em Vendas
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Fórmula: Leads com Venda ÷ Total de Leads × 100
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#002139] text-[#c1ef6d] flex items-center justify-center font-bold">
              <Percent className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-baseline gap-3 my-2">
            <span className="text-4xl font-black text-[#002139] tabular-nums font-['Plus_Jakarta_Sans',sans-serif]">
              {summary.taxa_conversao}%
            </span>
            <span className="text-xs font-semibold text-slate-600">
              ({summary.vendas} vendas em {totalPeriodLeads} leads totais)
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden my-3">
            <div 
              className="bg-[#1A94C5] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary.taxa_conversao)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-slate-700 font-bold">
              Total de Vendas: {summary.vendas}
            </span>
            <span className="text-slate-700 font-bold">
              Volume Total: {totalPeriodLeads} leads
            </span>
          </div>
        </article>
      </section>

      {/* ==================================================== */}
      {/* ROW 3: PIPELINE DE QUALIFICAÇÃO (STATUS BREAKDOWN)   */}
      {/* ==================================================== */}
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#002139] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
              Funil de Qualificação de Leads (Status)
            </h3>
            <p className="text-xs text-slate-400">
              Distribuição dos leads cadastrados nos estágios de análise e aprovação comercial
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Novo Lead */}
          <button
            onClick={() => onNavigateToLeads('NOVO LEAD')}
            className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Novo Lead</span>
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            </div>
            <span className="text-2xl font-black text-blue-900 tabular-nums">
              {summary.novos_leads}
            </span>
            <p className="text-[10px] text-blue-600 mt-1">Aguardando atendimento</p>
          </button>

          {/* 2. Em Análise */}
          <button
            onClick={() => onNavigateToLeads('EM ANÁLISE')}
            className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Em Análise</span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="text-2xl font-black text-amber-900 tabular-nums">
              {summary.em_analise}
            </span>
            <p className="text-[10px] text-amber-600 mt-1">SDR em contato</p>
          </button>

          {/* 3. Pendente */}
          <button
            onClick={() => onNavigateToLeads('PENDENTE')}
            className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Pendente</span>
              <AlertCircle className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <span className="text-2xl font-black text-purple-900 tabular-nums">
              {summary.pendentes}
            </span>
            <p className="text-[10px] text-purple-600 mt-1">Aguardando docs / cliente</p>
          </button>

          {/* 4. Aprovado */}
          <button
            onClick={() => onNavigateToLeads('APROVADO')}
            className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Aprovado</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <span className="text-2xl font-black text-emerald-900 tabular-nums">
              {summary.aprovados}
            </span>
            <p className="text-[10px] text-emerald-600 mt-1">Aprovado para venda</p>
          </button>

          {/* 5. Reprovado */}
          <button
            onClick={() => onNavigateToLeads('REPROVADO')}
            className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Reprovado</span>
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <span className="text-2xl font-black text-rose-900 tabular-nums">
              {summary.reprovados}
            </span>
            <p className="text-[10px] text-rose-600 mt-1">Não aprovado no critério</p>
          </button>
        </div>
      </section>

      {/* ==================================================== */}
      {/* ROW 4: DAILY EVOLUTION CHART & CHANNELS              */}
      {/* ==================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolution Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#002139] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                Volume Diário de Leads Recebidos
              </h3>
              <p className="text-xs text-slate-400">
                Histórico real de contatos que entraram via Chatwoot
              </p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl">
              {([7, 14, 30] as const).map(days => (
                <button
                  key={days}
                  onClick={() => setChartDaysRange(days)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    chartDaysRange === days
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          <div className="h-56 flex items-end gap-2 pt-6 pb-2">
            {dailySeries.map((d, idx) => {
              const heightPercent = maxDailyReceived > 0 ? (d.leads_received / maxDailyReceived) * 100 : 0;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-10 bg-[#002139] text-white text-[10px] font-bold py-1 px-2 rounded-lg whitespace-nowrap shadow-md z-20 transition-opacity">
                    {d.label}: {d.leads_received} leads ({d.leads_converted} vendas)
                  </div>

                  <div className="w-full max-w-[28px] bg-slate-100 hover:bg-[#cee5ff] rounded-t-lg relative flex items-end justify-center transition-all h-full overflow-hidden">
                    <div 
                      className="w-full bg-[#002139] group-hover:bg-[#1A94C5] transition-all rounded-t-lg"
                      style={{ height: `${Math.max(4, heightPercent)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono rotate-45 sm:rotate-0 origin-left sm:origin-center">
                    {d.label.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Channel Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#002139] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
              Canais de Atendimento
            </h3>
            <p className="text-xs text-slate-400">
              Origem dos leads e distribuição de contatos
            </p>
          </div>

          <div className="space-y-3.5 my-2">
            {(summary.channel_distribution || []).slice(0, 5).map(ch => (
              <div key={ch.channel} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{ch.channel}</span>
                  <span className="font-mono text-slate-500">
                    {ch.leads_received} leads ({ch.conversion_rate}% conv)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#002139] h-full rounded-full"
                    style={{ width: `${Math.min(100, ch.share_percentage || 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigateToLeads()}
            className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold text-center cursor-pointer transition-colors"
          >
            Ver todos os canais detalhados
          </button>
        </div>
      </section>

      {/* ==================================================== */}
      {/* ROW 5: RECENT LEADS QUICK TABLE                     */}
      {/* ==================================================== */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#002139] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
              Últimos Leads Cadastrados
            </h3>
            <p className="text-xs text-slate-400">
              Interações mais recentes registradas na plataforma
            </p>
          </div>
          <button
            onClick={() => onNavigateToLeads()}
            className="text-xs font-bold text-[#1A94C5] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver listagem completa</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {recentLeads.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Nenhum lead registrado recentemente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Lead</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Vendedor / Loja</th>
                  <th className="py-3 px-4">Venda</th>
                  <th className="py-3 px-4">Última Interação</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentLeads.slice(0, 6).map(lead => (
                  <tr 
                    key={lead.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => onOpenLeadDetails(lead)}
                  >
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {lead.contact_name}
                      <span className="block text-[11px] font-mono text-slate-400 font-normal">
                        {lead.contact_phone || `#CW-${lead.conversation_id}`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        lead.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-800' :
                        lead.status === 'REPROVADO' ? 'bg-rose-100 text-rose-800' :
                        lead.status === 'EM ANÁLISE' ? 'bg-amber-100 text-amber-800' :
                        lead.status === 'PENDENTE' ? 'bg-purple-100 text-purple-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {lead.vendedor || 'Não atribuído'}
                      <span className="block text-[10px] text-slate-400">{lead.loja || '-'}</span>
                    </td>
                    <td className="py-3 px-4">
                      {lead.vendeu ? (
                        <span className="font-bold text-emerald-700">Sim</span>
                      ) : (
                        <span className="text-slate-400">Não</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(lead.last_interaction_at || lead.entry_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                      {lead.chatwoot_url && (
                        <a
                          href={lead.chatwoot_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#002139] hover:text-[#1A94C5]"
                        >
                          <span>Chatwoot</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
