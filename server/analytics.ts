import type { 
  LeadRecord, 
  AnalyticsFilter, 
  AnalyticsSummary, 
  ChannelPerformance, 
  ChatwootInbox,
  DailyTimeSeriesPoint, 
  CohortPoint, 
  MonthlyTrendPoint,
  InvestmentRecord,
  MonthlyPerformancePoint 
} from './types.ts';
import { getInboxes } from './storage.ts';

// America/Belem is fixed at UTC-3 (no daylight saving time in Brazil since 2019)
export function getBelemDateStr(dateInput: Date | string | number = new Date()): string {
  try {
    let d: Date;
    if (typeof dateInput === 'number') {
      d = dateInput < 10000000000 ? new Date(dateInput * 1000) : new Date(dateInput);
    } else if (typeof dateInput === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return dateInput;
      }
      d = new Date(dateInput);
    } else {
      d = dateInput;
    }

    if (isNaN(d.getTime())) {
      d = new Date();
    }

    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Belem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function formatBelemDateStr(d: Date): string {
  return getBelemDateStr(d);
}

export function getBelemDate(dateInput: Date | string | number = new Date()): Date {
  const str = getBelemDateStr(dateInput);
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRangeForPeriod(period: string, customStart?: string, customEnd?: string, referenceDate: Date = new Date()): DateRange {
  const belemStr = getBelemDateStr(referenceDate);
  const [curYear, curMonth, curDay] = belemStr.split('-').map(Number);
  const curMonthIdx = curMonth - 1;

  function makeBelemDay(y: number, mIdx: number, d: number, endOfDay = false): Date {
    if (endOfDay) {
      return new Date(Date.UTC(y, mIdx, d + 1, 2, 59, 59, 999));
    } else {
      return new Date(Date.UTC(y, mIdx, d, 3, 0, 0, 0));
    }
  }

  switch (period) {
    case 'today': {
      const start = makeBelemDay(curYear, curMonthIdx, curDay, false);
      const end = makeBelemDay(curYear, curMonthIdx, curDay, true);
      return { start, end };
    }
    case 'yesterday': {
      const ref = new Date(Date.UTC(curYear, curMonthIdx, curDay, 12, 0, 0));
      ref.setUTCDate(ref.getUTCDate() - 1);
      const start = makeBelemDay(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), false);
      const end = makeBelemDay(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), true);
      return { start, end };
    }
    case 'last_7_days': {
      const ref = new Date(Date.UTC(curYear, curMonthIdx, curDay, 12, 0, 0));
      ref.setUTCDate(ref.getUTCDate() - 6);
      const start = makeBelemDay(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), false);
      const end = makeBelemDay(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), true);
      return { start, end };
    }
    case 'this_week': {
      const ref = new Date(Date.UTC(curYear, curMonthIdx, curDay, 12, 0, 0));
      const dayOfWeek = ref.getUTCDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(ref);
      monday.setUTCDate(monday.getUTCDate() + diffToMonday);
      
      const sunday = new Date(monday);
      sunday.setUTCDate(sunday.getUTCDate() + 6);
      
      const start = makeBelemDay(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), false);
      const end = makeBelemDay(sunday.getUTCFullYear(), sunday.getUTCMonth(), sunday.getUTCDate(), true);
      return { start, end };
    }
    case 'this_month': {
      const start = makeBelemDay(curYear, curMonthIdx, 1, false);
      const lastDayOfMonth = new Date(Date.UTC(curYear, curMonthIdx + 1, 0)).getUTCDate();
      const end = makeBelemDay(curYear, curMonthIdx, lastDayOfMonth, true);
      return { start, end };
    }
    case 'last_month': {
      const lastMonthYear = curMonthIdx === 0 ? curYear - 1 : curYear;
      const lastMonthIdx = curMonthIdx === 0 ? 11 : curMonthIdx - 1;
      const lastDay = new Date(Date.UTC(lastMonthYear, lastMonthIdx + 1, 0)).getUTCDate();
      const start = makeBelemDay(lastMonthYear, lastMonthIdx, 1, false);
      const end = makeBelemDay(lastMonthYear, lastMonthIdx, lastDay, true);
      return { start, end };
    }
    case 'this_year': {
      const start = makeBelemDay(curYear, 0, 1, false);
      const end = makeBelemDay(curYear, 11, 31, true);
      return { start, end };
    }
    case 'custom': {
      if (customStart && customEnd) {
        const sParts = customStart.split('-').map(Number);
        const eParts = customEnd.split('-').map(Number);
        const start = makeBelemDay(sParts[0], sParts[1] - 1, sParts[2], false);
        const end = makeBelemDay(eParts[0], eParts[1] - 1, eParts[2], true);
        return { start, end };
      }
      const start = makeBelemDay(curYear, curMonthIdx, 1, false);
      const end = makeBelemDay(curYear, curMonthIdx, curDay, true);
      return { start, end };
    }
    case 'all':
    default: {
      const start = new Date(0);
      const end = new Date(Date.now() + 86400000 * 365);
      return { start, end };
    }
  }
}

export function computeAnalytics(
  allLeads: LeadRecord[], 
  filter: AnalyticsFilter, 
  adSpend: number = 0,
  allInvestments: InvestmentRecord[] = []
): AnalyticsSummary {
  // Deduplicate by lead.id
  const uniqueLeadsMap = new Map<string, LeadRecord>();
  for (const lead of allLeads) {
    if (!lead) continue;
    uniqueLeadsMap.set(lead.id, lead);
  }
  const uniqueLeads = Array.from(uniqueLeadsMap.values());

  // Inboxes configuration: respect enabled / disabled state
  const inboxes = getInboxes();
  const inboxMap = new Map<number, ChatwootInbox>();
  const disabledInboxIds = new Set<number>();
  inboxes.forEach(ib => {
    inboxMap.set(ib.id, ib);
    if (ib.enabled === false) {
      disabledInboxIds.add(ib.id);
    }
  });

  // Base leads: exclude leads from disabled inboxes unless user explicitly requested a specific inboxId filter
  const enabledLeads = uniqueLeads.filter(l => {
    if (!filter.inboxId && l.inbox_id && disabledInboxIds.has(l.inbox_id)) {
      return false;
    }
    return true;
  });

  const rangeToday = getDateRangeForPeriod('today');
  const rangeYesterday = getDateRangeForPeriod('yesterday');
  const range7Days = getDateRangeForPeriod('last_7_days');
  const rangeWeek = getDateRangeForPeriod('this_week');
  const rangeMonth = getDateRangeForPeriod('this_month');
  const rangeLastMonth = getDateRangeForPeriod('last_month');
  const rangeYear = getDateRangeForPeriod('this_year');

  const countInEntryRange = (leads: LeadRecord[], range: DateRange) => {
    return leads.filter(l => {
      const entry = new Date(l.entry_date).getTime();
      return entry >= range.start.getTime() && entry <= range.end.getTime();
    }).length;
  };

  const leads_today = countInEntryRange(enabledLeads, rangeToday);
  const leads_yesterday = countInEntryRange(enabledLeads, rangeYesterday);
  const leads_this_week = countInEntryRange(enabledLeads, rangeWeek);
  const leads_last_7_days = countInEntryRange(enabledLeads, range7Days);
  const leads_this_month = countInEntryRange(enabledLeads, rangeMonth);
  const leads_last_month = countInEntryRange(enabledLeads, rangeLastMonth);
  const leads_this_year = countInEntryRange(enabledLeads, rangeYear);
  const leads_total_historical = enabledLeads.length;

  const activeRange = getDateRangeForPeriod(filter.period, filter.startDate, filter.endDate);

  // Apply filters to calculate cohort stats
  const filteredLeads = enabledLeads.filter(l => {
    const entry = new Date(l.entry_date).getTime();
    if (filter.period !== 'all') {
      if (entry < activeRange.start.getTime() || entry > activeRange.end.getTime()) {
        return false;
      }
    }
    if (filter.channel && filter.channel !== 'all' && filter.channel !== 'Todos') {
      const inboxObj = l.inbox_id ? inboxMap.get(l.inbox_id) : undefined;
      const customName = inboxObj?.custom_name;
      const match = 
        l.channel === filter.channel || 
        l.channel_detail === filter.channel || 
        l.inbox_name === filter.channel ||
        customName === filter.channel ||
        String(l.inbox_id) === filter.channel;
      if (!match) return false;
    }
    if (filter.inboxId && filter.inboxId !== 0) {
      if (l.inbox_id !== filter.inboxId) return false;
    }
    if (filter.status && filter.status !== 'all') {
      if (l.status !== filter.status) return false;
    }
    if (filter.vendeu && filter.vendeu !== 'all') {
      const shouldBeSold = filter.vendeu === 'sim';
      if (Boolean(l.vendeu) !== shouldBeSold) return false;
    }
    if (filter.loja && filter.loja !== 'all' && filter.loja !== 'Todas') {
      if (l.loja !== filter.loja) return false;
    }
    if (filter.vendedor && filter.vendedor !== 'all' && filter.vendedor !== 'Todos') {
      if (l.vendedor !== filter.vendedor) return false;
    }
    if (filter.search && filter.search.trim().length > 0) {
      const q = filter.search.toLowerCase().trim();
      const matchName = l.contact_name?.toLowerCase().includes(q);
      const matchEmail = l.contact_email?.toLowerCase().includes(q);
      const matchPhone = l.contact_phone?.toLowerCase().includes(q);
      const matchCpf = l.cpf?.includes(q);
      const matchVendedor = l.vendedor?.toLowerCase().includes(q);
      const matchLoja = l.loja?.toLowerCase().includes(q);
      const matchObs = l.observacao?.toLowerCase().includes(q);
      const matchId = `cw-${l.conversation_id}`.toLowerCase().includes(q) || String(l.conversation_id).includes(q) || String(l.contact_id).includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchCpf && !matchVendedor && !matchLoja && !matchObs && !matchId) {
        return false;
      }
    }
    return true;
  });

  const filtered_leads_total = filteredLeads.length;

  // Status indicators (ChatAnalytics 2.0)
  const novos_leads = filteredLeads.filter(l => l.status === 'NOVO LEAD').length;
  const em_analise = filteredLeads.filter(l => l.status === 'EM ANÁLISE').length;
  const pendentes = filteredLeads.filter(l => l.status === 'PENDENTE').length;
  const aprovados = filteredLeads.filter(l => l.status === 'APROVADO').length;
  const reprovados = filteredLeads.filter(l => l.status === 'REPROVADO').length;

  // Vendas (leads com venda: vendeu === true)
  const soldLeads = filteredLeads.filter(l => Boolean(l.vendeu));
  const vendas = soldLeads.length;
  const total_vendas_valor = soldLeads.reduce((acc, l) => acc + (l.valor_venda || l.value || 0), 0);

  // Requirement 4 formulas:
  // Taxa de aprovação = aprovados / (aprovados + reprovados) x 100
  const taxa_aprovacao = (aprovados + reprovados) > 0
    ? Number(((aprovados / (aprovados + reprovados)) * 100).toFixed(2))
    : 0;

  // Taxa de conversão = leads com venda / total de leads x 100
  const taxa_conversao = filtered_leads_total > 0
    ? Number(((vendas / filtered_leads_total) * 100).toFixed(2))
    : 0;

  // Backward compatibility aliases
  const filtered_leads_converted = aprovados;
  const filtered_leads_in_progress = em_analise + pendentes + novos_leads;
  const filtered_leads_not_converted = reprovados;
  const filtered_conversion_rate = taxa_conversao;
  const sales_closed_in_period = vendas;
  const sales_revenue_in_period = total_vendas_valor;

  // Growth percentages
  const growth_today_vs_yesterday = leads_yesterday > 0 
    ? Number((((leads_today - leads_yesterday) / leads_yesterday) * 100).toFixed(1))
    : (leads_today > 0 ? 100 : 0);

  const growth_month_vs_last_month = leads_last_month > 0
    ? Number((((leads_this_month - leads_last_month) / leads_last_month) * 100).toFixed(1))
    : 0;

  const growth_week_vs_last_week = 0;
  const growth_conversion_rate = 0;

  // Channel Distribution - Distinct Chatwoot Inboxes & Channels
  interface ChannelDataAccumulator {
    channel: string;
    channel_detail: string;
    channel_type: string;
    inbox_id?: number;
    inbox_name?: string;
    custom_name?: string;
    original_name?: string;
    enabled?: boolean;
    received: number;
    converted: number;
    revenue: number;
  }

  const channelMap = new Map<string, ChannelDataAccumulator>();

  filteredLeads.forEach(lead => {
    const inboxId = lead.inbox_id;
    const inbox = inboxId ? inboxMap.get(inboxId) : undefined;
    const customName = inbox?.custom_name;
    const originalName = inbox?.name;
    const channelType = inbox?.channel_type || lead.channel || 'Outros';

    // Separate distinct inboxes from Chatwoot by inbox_id or specific name
    const channelKey = inboxId ? `inbox_${inboxId}` : (customName || originalName || lead.inbox_name || channelType);
    const displayName = customName || originalName || lead.inbox_name || (inboxId ? `Caixa #${inboxId}` : channelType);

    const existing = channelMap.get(channelKey) || {
      channel: displayName,
      channel_detail: lead.channel_detail || displayName,
      channel_type: channelType,
      inbox_id: inboxId,
      inbox_name: originalName || lead.inbox_name || displayName,
      custom_name: customName,
      original_name: originalName,
      enabled: inbox ? inbox.enabled !== false : true,
      received: 0,
      converted: 0,
      revenue: 0
    };

    existing.received += 1;
    if (lead.vendeu || lead.status === 'APROVADO') {
      existing.converted += 1;
      existing.revenue += (lead.valor_venda || lead.value || 0);
    }
    channelMap.set(channelKey, existing);
  });

  const channel_distribution: ChannelPerformance[] = Array.from(channelMap.values()).map(data => {
    const rate = data.received > 0 ? Number(((data.converted / data.received) * 100).toFixed(1)) : 0;
    const share = filtered_leads_total > 0 ? Number(((data.received / filtered_leads_total) * 100).toFixed(1)) : 0;
    const avgTicket = data.converted > 0 ? Math.round(data.revenue / data.converted) : 0;
    return {
      channel: data.channel,
      channel_detail: data.channel_detail,
      channel_type: data.channel_type,
      inbox_id: data.inbox_id,
      inbox_name: data.inbox_name,
      custom_name: data.custom_name,
      original_name: data.original_name,
      enabled: data.enabled,
      leads_received: data.received,
      leads_converted: data.converted,
      not_converted: data.received - data.converted,
      conversion_rate: rate,
      share_percentage: share,
      total_revenue: data.revenue,
      average_ticket: avgTicket
    };
  }).sort((a, b) => b.leads_received - a.leads_received);

  // Daily evolution chart (last 30 days)
  const daily_series: DailyTimeSeriesPoint[] = [];
  const daysCount = 30;
  const monthNamesPt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  const leadsByBelemDate = new Map<string, LeadRecord[]>();
  for (const lead of uniqueLeads) {
    const lDateStr = getBelemDateStr(lead.entry_date);
    if (!leadsByBelemDate.has(lDateStr)) {
      leadsByBelemDate.set(lDateStr, []);
    }
    leadsByBelemDate.get(lDateStr)!.push(lead);
  }

  const todayStr = getBelemDateStr();
  const [tY, tM, tD] = todayStr.split('-').map(Number);

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(tY, tM - 1, tD, 12, 0, 0));
    d.setUTCDate(d.getUTCDate() - i);
    
    const yearStr = d.getUTCFullYear();
    const monthNum = d.getUTCMonth();
    const dayNum = d.getUTCDate();
    const dateStr = `${yearStr}-${String(monthNum + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const label = `${String(dayNum).padStart(2, '0')} ${monthNamesPt[monthNum]}`;

    const dayLeads = leadsByBelemDate.get(dateStr) || [];
    const received = dayLeads.length;
    const converted = dayLeads.filter(l => l.vendeu || l.status === 'APROVADO').length;
    const rate = received > 0 ? Number(((converted / received) * 100).toFixed(1)) : 0;

    daily_series.push({
      date: dateStr,
      label,
      leads_received: received,
      leads_converted: converted,
      conversion_rate: rate
    });
  }

  // Weekly cohorts (last 4 weeks)
  const weekly_cohorts: CohortPoint[] = [];
  const nowBelem = getBelemDate();
  for (let w = 3; w >= 0; w--) {
    const endOffset = w * 7;
    const startOffset = endOffset + 6;
    const dStart = new Date(nowBelem);
    dStart.setDate(dStart.getDate() - startOffset);
    const dEnd = new Date(nowBelem);
    dEnd.setDate(dEnd.getDate() - endOffset);

    const cohortLeads = uniqueLeads.filter(l => {
      const time = new Date(l.entry_date).getTime();
      return time >= dStart.getTime() && time <= dEnd.getTime();
    });

    const received = cohortLeads.length;
    const converted = cohortLeads.filter(l => l.vendeu || l.status === 'APROVADO').length;
    const rate = received > 0 ? Number(((converted / received) * 100).toFixed(1)) : 0;
    
    weekly_cohorts.push({
      cohort_label: w === 0 ? 'Semana Atual' : `Semana -${w}`,
      leads_received: received,
      leads_converted: converted,
      conversion_rate: rate
    });
  }

  // Monthly trends
  const monthly_trends: MonthlyTrendPoint[] = [];
  const monthNamesFull = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  for (let m = 2; m >= 0; m--) {
    const mDate = new Date(Date.UTC(tY, tM - 1 - m, 1, 12, 0, 0));
    const mYear = mDate.getUTCFullYear();
    const mMonthIdx = mDate.getUTCMonth();
    const mLabel = `${monthNamesFull[mMonthIdx]} ${mYear}`;

    const mLeads = uniqueLeads.filter(l => {
      const d = new Date(l.entry_date);
      return d.getUTCFullYear() === mYear && d.getUTCMonth() === mMonthIdx;
    });

    const received = mLeads.length;
    const converted = mLeads.filter(l => l.vendeu || l.status === 'APROVADO').length;
    const rate = received > 0 ? Number(((converted / received) * 100).toFixed(1)) : 0;

    monthly_trends.push({
      month: mLabel,
      conversion_rate: rate,
      leads_count: received,
      conversions_count: converted
    });
  }

  // Monthly performance with investments
  const monthly_performance: MonthlyPerformancePoint[] = [];
  const totalInvestedAllTime = allInvestments.reduce((acc, inv) => acc + (inv.amount || 0), 0);
  const totalInvestedPeriod = adSpend || totalInvestedAllTime;

  const cost_per_lead = filtered_leads_total > 0 ? Math.round(totalInvestedPeriod / filtered_leads_total) : 0;
  const cac = vendas > 0 ? Math.round(totalInvestedPeriod / vendas) : 0;
  const roas = totalInvestedPeriod > 0 ? Number((total_vendas_valor / totalInvestedPeriod).toFixed(2)) : 0;

  return {
    leads_today,
    leads_yesterday,
    leads_this_week,
    leads_last_7_days,
    leads_this_month,
    leads_last_month,
    leads_this_year,
    leads_total_historical,

    novos_leads,
    em_analise,
    pendentes,
    aprovados,
    reprovados,

    vendas,
    total_vendas_valor,
    taxa_aprovacao,
    taxa_conversao,

    filtered_leads_total,
    filtered_leads_converted,
    filtered_leads_in_progress,
    filtered_leads_not_converted,
    filtered_conversion_rate,

    sales_closed_in_period,
    sales_revenue_in_period,

    growth_today_vs_yesterday,
    growth_month_vs_last_month,
    growth_week_vs_last_week,
    growth_conversion_rate,

    daily_series,
    weekly_cohorts,
    channel_distribution,
    monthly_trends,
    monthly_performance,

    ad_spend: totalInvestedPeriod,
    cost_per_lead,
    cac,
    roas,
    total_invested_all_time: totalInvestedAllTime,
    total_invested_period: totalInvestedPeriod,

    avg_first_response_time: '3 min',
    top_converting_channel: (() => {
      if (channel_distribution.length === 0) return { name: 'Geral', rate: 0 };
      const sortedByRate = [...channel_distribution].sort((a, b) => {
        if (b.conversion_rate !== a.conversion_rate) {
          return b.conversion_rate - a.conversion_rate;
        }
        return b.leads_converted - a.leads_converted;
      });
      return { name: sortedByRate[0].channel, rate: sortedByRate[0].conversion_rate };
    })(),
    total_revenue_period: total_vendas_valor
  };
}
