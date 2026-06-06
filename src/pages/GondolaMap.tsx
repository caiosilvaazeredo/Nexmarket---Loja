import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Star, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { ICONS_MAP } from '../lib/gondolaIcons';

interface Gondola {
  id: string;
  name: string;
  iconName: string;
  level: number;
  order: number;
  colorTheme?: string;
}

export default function GondolaMap() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gondolas, setGondolas] = useState<Gondola[]>([]);
  const [themeColor, setThemeColor] = useState('#58CC02');
  const [supermarketName, setSupermarketName] = useState('');

  useEffect(() => {
    if (!id) return;
    
    // Fetch supermarket details
    getDoc(doc(db, 'supermarkets', id)).then(docSnap => {
      if (docSnap.exists()) {
        setThemeColor(docSnap.data().themeColor);
        setSupermarketName(docSnap.data().name);
      }
    }).catch(e => handleFirestoreError(e, OperationType.GET, `supermarkets/${id}`));

    // Fetch gondolas
    const q = query(collection(db, `supermarkets/${id}/gondolas`), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Gondola[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Gondola);
      });
      setGondolas(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `supermarkets/${id}/gondolas`);
    });

    return () => unsubscribe();
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b-2 border-slate-100 flex items-center gap-4 sticky top-0 z-20">
        <button onClick={() => navigate('/')} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
          <ChevronLeft className="w-6 h-6" strokeWidth={3} />
        </button>
        <div className="flex-1 flex items-center justify-between">
            <h1 className="text-xl font-extrabold text-slate-700">{supermarketName}</h1>
            <div className="flex items-center gap-2 text-orange-400 font-bold bg-orange-50 px-3 py-1 rounded-full">
                <Star className="w-5 h-5 fill-current" />
                <span>0</span>
            </div>
        </div>
      </div>

      {/* Path Map */}
      <div className="flex-1 p-8 pb-32 max-w-lg mx-auto w-full relative">
        <div className="absolute top-0 bottom-0 left-1/2 w-4 -ml-2 bg-slate-200 z-0"></div>
        {gondolas.map((gondola, index) => {
          const Icon = ICONS_MAP[gondola.iconName] || ShoppingBag;
          // Calculate offset to create a winding path
          const offset = Math.sin(index * 1.5) * 60;
          const gondolaColor = gondola.colorTheme || themeColor;
          
          return (
            <motion.div 
              key={gondola.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1, type: "spring", bounce: 0.5 }}
              className="relative z-10 flex flex-col items-center my-8"
              style={{ transform: `translateX(${offset}px)` }}
            >
                {/* Crown / Level label */}
                <div 
                    className="absolute -top-6 bg-white border-2 border-slate-200 rounded-full px-3 py-1 text-xs font-bold text-slate-500 flex items-center gap-1 shadow-sm"
                    style={{ color: gondolaColor }}
                >
                    Nível {gondola.level}
                </div>
              <button
                onClick={() => navigate(`/supermarket/${id}/gondola/${gondola.id}`)}
                className="w-20 h-20 rounded-full flex items-center justify-center border-b-8 active:border-b-0 active:translate-y-2 transition-all"
                style={{ backgroundColor: gondolaColor, borderColor: "rgba(0,0,0,0.2)" }}
              >
                <Icon className="w-10 h-10 text-white" strokeWidth={2.5} />
              </button>
              <span className="mt-4 font-bold text-slate-600 text-lg bg-white/80 px-4 py-1 rounded-full backdrop-blur-sm border-2 border-slate-100">{gondola.name}</span>
            </motion.div>
          );
        })}

        {gondolas.length === 0 && (
          <div className="text-center p-8 text-slate-400 font-medium z-10 relative bg-white/80 backdrop-blur rounded-3xl border-2 border-slate-200">
            Nenhuma gôndola encontrada.
          </div>
        )}
      </div>
    </div>
  );
}
