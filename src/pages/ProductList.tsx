import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/Button';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

export default function ProductList() {
  const { smId, gdId } = useParams<{ smId: string; gdId: string }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [themeColor, setThemeColor] = useState('#58CC02');
  const [gondolaName, setGondolaName] = useState('');

  useEffect(() => {
    if (!smId || !gdId) return;
    
    getDoc(doc(db, 'supermarkets', smId)).then(docSnap => {
      if (docSnap.exists()) setThemeColor(docSnap.data().themeColor);
    }).catch(e => handleFirestoreError(e, OperationType.GET, `supermarkets/${smId}`));

    getDoc(doc(db, `supermarkets/${smId}/gondolas`, gdId)).then(docSnap => {
      if (docSnap.exists()) setGondolaName(docSnap.data().name);
    }).catch(e => handleFirestoreError(e, OperationType.GET, `supermarkets/${smId}/gondolas/${gdId}`));

    const q = query(collection(db, `supermarkets/${smId}/products`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        if (doc.data().gondolaId === gdId) {
            data.push({ id: doc.id, ...doc.data() });
        }
      });
      data.sort((a,b) => (a.order || 0) - (b.order || 0));
      setProducts(data as Product[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `supermarkets/${smId}/products`);
    });

    return () => unsubscribe();
  }, [smId, gdId]);

  const progress = products.length > 0 ? ((currentIdx) / products.length) * 100 : 0;

  const handleNext = () => {
      if (currentIdx < products.length - 1) {
          setCurrentIdx(prev => prev + 1);
      } else {
          // Finished!
          navigate(`/supermarket/${smId}`);
      }
  };

  if (products.length === 0) {
      return (
          <div className="min-h-screen bg-white p-6 flex flex-col items-center justify-center">
               <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-8 h-8" strokeWidth={3} />
              </button>
              <h2 className="text-2xl font-bold text-slate-400">Esta gôndola está vazia.</h2>
          </div>
      )
  }

  const currentProduct = products[currentIdx];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header & Progress */}
      <div className="p-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-8 h-8" strokeWidth={3} />
        </button>
        <div className="flex-1 bg-slate-200 h-4 rounded-full overflow-hidden">
             <motion.div 
                className="h-full rounded-full"
                style={{ backgroundColor: themeColor }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
             />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-32">
        <h2 className="text-3xl font-extrabold text-slate-800 mb-8 self-start w-full text-center">
          Você quer adicionar ao carrinho?
        </h2>
        
        <AnimatePresence mode="popLayout">
            <motion.div
                key={currentProduct.id}
                initial={{ scale: 0.8, opacity: 0, x: 100 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                exit={{ scale: 0.8, opacity: 0, x: -100 }}
                transition={{ type: "spring", bounce: 0.4 }}
                className="w-full max-w-sm"
            >
                <div className="bg-white border-2 border-b-8 border-slate-200 rounded-3xl p-6 flex flex-col items-center">
                    {currentProduct.imageUrl ? (
                        <img src={currentProduct.imageUrl} alt={currentProduct.name} className="w-48 h-48 object-contain rounded-xl mb-6 shadow-sm border border-slate-100" />
                    ) : (
                        <div className="w-48 h-48 bg-slate-100 rounded-xl mb-6 flex items-center justify-center text-slate-300">Sem Imagem</div>
                    )}
                    <h3 className="text-2xl font-bold text-slate-700 text-center">{currentProduct.name}</h3>
                    <p className="text-xl font-extrabold text-[#58CC02] mt-2">
                        R$ {currentProduct.price.toFixed(2)}
                    </p>
                </div>
            </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Area */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t-2 border-slate-100 flex gap-4 max-w-md mx-auto w-full">
         <Button variant="secondary" className="flex-1" size="lg" onClick={handleNext}>
            Pular
         </Button>
         <Button className="flex-1" size="lg" themeColor={themeColor} variant="supermarket" onClick={handleNext}>
            Adicionar <Check className="w-5 h-5 ml-2" strokeWidth={3} />
         </Button>
      </div>
    </div>
  );
}
