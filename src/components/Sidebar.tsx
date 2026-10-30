import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Radio, 
  FileText, 
  Settings, 
  Download, 
  RefreshCw,
  Wallet,
  UserCheck,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Info
} from 'lucide-react';
import { ChatwootConfig, AppUser } from '../types.ts';
import { Tooltip } from './Tooltip.tsx';

export type NavTab = 'dashboard' | 'leads' | 'conversions' | 'investments' | 'channels' | 'reports' | 'users' | 'settings' | 'about';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  config: ChatwootConfig | null;
  totalLeadsCount: number;
  onExportCsv: () => void;
  onQuickSync: () => void;
  isSyncing: boolean;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  currentUser?: AppUser | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  config,
  totalLeadsCount,
  onExportCsv,
  onQuickSync,
  isSyncing,
  isOpenMobile,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
  currentUser,
  onLogout
}) => {
  const formatSyncTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Nunca';
    const diffMin = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diffMin <= 1) return 'há poucos seg';
    if (diffMin < 60) return `há ${diffMin} min`;
    const hours = Math.floor(diffMin / 60);
    return `há ${hours}h`;
  };

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" /> 
    },
    { 
      id: 'leads', 
      label: 'Leads', 
      icon: <Users className="w-5 h-5 shrink-0" />,
      badge: totalLeadsCount > 1000 ? `${(totalLeadsCount / 1000).toFixed(1)}k` : String(totalLeadsCount)
    },
    { 
      id: 'conversions', 
      label: 'Conversões', 
      icon: <TrendingUp className="w-5 h-5 shrink-0" /> 
    },
    { 
      id: 'investments', 
      label: 'Investimento', 
      icon: <Wallet className="w-5 h-5 shrink-0" /> 
    },
    { 
      id: 'channels', 
      label: 'Canais de Entrada', 
      icon: <Radio className="w-5 h-5 shrink-0" /> 
    },
    { 
      id: 'reports', 
      label: 'Relatórios', 
      icon: <FileText className="w-5 h-5 shrink-0" /> 
    },
    { 
      id: 'users', 
      label: 'Usuários', 
      icon: <UserCheck className="w-5 h-5 shrink-0" /> 
    },
    { 
      id: 'settings', 
      label: 'Configurações', 
      icon: <Settings className="w-5 h-5 shrink-0" /> 
    },
    { 
      id: 'about', 
      label: 'Sobre o Sistema', 
      icon: <Info className="w-5 h-5 shrink-0" /> 
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar Shell */}
      <aside 
        className={`fixed left-0 top-0 h-full z-50 lg:z-40 flex flex-col justify-between p-3.5 bg-gradient-to-b from-[#001726] via-[#001f35] to-[#001424] border-r border-[#00375a]/70 select-none text-slate-100 shadow-2xl transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-[72px]' : 'w-68'
        } ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand & Navigation Section */}
        <div className="flex flex-col gap-5">
          {/* Brand Header */}
          <div className={`pt-1 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-1.5'}`}>
            {!isCollapsed ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00375a] to-[#1A94C5] flex items-center justify-center font-bold text-white shadow-lg border border-cyan-400/30 shrink-0">
                  <TrendingUp className="w-5 h-5 text-[#c1ef6d]" />
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-lg font-bold tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif] whitespace-nowrap">
                    ChatAnalytics
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#c1ef6d]/20 text-[#c1ef6d] border border-[#c1ef6d]/30 whitespace-nowrap">
                    2.0
                  </span>
                </div>
              </div>
            ) : (
              <Tooltip content="ChatAnalytics 2.0" position="right">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00375a] to-[#1A94C5] flex items-center justify-center font-bold text-white shadow-lg border border-cyan-400/30 cursor-pointer">
                  <TrendingUp className="w-5 h-5 text-[#c1ef6d]" />
                </div>
              </Tooltip>
            )}

            {/* Collapse / Expand Toggle Button on Desktop */}
            {onToggleCollapse && (
              <Tooltip 
                content={isCollapsed ? "Expandir menu lateral" : "Ocultar / Recolher menu"} 
                position={isCollapsed ? "right" : "bottom"}
              >
                <button
                  onClick={onToggleCollapse}
                  className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-[#c1ef6d]" />
                  ) : (
                    <ChevronLeft className="w-4 h-4" />
                  )}
                </button>
              </Tooltip>
            )}

            {/* Close Button on Mobile */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Divider in full mode */}
          {!isCollapsed && <div className="h-px bg-gradient-to-r from-transparent via-[#00375a]/70 to-transparent -my-1" />}

          {/* Navigation Tabs */}
          <nav aria-label="Navegação Principal" className="flex flex-col gap-1.5">
            {navItems.map(item => {
              const isActive = currentTab === item.id;
              
              if (isCollapsed) {
                return (
                  <Tooltip 
                    key={item.id} 
                    content={
                      <div className="flex items-center gap-2">
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#c1ef6d]/20 text-[#c1ef6d] font-bold">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    } 
                    position="right"
                  >
                    <button
                      onClick={() => {
                        onTabChange(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`relative w-11 h-11 mx-auto rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-tr from-[#00375a] to-[#004e7c] text-[#c1ef6d] shadow-md border border-[#c1ef6d]/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
                      }`}
                      aria-label={item.label}
                    >
                      {isActive && (
                        <span className="absolute -left-1 top-2.5 bottom-2.5 w-1 rounded-r-full bg-[#c1ef6d]" />
                      )}
                      {item.icon}
                      {item.badge && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#c1ef6d] ring-2 ring-[#001726]" />
                      )}
                    </button>
                  </Tooltip>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left group cursor-pointer ${
                    isActive
                      ? 'bg-white/[0.09] text-white shadow-sm border border-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  {/* Glowing left indicator line for active state */}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#c1ef6d] shadow-sm shadow-[#c1ef6d]/50" />
                  )}
                  <span className={`${isActive ? 'text-[#c1ef6d]' : 'text-slate-400 group-hover:text-slate-200'} transition-colors`}>
                    {item.icon}
                  </span>
                  <span className="flex-1 whitespace-nowrap truncate">{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                      isActive 
                        ? 'bg-[#c1ef6d]/20 text-[#c1ef6d] border border-[#c1ef6d]/30' 
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Chatwoot Status & CTA & User Profile */}
        <div className="flex flex-col gap-2.5 pt-3 border-t border-[#00375a]/70">
          {/* Collapsed Sync Widget */}
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip 
                content={
                  <div>
                    <p className="font-bold">{config?.connected ? 'Chatwoot Conectado' : 'Conexão Pendente'}</p>
                    <p className="text-[10px] text-slate-300">Sync: {formatSyncTime(config?.last_sync_at)}</p>
                  </div>
                } 
                position="right"
              >
                <button
                  onClick={onQuickSync}
                  disabled={isSyncing}
                  className="w-10 h-10 rounded-xl bg-[#002d4a]/70 border border-[#004875]/50 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer relative"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#c1ef6d]' : 'text-slate-300'}`} />
                  <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${config?.connected ? 'bg-[#c1ef6d]' : 'bg-amber-400'}`} />
                </button>
              </Tooltip>

              <Tooltip content="Exportar Dados CSV" position="right">
                <button
                  onClick={onExportCsv}
                  className="w-10 h-10 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#c1ef6d]" />
                </button>
              </Tooltip>

              {currentUser && (
                <Tooltip 
                  content={
                    <div>
                      <p className="font-bold">{currentUser.name}</p>
                      <p className="text-[10px] text-slate-300">{currentUser.email}</p>
                    </div>
                  } 
                  position="right"
                >
                  <div className="w-9 h-9 rounded-full bg-[#1A94C5] text-white flex items-center justify-center font-bold text-xs shadow-md mt-1 cursor-pointer">
                    {(currentUser.name || currentUser.email || 'U').slice(0, 2).toUpperCase()}
                  </div>
                </Tooltip>
              )}

              {currentUser && onLogout && (
                <Tooltip content="Sair do sistema" position="right">
                  <button
                    onClick={onLogout}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </Tooltip>
              )}
            </div>
          ) : (
            <>
              {/* Expanded Sync Status Widget */}
              <div className="bg-[#002840]/90 rounded-xl p-3 flex flex-col gap-2 border border-[#004875]/50 backdrop-blur-xs shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="relative flex h-2 w-2 shrink-0">
                      {config?.connected ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c1ef6d] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c1ef6d]"></span>
                        </>
                      ) : (
                        <span className="inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                      )}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {config?.connected ? 'Chatwoot Conectado' : 'Conexão Pendente'}
                    </span>
                  </div>
                  <Tooltip content="Sincronizar agora com Chatwoot" position="top">
                    <button
                      onClick={onQuickSync}
                      disabled={isSyncing}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#c1ef6d]' : ''}`} />
                    </button>
                  </Tooltip>
                </div>
                
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-[#00375a]/40">
                  <span>Último sync:</span>
                  <span className="text-slate-300 font-medium">{formatSyncTime(config?.last_sync_at)}</span>
                </div>

                <div className="text-[10px] text-cyan-300/90 bg-[#001f35] px-2 py-1 rounded flex items-center justify-between">
                  <span>Etiqueta:</span>
                  <span className="font-mono text-[#c1ef6d] font-bold">trafego_pago</span>
                </div>
              </div>

              {/* Export Data Button */}
              <button
                onClick={onExportCsv}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-semibold transition-all border border-white/10 active:scale-[0.98] cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-[#c1ef6d]" />
                <span>Exportar Dados CSV</span>
              </button>

              {/* Current Logged User Profile & Logout */}
              {currentUser && (
                <div className="pt-2 border-t border-[#00375a]/70 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#1A94C5] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-cyan-400/20">
                      {(currentUser.name || currentUser.email || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white truncate" title={currentUser.name}>
                          {currentUser.name}
                        </p>
                        {currentUser.role && (
                          <span className="text-[9px] font-extrabold uppercase px-1 rounded bg-[#00375a] text-[#c1ef6d]">
                            {currentUser.role}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate" title={currentUser.email}>
                        {currentUser.email}
                      </p>
                    </div>
                  </div>

                  {onLogout && (
                    <Tooltip content="Sair do sistema" position="top">
                      <button
                        onClick={onLogout}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
};
