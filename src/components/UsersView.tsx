import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db } from '../lib/firebase.ts';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  Mail, 
  Lock, 
  User, 
  X, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Search
} from 'lucide-react';
import { AppUser } from '../types.ts';

interface UsersViewProps {
  currentUser: AppUser | null;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ currentUser, showToast }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'operator'>('operator');
  const [showPassword, setShowPassword] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: AppUser[] = [];
      snap.forEach(d => {
        list.push(d.data() as AppUser);
      });

      // Ensure currentUser is included if DB is newly initialized
      if (list.length === 0 && currentUser) {
        list.push(currentUser);
        try {
          await setDoc(doc(db, 'users', currentUser.uid), currentUser);
        } catch (saveErr) {
          console.warn('Could not auto-seed currentUser in Firestore:', saveErr);
        }
      } else if (currentUser && !list.some(u => u.uid === currentUser.uid || u.email === currentUser.email)) {
        list.unshift(currentUser);
      }

      // Sort: current user first, then by createdAt desc
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setUsers(list);
    } catch (err: any) {
      console.warn('Notice fetching users from Firestore:', err?.message || err);
      // Graceful fallback to avoid blank screen or blocking the admin
      if (currentUser) {
        setUsers([currentUser]);
      }
      showToast('error', 'Falha ao carregar lista de usuários do banco.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      showToast('error', 'Preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 6) {
      showToast('error', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use an isolated secondary Firebase app to create user without logging out the current admin
      const secondaryAppName = `user-creator-${Date.now()}`;
      const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
      await signOut(secondaryAuth);

      const newUser: AppUser = {
        uid: cred.user.uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', cred.user.uid), newUser);
      showToast('success', `Usuário ${newUser.name} criado com sucesso!`);
      
      setName('');
      setEmail('');
      setPassword('');
      setRole('operator');
      setIsModalOpen(false);

      await fetchUsers();
    } catch (err: any) {
      console.error('Error creating user:', err);
      if (err.code === 'auth/email-already-in-use') {
        showToast('error', 'Este e-mail já está cadastrado.');
      } else {
        showToast('error', err.message || 'Erro ao criar novo usuário.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: AppUser) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'users', user.uid), { status: nextStatus });
      showToast('success', `Status do usuário atualizado para ${nextStatus === 'active' ? 'Ativo' : 'Inativo'}.`);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      showToast('error', 'Erro ao alterar status.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const target = users.find(u => u.uid === userId);
    if (target?.isMaster) {
      showToast('error', 'O usuário Master é o proprietário do sistema e não pode ser excluído.');
      setDeletingUserId(null);
      return;
    }

    if (userId === currentUser?.uid) {
      showToast('error', 'Você não pode excluir sua própria conta enquanto estiver logado.');
      setDeletingUserId(null);
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
      showToast('success', 'Registro do usuário removido do sistema.');
      setDeletingUserId(null);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      showToast('error', 'Erro ao remover usuário.');
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q);
  });

  const getRoleBadge = (r: string) => {
    switch (r) {
      case 'admin':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            Administrador
          </span>
        );
      case 'manager':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
            Gerente Comercial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Operador de Tráfego
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Controle de Acessos & Permissões
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#002139] mt-1 font-['Plus_Jakarta_Sans',sans-serif]">
            Gestão de Usuários da Equipe
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Crie e gerencie os acessos dos operadores, gestores de tráfego e administradores.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#002139] hover:bg-[#00375a] text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-[0.98] self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4 text-[#c1ef6d]" />
          <span>Criar Novo Usuário</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total de Usuários
          </span>
          <span className="text-2xl font-extrabold text-[#002139] mt-2 block tabular-nums">
            {users.length}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">Cadastrados no sistema</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
            Administradores
          </span>
          <span className="text-2xl font-extrabold text-purple-900 mt-2 block tabular-nums">
            {users.filter(u => u.role === 'admin').length}
          </span>
          <span className="text-xs text-purple-700 mt-1 block">Acesso total irrestrito</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">
            Gerentes Comerciais
          </span>
          <span className="text-2xl font-extrabold text-sky-900 mt-2 block tabular-nums">
            {users.filter(u => u.role === 'manager').length}
          </span>
          <span className="text-xs text-sky-700 mt-1 block">Relatórios e leads</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Usuários Ativos
          </span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-2 block tabular-nums">
            {users.filter(u => u.status !== 'inactive').length}
          </span>
          <span className="text-xs text-emerald-700 mt-1 block">Com login habilitado</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou cargo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#1A94C5] bg-slate-50/50"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {filteredUsers.length} usuários listados
        </span>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 h-10">
                <th className="px-6">Usuário</th>
                <th className="px-6">E-mail de Acesso</th>
                <th className="px-6">Nível de Permissão</th>
                <th className="px-6">Data de Cadastro</th>
                <th className="px-6 text-center">Status</th>
                <th className="px-6 text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-slate-300 border-t-[#002139] rounded-full animate-spin"></div>
                      <span>Carregando usuários...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const isCurrent = u.uid === currentUser?.uid;
                  const initials = (u.name || u.email || 'U')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#002139] text-[#c1ef6d] flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-[#002139] flex items-center gap-1.5 flex-wrap">
                              <span>{u.name}</span>
                              {u.isMaster && (
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                                  👑 Master
                                </span>
                              )}
                              {isCurrent && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Você
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">ID: {u.uid.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 font-medium text-slate-700">
                        {u.email}
                      </td>

                      <td className="px-6 py-3.5">
                        {getRoleBadge(u.role)}
                      </td>

                      <td className="px-6 py-3.5 text-slate-500 tabular-nums">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '-'}
                      </td>

                      <td className="px-6 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={u.isMaster}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                            u.status !== 'inactive' 
                              ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100' 
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          } disabled:opacity-75 disabled:cursor-not-allowed`}
                        >
                          {u.status !== 'inactive' ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>

                      <td className="px-6 py-3.5 text-center">
                        {!isCurrent && !u.isMaster && (
                          <button
                            onClick={() => setDeletingUserId(u.uid)}
                            title="Excluir usuário"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar Novo Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#002139] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#c1ef6d]" />
                <h3 className="font-bold text-base font-['Plus_Jakarta_Sans',sans-serif]">
                  Criar Novo Usuário
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nome Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Amanda Rocha"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-[#1A94C5] focus:ring-2 focus:ring-[#1A94C5]/20 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  E-mail de Acesso *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="amanda@empresa.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-[#1A94C5] focus:ring-2 focus:ring-[#1A94C5]/20 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Senha Provisória *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-[#1A94C5] focus:ring-2 focus:ring-[#1A94C5]/20 bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nível de Permissão
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-[#1A94C5] focus:ring-2 focus:ring-[#1A94C5]/20 bg-slate-50/50 font-medium"
                >
                  <option value="operator">Operador de Tráfego (Visualização e Leads)</option>
                  <option value="manager">Gerente Comercial (Relatórios & Investimentos)</option>
                  <option value="admin">Administrador (Acesso Completo ao Sistema)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
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
                  {isSubmitting ? 'Criando usuário...' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deletingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Remover Usuário?</h3>
            </div>
            <p className="text-xs text-slate-500">
              Esta ação removerá o acesso deste usuário à plataforma.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingUserId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteUser(deletingUserId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Confirmar Remoção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
