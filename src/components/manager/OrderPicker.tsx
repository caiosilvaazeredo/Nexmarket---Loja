import React, { useEffect, useState, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { sendPush } from '../../lib/payments';
import { logStockRupture } from '../../lib/inventory';
import { compressImage } from '../../lib/compressImage';
import { Button } from '../ui/Button';
import OrdersKanban from './OrdersKanban';
import { Check, X, AlertCircle, ShoppingBag, Printer, ArrowRight, Search, LayoutGrid, List, BellRing, Camera, MessageCircle, Download, PartyPopper } from 'lucide-react';

/** Campainha de pedido novo (estilo iFood) — sintetizada, sem asset de áudio. */
function ringBell() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const ding = (t: number, f: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.35, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.6);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.6);
    };
    ding(0, 880);
    ding(0.3, 1174);
    ding(0.6, 880);
  } catch {
    // navegador bloqueou áudio antes de interação — silencioso
  }
}

function ageMinutes(createdAt: any): number {
  const ms = createdAt?.toMillis?.() ?? (createdAt?.seconds ? createdAt.seconds * 1000 : 0);
  return ms ? Math.floor((Date.now() - ms) / 60000) : 0;
}

/** Link wa.me com mensagem pronta — envio manual da foto da sacola (fase inicial, sem API do WhatsApp). */
function waLink(phone: string | undefined, message: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  const withCountry = digits.length >= 10 && digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

interface OrderPickerProps {
  supermarketId: string;
  products: any[];
}

/** Métodos cobrados online (Stripe/PicPay/NuPay) — exigem confirmação antes da separação. */
const ONLINE_METHODS = ['pix', 'card_online', 'picpay', 'nupay'];

/** Chip de pagamento do pedido (pago / aguardando / estornado / na entrega). */
function paymentChip(order: any): { label: string; cls: string } {
  const online = ONLINE_METHODS.includes(order.paymentMethod);
  const st = order.paymentStatus || order.payment?.status;
  const onlineName: Record<string, string> = { pix: 'PIX', card_online: 'online', picpay: 'PicPay', nupay: 'NuPay' };
  if (st === 'paid') return { label: online ? `Pago (${onlineName[order.paymentMethod] || 'online'})` : 'Pago', cls: 'bg-green-100 text-green-700' };
  if (st === 'refunded') return { label: 'Estornado', cls: 'bg-purple-100 text-purple-700' };
  if (online) return { label: 'Aguardando pagamento', cls: 'bg-red-100 text-red-600' };
  const labels: Record<string, string> = {
    card_delivery: 'Cartão na entrega',
    cash_delivery: 'Dinheiro na entrega',
    voucher_delivery: 'Vale na entrega',
  };
  return { label: labels[order.paymentMethod] || 'Pagamento na entrega', cls: 'bg-slate-100 text-slate-600' };
}

/** Pedido online ainda sem confirmação de pagamento — separa só depois de pago. */
function awaitingOnlinePayment(order: any): boolean {
  const online = ONLINE_METHODS.includes(order.paymentMethod);
  const st = order.paymentStatus || order.payment?.status;
  return online && st !== 'paid';
}

export default function OrderPicker({ supermarketId, products }: OrderPickerProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [view, setView] = useState<'fila' | 'kanban'>('fila');
  const [newOrderIds, setNewOrderIds] = useState<string[]>([]);
  const prevPendingIds = useRef<Set<string> | null>(null);

  // Campainha + destaque visual quando um pedido NOVO chega (estilo iFood).
  useEffect(() => {
    const pending = new Set<string>(orders.filter(o => o.status === 'pending').map(o => o.id));
    if (prevPendingIds.current) {
      const fresh = [...pending].filter(id => !prevPendingIds.current!.has(id));
      if (fresh.length > 0) {
        ringBell();
        setNewOrderIds(ids => [...ids, ...fresh]);
        setTimeout(() => setNewOrderIds(ids => ids.filter(id => !fresh.includes(id))), 12000);
      }
    }
    prevPendingIds.current = pending;
  }, [orders]);

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

  // Frete dinâmico (surge): publica o multiplicador conforme o tamanho da fila
  // de separação. O app do cliente lê deliveryConfig e ajusta o frete/aviso.
  const lastSurge = useRef(0);
  useEffect(() => {
      const queue = orders.filter(o => o.status === 'pending' || o.status === 'picking').length;
      const multiplier = queue >= 10 ? 2 : queue >= 5 ? 1.5 : 1;
      if (multiplier === lastSurge.current) return;
      lastSurge.current = multiplier;
      setDoc(
          doc(db, `supermarkets/${supermarketId}/deliveryConfig/main`),
          { surgeMultiplier: multiplier, updatedAt: serverTimestamp() },
          { merge: true }
      ).catch(() => {});
  }, [orders, supermarketId]);

  const startPicking = async (orderId: string) => {
    try {
        await updateDoc(doc(db, `supermarkets/${supermarketId}/orders/${orderId}`), {
            status: 'picking',
            updatedAt: serverTimestamp()
        });
        const o = orders.find(x => x.id === orderId);
        sendPush(o?.pushToken, 'Pedido em separação 🧺', 'A loja começou a separar os itens do seu pedido.');
        setActiveOrderId(orderId);
    } catch(err) {
        handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${supermarketId}/orders`);
    }
  };

  // --------------------------- Checklist de separação --------------------------
  const [pickingStep, setPickingStep] = useState<'items' | 'photo'>('items');
  const [substituteItemIndex, setSubstituteItemIndex] = useState<number | null>(null);
  const [substituteSearch, setSubstituteSearch] = useState('');
  const [substituteSelected, setSubstituteSelected] = useState<any>(null);

  // Foto da sacola fechada
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoCompressing, setPhotoCompressing] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);

  // Reseta o estado do checklist sempre que um pedido diferente é aberto.
  useEffect(() => {
    setPickingStep('items');
    setPhotoDataUrl(null);
    setPhotoSaved(false);
  }, [activeOrderId]);

  const isComplete = !!activeOrder && activeOrder.items.every((i: any) => i.separated || i.missing);

  // Ao marcar 100% dos itens, avança sozinho para a etapa de foto — sem botão
  // extra de "finalizar" (spec: checklist de separação, item 4).
  useEffect(() => {
    if (isComplete && pickingStep === 'items') {
      setPickingStep('photo');
    }
  }, [isComplete, pickingStep]);

  const markItem = async (itemIndex: number, status: 'separated' | 'missing') => {
      if (!activeOrder) return;

      if (status === 'missing') {
          setSubstituteItemIndex(itemIndex);
          return;
      }

      const newItems = [...activeOrder.items];
      const item = { ...newItems[itemIndex] };

      item.separated = true;
      item.missing = false;
      item.substituted = false;
      newItems[itemIndex] = item;

      try {
          await updateDoc(doc(db, `supermarkets/${supermarketId}/orders/${activeOrder.id}`), {
              items: newItems,
              updatedAt: serverTimestamp()
          });
      } catch(err) {
          handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${supermarketId}/orders`);
      }
  };

  /**
   * Marca o item como faltante (com ou sem substituto sugerido) e já notifica
   * o cliente — nunca depois do despacho. O pedido entra em
   * 'waiting_substitution' imediatamente, mas o restante da separação segue
   * normal (spec: fluxo de item em falta, itens 1 e 3).
   */
  const flagMissingItem = async (itemIndex: number, substitute: any | null) => {
      if (!activeOrder) return;
      const newItems = [...activeOrder.items];
      const item = { ...newItems[itemIndex] };

      item.separated = false;
      item.missing = true;
      item.substituted = !!substitute;
      item.customerDecision = 'pending';
      // Timestamp em milissegundos (não dá para usar serverTimestamp() dentro
      // de um array do Firestore) — usado pelo job de expiração no servidor.
      item.missingAt = Date.now();
      if (substitute) {
          item.substituteName = substitute.name;
          item.substitutePrice = substitute.price;
      } else {
          delete item.substituteName;
          delete item.substitutePrice;
      }
      newItems[itemIndex] = item;

      try {
          await updateDoc(doc(db, `supermarkets/${supermarketId}/orders/${activeOrder.id}`), {
              items: newItems,
              status: 'waiting_substitution',
              updatedAt: serverTimestamp()
          });
          sendPush(
              activeOrder.pushToken,
              substitute ? 'Sugestão de substituição 🔄' : 'Item em falta ⚠️',
              substitute
                  ? `"${item.name}" está em falta. Sugerimos "${substitute.name}" no lugar. Abra o app para decidir.`
                  : `"${item.name}" não está disponível. Abra o app para escolher o que fazer.`
          );
          logStockRupture(supermarketId, activeOrder.id, item.productId, item.name);
          setSubstituteItemIndex(null);
          setSubstituteSelected(null);
          setSubstituteSearch('');
      } catch(err) {
          handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${supermarketId}/orders`);
      }
  };

  const markMissingDirectly = (itemIndex: number) => flagMissingItem(itemIndex, null);
  const sendSubstituteSuggestion = () => {
      if (substituteItemIndex === null || !substituteSelected) return;
      flagMissingItem(substituteItemIndex, substituteSelected);
  };

  const onPickPhoto = async (file: File | undefined) => {
      if (!file) return;
      setPhotoCompressing(true);
      try {
          const dataUrl = await compressImage(file);
          setPhotoDataUrl(dataUrl);
      } catch {
          alert('Não foi possível processar a foto. Tente novamente.');
      } finally {
          setPhotoCompressing(false);
      }
  };

  const finishPicking = async () => {
      if (!activeOrder) return;
      const hasMissing = activeOrder.items.some((i: any) => i.missing);
      setPhotoSaving(true);
      try {
          await updateDoc(doc(db, `supermarkets/${supermarketId}/orders/${activeOrder.id}`), {
              status: hasMissing ? 'waiting_substitution' : 'ready',
              ...(photoDataUrl ? { pickingPhotoUrl: photoDataUrl } : {}),
              pickingCompletedAt: serverTimestamp(),
              updatedAt: serverTimestamp()
          });
          sendPush(
              activeOrder.pushToken,
              hasMissing ? 'Um item precisa da sua atenção ⚠️' : 'Pedido pronto! 📦',
              hasMissing
                  ? 'A separação terminou, mas um item precisa da sua decisão. Abra o app para revisar.'
                  : 'Seu pedido foi separado e está saindo para entrega!'
          );
          setPhotoSaved(true);
      } catch(err) {
          handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${supermarketId}/orders`);
      } finally {
          setPhotoSaving(false);
      }
  };

  const printCommand = () => {
      alert("Impressão térmica Bluetooth enviada!");
  };

  if (activeOrderId && activeOrder) {
      const total = activeOrder.items.length;
      const done = activeOrder.items.filter((i: any) => i.separated || i.missing).length;
      const pct = total ? Math.round((done / total) * 100) : 0;

      return (
          <div className="max-w-xl mx-auto pb-24">
              <div className="flex items-center justify-between mb-6">
                  <div>
                      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ShoppingBag className="w-6 h-6 text-green-500"/> Pedido #{activeOrder.id.slice(0,6)}</h2>
                      <p className="text-slate-500">Cliente ID: {activeOrder.customerId}</p>
                      <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${paymentChip(activeOrder).cls}`}>
                          {paymentChip(activeOrder).label}
                      </span>
                  </div>
                  <Button variant="secondary" onClick={() => setActiveOrderId(null)}>Pausar</Button>
              </div>

              {/* Barra de progresso — atualizada em tempo real conforme os itens são marcados. */}
              <div className="mb-6">
                  <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-slate-600">{done} de {total} itens separados</span>
                      <span className="text-sm font-bold text-emerald-600">{pct}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
              </div>

              {pickingStep === 'items' ? (
              <>
              <div className="space-y-4">
                  {activeOrder.items.map((item: any, index: number) => (
                      <div key={index} className={`bg-white rounded-2xl p-5 border-2 shadow-sm transition-all ${item.separated ? 'border-green-500 bg-green-50/30' : item.substituted ? 'border-yellow-400 bg-yellow-50/30' : item.missing ? 'border-red-400 bg-red-50/30' : 'border-slate-200'}`}>
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <h3 className={`font-bold text-xl text-slate-800 ${item.substituted ? 'line-through text-slate-400' : ''}`}>{item.name}</h3>
                                  <p className="text-slate-500 font-medium">{item.quantity}x • R$ {item.price.toFixed(2)}</p>
                                  {item.substituted && (
                                      <div className="mt-2 bg-yellow-100 p-3 rounded-lg border border-yellow-300">
                                          <p className="text-xs text-yellow-800 font-bold mb-1">SUGESTÃO ENVIADA AO CLIENTE:</p>
                                          <p className="text-yellow-900 font-bold">{item.substituteName}</p>
                                          <p className="text-yellow-800 font-medium text-sm">R$ {item.substitutePrice.toFixed(2)}</p>
                                          <p className="text-yellow-700 text-xs mt-1">
                                              {item.customerDecision === 'pending' || !item.customerDecision ? 'Aguardando o cliente decidir…' : item.customerDecision === 'accepted' ? 'Cliente aceitou a substituição.' : 'Cliente recusou — item removido com desconto.'}
                                          </p>
                                      </div>
                                  )}
                                  {item.missing && !item.substituted && (
                                      <p className="text-red-700 text-xs mt-1 font-medium">
                                          {item.customerDecision === 'pending' || !item.customerDecision ? 'Cliente notificado — aguardando decisão.' : 'Cliente já decidiu.'}
                                      </p>
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

              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 md:left-80 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20 flex justify-center gap-4">
                <Button variant="secondary" className="flex-1 max-w-[240px]" onClick={printCommand}>
                    <Printer className="w-5 h-5 mr-2"/> Imprimir
                </Button>
              </div>
              </>
              ) : (
              /* --------------------------- Foto da sacola fechada --------------------------- */
              <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 space-y-5">
                  {!photoSaved ? (
                  <>
                      <div className="text-center">
                          <Camera className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                          <h3 className="text-xl font-bold text-slate-800">Foto da sacola fechada</h3>
                          <p className="text-slate-500 text-sm mt-1">Separação concluída! Tire uma foto da sacola já fechada antes de despachar — serve de registro em caso de dúvida sobre a entrega.</p>
                      </div>

                      <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => onPickPhoto(e.target.files?.[0])}
                      />

                      {photoDataUrl ? (
                          <img src={photoDataUrl} alt="Sacola fechada" className="w-full rounded-2xl border-2 border-slate-100 object-cover max-h-80" />
                      ) : (
                          <button
                              onClick={() => photoInputRef.current?.click()}
                              disabled={photoCompressing}
                              className="w-full py-10 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 font-bold flex flex-col items-center gap-2 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                          >
                              <Camera className="w-8 h-8" />
                              {photoCompressing ? 'Processando…' : 'Tirar ou escolher foto'}
                          </button>
                      )}

                      {photoDataUrl && (
                          <button onClick={() => photoInputRef.current?.click()} className="text-sm font-bold text-slate-500 hover:text-slate-700">
                              Trocar foto
                          </button>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3">
                          <Button variant="secondary" className="flex-1" onClick={() => setActiveOrderId(null)}>
                              Concluir sem foto
                          </Button>
                          <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white" disabled={!photoDataUrl || photoSaving} onClick={finishPicking}>
                              {photoSaving ? 'Enviando…' : 'Concluir separação'} <ArrowRight className="w-5 h-5 ml-2"/>
                          </Button>
                      </div>
                  </>
                  ) : (
                  <>
                      <div className="text-center">
                          <PartyPopper className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                          <h3 className="text-xl font-bold text-slate-800">Separação concluída!</h3>
                          <p className="text-slate-500 text-sm mt-1">
                              O cliente já foi avisado pelo app. Nesta fase inicial, envie a foto pelo WhatsApp manualmente:
                          </p>
                      </div>

                      {photoDataUrl && (
                          <img src={photoDataUrl} alt="Sacola fechada" className="w-full rounded-2xl border-2 border-slate-100 object-cover max-h-80" />
                      )}

                      <div className="flex flex-col sm:flex-row gap-3">
                          {photoDataUrl && (
                              <a
                                  href={photoDataUrl}
                                  download={`sacola-pedido-${activeOrder.id.slice(0, 6)}.jpg`}
                                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50"
                              >
                                  <Download className="w-5 h-5" /> Baixar foto
                              </a>
                          )}
                          <a
                              href={waLink(activeOrder.customerPhone, 'Seu pedido foi separado e está saindo para entrega! 📦 (segue a foto da sacola em anexo)')}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-[#25D366] text-white hover:bg-[#1DAE54]"
                          >
                              <MessageCircle className="w-5 h-5" /> Abrir WhatsApp
                          </a>
                      </div>

                      <Button className="w-full" onClick={() => setActiveOrderId(null)}>
                          Voltar para a fila
                      </Button>
                  </>
                  )}
              </div>
              )}

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
                          </div>

                          <div className="p-6 border-t border-slate-100 bg-slate-50 gap-3 flex flex-col sm:flex-row">
                              <Button variant="secondary" className="flex-1 whitespace-nowrap" onClick={() => markMissingDirectly(substituteItemIndex)}>
                                  Marcar sem substituto
                              </Button>
                              <Button className="flex-1" disabled={!substituteSelected} onClick={sendSubstituteSuggestion}>
                                  Enviar Sugestão
                              </Button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  return (
    <div className="space-y-6">
        {/* Alternância Fila × Kanban */}
        <div className="flex items-center justify-between">
            <div className="inline-flex rounded-xl border-2 border-slate-200 overflow-hidden">
                <button onClick={() => setView('fila')} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold ${view === 'fila' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                    <List className="w-4 h-4"/> Fila
                </button>
                <button onClick={() => setView('kanban')} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold ${view === 'kanban' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                    <LayoutGrid className="w-4 h-4"/> Kanban
                </button>
            </div>
            {newOrderIds.length > 0 && (
                <span className="flex items-center gap-2 text-amber-600 font-bold text-sm animate-pulse">
                    <BellRing className="w-4 h-4"/> Pedido novo!
                </span>
            )}
        </div>

        {view === 'kanban' ? (
            <OrdersKanban
                supermarketId={supermarketId}
                orders={orders}
                paymentChip={paymentChip}
                awaitingOnlinePayment={awaitingOnlinePayment}
                onOpenOrder={(id) => {
                    const o = orders.find(x => x.id === id);
                    if (!o) return;
                    if (o.status === 'picking') setActiveOrderId(id);
                    else if (o.status === 'pending' && !awaitingOnlinePayment(o)) startPicking(id);
                }}
            />
        ) : (
        <>
        {orders.filter(o => o.status === 'pending' || o.status === 'picking').length === 0 && (
            <div className="bg-white p-12 rounded-3xl border-2 border-slate-100 text-center">
                <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4"/>
                <h3 className="text-xl font-bold text-slate-500">Nenhum pedido na fila</h3>
                <p className="text-slate-400 mt-2">Você está em dia com as entregas.</p>
            </div>
        )}

        {orders.map(order => {
            const isNew = newOrderIds.includes(order.id);
            const age = ageMinutes(order.createdAt);
            return (
            <div key={order.id} className={`bg-white p-6 rounded-3xl border-2 flex items-center justify-between transition-all ${isNew ? 'border-amber-400 ring-4 ring-amber-100 animate-pulse' : 'border-slate-100'}`}>
                <div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${order.status === 'pending' ? 'bg-amber-100 text-amber-700' : order.status === 'picking' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                            {order.status === 'pending' ? 'Novo' : order.status === 'picking' ? 'Em separação' : order.status}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${paymentChip(order).cls}`}>
                            {paymentChip(order).label}
                        </span>
                        {order.status === 'pending' && (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${age > 5 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                aguardando há {age} min
                            </span>
                        )}
                        <span className="text-slate-400 font-mono text-sm">#{order.id.slice(0,6)}</span>
                    </div>
                    <p className="text-slate-600 font-medium">{order.items?.length || 0} itens • R$ {order.total?.toFixed(2)}</p>
                </div>

                {(order.status === 'pending' || order.status === 'picking') && (
                    awaitingOnlinePayment(order) ? (
                        <span className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-bold">
                            Aguardando pagamento do cliente
                        </span>
                    ) : (
                        <Button onClick={() => startPicking(order.id)}>
                            {order.status === 'pending' ? 'Iniciar Separação' : 'Continuar Separação'}
                        </Button>
                    )
                )}
            </div>
            );
        })}
        </>
        )}
    </div>
  );
}
