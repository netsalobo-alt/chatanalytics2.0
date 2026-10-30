import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { LeadsView } from './components/LeadsView.tsx';
import { ConversionsView } from './components/ConversionsView.tsx';
import { InvestmentsView } from './components/InvestmentsView.tsx';
import { ChannelsView } from './components/ChannelsView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { UsersView } from './components/UsersView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { LoginView } from './components/LoginView.tsx';
import { LeadDetailModal } from './components/LeadDetailModal.tsx';
import { NewLeadModal } from './components/NewLeadModal.tsx';
import { 
  ChatwootConfig, 
  AnalyticsSummary, 
  LeadRecord, 
  PeriodFilter,
  AppUser 
} from './types.ts';
import { auth, db } from './lib/firebase.ts';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [period, setPeriod] = useState<PeriodFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Data states
  const [config, setConfig] = useState<ChatwootConfig | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ChatAnalytics 2.0 Filter states
  const [selectedChannel, setSelectedChannel] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedVendeu, setSelectedVendeu] = useState('all');
  const [selectedLoja, setSelectedLoja] = useState('all');
  const [selectedVendedor, setSelectedVendedor] = useState('all');
  const [selectedSort, setSelectedSort] = useState('date_desc');
  const [searchQuery, setSearchQuery] = useState('');

  // UI state
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chatanalytics_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [activeLeadModal, setActiveLeadModal] = useState<LeadRecord | null>(null);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; message: string } | null>(null);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('chatanalytics_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Authentication state
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setCurrentUser(userDoc.data() as AppUser);
          } else {
            const fallback: AppUser = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Administrador',
              email: (firebaseUser.email || '').toLowerCase(),
              role: 'admin',
              status: 'active',
              isMaster: true,
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), fallback);
            } catch (e) {
              console.warn('Could not auto-persist user doc:', e);
            }
            setCurrentUser(fallback);
          }
        } catch (err) {
          console.warn('Error fetching user profile:', err);
          setCurrentUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Administrador',
            email: (firebaseUser.email || '').toLowerCase(),
            role: 'admin',
            status: 'active',
            isMaster: true,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      showToast('info', 'Sessão encerrada com sucesso.');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // 1. Fetch Config
  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e: any) {
      console.warn('Configuração temporariamente indisponível:', e?.message || e);
    }
  }, []);

  // 2. Fetch Stats
  const loadStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        period,
        ...(customStartDate ? { startDate: customStartDate } : {}),
        ...(customEndDate ? { endDate: customEndDate } : {}),
        ...(selectedChannel ? { channel: selectedChannel } : {}),
        ...(selectedStatus && selectedStatus !== 'all' ? { status: selectedStatus } : {}),
        ...(selectedVendeu && selectedVendeu !== 'all' ? { vendeu: selectedVendeu } : {}),
        ...(selectedLoja && selectedLoja !== 'all' ? { loja: selectedLoja } : {}),
        ...(selectedVendedor && selectedVendedor !== 'all' ? { vendedor: selectedVendedor } : {}),
        ...(searchQuery ? { search: searchQuery } : {})
      });
      const res = await fetch(`/api/stats?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e: any) {
      console.warn('Estatísticas temporariamente indisponíveis (reconectando...):', e?.message || e);
    }
  }, [period, customStartDate, customEndDate, selectedChannel, selectedStatus, selectedVendeu, selectedLoja, selectedVendedor, searchQuery]);

  // 3. Fetch Leads
  const loadLeads = useCallback(async (page: number = currentPage) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        period,
        sort: selectedSort,
        ...(customStartDate ? { startDate: customStartDate } : {}),
        ...(customEndDate ? { endDate: customEndDate } : {}),
        ...(selectedChannel ? { channel: selectedChannel } : {}),
        ...(selectedStatus && selectedStatus !== 'all' ? { status: selectedStatus } : {}),
        ...(selectedVendeu && selectedVendeu !== 'all' ? { vendeu: selectedVendeu } : {}),
        ...(selectedLoja && selectedLoja !== 'all' ? { loja: selectedLoja } : {}),
        ...(selectedVendedor && selectedVendedor !== 'all' ? { vendedor: selectedVendedor } : {}),
        ...(searchQuery ? { search: searchQuery } : {})
      });
      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLeads(json.data || []);
        setTotalLeads(json.pagination?.total || 0);
        setTotalPages(json.pagination?.total_pages || 1);
        setCurrentPage(json.pagination?.page || 1);
      }
    } catch (e: any) {
      console.warn('Leads temporariamente indisponíveis (reconectando...):', e?.message || e);
    }
  }, [period, customStartDate, customEndDate, selectedSort, selectedChannel, selectedStatus, selectedVendeu, selectedLoja, selectedVendedor, searchQuery, currentPage]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    loadStats();
    loadLeads(1);
  }, [loadStats, loadLeads]);

  // Real-time synchronization: Poll leads & stats every 4 seconds to reflect webhook updates immediately
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isSyncing && !authLoading) {
        loadLeads(currentPage);
        loadStats();
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [loadLeads, loadStats, currentPage, isSyncing, authLoading]);

  // Refresh immediately when switching tabs
  useEffect(() => {
    loadLeads(currentPage);
    loadStats();
  }, [currentTab]);

  // Refresh immediately when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      loadLeads(currentPage);
      loadStats();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadLeads, loadStats, currentPage]);

  // Handlers
  const handlePeriodChange = (newPeriod: PeriodFilter, start?: string, end?: string) => {
    setPeriod(newPeriod);
    if (start && end) {
      setCustomStartDate(start);
      setCustomEndDate(end);
    } else {
      setCustomStartDate('');
      setCustomEndDate('');
    }
    setCurrentPage(1);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast('success', json.message || 'Sincronização concluída com sucesso!');
        await loadConfig();
        await loadStats();
        await loadLeads(1);
      } else {
        showToast('error', json.message || 'Erro durante a sincronização.');
      }
    } catch (error: any) {
      showToast('error', `Falha ao sincronizar: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveConfig = async (url: string, accountId: string, token: string) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatwoot_url: url, account_id: accountId, api_token: token })
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Configurações salvas com sucesso!');
        await loadConfig();
        return { success: true, message: json.message || 'Configurações salvas com sucesso!' };
      } else {
        showToast('error', json.error || 'Erro ao salvar configurações.');
        return { success: false, message: json.error || 'Erro ao salvar configurações.' };
      }
    } catch (error: any) {
      const msg = `Falha ao salvar: ${error.message}`;
      showToast('error', msg);
      return { success: false, message: msg };
    }
  };

  const handleTestConnection = async (testUrl: string, testAccountId: string, testToken: string) => {
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatwoot_url: testUrl,
          account_id: testAccountId,
          api_token: testToken
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message || 'Conexão validada com sucesso!');
        await loadConfig();
      } else {
        showToast('error', data.message || 'Falha ao testar conexão.');
      }
      return data;
    } catch (err: any) {
      const msg = `Erro no teste de conexão: ${err.message}`;
      showToast('error', msg);
      return { success: false, message: msg };
    }
  };

  const handleClearDb = async () => {
    try {
      const res = await fetch('/api/clear', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast('info', 'Base de dados resetada com sucesso.');
        await loadStats();
        await loadLeads(1);
      }
    } catch (e: any) {
      showToast('error', `Erro ao limpar banco: ${e.message}`);
    }
  };

  const handleUpdateAutoSync = async (enabled?: boolean, intervalMinutes?: number, triggerNow?: boolean) => {
    try {
      const res = await fetch('/api/config/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: enabled ?? true,
          interval_minutes: intervalMinutes ?? 10,
          trigger_now: triggerNow
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', json.message);
        await loadConfig();
        if (triggerNow) {
          await loadStats();
          await loadLeads(1);
        }
      }
      return json;
    } catch (e: any) {
      showToast('error', `Erro ao atualizar auto-sync: ${e.message}`);
      return { success: false, error: e.message };
    }
  };

  const handleBackupRestored = async () => {
    showToast('success', 'Backup restaurado com sucesso!');
    await loadConfig();
    await loadStats();
    await loadLeads(1);
  };

  const handleUpdateInbox = async (inboxId: number, updates: { enabled?: boolean; custom_name?: string }) => {
    try {
      const res = await fetch(`/api/inboxes/${inboxId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        await loadConfig();
        await loadStats();
        await loadLeads(1);
        return data;
      } else {
        showToast('error', data.error || 'Erro ao atualizar caixa de entrada');
        throw new Error(data.error);
      }
    } catch (e: any) {
      showToast('error', `Falha ao atualizar caixa: ${e.message}`);
      throw e;
    }
  };

  const handleSyncInboxes = async () => {
    try {
      const res = await fetch('/api/inboxes/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        await loadConfig();
        await loadStats();
        return data;
      } else {
        showToast('error', data.message || 'Erro ao sincronizar caixas de entrada');
        throw new Error(data.message);
      }
    } catch (e: any) {
      showToast('error', `Falha ao sincronizar caixas: ${e.message}`);
      throw e;
    }
  };

  const handleCleanMockData = async () => {
    try {
      const res = await fetch('/api/clean-mock-data', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        await loadConfig();
        await loadStats();
        await loadLeads(1);
        return data;
      } else {
        showToast('error', data.message || 'Erro ao limpar dados simulados');
        throw new Error(data.message);
      }
    } catch (e: any) {
      showToast('error', `Falha ao limpar dados: ${e.message}`);
      throw e;
    }
  };

  const handleExportCsv = () => {
    window.location.href = `/api/reports/csv?period=${period}`;
  };

  // ChatAnalytics 2.0 Lead Creation (SDR)
  const handleCreateLead = async (data: any) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', `Lead "${json.lead?.contact_name || data.nome}" cadastrado com sucesso!`);
        await loadStats();
        await loadLeads(1);
      } else {
        showToast('error', json.error || 'Erro ao cadastrar lead.');
      }
    } catch (e: any) {
      showToast('error', `Falha ao cadastrar lead: ${e.message}`);
    }
  };

  // ChatAnalytics 2.0 Lead Edit (SDR Manual Edit)
  const handleSaveLead = async (leadId: string, updates: Partial<LeadRecord>) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const json = await res.json();
      if (json.success && json.lead) {
        showToast('success', 'Lead atualizado com sucesso!');
        if (activeLeadModal && activeLeadModal.id === leadId) {
          setActiveLeadModal(json.lead);
        }
        await loadStats();
        await loadLeads(currentPage);
      } else {
        showToast('error', json.error || 'Erro ao atualizar dados do lead.');
      }
    } catch (e: any) {
      showToast('error', `Falha ao atualizar lead: ${e.message}`);
    }
  };

  // ChatAnalytics 2.0 Quick Actions
  const handleQuickApprove = async (lead: LeadRecord) => {
    try {
      const res = await fetch(`/api/leads/${lead.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor_venda: lead.valor_venda || lead.value })
      });
      const json = await res.json();
      if (json.success && json.lead) {
        showToast('success', `Lead "${lead.contact_name}" APROVADO!`);
        if (activeLeadModal && activeLeadModal.id === lead.id) {
          setActiveLeadModal(json.lead);
        }
        await loadStats();
        await loadLeads(currentPage);
      } else {
        showToast('error', json.error || 'Erro ao aprovar lead.');
      }
    } catch (e: any) {
      showToast('error', `Falha ao aprovar: ${e.message}`);
    }
  };

  const handleQuickReject = async (lead: LeadRecord, reason: string) => {
    try {
      const res = await fetch(`/api/leads/${lead.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo_reprovacao: reason })
      });
      const json = await res.json();
      if (json.success && json.lead) {
        showToast('info', `Lead "${lead.contact_name}" marcado como REPROVADO.`);
        if (activeLeadModal && activeLeadModal.id === lead.id) {
          setActiveLeadModal(json.lead);
        }
        await loadStats();
        await loadLeads(currentPage);
      } else {
        showToast('error', json.error || 'Erro ao reprovar lead.');
      }
    } catch (e: any) {
      showToast('error', `Falha ao reprovar: ${e.message}`);
    }
  };

  const handleQuickInAnalysis = async (lead: LeadRecord) => {
    try {
      const res = await fetch(`/api/leads/${lead.id}/in-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.success && json.lead) {
        showToast('info', `Lead "${lead.contact_name}" movido para EM ANÁLISE.`);
        if (activeLeadModal && activeLeadModal.id === lead.id) {
          setActiveLeadModal(json.lead);
        }
        await loadStats();
        await loadLeads(currentPage);
      } else {
        showToast('error', json.error || 'Erro ao atualizar status.');
      }
    } catch (e: any) {
      showToast('error', `Falha ao atualizar status: ${e.message}`);
    }
  };

  const handleForceSearchCpf = async (lead: LeadRecord) => {
    try {
      const res = await fetch(`/api/leads/${lead.id}/force-search-cpf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.found && json.lead) {
        showToast(json.conflict ? 'warning' : 'success', json.message);
        if (activeLeadModal && activeLeadModal.id === lead.id) {
          setActiveLeadModal(json.lead);
        }
        await loadStats();
        await loadLeads(currentPage);
      } else {
        showToast('info', json.message || 'Nenhum CPF válido localizado nas mensagens recentes do cliente.');
      }
      return json;
    } catch (e: any) {
      showToast('error', `Falha ao buscar CPF: ${e.message}`);
      return { success: false, error: e.message };
    }
  };

  const handleDeleteLead = async (lead: LeadRecord) => {
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || ''
        }
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Erro ao excluir lead.');
      }
      showToast('success', json.message || 'Lead excluído com sucesso.');
      if (activeLeadModal && activeLeadModal.id === lead.id) {
        setActiveLeadModal(null);
      }
      await loadLeads(currentPage);
      await loadStats();
    } catch (err: any) {
      showToast('error', err.message || 'Falha ao excluir lead.');
    }
  };

  const handleUpdateAdSpend = async (amount: number) => {
    try {
      const res = await fetch('/api/config/ad-spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_spend: amount })
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', json.message || 'Investimento em tráfego atualizado!');
        await loadConfig();
        await loadStats();
      } else {
        showToast('error', json.error || 'Erro ao salvar investimento.');
      }
    } catch (e: any) {
      showToast('error', `Falha ao salvar investimento: ${e.message}`);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#002139] flex flex-col items-center justify-center text-white p-4">
        <div className="w-9 h-9 border-3 border-white/20 border-t-[#c1ef6d] rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-white font-['Plus_Jakarta_Sans',sans-serif]">ChatAnalytics 2.0</p>
        <p className="text-xs text-slate-400 mt-1">Carregando ambiente seguro...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onSuccess={user => setCurrentUser(user)} />;
  }

  return (
    <div className="flex min-h-screen bg-[#f8f9fc] text-slate-900 font-sans antialiased selection:bg-[#c1ef6d] selection:text-[#002139]">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl bg-white border border-slate-200 text-xs font-semibold animate-in slide-in-from-top-3 duration-200">
          {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          {notification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
          {notification.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
          {notification.type === 'info' && <Info className="w-4 h-4 text-[#1A94C5] shrink-0" />}
          <span className="text-slate-800">{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="ml-2 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={tab => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        config={config}
        totalLeadsCount={totalLeads}
        onExportCsv={handleExportCsv}
        onQuickSync={handleManualSync}
        isSyncing={isSyncing}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Workspace with Dynamic Responsive Margins */}
      <div className={`flex-1 ${isSidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'} flex flex-col min-w-0 min-h-screen transition-all duration-300 ease-in-out`}>
        <Header
          currentTab={currentTab}
          period={period}
          onPeriodChange={handlePeriodChange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          isSyncing={isSyncing}
          onTriggerSync={handleManualSync}
          config={config}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <main className="flex-1">
          {currentTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              recentLeads={leads}
              onNavigateToLeads={statusFilter => {
                if (statusFilter) {
                  setSelectedStatus(statusFilter);
                }
                setCurrentTab('leads');
              }}
              onOpenLeadDetails={lead => setActiveLeadModal(lead)}
              onNavigateToInvestments={() => setCurrentTab('investments')}
            />
          )}

          {currentTab === 'leads' && (
            <LeadsView
              leads={leads}
              summary={summary}
              totalLeads={totalLeads}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={page => {
                setCurrentPage(page);
                loadLeads(page);
              }}
              selectedStatus={selectedStatus}
              onStatusChange={st => {
                setSelectedStatus(st);
                setCurrentPage(1);
              }}
              searchQuery={searchQuery}
              onSearchChange={q => {
                setSearchQuery(q);
                setCurrentPage(1);
              }}
              selectedChannel={selectedChannel}
              onChannelChange={ch => {
                setSelectedChannel(ch);
                setCurrentPage(1);
              }}
              selectedSort={selectedSort}
              onSortChange={sort => {
                setSelectedSort(sort);
                setCurrentPage(1);
              }}
              selectedLoja={selectedLoja}
              onLojaChange={loja => {
                setSelectedLoja(loja);
                setCurrentPage(1);
              }}
              selectedVendedor={selectedVendedor}
              onVendedorChange={vendedor => {
                setSelectedVendedor(vendedor);
                setCurrentPage(1);
              }}
              selectedVendeu={selectedVendeu}
              onVendeuChange={vendeu => {
                setSelectedVendeu(vendeu);
                setCurrentPage(1);
              }}
              onOpenDetails={lead => setActiveLeadModal(lead)}
              onOpenNewLeadModal={() => setIsNewLeadModalOpen(true)}
              onQuickApprove={handleQuickApprove}
              onQuickReject={handleQuickReject}
              onQuickInAnalysis={handleQuickInAnalysis}
              onForceSearchCpf={handleForceSearchCpf}
              currentUser={currentUser}
              onDeleteLead={handleDeleteLead}
              onRefresh={() => {
                loadLeads(currentPage);
                loadStats();
              }}
            />
          )}

          {currentTab === 'conversions' && (
            <ConversionsView
              summary={summary}
              convertedLeads={leads.filter(l => l.vendeu || l.status === 'APROVADO')}
              onOpenLeadDetails={lead => setActiveLeadModal(lead)}
            />
          )}

          {currentTab === 'investments' && (
            <InvestmentsView
              summary={summary}
              onRefreshStats={loadStats}
              showToast={showToast}
            />
          )}

          {currentTab === 'channels' && (
            <ChannelsView
              summary={summary}
              config={config}
              onFilterByChannel={ch => {
                setSelectedChannel(ch);
                setCurrentTab('leads');
              }}
              onUpdateInbox={handleUpdateInbox}
              onSyncInboxes={handleSyncInboxes}
              onCleanMockData={handleCleanMockData}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              summary={summary}
              period={period}
              onExportCsv={handleExportCsv}
            />
          )}

          {currentTab === 'users' && (
            <UsersView
              currentUser={currentUser}
              showToast={showToast}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              config={config}
              onSaveConfig={handleSaveConfig}
              onTestConnection={handleTestConnection}
              onManualSync={handleManualSync}
              isSyncing={isSyncing}
              onClearDb={handleClearDb}
              onCleanMockData={handleCleanMockData}
              onUpdateAutoSync={handleUpdateAutoSync}
              onUpdateAdSpend={handleUpdateAdSpend}
              onBackupRestored={handleBackupRestored}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <LeadDetailModal
        lead={activeLeadModal}
        currentUser={currentUser}
        onClose={() => setActiveLeadModal(null)}
        onSaveLead={handleSaveLead}
        onApprove={handleQuickApprove}
        onReject={handleQuickReject}
        onInAnalysis={handleQuickInAnalysis}
        onDeleteLead={handleDeleteLead}
      />

      <NewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        onSubmit={handleCreateLead}
      />
    </div>
  );
}
