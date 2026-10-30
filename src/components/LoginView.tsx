import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, limit, query } from 'firebase/firestore';
import { auth, db } from '../lib/firebase.ts';
import { 
  Lock, 
  Mail, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  Crown, 
  AlertCircle,
  Eye, 
  EyeOff,
  CheckCircle2,
  KeyRound,
  ChevronLeft
} from 'lucide-react';
import { AppUser } from '../types.ts';

interface LoginViewProps {
  onSuccess: (user: AppUser) => void;
}

type AuthMode = 'login' | 'register' | 'forgot_password';

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [hasMasterUser, setHasMasterUser] = useState<boolean | null>(null);
  const [checkingMaster, setCheckingMaster] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Check if Master User exists on mount
  useEffect(() => {
    let isMounted = true;
    const verifyMasterStatus = async () => {
      try {
        // 1. Check local backend status
        try {
          const res = await fetch('/api/auth/status');
          if (res.ok) {
            const data = await res.json();
            if (data.has_master_user) {
              if (isMounted) {
                setHasMasterUser(true);
                setAuthMode('login');
                setCheckingMaster(false);
              }
              return;
            }
          }
        } catch (e) {
          console.warn('API auth status check skipped:', e);
        }

        // 2. Check Firestore /system/setup or /users collection
        try {
          const setupSnap = await getDoc(doc(db, 'system', 'setup'));
          if (setupSnap.exists() && setupSnap.data()?.masterRegistered) {
            if (isMounted) {
              setHasMasterUser(true);
              setAuthMode('login');
              setCheckingMaster(false);
            }
            return;
          }

          const q = query(collection(db, 'users'), limit(1));
          const usersSnap = await getDocs(q);
          const exists = !usersSnap.empty;
          if (isMounted) {
            setHasMasterUser(exists);
            if (!exists) {
              // First time setup - default to registration mode
              setAuthMode('register');
            }
            setCheckingMaster(false);
          }
        } catch (firestoreErr) {
          console.warn('Firestore users check skipped:', firestoreErr);
          if (isMounted) {
            setHasMasterUser(false);
            setAuthMode('login');
            setCheckingMaster(false);
          }
        }
      } finally {
        if (isMounted) setCheckingMaster(false);
      }
    };

    verifyMasterStatus();
    return () => { isMounted = false; };
  }, []);

  const getPortugueseAuthError = (code: string): string => {
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-mail ou senha incorretos. Se ainda não possui cadastro com senha, utilize o botão "Continuar com Google" ou clique na aba "Criar Conta".';
      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado no sistema. Tente fazer login ou redefinir sua senha.';
      case 'auth/weak-password':
        return 'A senha deve ter pelo menos 6 caracteres.';
      case 'auth/invalid-email':
        return 'Formato de e-mail inválido. Por favor, verifique.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas sem sucesso. Aguarde alguns instantes e tente novamente.';
      case 'auth/popup-closed-by-user':
        return 'Janela de login com o Google foi fechada antes da confirmação.';
      case 'auth/operation-not-allowed':
        return 'O método de login por e-mail/senha ainda não foi ativado no Firebase. Recomendamos utilizar o botão "Continuar com Google" acima.';
      default:
        return 'Falha na autenticação. Verifique os dados informados ou entre com o Google.';
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);

      if (!cred.user) {
        throw new Error('Falha ao autenticar com o Google.');
      }

      const userEmail = (cred.user.email || '').toLowerCase();
      const userUid = cred.user.uid;

      // 1. Check if user profile already exists by UID in /users
      const profileDoc = await getDoc(doc(db, 'users', userUid));
      
      if (profileDoc.exists()) {
        const profile = profileDoc.data() as AppUser;
        if (profile.status === 'inactive') {
          await signOut(auth);
          setErrorMsg('Sua conta de usuário está desativada no sistema. Contate o Administrador Master.');
          return;
        }
        onSuccess(profile);
        return;
      }

      // 2. Also check if the Master user created this user by email
      const qUsers = query(collection(db, 'users'), limit(50));
      const usersSnap = await getDocs(qUsers);
      const matchedExisting = usersSnap.docs
        .map(d => d.data() as AppUser)
        .find(u => u.email && u.email.toLowerCase() === userEmail);

      if (matchedExisting) {
        const activatedUser: AppUser = {
          ...matchedExisting,
          uid: userUid,
          name: cred.user.displayName || matchedExisting.name,
          status: matchedExisting.status || 'active'
        };
        if (activatedUser.status === 'inactive') {
          await signOut(auth);
          setErrorMsg('Sua conta de usuário está desativada no sistema. Contate o Administrador Master.');
          return;
        }
        await setDoc(doc(db, 'users', userUid), activatedUser);
        onSuccess(activatedUser);
        return;
      }

      // 3. If user doesn't exist, check if there are ANY users in the system
      const isSystemEmpty = usersSnap.empty;

      if (isSystemEmpty || !hasMasterUser) {
        // First ever user becomes the MASTER user
        const masterProfile: AppUser = {
          uid: userUid,
          name: cred.user.displayName || userEmail.split('@')[0] || 'Administrador Master',
          email: userEmail,
          role: 'admin',
          status: 'active',
          isMaster: true,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', userUid), masterProfile);
        try {
          await setDoc(doc(db, 'system', 'setup'), {
            masterRegistered: true,
            masterUid: userUid,
            masterEmail: userEmail,
            createdAt: new Date().toISOString()
          });
          await fetch('/api/auth/set-master', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail })
          });
        } catch (e) {
          console.warn('Could not record master setup:', e);
        }

        setHasMasterUser(true);
        onSuccess(masterProfile);
      } else {
        // Master already exists and this user was not pre-created by Master!
        await signOut(auth);
        setErrorMsg(`Acesso não autorizado: O e-mail "${userEmail}" não foi cadastrado no sistema. Por medida de segurança, novos usuários devem ser criados previamente pelo Administrador Master no menu "Usuários".`);
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.warn('Google sign-in warning:', err);
      setErrorMsg(getPortugueseAuthError(err.code || ''));
    } finally {
      setGoogleLoading(false);
    }
  };

  // Password Reset Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Informe seu e-mail para receber o link de recuperação.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMsg(`Instruções de redefinição enviadas para ${email.trim()}. Verifique sua caixa de entrada e pasta de spam.`);
    } catch (err: any) {
      console.warn('Password reset error:', err);
      setErrorMsg(getPortugueseAuthError(err.code || ''));
    } finally {
      setLoading(false);
    }
  };

  // Form Submit Handler (Login or Register)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (authMode === 'register') {
        if (hasMasterUser) {
          setErrorMsg('O Administrador Master já foi cadastrado. Novos operadores devem ser criados internamente pelo Master em "Gestão de Usuários".');
          setLoading(false);
          return;
        }

        if (!name.trim()) {
          setErrorMsg('Por favor, informe seu nome completo.');
          setLoading(false);
          return;
        }

        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });

        const userEmail = email.trim().toLowerCase();
        const masterUser: AppUser = {
          uid: cred.user.uid,
          name: name.trim(),
          email: userEmail,
          role: 'admin',
          status: 'active',
          isMaster: true,
          createdAt: new Date().toISOString()
        };

        // Save profile in Firestore /users
        try {
          await setDoc(doc(db, 'users', cred.user.uid), masterUser);
          await setDoc(doc(db, 'system', 'setup'), {
            masterRegistered: true,
            masterUid: cred.user.uid,
            masterEmail: userEmail,
            createdAt: new Date().toISOString()
          });
          await fetch('/api/auth/set-master', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail })
          });
        } catch (e) {
          console.warn('Could not write master setup doc:', e);
        }

        setHasMasterUser(true);
        onSuccess(masterUser);
      } else {
        // Login mode
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const userUid = cred.user.uid;
        const userEmail = (cred.user.email || email.trim()).toLowerCase();

        // 1. Check profile in Firestore /users
        const profileDoc = await getDoc(doc(db, 'users', userUid));
        let userProfile: AppUser | null = null;

        if (profileDoc.exists()) {
          userProfile = profileDoc.data() as AppUser;
        } else {
          // Check by email in /users (e.g. user was provisioned by master with email)
          const qUsers = query(collection(db, 'users'), limit(50));
          const usersSnap = await getDocs(qUsers);
          const matchedProfile = usersSnap.docs
            .map(d => d.data() as AppUser)
            .find(u => u.email && u.email.toLowerCase() === userEmail);

          if (matchedProfile) {
            userProfile = {
              ...matchedProfile,
              uid: userUid,
              status: matchedProfile.status || 'active'
            };
            await setDoc(doc(db, 'users', userUid), userProfile);
          }
        }

        if (!userProfile) {
          // Check if system has no users at all
          const qUsers = query(collection(db, 'users'), limit(1));
          const usersSnap = await getDocs(qUsers);
          if (usersSnap.empty || !hasMasterUser) {
            userProfile = {
              uid: userUid,
              name: cred.user.displayName || email.split('@')[0] || 'Administrador Master',
              email: userEmail,
              role: 'admin',
              status: 'active',
              isMaster: true,
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', userUid), userProfile);
            setHasMasterUser(true);
          } else {
            await signOut(auth);
            setErrorMsg(`Acesso não autorizado: O usuário "${userEmail}" não possui cadastro no sistema. Novos usuários devem ser criados pelo Administrador Master no menu "Usuários".`);
            setLoading(false);
            return;
          }
        }

        if (userProfile.status === 'inactive') {
          await signOut(auth);
          setErrorMsg('Sua conta de usuário está inativa. Entre em contato com o Administrador Master.');
          setLoading(false);
          return;
        }

        onSuccess(userProfile);
      }
    } catch (err: any) {
      // Use console.warn for credential / user-input mismatch so error telemetry is not triggered
      console.warn('Auth issue:', err.code, err.message);
      setErrorMsg(getPortugueseAuthError(err.code || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden">
        {/* Top Header Card */}
        <div className="bg-[#002139] p-8 text-white text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#1A94C5]/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-[#c1ef6d]/15 rounded-full blur-2xl pointer-events-none" />

          <div className="w-14 h-14 bg-white/10 rounded-2xl border border-white/10 flex items-center justify-center mx-auto mb-4 text-[#c1ef6d] shadow-inner">
            {authMode === 'register' ? (
              <Crown className="w-7 h-7 text-amber-400" />
            ) : authMode === 'forgot_password' ? (
              <KeyRound className="w-7 h-7 text-sky-400" />
            ) : (
              <ShieldCheck className="w-7 h-7" />
            )}
          </div>

          <h1 className="text-2xl font-black font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
            ChatAnalytics
          </h1>

          {checkingMaster ? (
            <p className="text-xs text-slate-300 mt-1">
              Verificando configurações de segurança...
            </p>
          ) : authMode === 'register' ? (
            <div className="mt-2 space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                <Crown className="w-3.5 h-3.5" />
                {!hasMasterUser ? 'Configuração Inicial • Administrador Master' : 'Novo Usuário do Sistema'}
              </span>
              <p className="text-xs text-slate-300 max-w-xs mx-auto pt-1">
                {!hasMasterUser 
                  ? 'Cadastre o Administrador Master para assumir a gestão da plataforma.'
                  : 'Crie seu acesso para acompanhar métricas e conversões do Chatwoot.'}
              </p>
            </div>
          ) : authMode === 'forgot_password' ? (
            <div className="mt-1">
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                Recuperação de acesso à sua conta ChatAnalytics
              </p>
            </div>
          ) : (
            <div className="mt-1">
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                Acesso seguro à plataforma de inteligência de tráfego e conversões Chatwoot
              </p>
            </div>
          )}
        </div>

        {/* Auth Body */}
        <div className="p-8 space-y-5">
          {/* Quick 1-Click Google Sign In */}
          {authMode !== 'forgot_password' && (
            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-3 px-4 rounded-xl border border-slate-300 hover:border-slate-400 hover:bg-slate-50/80 bg-white text-slate-700 text-sm font-semibold flex items-center justify-center gap-3 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {googleLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-[#002139] rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continuar com Google</span>
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-medium tracking-wider">
                    ou com e-mail e senha
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Mode Switcher Tabs (Entrar / Cadastrar) */}
          {authMode !== 'forgot_password' && (
            !hasMasterUser ? (
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Cadastrar Master
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-[#1A94C5] shrink-0" />
                <span className="leading-tight">
                  <strong>Acesso Restrito:</strong> Novos usuários só podem ser cadastrados pelo Administrador Master.
                </span>
              </div>
            )
          )}

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span>{errorMsg}</span>
                {authMode === 'login' && !hasMasterUser && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className="text-xs font-bold text-[#1A94C5] underline hover:text-[#002139] cursor-pointer"
                    >
                      Cadastrar Administrador Master agora
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Forgot Password View */}
          {authMode === 'forgot_password' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Seu E-mail Cadastrado *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="seu.email@empresa.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-[#1A94C5] focus:ring-2 focus:ring-[#1A94C5]/20 bg-slate-50/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#002139] hover:bg-[#00375a] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enviar Link de Redefinição</span>
                    <ArrowRight className="w-4 h-4 text-[#c1ef6d]" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Voltar para o login</span>
                </button>
              </div>
            </form>
          ) : (
            /* Login / Register Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nome Completo *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Silva"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-[#1A94C5] focus:ring-2 focus:ring-[#1A94C5]/20 bg-slate-50/50"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  E-mail *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="seu.email@empresa.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-[#1A94C5] focus:ring-2 focus:ring-[#1A94C5]/20 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Senha *
                  </label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot_password');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-[11px] font-semibold text-[#1A94C5] hover:underline cursor-pointer"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || checkingMaster}
                  className="w-full py-3 px-4 rounded-xl bg-[#002139] hover:bg-[#00375a] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processando...</span>
                    </div>
                  ) : (
                    <>
                      <span>{authMode === 'register' ? 'Criar Conta e Acessar' : 'Acessar Sistema'}</span>
                      <ArrowRight className="w-4 h-4 text-[#c1ef6d]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-6 text-center">
        Protegido por Firebase Authentication • Fuso: America/Belem
      </p>
    </div>
  );
};
