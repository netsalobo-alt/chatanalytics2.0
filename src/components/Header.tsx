import React, { useState } from 'react';
import { 
  Calendar, 
  RefreshCw, 
  Download, 
  Plus, 
  ChevronDown,
  Filter,
  Check,
  Menu,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { PeriodFilter } from '../types.ts';
import { NavTab } from './Sidebar.tsx';

interface HeaderProps {
  currentTab: NavTab;
  period: PeriodFilter;
  onPeriodChange: (period: PeriodFilter, customStart?: string, customEnd?: string) => void;
  customStartDate: string;
  customEndDate: string;
  onSync?: () => void;
  onTriggerSync?: () => void;
  isSyncing: boolean;
  onExportCsv?: () => void;
  onOpenNewLeadModal?: () => void;
  lastSyncAt?: string | null;
  onToggleMobileMenu?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  config?: any;
  currentUser?: any;
  onLogout?: () => Promise<void> | void;
}

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  last_7_days: 'Últimos 7 dias',
  this_week: 'Semana Atual',
  this_month: 'Mês Atual',
  last_month: 'Mês Anterior',
  this_year: 'Ano Atual',
  all: 'Todo Histórico',
  custom: 'Personalizado'
};

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string; tag: string }> = {
  dashboard: {
    title: 'Dashboard Principal',
    subtitle: 'Visão geral de desempenho e conversão comercial em tempo real',
    tag: 'Live Telemetry'
  },
  leads: {
    title: 'Gestão de Leads',
    subtitle: 'Rastreabilidade completa de leads recebidos via Chatwoot e campanhas de tráfego pago',
    tag: 'Chatwoot V3 Pipeline'
  },
  conversions: {
    title: 'Análise de Conversões & Vendas',
    subtitle: 'Acompanhamento de fechamentos com etiqueta Ganhamos e coortes temporais',
    tag: 'Etiqueta: Ganhamos'
  },
  investments: {
    title: 'Controle de Investimentos',
    subtitle: 'Registro e acompanhamento de entradas de mídia por data, apurando CPL e CAC mensal',
    tag: 'Gestão de Tráfego'
  },
  channels: {
    title: 'Desempenho por Canal de Entrada',
    subtitle: 'Análise comparativa de taxa de conversão e volume por canal de atendimento',
    tag: 'Atribuição Omnichannel'
  },
  reports: {
    title: 'Relatórios Executivos',
    subtitle: 'Consolidação periódica de indicadores, métricas e exportações oficiais',
    tag: 'Fuso: America/Belem'
  },
  users: {
    title: 'Gestão de Usuários da Equipe',
    subtitle: 'Controle de acesso, cadastro de operadores e permissões no ChatAnalytics',
    tag: 'Autenticação & Permissões'
  },
  settings: {
    title: 'Configurações da Integração',
    subtitle: 'Conexão segura com a API do Chatwoot, credenciais, webhooks e parâmetros',
    tag: 'API Oficial Chatwoot'
  },
  about: {
    title: 'Sobre o ChatAnalytics 2.0',
    subtitle: 'Funcionalidades, arquitetura, propósito do sistema e autoria',
    tag: 'Versão 2.0 • Netsa Lobo'
  }
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  period,
  onPeriodChange,
  customStartDate,
  customEndDate,
  onSync,
  onTriggerSync,
  isSyncing,
  onExportCsv,
  onOpenNewLeadModal,
  onToggleMobileMenu,
  isSidebarCollapsed,
  onToggleSidebar
}) => {
  const handleSyncAction = onSync || onTriggerSync || (() => {});
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [tempStart, setTempStart] = useState(customStartDate || '2026-10-01');
  const [tempEnd, setTempEnd] = useState(customEndDate || '2026-10-24');

  const { title, subtitle, tag } = TAB_TITLES[currentTab] || TAB_TITLES.dashboard;

  const handleSelectPeriod = (p: PeriodFilter) => {
    setIsPeriodMenuOpen(false);
    if (p === 'custom') {
      setShowCustomModal(true);
    } else {
      onPeriodChange(p);
    }
  };

  const handleApplyCustomDates = () => {
    setShowCustomModal(false);
    onPeriodChange('custom', tempStart, tempEnd);
  };

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 md:px-8 sticky top-0 z-30 shadow-xs">
      {/* Title & Subtitle + Mobile Toggle */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-[#002139] hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Collapse / Expand Toggle */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex p-2 rounded-xl text-slate-500 hover:text-[#002139] hover:bg-slate-100 transition-colors cursor-pointer items-center justify-center border border-slate-200/70 shadow-2xs group"
            title={isSidebarCollapsed ? "Expandir menu lateral" : "Ocultar / Recolher menu lateral"}
            aria-label={isSidebarCollapsed ? "Expandir menu lateral" : "Ocultar / Recolher menu lateral"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-[#1A94C5] group-hover:scale-105 transition-transform" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-slate-600 group-hover:scale-105 transition-transform" />
            )}
          </button>
        )}

        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-base sm:text-xl md:text-2xl font-bold text-[#002139] tracking-tight font-['Plus_Jakarta_Sans',sans-serif] truncate max-w-[180px] sm:max-w-none">
              {title}
            </h1>
            <span className="hidden xs:inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
              {tag}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 hidden md:block">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Action Cluster */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Period Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsPeriodMenuOpen(!isPeriodMenuOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>
              {period === 'custom' && customStartDate && customEndDate
                ? `${customStartDate.split('-').reverse().slice(0, 2).join('/')} a ${customEndDate.split('-').reverse().slice(0, 2).join('/')}`
                : PERIOD_LABELS[period]}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isPeriodMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Filtrar Período (America/Belem)
              </div>
              {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map(key => (
                <button
                  key={key}
                  onClick={() => handleSelectPeriod(key)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
                    period === key
                      ? 'bg-sky-50 text-[#00375a] font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{PERIOD_LABELS[key]}</span>
                  {period === key && <Check className="w-3.5 h-3.5 text-[#00375a]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sync Now Button */}
        <button
          onClick={handleSyncAction}
          disabled={isSyncing}
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#002139] text-xs font-semibold transition-colors shadow-2xs cursor-pointer active:scale-[0.98]"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#1A94C5] ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
        </button>

        {/* Export CSV Button */}
        <button
          onClick={onExportCsv}
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#002139] text-xs font-semibold transition-colors shadow-2xs cursor-pointer active:scale-[0.98]"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" />
          <span>Exportar CSV</span>
        </button>

        {/* New Lead Manual CTA */}
        <button
          onClick={onOpenNewLeadModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#00375a] hover:bg-[#002139] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#c1ef6d]" />
          <span className="hidden xs:inline">+ Novo Lead Manual</span>
          <span className="xs:hidden">Novo</span>
        </button>

        {/* User Profile Avatar */}
        <div className="pl-2 border-l border-slate-200 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#00375a] text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-100 shadow-2xs">
            CW
          </div>
        </div>
      </div>

      {/* Custom Date Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-[#002139] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1A94C5]" />
                Intervalo Personalizado de Datas
              </h3>
            </div>
            
            <p className="text-xs text-slate-500">
              Selecione o início e o fim da janela de entrada dos leads (horário de Belém/Brasília).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={tempStart}
                  onChange={e => setTempStart(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1A94C5]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  value={tempEnd}
                  onChange={e => setTempEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1A94C5]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyCustomDates}
                className="px-4 py-1.5 rounded-lg bg-[#00375a] hover:bg-[#002139] text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                Aplicar Intervalo
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
