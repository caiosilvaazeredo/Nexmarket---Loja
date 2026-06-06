import React, { useState, useEffect } from 'react';
import { 
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    loginAsVisitor, 
    resetPassword,
    db 
} from '../lib/firebase';
import { Button } from '../components/ui/Button';
import { ShoppingBasket, Mail, Store, User, Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useStore } from '../store/useStore';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [view, setView] = useState<'login' | 'register' | 'recovery'>('login');
  
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [networkName, setNetworkName] = useState('');
  const [cnpj, setCnpj] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const routeByRole = async (uid: string) => {
      // Basic check: we just redirect everyone to manager dashboard for now,
      // per instructions: "esse sistema é voltado apenas ao lojista"
      // later we can add more logic if needed.
      navigate('/dashboard');
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await loginWithEmail(email, password);
      await routeByRole(user.uid);
    } catch (err: any) {
      setError('Credenciais inválidas. Verifique seu e-mail e senha.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await registerWithEmail(email, password);
      // Create user profile in Firestore
      await setDoc(doc(db, `users/${user.uid}`), {
          name,
          email,
          contact,
          networkName,
          cnpj,
          role: 'manager', // Default to manager
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
      });
      await routeByRole(user.uid);
    } catch (err: any) {
      setError('Erro ao criar conta. Verifique os dados ou se o e-mail já está em uso.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await loginWithGoogle();
      // Ensure user profile exists
      const userDoc = await getDoc(doc(db, `users/${user.uid}`));
      if (!userDoc.exists()) {
          await setDoc(doc(db, `users/${user.uid}`), {
              name: user.displayName || 'Usuário',
              email: user.email || '',
              contact: '',
              networkName: '',
              cnpj: '',
              role: 'manager',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
          });
      }
      await routeByRole(user.uid);
    } catch (err: any) {
      setError('Erro ao fazer login com Google.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVisitorLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginAsVisitor();
      alert('Nada feito será salvo, é apenas um teste para quem quer conhecer a aplicação.');
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/admin-restricted-operation') {
        setError('O modo de teste não está configurado. Por favor, entre em contato com o administrador.');
      } else {
        setError('Erro ao entrar como visitante. Verifique se a autenticação anônima está ativada no Firebase.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
          await resetPassword(email);
          setSuccess('Link de recuperação enviado para o seu e-mail.');
      } catch(err: any) {
          setError('Erro ao enviar link de recuperação. Verifique o e-mail.');
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[440px] bg-white rounded-3xl p-8 sm:p-10 shadow-sm border-2 border-slate-100 flex flex-col transition-all">
        <div className="flex flex-col items-center text-center space-y-6 mb-8">
          <div className="w-20 h-20 bg-[#58CC02] rounded-3xl rotate-12 flex items-center justify-center shadow-lg shadow-green-200">
            <Store className="w-10 h-10 text-white -rotate-12" strokeWidth={3} />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Nexmarket</h1>
            <p className="text-slate-500 font-medium">Gestão inteligente para o seu mercado</p>
          </div>
        </div>

        {error && <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl font-medium text-sm text-center border-2 border-red-100">{error}</div>}
        {success && <div className="p-4 mb-6 bg-green-50 text-green-600 rounded-xl font-medium text-sm text-center border-2 border-green-100">{success}</div>}

        {view === 'login' && (
            <div className="space-y-6 w-full animate-in fade-in slide-in-from-bottom-2">
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-3">
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Seu e-mail" 
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-[#58CC02] focus:bg-white outline-none font-medium text-slate-700 transition-colors"
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Sua senha" 
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-[#58CC02] focus:bg-white outline-none font-medium text-slate-700 transition-colors"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button type="button" onClick={() => setView('recovery')} className="text-sm font-bold text-[#58CC02] hover:text-[#4ba802] transition-colors">
                                Esqueceu a senha?
                            </button>
                        </div>
                    </div>
                    <Button className="w-full h-12 text-lg" disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </Button>
                </form>

                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-medium">ou</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div className="space-y-3">
                    <Button variant="secondary" className="w-full h-12 font-bold text-slate-600 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300" onClick={handleGoogleLogin} disabled={loading}>
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Entrar com Google
                    </Button>
                    <Button variant="secondary" className="w-full h-12 bg-slate-100 text-slate-600 hover:bg-slate-200" onClick={handleVisitorLogin} disabled={loading}>
                        Quero apenas testar
                    </Button>
                </div>

                <div className="text-center pt-2">
                    <p className="text-slate-500 font-medium text-sm">
                        Não tem uma conta? <button onClick={() => setView('register')} className="text-[#58CC02] font-bold hover:underline">Cadastre-se</button>
                    </p>
                </div>
            </div>
        )}

        {view === 'register' && (
             <div className="space-y-6 w-full animate-in fade-in slide-in-from-bottom-2">
                 <button onClick={() => setView('login')} className="flex items-center text-slate-400 hover:text-slate-600 font-bold text-sm mb-4 transition-colors">
                     <ArrowLeft className="w-4 h-4 mr-1"/> Voltar para Login
                 </button>
                 <form onSubmit={handleRegister} className="space-y-4">
                     <div className="space-y-3">
                         <div className="relative">
                             <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                             <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-[#58CC02] focus:bg-white outline-none font-medium text-slate-700 transition-colors" />
                         </div>
                         <div className="relative">
                             <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                             <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-[#58CC02] focus:bg-white outline-none font-medium text-slate-700 transition-colors" />
                         </div>
                         <div className="relative">
                             <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                             <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" minLength={6} className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-[#58CC02] focus:bg-white outline-none font-medium text-slate-700 transition-colors" />
                         </div>
                         <div className="relative">
                             <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                             <input type="text" required value={networkName} onChange={e => setNetworkName(e.target.value)} placeholder="Nome da Rede / Loja" className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-[#58CC02] focus:bg-white outline-none font-medium text-slate-700 transition-colors" />
                         </div>
                         <input type="text" value={contact} onChange={e => setContact(e.target.value)} placeholder="Telefone (Opcional)" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-[#58CC02] focus:bg-white outline-none font-medium text-slate-700 transition-colors" />
                         <input type="text" value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="CNPJ (Opcional)" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-[#58CC02] focus:bg-white outline-none font-medium text-slate-700 transition-colors" />
                     </div>
                     <Button className="w-full h-12 text-lg mt-2" disabled={loading}>
                         {loading ? 'Criando...' : 'Criar Conta'}
                     </Button>
                 </form>
             </div>
        )}

        {view === 'recovery' && (
             <div className="space-y-6 w-full animate-in fade-in slide-in-from-bottom-2">
                 <button onClick={() => setView('login')} className="flex items-center text-slate-400 hover:text-slate-600 font-bold text-sm mb-4 transition-colors">
                     <ArrowLeft className="w-4 h-4 mr-1"/> Voltar para Login
                 </button>
                 <div className="mb-4">
                     <p className="text-slate-600 font-medium">Informe seu e-mail para receber um link de redefinição de senha.</p>
                 </div>
                 <form onSubmit={handleRecovery} className="space-y-4">
                     <div className="relative">
                         <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                         <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Seu e-mail" className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-[#58CC02] focus:bg-white outline-none font-medium text-slate-700 transition-colors" />
                     </div>
                     <Button className="w-full h-12 text-lg" disabled={loading}>
                         {loading ? 'Enviando...' : 'Enviar Link'}
                     </Button>
                 </form>
             </div>
        )}

      </div>
    </div>
  );
}
