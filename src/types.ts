export interface ChatwootConfig {
  chatwoot_url: string;
  account_id: string;
  api_token: string;
  has_token?: boolean;
  connected: boolean;
  last_sync_at: string | null;
  last_sync_count: number;
  last_sync_status: 'idle' | 'success' | 'error' | 'syncing';
  last_error_message?: string;
  inboxes: {
    id: number;
    name: string;
    channel_type: string;
    phone_number?: string | null;
    enabled?: boolean;
    custom_name?: string;
  }[];
  webhook_url?: string;
  auto_sync_enabled: boolean;
  auto_sync_interval_minutes: number;
  last_auto_sync_at?: string | null;
  last_auto_sync_result?: {
    paid_leads_found: number;
    ganhamos_found: number;
    conversions_updated: number;
    message: string;
  };
  ad_spend?: number;
}

export interface WebhookLogEntry {
  id: string;
  received_at: string;
  event: string;
  account_id?: string;
  conversation_id?: number;
  contact_id?: number;
  contact_name?: string;
  message_type?: string;
  sender_type?: string;
  content_preview?: string;
  status: 'processed' | 'ignored' | 'error';
  action_summary: string;
  cpf_detected?: string;
  lead_id?: string;
  ip?: string;
  raw_payload?: any;
}

export type LeadStatus = 'NOVO LEAD' | 'EM ANÁLISE' | 'PENDENTE' | 'APROVADO' | 'REPROVADO';
export type FieldOrigin = 'MANUAL' | 'LOCAL' | 'IA';
export type FieldOriginsMap = {
  cpf?: FieldOrigin;
  birth_date?: FieldOrigin;
  cnh?: FieldOrigin;
  [key: string]: FieldOrigin | undefined;
};

export interface LeadRecord {
  id: string; // key: `${account_id}_${contact_id}`
  account_id: string;
  contact_id: number;
  conversation_id: number;
  
  // Lead info
  contact_name: string; // nome
  contact_phone: string; // telefone
  contact_email?: string;
  contact_avatar?: string;
  
  // Dates
  entry_date: string; // data de entrada (ISO)
  last_interaction_at: string; // última interação (ISO)
  
  // Qualification & SDR fields
  cpf?: string; // CPF
  cpf_valid?: boolean; // CPF válido
  birth_date?: string; // nascimento (DD/MM/AAAA)
  cnh?: string; // CNH ("SIM" | "NÃO")
  status: LeadStatus; // NOVO LEAD | EM ANÁLISE | PENDENTE | APROVADO | REPROVADO
  vendedor?: string; // vendedor responsável
  loja?: string; // loja / unidade
  vendeu: boolean; // vendeu (sim/não)
  valor_venda: number; // valor da venda (R$)
  observacao?: string; // observação
  motivo_reprovacao?: string; // motivo da reprovação
  chatwoot_url?: string; // link da conversa no Chatwoot
  
  // Metadata & communication
  channel: 'WhatsApp' | 'Instagram' | 'Facebook' | 'Webchat' | 'Outros';
  channel_detail: string;
  inbox_id?: number;
  inbox_name?: string;
  tags: string[];
  last_message?: string;
  
  // SDR Priority Flags & Field Origins (MANUAL | LOCAL | IA)
  sdr_modified?: boolean;
  manual_fields?: string[];
  field_origins?: FieldOriginsMap;
  cpf_conflict?: boolean;
  cpf_conflict_detail?: string;
  recent_client_messages?: Array<{
    text: string;
    timestamp: number;
    message_id?: string | number;
  }>;

  // Legacy / compatibility aliases
  is_lead?: boolean;
  is_converted?: boolean;
  value?: number;
  conversion_date?: string;
  first_identified_at?: string;
  has_confirmed_timestamp?: boolean;
}

export interface InvestmentRecord {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // in BRL
  channel?: string; // e.g. "Meta Ads", "Google Ads", "TikTok Ads", "Geral"
  notes?: string;
  created_at: string;
}

export type PeriodFilter = 
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'all'
  | 'custom';

export interface ChatwootInbox {
  id: number;
  name: string;
  channel_type: string;
  phone_number?: string | null;
  enabled?: boolean;
  custom_name?: string;
}

export interface ChannelPerformance {
  channel: string;
  channel_detail?: string;
  channel_type?: string;
  inbox_id?: number;
  inbox_name?: string;
  custom_name?: string;
  original_name?: string;
  enabled?: boolean;
  leads_received: number;
  leads_converted: number;
  not_converted: number;
  conversion_rate: number;
  share_percentage: number;
  total_revenue: number;
  average_ticket: number;
}

export interface DailyTimeSeriesPoint {
  date: string;
  label: string;
  leads_received: number;
  leads_converted: number;
  conversion_rate: number;
}

export interface CohortPoint {
  cohort_label: string;
  leads_received: number;
  leads_converted: number;
  conversion_rate: number;
}

export interface MonthlyTrendPoint {
  month: string;
  conversion_rate: number;
  leads_count: number;
  conversions_count: number;
  note?: string;
}

export interface MonthlyPerformancePoint {
  month_key: string;
  month_label: string;
  ad_spend: number;
  leads_count: number;
  conversions_count: number;
  revenue: number;
  cpl: number;
  cac: number;
  roas: number;
  conversion_rate: number;
}

export interface AnalyticsSummary {
  // Top KPIs (ChatAnalytics 2.0)
  leads_today: number; // leads hoje
  leads_yesterday: number;
  leads_this_week: number; // esta semana
  leads_last_7_days: number;
  leads_this_month: number; // este mês
  leads_last_month: number;
  leads_this_year: number;
  leads_total_historical: number;
  
  // Status breakdown
  novos_leads: number; // novos leads (status === 'NOVO LEAD')
  em_analise: number; // em análise (status === 'EM ANÁLISE')
  pendentes: number; // pendentes (status === 'PENDENTE')
  aprovados: number; // aprovados (status === 'APROVADO')
  reprovados: number; // reprovados (status === 'REPROVADO')
  
  // Vendas e taxas
  vendas: number; // leads com venda (vendeu === true)
  total_vendas_valor: number; // soma de valor_venda
  taxa_aprovacao: number; // aprovados / (aprovados + reprovados) x 100
  taxa_conversao: number; // leads com venda / total de leads x 100

  // Filter cohort metrics
  filtered_leads_total: number;
  filtered_leads_converted: number;
  filtered_leads_in_progress: number;
  filtered_leads_not_converted: number;
  filtered_conversion_rate: number;
  
  sales_closed_in_period: number;
  sales_revenue_in_period: number;
  
  growth_today_vs_yesterday: number;
  growth_month_vs_last_month: number;
  growth_week_vs_last_week: number;
  growth_conversion_rate: number;

  daily_series: DailyTimeSeriesPoint[];
  weekly_cohorts: CohortPoint[];
  channel_distribution: ChannelPerformance[];
  monthly_trends: MonthlyTrendPoint[];
  monthly_performance: MonthlyPerformancePoint[];

  ad_spend: number;
  cost_per_lead: number;
  cac: number;
  roas: number;
  total_invested_all_time: number;
  total_invested_period: number;

  avg_first_response_time: string;
  top_converting_channel: { name: string; rate: number };
  total_revenue_period: number;
}

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'operator';
  status: 'active' | 'inactive';
  createdAt: string;
  isMaster?: boolean;
}
