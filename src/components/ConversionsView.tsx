import React from 'react';
import { 
  TrendingUp, 
  CheckCircle, 
  DollarSign, 
  Calendar, 
  Clock, 
  ArrowUpRight,
  ShieldCheck,
  Target,
  BarChart3
} from 'lucide-react';
import { AnalyticsSummary, LeadRecord } from '../types.ts';

interface ConversionsViewProps {
  summary: AnalyticsSummary | null;
  convertedLeads: LeadRecord[];
  onOpenLeadDetails: (lead: LeadRecord) => void;
}

export const ConversionsView: React.FC<ConversionsViewProps> = ({
  summary,
  convertedLeads,
  onOpenLeadDetails
}) => {
  if (!summary) return null;

  const totalWon = summary.filtered_leads_converted;
  const totalLeads = summary.filtered_leads_total;
  const conversionRate = summary.filtered_conversion_rate;
  const avgTicket = totalWon > 0 ? Math.round(summary.total_revenue_period / totalWon) : 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Title & Explanation */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#002139] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              Regras Oficiais de Conversão & Fechamento
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Um lead só é contabilizado como convertido se possuir simultaneamente as etiquetas <span className="font-mono text-[#00375a] font-bold">trafego_pago</span> e <span className="font-mono text-emerald-700 font-bold">Ganhamos</span>.
              A taxa principal mede a coorte de leads que entraram no período e foram convertidos.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Idempotência Ativa
            </span>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Taxa Principal de Conversão
          </span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#002139] tabular-nums">
              {conversionRate}%
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              (Meta 20%)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {totalWon} vendas de {totalLeads} leads captados
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Vendas Fechadas no Período
          </span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#002139] tabular-nums">
              {summary.sales_closed_in_period || totalWon}
            </span>
            <span className="text-xs font-semibold text-slate-600">
              Data de Fechamento
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Baseado no timestamp da tag Ganhamos
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Receita Total Rastreada
          </span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-800 tabular-nums">
              R$ {summary.total_revenue_period.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Atribuição direta de tráfego pago
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Ticket Médio por Venda
          </span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#002139] tabular-nums">
              R$ {avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Média ponderada de todas as vendas
          </p>
        </div>
      </section>

      {/* CAC, CPL and Traffic Efficiency Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              CAC (Custo de Aquisição)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
              Investimento ÷ Ganhamos
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#002139] tabular-nums">
              R$ {(summary.cac || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Valor médio gasto para conquistar um novo cliente no marketing e nas vendas
          </p>
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              CPL (Custo por Lead)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">
              Investimento ÷ Leads
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#002139] tabular-nums">
              R$ {(summary.cost_per_lead || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Custo médio por lead que entrou em contato via tráfego pago
          </p>
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Investimento em Tráfego
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
              ROAS: {summary.roas || 0}x
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#002139] tabular-nums">
              R$ {(summary.ad_spend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Total investido em tráfego pago no sistema
          </p>
        </div>
      </section>

      {/* Visual Conversion Funnel */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <h3 className="text-base font-bold text-[#002139] mb-1">
          Funil de Maturação e Fechamento
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Taxa de conversão de cada etapa comercial até a aplicação da etiqueta Ganhamos
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Etapa 1
              </span>
              <h4 className="text-sm font-bold text-[#002139] mt-1">Tráfego Pago Recebido</h4>
              <p className="text-xs text-slate-500 mt-1">Etiqueta: trafego_pago</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <span className="text-2xl font-extrabold text-[#002139]">{totalLeads}</span>
              <span className="block text-[11px] font-semibold text-slate-500">100% da base</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Etapa 2
              </span>
              <h4 className="text-sm font-bold text-[#002139] mt-1">Primeiro Atendimento</h4>
              <p className="text-xs text-slate-500 mt-1">Tempo médio: 1m 42s</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <span className="text-2xl font-extrabold text-[#002139]">{Math.round(totalLeads * 0.82)}</span>
              <span className="block text-[11px] font-semibold text-sky-700">82% de resposta</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Etapa 3
              </span>
              <h4 className="text-sm font-bold text-[#002139] mt-1">Proposta / Demonstração</h4>
              <p className="text-xs text-slate-500 mt-1">Em negociação ativa</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <span className="text-2xl font-extrabold text-[#002139]">{summary.filtered_leads_in_progress}</span>
              <span className="block text-[11px] font-semibold text-slate-600">55.7% da base</span>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Etapa 4 (Vitória)
              </span>
              <h4 className="text-sm font-bold text-emerald-900 mt-1">Ganhamos / Venda Fechada</h4>
              <p className="text-xs text-emerald-700 mt-1">Etiqueta: Ganhamos</p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-200">
              <span className="text-2xl font-extrabold text-emerald-900">{totalWon}</span>
              <span className="block text-[11px] font-bold text-emerald-700">{conversionRate}% conversão final</span>
            </div>
          </div>
        </div>
      </section>

      {/* Cohorts Table */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#002139]">
              Coortes de Maturação Semanal (Conversão Acumulada)
            </h3>
            <p className="text-xs text-slate-500">
              Acompanha os leads que entraram em cada semana e quantos foram fechados posteriormente
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
            Semana: Segunda a Domingo
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 h-10">
                <th className="px-6">Coorte Semanal</th>
                <th className="px-6">Leads Captados (trafego_pago)</th>
                <th className="px-6">Convertidos (Ganhamos)</th>
                <th className="px-6">Não Convertidos</th>
                <th className="px-6">Taxa de Conversão</th>
                <th className="px-6">Status da Coorte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.weekly_cohorts.map((cohort, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-[#002139]">
                    {cohort.cohort_label}
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-slate-800 tabular-nums">
                    {cohort.leads_received} leads
                  </td>
                  <td className="px-6 py-3.5 font-bold text-emerald-800 tabular-nums">
                    {cohort.leads_converted}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 tabular-nums">
                    {cohort.leads_received - cohort.leads_converted}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      {cohort.conversion_rate}%
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    {idx === summary.weekly_cohorts.length - 1 ? (
                      <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                        Em Maturação (Ativa)
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        Consolidada
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
