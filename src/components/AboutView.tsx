import React from 'react';
import { 
  Info, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  Database, 
  Workflow, 
  Sparkles, 
  UserCheck, 
  CheckCircle2, 
  ExternalLink, 
  Layers, 
  Code2, 
  Radio, 
  FileSpreadsheet, 
  Fingerprint, 
  Mail, 
  Award,
  Zap,
  Target,
  BarChart3,
  MessageSquareCode
} from 'lucide-react';
import { NavTab } from './Sidebar.tsx';

interface AboutViewProps {
  onNavigate?: (tab: NavTab) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#001726] via-[#002744] to-[#001726] p-6 sm:p-8 lg:p-10 text-white shadow-xl border border-[#003e66]/50">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#1A94C5]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-[#c1ef6d]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-[#c1ef6d] backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#c1ef6d]" />
              <span>Plataforma Oficial de Inteligência de Tráfego & Atendimento</span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-black font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
                ChatAnalytics
              </h1>
              <span className="px-2.5 py-0.5 rounded-lg text-sm font-extrabold bg-[#c1ef6d] text-[#002139] shadow-sm">
                v2.0
              </span>
            </div>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              O <strong>ChatAnalytics 2.0</strong> é uma solução completa de Business Intelligence (BI) e esteira de conversão (SDR) projetada para integrar conversas do <strong>Chatwoot</strong>, capturar e auditar dados cadastrais críticos (como CPF) e fechar o ciclo entre investimento em tráfego pago e fechamento real de vendas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="px-4 py-2.5 rounded-xl bg-[#c1ef6d] hover:bg-[#aee24f] text-[#002139] text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Acessar Dashboard</span>
                </button>
                <button
                  onClick={() => onNavigate('leads')}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Target className="w-4 h-4 text-cyan-300" />
                  <span>Gestão de Leads</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: O que é & Pra que serve */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card: Pra que serve */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/90 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-[#1A94C5] border border-sky-100 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Para que serve o sistema?</h2>
              <p className="text-xs text-slate-500 mt-1">
                Conectando atendimento, inteligência de campanhas e conversões financeiras
              </p>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Em muitas empresas, as campanhas de marketing geram milhares de mensagens no WhatsApp e redes sociais, mas a equipe não consegue saber <strong>quais leads realmente se converteram em vendas</strong>, quem é o cliente (dados cadastrais), e qual anúncio gerou lucro real.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-700">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Rastreabilidade de Ponta a Ponta:</strong> Liga o clique no anúncio (Meta/Google Ads) ao cliente no Chatwoot e à venda concretizada.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Cálculo Real de CAC & ROAS:</strong> Cruza gastos de mídia com o faturamento apurado das vendas ganhas.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Esteira SDR para Qualificação:</strong> Atribui vendedor, loja, status de crédito e motivos de reprovação em tempo recorde.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Card: Funcionalidades Centrais */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/90 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Principais Funcionalidades</h2>
              <p className="text-xs text-slate-500 mt-1">
                Recursos desenvolvidos para máxima produtividade do time
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="flex items-center gap-2 mb-1">
                  <Fingerprint className="w-4 h-4 text-[#1A94C5]" />
                  <span className="text-xs font-bold text-slate-800">Captura de CPF</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Validação algorítmica matemática dos dígitos verificadores diretamente nas mensagens.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="flex items-center gap-2 mb-1">
                  <Workflow className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">Pipeline de Vendas</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Controle por status: Novo, Em Análise, Pendente, Aprovado e Reprovado.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">Coortes & Relatórios</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Série histórica diária, mensal e por canais com filtros por fuso America/Belem.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-800">Acesso Master</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Governança rigorosa onde apenas o Master cria operadores e define papéis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Como funciona o fluxo de dados */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/90 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Como funciona o Fluxo Operacional</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Da mensagem no WhatsApp ao relatório gerencial de faturamento
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 relative">
            <span className="text-2xl font-black text-slate-300">01</span>
            <h3 className="text-xs font-bold text-slate-800 mt-1 mb-1.5 flex items-center gap-2">
              <MessageSquareCode className="w-4 h-4 text-[#1A94C5]" />
              Entrada no Chatwoot
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              O lead chega pelas inboxes (WhatsApp, Instagram, Webchat). As conversas com etiqueta <code>trafego_pago</code> são sincronizadas automaticamente.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 relative">
            <span className="text-2xl font-black text-slate-300">02</span>
            <h3 className="text-xs font-bold text-slate-800 mt-1 mb-1.5 flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-emerald-600" />
              Extração Automática
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              O motor examina as mensagens enviadas pelo cliente, localiza CPFs e valida sua autenticidade algorítmica sem rejeitar novas mensagens.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 relative">
            <span className="text-2xl font-black text-slate-300">03</span>
            <h3 className="text-xs font-bold text-slate-800 mt-1 mb-1.5 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              Atuação do SDR
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              O operador SDR qualifica o contato na tabela de Gestão de Leads, define vendedor, loja, valor de venda ou anota motivos de pendência.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 relative">
            <span className="text-2xl font-black text-slate-300">04</span>
            <h3 className="text-xs font-bold text-slate-800 mt-1 mb-1.5 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              Consolidação de BI
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Os dados alimentam os painéis de Conversões, canais de entrada e cruzam com os investimentos em mídia para apurar ROAS e CAC.
            </p>
          </div>
        </div>
      </div>

      {/* Seção Quem Desenvolveu & Ficha Técnica */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bloco Desenvolvedor */}
        <div className="bg-gradient-to-br from-white to-slate-50/80 rounded-2xl p-6 shadow-xs border border-slate-200/90 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Autoria & Desenvolvimento</h3>
                <p className="text-[11px] text-slate-500">Responsável pelo projeto</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#002139] to-[#1A94C5] text-white flex items-center justify-center font-extrabold text-base shadow-sm">
                  NL
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                    Netsa Lobo
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Engenharia & Arquitetura de Software
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono text-slate-700">netsalobo@gmail.com</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Desenvolvido com foco em desempenho, integridade de dados e simplicidade de uso para equipes de tráfego, SDRs e gestores comerciais.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Status da Versão</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Produção Ativa
            </span>
          </div>
        </div>

        {/* Ficha Técnica e Arquitetura */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-xs border border-slate-200/90 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#1A94C5] flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Especificações Técnicas da Plataforma</h3>
              <p className="text-[11px] text-slate-500">Arquitetura de componentes e infraestrutura</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-500 font-medium text-[11px]">
                <Layers className="w-3.5 h-3.5 text-[#1A94C5]" />
                <span>Frontend</span>
              </div>
              <p className="font-semibold text-slate-800">
                React 18 + TypeScript + Vite + Tailwind CSS
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-500 font-medium text-[11px]">
                <Code2 className="w-3.5 h-3.5 text-[#1A94C5]" />
                <span>Backend & API</span>
              </div>
              <p className="font-semibold text-slate-800">
                Node.js + Express + TSX (Proxy seguro para Chatwoot)
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-500 font-medium text-[11px]">
                <Database className="w-3.5 h-3.5 text-[#1A94C5]" />
                <span>Persistência & Armazenamento</span>
              </div>
              <p className="font-semibold text-slate-800">
                Firebase Firestore + JSON Store local com autosave
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-500 font-medium text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1A94C5]" />
                <span>Autenticação & Segurança</span>
              </div>
              <p className="font-semibold text-slate-800">
                Firebase Auth (Google & E-mail/Senha) com trava de Master
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-500 font-medium text-[11px]">
                <Radio className="w-3.5 h-3.5 text-[#1A94C5]" />
                <span>Integração de Mensageria</span>
              </div>
              <p className="font-semibold text-slate-800">
                Chatwoot REST API v1/v3 + Webhooks em tempo real
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-500 font-medium text-[11px]">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#1A94C5]" />
                <span>Exportação & Fuso Horário</span>
              </div>
              <p className="font-semibold text-slate-800">
                CSV com codificação UTF-8 • Fuso America/Belem
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
