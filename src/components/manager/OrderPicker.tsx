import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Button } from '../ui/Button';
import { Check, X, AlertCircle, ShoppingBag, Printer, ArrowRight, Search, Loader2 } from 'lucide-react';

interface OrderPickerProps {
  supermarketId: string;
  products: any[];
}

export default function OrderPicker({ supermarketId, products }: OrderPickerProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, `supermarkets/${supermarketId}/orders`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      // Sort: pending first, then picking
      data.sort((a, b) => {
          const statusOrder: any = { pending: 1, picking: 2, waiting_substitution: 3, ready: 4, delivered: 5 };
          return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      });
      setOrders(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `supermarkets/${supermarketId}/orders`));
    return () => unsubscribe();
  }, [supermarketId]);

  const activeOrder = orders.find(o => o.id === activeOrderId);

  const startPicking = async (orderId: string) => {
    try {
        await updateDoc(doc(db, `supermarkets/${supermarketId}/orders/${orderId}`), {
            status: 'picking',
            updatedAt: serverTimestamp()
        });
        setActiveOrderId(orderId);
    } catch(err) {
        handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${supermarketId}/orders`);
    }
  };

  const [substituteItemIndex, setSubstituteItemIndex] = useState<number | null>(null);
  const [substituteSearch, setSubstituteSearch] = useState('');
  const [substituteLoading, setSubstituteLoading] = useState(false);
  const [substituteSelected, setSubstituteSelected] = useState<any>(null);

  const markItem = async (itemIndex: number, status: 'separated' | 'missing') => {
      if (!activeOrder) return;
      
      if (status === 'missing') {
          setSubstituteItemIndex(itemIndex);
          return;
      }
      
      const newItems = [...activeOrder.items];
      const item = newItems[itemIndex];
      
      item.separated = true;
      item.missing = false;
      item.substituted = false;
      
      try {
          await updateDoc(doc(db, `supermarkets/${supermarketId}/orders/${activeOrder.id}`), {
              items: newItems,
              updatedAt: serverTimestamp()
          });
      } catch(err) {
          handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${supermarketId}/orders`);
      }
  };

  const markMissingDirectly = async (itemIndex: number) => {
      if (!activeOrder) return;
      
      const newItems = [...activeOrder.items];
      const item = newItems[itemIndex];
      
      item.separated = false;
      item.missing = true;
      item.substituted = false;
      
      try {
          await updateDoc(doc(db, `supermarkets/${supermarketId}/orders/${activeOrder.id}`), {
              items: newItems,
              updatedAt: serverTimestamp()
          });
          setSubstituteItemIndex(null);
          setSubstituteSelected(null);
      } catch(err) {
          handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${supermarketId}/orders`);
      }
  };

  const sendSubstituteSuggestion = async () => {
      if (!activeOrder || substituteItemIndex === null || !substituteSelected) return;
      
      setSubstituteLoading(true);
      
      // Simulate waiting for customer approval
      setTimeout(async () => {
          setSubstituteLoading(false);
          
          const newItems = [...activeOrder.items];
          const item = newItems[substituteItemIndex];
          
          item.separated = false;
          item.missing = true;
          item.substituted = true;
          item.substituteName = substituteSelected.name;
          item.substitutePrice = substituteSelected.price;
          
          try {
              await updateDoc(doc(db, `supermarkets/${supermarketId}/orders/${activeOrder.id}`), {
                  items: newItems,
                  updatedAt: serverTimestamp()
              });
              setSubstituteItemIndex(null);
              setSubstituteSelected(null);
              setSubstituteSearch('');
              alert('Simulação: O cliente aprovou a substituição!');
          } catch(err) {
              handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${supermarketId}/orders`);
          }
      }, 3000);
  };

  const completePicking = async () => {
      if (!activeOrder) return;
      const hasMissing = activeOrder.items.some((i: any) => i.missing);
      try {
          await updateDoc(doc(db, `supermarkets/${supermarketId}/orders/${activeOrder.id}`), {
              status: hasMissing ? 'waiting_substitution' : 'ready',
              updatedAt: serverTimestamp()
          });
          setActiveOrderId(null);
      } catch(err) {
          handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${supermarketId}/orders`);
      }
  };

  const printCommand = () => {
      alert("Impressão térmica Bluetooth enviada!");
  };

  if (activeOrderId && activeOrder) {
      const isComplete = activeOrder.items.every((i: any) => i.separated || i.missing);
      return (
          <div className="max-w-xl mx-auto pb-24">
              <div className="flex items-center justify-between mb-6">
                  <div>
                      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ShoppingBag className="w-6 h-6 text-green-500"/> Pedido #{activeOrder.id.slice(0,6)}</h2>
                      <p className="text-slate-500">Cliente ID: {activeOrder.customerId}</p>
                  </div>
                  <Button variant="secondary" onClick={() => setActiveOrderId(null)}>Pausar</Button>
              </div>

              <div className="space-y-4">
                  {activeOrder.items.map((item: any, index: number) => (
                      <div key={index} className={`bg-white rounded-2xl p-5 border-2 shadow-sm transition-all ${item.separated ? 'border-green-500 bg-green-50/30' : item.substituted ? 'border-yellow-400 bg-yellow-50/30' : item.missing ? 'border-red-400 bg-red-50/30' : 'border-slate-200'}`}>
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <h3 className={`font-bold text-xl text-slate-800 ${item.substituted ? 'line-through text-slate-400' : ''}`}>{item.name}</h3>
                                  <p className="text-slate-500 font-medium">{item.quantity}x • R$ {item.price.toFixed(2)}</p>
                                  {item.substituted && (
                                      <div className="mt-2 bg-yellow-100 p-3 rounded-lg border border-yellow-300">
                                          <p className="text-xs text-yellow-800 font-bold mb-1">PRODUTO SUBSTITUÍDO POR:</p>
                                          <p className="text-yellow-900 font-bold">{item.substituteName}</p>
                                          <p className="text-yellow-800 font-medium text-sm">R$ {item.substitutePrice.toFixed(2)}</p>
                                      </div>
                                  )}
                              </div>
                              {item.separated && <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Check className="w-3 h-3"/> Coletado</div>}
                              {item.missing && !item.substituted && <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Em falta</div>}
                              {item.substituted && <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Check className="w-3 h-3"/> Substituído</div>}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                              <button 
                                  onClick={() => markItem(index, 'separated')}
                                  className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${item.separated ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-green-100 hover:text-green-700'}`}
                              >
                                  <Check className="w-5 h-5"/> Separado
                              </button>
                              <button 
                                  onClick={() => markItem(index, 'missing')}
                                  className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${item.missing ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700'}`}
                              >
                                  <X className="w-5 h-5"/> Em falta
                              </button>
                          </div>
                      </div>
                  ))}
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 md:left-80 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20 flex justify-between gap-4">
                <Button variant="secondary" className="flex-1 max-w-[200px]" onClick={printCommand}>
                    <Printer className="w-5 h-5 mr-2"/> Imprimir
                </Button>
                <Button 
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white" 
                    disabled={!isComplete}
                    onClick={completePicking}
                >
                    Concluir Separação <ArrowRight className="w-5 h-5 ml-2"/>
                </Button>
              </div>

              {substituteItemIndex !== null && (
                  <div className="fixed inset-0 bg-slate-800/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                              <h3 className="text-xl font-bold text-slate-800">Sugerir Substituição</h3>
                              <button onClick={() => { setSubstituteItemIndex(null); setSubstituteSelected(null); setSubstituteSearch(''); }} className="text-slate-400 hover:text-slate-600 border-none outline-none focus:outline-none">
                                  <X className="w-6 h-6"/>
                              </button>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-6 space-y-6">
                              <div>
                                  <p className="text-sm font-bold text-slate-500 mb-1">PRODUTO EM FALTA:</p>
                                  <p className="text-lg font-bold text-slate-800">{activeOrder.items[substituteItemIndex].name}</p>
                              </div>

                              {!substituteLoading ? (
                                  <>
                                      <div className="relative">
                                          <Search className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                                          <input 
                                              type="text" 
                                              placeholder="Buscar produto substituto..." 
                                              className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                              value={substituteSearch}
                                              onChange={e => setSubstituteSearch(e.target.value)}
                                          />
                                      </div>

                                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                          {products.filter(p => p.name.toLowerCase().includes(substituteSearch.toLowerCase())).slice(0, 5).map(pr => (
                                              <div 
                                                  key={pr.id} 
                                                  onClick={() => setSubstituteSelected(pr)} 
                                                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${substituteSelected?.id === pr.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                                              >
                                                  {pr.imageUrl ? (
                                                      <img src={pr.imageUrl} alt={pr.name} className="w-10 h-10 object-contain rounded-lg bg-white" />
                                                  ) : (
                                                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                                          <ShoppingBag className="w-5 h-5 text-slate-400" />
                                                      </div>
                                                  )}
                                                  <div>
                                                      <p className="font-bold text-slate-800">{pr.name}</p>
                                                      <p className="text-sm text-slate-500">R$ {pr.price.toFixed(2)}</p>
                                                  </div>
                                              </div>
                                          ))}
                                          {products.filter(p => p.name.toLowerCase().includes(substituteSearch.toLowerCase())).length === 0 && (
                                              <p className="text-center text-slate-500 py-4">Nenhum produto encontrado.</p>
                                          )}
                                      </div>
                                  </>
                              ) : (
                                  <div className="flex flex-col items-center justify-center py-12 text-blue-500">
                                      <Loader2 className="w-12 h-12 animate-spin mb-4" />
                                      <p className="font-bold text-lg text-slate-800">Aguardando Cliente...</p>
                                      <p className="text-slate-500 text-center mt-2">O cliente está revisando a sugestão de substituição no aplicativo.</p>
                                  </div>
                              )}
                          </div>
                          
                          <div className="p-6 border-t border-slate-100 bg-slate-50 gap-3 flex flex-col sm:flex-row">
                              {!substituteLoading ? (
                                  <>
                                      <Button variant="secondary" className="flex-1 whitespace-nowrap" onClick={() => markMissingDirectly(substituteItemIndex)}>
                                          Marcar sem substituto
                                      </Button>
                                      <Button className="flex-1" disabled={!substituteSelected} onClick={sendSubstituteSuggestion}>
                                          Enviar Sugestão
                                      </Button>
                                  </>
                              ) : null}
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  return (
    <div className="space-y-6">
        {orders.filter(o => o.status === 'pending' || o.status === 'picking').length === 0 && (
            <div className="bg-white p-12 rounded-3xl border-2 border-slate-100 text-center">
                <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4"/>
                <h3 className="text-xl font-bold text-slate-500">Nenhum pedido na fila</h3>
                <p className="text-slate-400 mt-2">Você está em dia com as entregas.</p>
            </div>
        )}
        
        {orders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-3xl border-2 border-slate-100 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${order.status === 'pending' ? 'bg-amber-100 text-amber-700' : order.status === 'picking' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                            {order.status === 'pending' ? 'Novo' : order.status === 'picking' ? 'Em separação' : order.status}
                        </span>
                        <span className="text-slate-400 font-mono text-sm">#{order.id.slice(0,6)}</span>
                    </div>
                    <p className="text-slate-600 font-medium">{order.items?.length || 0} itens • R$ {order.total?.toFixed(2)}</p>
                </div>
                
                {(order.status === 'pending' || order.status === 'picking') && (
                    <Button onClick={() => startPicking(order.id)}>
                        {order.status === 'pending' ? 'Iniciar Separação' : 'Continuar Separação'}
                    </Button>
                )}
            </div>
        ))}
    </div>
  );
}
