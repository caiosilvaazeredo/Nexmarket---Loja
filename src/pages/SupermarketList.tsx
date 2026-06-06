import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Store, User, LogOut } from 'lucide-react';
import { useStore } from '../store/useStore';
import { logout } from '../lib/firebase';

interface Supermarket {
  id: string;
  name: string;
  themeColor: string;
  ownerId: string;
}

export default function SupermarketList() {
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
  const navigate = useNavigate();
  const { user } = useStore();

  useEffect(() => {
    const q = query(collection(db, 'supermarkets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Supermarket[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Supermarket);
      });
      setSupermarkets(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'supermarkets');
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b-2 border-slate-100 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-slate-800">Mercados</h1>
        <div className="flex gap-4">
          <button onClick={() => navigate('/manager')} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
            <User className="w-5 h-5" />
          </button>
          <button onClick={() => logout()} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        {supermarkets.map(sm => (
          <div 
            key={sm.id}
            onClick={() => navigate(`/supermarket/${sm.id}`)}
            className="group relative bg-white border-2 border-b-4 border-slate-200 rounded-2xl p-6 cursor-pointer hover:bg-slate-50 transition-all active:translate-y-1 active:border-b-2"
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner"
                style={{ backgroundColor: sm.themeColor + '20' }} // 20% opacity
              >
                <Store className="w-8 h-8" style={{ color: sm.themeColor }} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">{sm.name}</h2>
                <p className="text-slate-400 font-medium text-sm">Gôndolas gamificadas liberadas</p>
              </div>
            </div>
          </div>
        ))}
        {supermarkets.length === 0 && (
          <div className="text-center p-12 text-slate-400 font-medium border-2 border-dashed border-slate-200 rounded-3xl">
            Nenhum mercado encontrado. <br/> Seja o primeiro a criar um!
          </div>
        )}
      </div>
    </div>
  );
}
