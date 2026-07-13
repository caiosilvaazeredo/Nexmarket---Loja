import React, { useState, useEffect } from 'react';
import { 
    loginWithEmail, 
    registerWithEmail, 
    loginAsVisitor, 
    db 
} from '../lib/firebase';
import { Button } from '../components/ui/Button';
import { ShoppingBasket, Mail, Store, User, Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useStore } from '../store/useStore';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [view, setView] = useState<'login' | 'register'>('login');
  
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
      setError(err?.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
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
      setError(err?.message || 'Erro ao criar conta. Verifique os dados ou se o e-mail já está em uso.');
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
                        <p className="text-right text-xs text-slate-400 font-medium">
                            Esqueceu a senha? Fale com o suporte Nexmarket.
                        </p>
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

      </div>
    </div>
  );
}
