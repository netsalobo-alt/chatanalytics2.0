import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  BarChart3,
  DollarSign,
  TrendingDown,
  Layers,
  ArrowUpRight,
  Info,
  X,
  FileCheck,
  ExternalLink,
  Check
} from 'lucide-react';
import { AnalyticsSummary, PeriodFilter } from '../types.ts';

interface ReportsViewProps {
  summary: AnalyticsSummary | null;
  period: PeriodFilter;
  onExportCsv: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  summary,
  period,
  onExportCsv
}) => {
  const [activeTab, setActiveTab] = useState<'financial' | 'efficiency' | 'channels'>('financial');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDownloadingPdfHtml, setIsDownloadingPdfHtml] = useState(false);

  if (!summary) return null;

  const periodLabelMap: Record<PeriodFilter, string> = {
    today: 'Hoje',
    yesterday: 'Ontem',
    last_7_days: 'Últimos 7 dias',
    this_week: 'Semana Atual',
    this_month: 'Mês Atual',
    last_month: 'Mês Anterior',
    this_year: 'Ano Atual',
    all: 'Total Histórico',
    custom: 'Período Personalizado'
  };

  const monthlyPerf = summary.monthly_performance || [];

  // Determine scales for charts
  const maxSpendOrRevenue = Math.max(
    1000,
    ...monthlyPerf.map(m => Math.max(m.ad_spend, m.revenue))
  );

  const maxCacOrCpl = Math.max(
    50,
    ...monthlyPerf.map(m => Math.max(m.cac, m.cpl))
  );

  const maxLeads = Math.max(
    10,
    ...monthlyPerf.map(m => m.leads_count)
  );

  const handlePrint = () => {
    // Open the Print & PDF Modal for guaranteed execution
    setIsPrintModalOpen(true);
    // Also try direct window.print() if allowed by environment
    try {
      window.print();
    } catch (e) {
      console.warn('Iframe blocked print():', e);
    }
  };

  const generateAndDownloadReportHtml = () => {
    setIsDownloadingPdfHtml(true);
    try {
      const nowStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Belem' });
      const periodLabel = periodLabelMap[period] || period;

      const htmlContent = `<!DOCTYPE html>
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
        Filtro: <strong>${periodLabel}</strong> • Emitido em: ${nowStr} (Horário Oficial de Belém - America/Belem)
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

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_executivo_${period}_${Date.now()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloadingPdfHtml(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto print:p-0 print:m-0">
      {/* Top Banner & Export Actions */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:border-none print:shadow-none">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Relatório Executivo Oficial
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#002139] mt-1 font-['Plus_Jakarta_Sans',sans-serif]">
            Relatório de Performance Comercial & Mídia Paga
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dados sincronizados em tempo real com Chatwoot • Horário Oficial de Belém (America/Belem)
          </p>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={onExportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#002139] text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <Download className="w-4 h-4 text-[#1A94C5]" />
            <span>Baixar Planilha (CSV)</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#002139] hover:bg-[#00375a] text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-[0.98]"
          >
            <Printer className="w-4 h-4 text-[#c1ef6d]" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Highlights Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Leads Captados (trafego_pago)
          </span>
          <span className="text-2xl font-extrabold text-[#002139] mt-2 block tabular-nums">
            {summary.filtered_leads_total.toLocaleString('pt-BR')}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">Filtro: {periodLabelMap[period] || period}</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Leads Convertidos (Ganhamos)
          </span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-2 block tabular-nums">
            {summary.filtered_leads_converted.toLocaleString('pt-BR')}
          </span>
          <span className="text-xs text-emerald-700 mt-1 block">
            Taxa: {summary.filtered_conversion_rate}%
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Investimento Alocado
          </span>
          <span className="text-2xl font-extrabold text-[#002139] mt-2 block tabular-nums">
            R$ {(summary.ad_spend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            {summary.total_invested_all_time > 0 ? `Total Geral: R$ ${summary.total_invested_all_time.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Orçamento configurado'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Receita Total Rastreada
          </span>
          <span className="text-2xl font-extrabold text-emerald-700 mt-2 block tabular-nums">
            R$ {summary.total_revenue_period.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            ROAS: <strong className="text-emerald-700">{summary.roas || 0}x</strong>
          </span>
        </div>
      </section>

      {/* Traffic Cost & Efficiency Bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100">
          <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
            CPL (Custo por Lead)
          </span>
          <span className="text-xl font-extrabold text-[#002139] mt-1.5 block tabular-nums">
            R$ {(summary.cost_per_lead || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Investimento ÷ Total Leads</span>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            CAC (Custo de Aquisição)
          </span>
          <span className="text-xl font-extrabold text-emerald-900 mt-1.5 block tabular-nums">
            R$ {(summary.cac || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-emerald-700 mt-1 block">Investimento ÷ Clientes Ganhos</span>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Ticket Médio
          </span>
          <span className="text-xl font-extrabold text-[#002139] mt-1.5 block tabular-nums">
            R$ {summary.filtered_leads_converted > 0 ? (summary.total_revenue_period / summary.filtered_leads_converted).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Receita ÷ Vendas Ganhamos</span>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Melhor Canal
          </span>
          <span className="text-xl font-extrabold text-[#002139] mt-1.5 block truncate" title={summary.top_converting_channel.name}>
            {summary.top_converting_channel.name}
          </span>
          <span className="text-[11px] text-emerald-700 mt-1 block font-semibold">
            {summary.top_converting_channel.rate}% de conversão
          </span>
        </div>
      </section>

      {/* Visual Charts Container */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h3 className="text-base font-bold text-[#002139] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#1A94C5]" />
              <span>Análise Gráfica & Indicadores de Desempenho</span>
            </h3>
            <p className="text-xs text-slate-500">
              Evolução cronológica de investimento, captação, conversão e CAC mês a mês
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 print:hidden">
            <button
              onClick={() => setActiveTab('financial')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'financial' ? 'bg-white text-[#002139] shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Financeiro (Invest. x Receita)
            </button>
            <button
              onClick={() => setActiveTab('efficiency')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'efficiency' ? 'bg-white text-[#002139] shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Eficiência (CAC x CPL)
            </button>
            <button
              onClick={() => setActiveTab('channels')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'channels' ? 'bg-white text-[#002139] shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Canais & Conversão
            </button>
          </div>
        </div>

        {/* Tab 1: Financial Evolution (Investimento vs Receita) */}
        {activeTab === 'financial' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#002139]"></span>
                  <span className="font-semibold text-slate-700">Investimento em Tráfego (R$)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-emerald-600"></span>
                  <span className="font-semibold text-slate-700">Receita de Vendas (R$)</span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400">Passe o mouse nas colunas para detalhar</span>
            </div>

            {/* SVG Grouped Bar Chart */}
            <div className="relative h-64 w-full bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col justify-end">
              {monthlyPerf.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Sem dados suficientes para exibir o gráfico mensal.
                </div>
              ) : (
                <div className="h-48 w-full flex items-end justify-around gap-2 px-2 pt-6">
                  {monthlyPerf.map((point) => {
                    const spendHeightPct = maxSpendOrRevenue > 0 ? (point.ad_spend / maxSpendOrRevenue) * 100 : 0;
                    const revHeightPct = maxSpendOrRevenue > 0 ? (point.revenue / maxSpendOrRevenue) * 100 : 0;
                    const isHovered = hoveredMonth === point.month_key;

                    return (
                      <div
                        key={point.month_key}
                        className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                        onMouseEnter={() => setHoveredMonth(point.month_key)}
                        onMouseLeave={() => setHoveredMonth(null)}
                      >
                        {/* Tooltip */}
                        {isHovered && (
                          <div className="absolute -top-16 z-20 bg-[#002139] text-white text-[11px] py-1.5 px-3 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                            <p className="font-bold text-[#c1ef6d]">{point.month_label}</p>
                            <p>Investido: R$ {point.ad_spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p>Receita: R$ {point.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p>ROAS: {point.roas}x</p>
                          </div>
                        )}

                        {/* Bars container */}
                        <div className="w-full max-w-[64px] flex items-end justify-center gap-1.5 h-full">
                          {/* Spend Bar */}
                          <div
                            style={{ height: `${Math.max(4, spendHeightPct)}%` }}
                            className={`w-1/2 bg-[#002139] rounded-t-sm transition-all duration-300 ${
                              isHovered ? 'bg-[#00375a] scale-y-105' : ''
                            }`}
                          />
                          {/* Revenue Bar */}
                          <div
                            style={{ height: `${Math.max(4, revHeightPct)}%` }}
                            className={`w-1/2 bg-emerald-600 rounded-t-sm transition-all duration-300 ${
                              isHovered ? 'bg-emerald-500 scale-y-105' : ''
                            }`}
                          />
                        </div>

                        {/* Month Label */}
                        <span className="text-[11px] font-bold text-slate-600 mt-2 truncate w-full text-center">
                          {point.month_label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Efficiency (CAC x CPL) */}
        {activeTab === 'efficiency' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-600"></span>
                  <span className="font-semibold text-slate-700">CAC - Custo de Aquisição (R$)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-sky-600"></span>
                  <span className="font-semibold text-slate-700">CPL - Custo por Lead (R$)</span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400">Quanto menor a linha, maior a eficiência</span>
            </div>

            {/* SVG Line / Dot Chart */}
            <div className="relative h-64 w-full bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col justify-end">
              <div className="h-48 w-full flex items-end justify-around gap-2 px-2 pt-6">
                {monthlyPerf.map((point) => {
                  const cacPct = maxCacOrCpl > 0 ? (point.cac / maxCacOrCpl) * 100 : 0;
                  const cplPct = maxCacOrCpl > 0 ? (point.cpl / maxCacOrCpl) * 100 : 0;
                  const isHovered = hoveredMonth === point.month_key;

                  return (
                    <div
                      key={point.month_key}
                      className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                      onMouseEnter={() => setHoveredMonth(point.month_key)}
                      onMouseLeave={() => setHoveredMonth(null)}
                    >
                      {/* Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-16 z-20 bg-[#002139] text-white text-[11px] py-1.5 px-3 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                          <p className="font-bold text-[#c1ef6d]">{point.month_label}</p>
                          <p>CAC: R$ {point.cac.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p>CPL: R$ {point.cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p>Vendas: {point.conversions_count} ({point.conversion_rate}%)</p>
                        </div>
                      )}

                      {/* Visual Pill Column */}
                      <div className="w-full flex flex-col items-center justify-end h-full relative">
                        {/* CAC Marker */}
                        <div
                          style={{ bottom: `${Math.max(6, Math.min(92, cacPct))}%` }}
                          className="absolute w-3.5 h-3.5 rounded-full bg-rose-600 border-2 border-white shadow-sm flex items-center justify-center transition-all group-hover:scale-125"
                        />
                        {/* CPL Marker */}
                        <div
                          style={{ bottom: `${Math.max(6, Math.min(92, cplPct))}%` }}
                          className="absolute w-3 h-3 rounded-full bg-sky-600 border-2 border-white shadow-sm flex items-center justify-center transition-all group-hover:scale-125"
                        />
                        {/* Connecting background stick */}
                        <div className="w-0.5 h-full bg-slate-200 group-hover:bg-slate-300 transition-colors" />
                      </div>

                      <span className="text-[11px] font-bold text-slate-600 mt-2 truncate w-full text-center">
                        {point.month_label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Channels & Conversion */}
        {activeTab === 'channels' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Channel Conversion Bars */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Taxa de Conversão por Canal
                </span>
                {summary.channel_distribution.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">Nenhum canal registrado.</p>
                ) : (
                  summary.channel_distribution.map(ch => (
                    <div key={ch.channel} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-[#002139]">{ch.channel_detail || ch.channel}</span>
                        <span className="font-extrabold text-emerald-800 tabular-nums">{ch.conversion_rate}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, ch.conversion_rate)}%` }}
                          className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>{ch.leads_received} leads captados</span>
                        <span>{ch.leads_converted} convertidos</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Channel Volume Distribution */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Participação no Volume de Leads
                </span>
                {summary.channel_distribution.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">Nenhum canal registrado.</p>
                ) : (
                  summary.channel_distribution.map(ch => (
                    <div key={ch.channel} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-[#002139]">{ch.channel_detail || ch.channel}</span>
                        <span className="font-semibold text-slate-700 tabular-nums">{ch.share_percentage}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, ch.share_percentage)}%` }}
                          className="h-full bg-[#002139] rounded-full transition-all duration-500"
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Receita: R$ {ch.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span>{ch.leads_received} leads</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Monthly Performance Consolidated Table */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#002139]">
              Consolidação Mensal: Investimento, Leads, CAC e Receita
            </h3>
            <p className="text-xs text-slate-500">
              Histórico cruzado de investimento registrado mês a mês com os leads identificados com a tag trafego_pago
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[750px]">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 h-10">
                <th className="px-6">Mês</th>
                <th className="px-6 text-right">Investimento (R$)</th>
                <th className="px-6 text-right">Leads Captados</th>
                <th className="px-6 text-right">Clientes Ganhos</th>
                <th className="px-6 text-right">Taxa Conv.</th>
                <th className="px-6 text-right">CPL</th>
                <th className="px-6 text-right">CAC</th>
                <th className="px-6 text-right">Receita Total</th>
                <th className="px-6 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyPerf.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-slate-400">
                    Aguardando primeiros registros de investimento e captação.
                  </td>
                </tr>
              ) : (
                monthlyPerf.map(m => (
                  <tr key={m.month_key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-[#002139]">{m.month_label}</td>
                    <td className="px-6 py-3.5 text-right font-medium text-slate-800 tabular-nums">
                      R$ {m.ad_spend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3.5 text-right tabular-nums">{m.leads_count}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-emerald-800 tabular-nums">{m.conversions_count}</td>
                    <td className="px-6 py-3.5 text-right font-semibold text-emerald-800 tabular-nums">{m.conversion_rate}%</td>
                    <td className="px-6 py-3.5 text-right text-sky-800 font-medium tabular-nums">
                      R$ {m.cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3.5 text-right text-emerald-900 font-bold tabular-nums">
                      R$ {m.cac.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-slate-800 tabular-nums">
                      R$ {m.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-slate-900 tabular-nums">
                      {m.roas}x
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {monthlyPerf.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t border-slate-200">
                  <td className="px-6 py-3 text-slate-800 uppercase tracking-wider text-[11px]">
                    Total Consolidado
                  </td>
                  <td className="px-6 py-3 text-right text-[#002139] tabular-nums">
                    R$ {monthlyPerf.reduce((acc, m) => acc + m.ad_spend, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3 text-right text-[#002139] tabular-nums">
                    {monthlyPerf.reduce((acc, m) => acc + m.leads_count, 0)}
                  </td>
                  <td className="px-6 py-3 text-right text-emerald-800 tabular-nums">
                    {monthlyPerf.reduce((acc, m) => acc + m.conversions_count, 0)}
                  </td>
                  <td className="px-6 py-3 text-right text-emerald-800 tabular-nums">
                    {(() => {
                      const totalL = monthlyPerf.reduce((acc, m) => acc + m.leads_count, 0);
                      const totalC = monthlyPerf.reduce((acc, m) => acc + m.conversions_count, 0);
                      return totalL > 0 ? `${((totalC / totalL) * 100).toFixed(1)}%` : '0%';
                    })()}
                  </td>
                  <td className="px-6 py-3 text-right text-sky-800 tabular-nums">
                    {(() => {
                      const totalS = monthlyPerf.reduce((acc, m) => acc + m.ad_spend, 0);
                      const totalL = monthlyPerf.reduce((acc, m) => acc + m.leads_count, 0);
                      return totalL > 0 ? `R$ ${(totalS / totalL).toFixed(2).replace('.', ',')}` : 'R$ 0,00';
                    })()}
                  </td>
                  <td className="px-6 py-3 text-right text-emerald-900 tabular-nums">
                    {(() => {
                      const totalS = monthlyPerf.reduce((acc, m) => acc + m.ad_spend, 0);
                      const totalC = monthlyPerf.reduce((acc, m) => acc + m.conversions_count, 0);
                      return totalC > 0 ? `R$ ${(totalS / totalC).toFixed(2).replace('.', ',')}` : 'R$ 0,00';
                    })()}
                  </td>
                  <td className="px-6 py-3 text-right text-[#002139] tabular-nums">
                    R$ {monthlyPerf.reduce((acc, m) => acc + m.revenue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3 text-right text-[#002139] tabular-nums">
                    {(() => {
                      const totalS = monthlyPerf.reduce((acc, m) => acc + m.ad_spend, 0);
                      const totalR = monthlyPerf.reduce((acc, m) => acc + m.revenue, 0);
                      return totalS > 0 ? `${(totalR / totalS).toFixed(2)}x` : '0x';
                    })()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Breakdown by Periods Table */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-[#002139]">
            Consolidação dos Períodos de Auditoria (Regras de Fechamento)
          </h3>
          <p className="text-xs text-slate-500">
            Fuso horário America/Belem com semana iniciando na Segunda-feira
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[650px]">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 h-10">
                <th className="px-6">Período de Referência</th>
                <th className="px-6 text-right">Leads Recebidos (trafego_pago)</th>
                <th className="px-6 text-right">Comparativo / Variação</th>
                <th className="px-6 text-right">Status do Período</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-3.5 font-bold text-[#002139]">Hoje</td>
                <td className="px-6 py-3.5 text-right font-semibold text-slate-800 tabular-nums">{summary.leads_today}</td>
                <td className="px-6 py-3.5 text-right font-bold text-emerald-700 tabular-nums">
                  {summary.growth_today_vs_yesterday > 0 ? `+${summary.growth_today_vs_yesterday}%` : `${summary.growth_today_vs_yesterday}%`} vs ontem
                </td>
                <td className="px-6 py-3.5 text-right text-slate-500">Em andamento</td>
              </tr>
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-3.5 font-bold text-[#002139]">Ontem</td>
                <td className="px-6 py-3.5 text-right font-semibold text-slate-800 tabular-nums">{summary.leads_yesterday}</td>
                <td className="px-6 py-3.5 text-right text-slate-500 tabular-nums">-</td>
                <td className="px-6 py-3.5 text-right text-slate-500">Consolidado</td>
              </tr>
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-3.5 font-bold text-[#002139]">Últimos 7 dias</td>
                <td className="px-6 py-3.5 text-right font-semibold text-slate-800 tabular-nums">{summary.leads_last_7_days}</td>
                <td className="px-6 py-3.5 text-right text-slate-500 tabular-nums">Janela móvel</td>
                <td className="px-6 py-3.5 text-right text-slate-500">7 dias corridos</td>
              </tr>
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-3.5 font-bold text-[#002139]">Semana Atual (Seg - Dom)</td>
                <td className="px-6 py-3.5 text-right font-semibold text-slate-800 tabular-nums">{summary.leads_this_week}</td>
                <td className="px-6 py-3.5 text-right text-slate-500 tabular-nums">Semana em curso</td>
                <td className="px-6 py-3.5 text-right text-slate-500">America/Belem</td>
              </tr>
              <tr className="hover:bg-slate-50/80 transition-colors bg-emerald-50/30">
                <td className="px-6 py-3.5 font-bold text-[#002139]">Mês Atual</td>
                <td className="px-6 py-3.5 text-right font-extrabold text-[#002139] tabular-nums">{summary.leads_this_month.toLocaleString('pt-BR')}</td>
                <td className="px-6 py-3.5 text-right font-bold text-emerald-700 tabular-nums">
                  {summary.growth_month_vs_last_month > 0 ? `+${summary.growth_month_vs_last_month}%` : `${summary.growth_month_vs_last_month}%`} vs mês anterior
                </td>
                <td className="px-6 py-3.5 text-right font-bold text-emerald-800">Em curso</td>
              </tr>
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-3.5 font-bold text-[#002139]">Mês Anterior</td>
                <td className="px-6 py-3.5 text-right font-semibold text-slate-800 tabular-nums">{summary.leads_last_month.toLocaleString('pt-BR')}</td>
                <td className="px-6 py-3.5 text-right text-slate-500 tabular-nums">-</td>
                <td className="px-6 py-3.5 text-right text-slate-500">Consolidado</td>
              </tr>
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-3.5 font-bold text-[#002139]">Ano Atual</td>
                <td className="px-6 py-3.5 text-right font-semibold text-slate-800 tabular-nums">{summary.leads_this_year.toLocaleString('pt-BR')}</td>
                <td className="px-6 py-3.5 text-right text-slate-500 tabular-nums">-</td>
                <td className="px-6 py-3.5 text-right text-slate-500">Ano civil</td>
              </tr>
              <tr className="hover:bg-slate-50/80 transition-colors font-bold text-slate-900 bg-slate-50">
                <td className="px-6 py-3.5">Total Histórico Auditado</td>
                <td className="px-6 py-3.5 text-right tabular-nums">{summary.leads_total_historical.toLocaleString('pt-BR')}</td>
                <td className="px-6 py-3.5 text-right text-emerald-700">100% Rastreável</td>
                <td className="px-6 py-3.5 text-right text-slate-600">Base total</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      {/* Print & PDF Export Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs print:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#002139] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-[#c1ef6d]" />
                <h3 className="font-bold text-base font-['Plus_Jakarta_Sans',sans-serif]">
                  Imprimir / Salvar em PDF
                </h3>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#002139]">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Relatório Consolidado Pronto ({periodLabelMap[period] || period})</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  O documento inclui todos os indicadores financeiros, CPL, CAC, faturamento, tabela consolidada mensal e divisão por canais de tráfego.
                </p>
              </div>

              {/* Action Cards */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={generateAndDownloadReportHtml}
                  disabled={isDownloadingPdfHtml}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-[#002139] hover:bg-[#00375a] text-white text-left transition-all shadow-md cursor-pointer group active:scale-[0.99]"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold flex items-center gap-1.5 text-white">
                      <Download className="w-4 h-4 text-[#c1ef6d]" />
                      Baixar Relatório para Salvar em PDF (Recomendado)
                    </span>
                    <span className="text-[11px] text-slate-300 block">
                      Gera arquivo pronto que aciona o salvamento em PDF automaticamente
                    </span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#c1ef6d] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>

                <a
                  href={`/api/export/printable-report?period=${period}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 text-left transition-all cursor-pointer group"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#002139] flex items-center gap-1.5">
                      <ExternalLink className="w-4 h-4 text-[#1A94C5]" />
                      Abrir em Nova Aba para Impressão Direta
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Abre a visualização limpa do documento sem as restrições do iframe
                    </span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      window.print();
                    } catch (e) {
                      console.warn(e);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tentar Impressão Direta Nesta Janela</span>
                </button>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Como salvar em PDF:</strong> Na janela de impressão que se abrir, selecione a opção <strong>"Salvar como PDF"</strong> no campo "Destino" da impressora.
                </span>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer shadow-2xs"
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
