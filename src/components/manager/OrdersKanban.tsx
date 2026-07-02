import React from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { sendPush } from '../../lib/payments';
import { Sparkles, PackageSearch, PackageCheck, Bike } from 'lucide-react';

/**
 * Visão Kanban dos pedidos (estilo iFood Gestor): Novo → Separação → Pronto →
 * Em entrega. Arraste um card para avançar/voltar o status; a coluna
 * "Em entrega" é somente leitura (o status é do entregador).
 */

type ColumnKey = 'pending' | 'picking' | 'ready' | 'out';

const COLUMNS: { key: ColumnKey; title: string; icon: React.ReactNode; tint: string }[] = [
  { key: 'pending', title: 'Novos', icon: <Sparkles className="w-4 h-4" />, tint: 'bg-amber-50 border-amber-200' },
  { key: 'picking', title: 'Em separação', icon: <PackageSearch className="w-4 h-4" />, tint: 'bg-blue-50 border-blue-200' },
  { key: 'ready', title: 'Prontos', icon: <PackageCheck className="w-4 h-4" />, tint: 'bg-green-50 border-green-200' },
  { key: 'out', title: 'Em entrega', icon: <Bike className="w-4 h-4" />, tint: 'bg-slate-50 border-slate-200' },
];

function columnOf(order: any): ColumnKey | null {
  if (order.status === 'cancelled') return null;
  if (order.deliveryStatus && ['going_to_store', 'arrived_store', 'picked_up', 'going_to_customer'].includes(order.deliveryStatus)) return 'out';
  if (order.status === 'delivered' || order.deliveryStatus === 'delivered') return null;
  if (order.status === 'ready') return 'ready';
  if (order.status === 'picking' || order.status === 'waiting_substitution') return 'picking';
  if (order.status === 'pending') return 'pending';
  return null;
}

/** Transições permitidas ao arrastar (a coluna "out" pertence ao entregador). */
const ALLOWED: Record<string, string> = {
  'pending>picking': 'picking',
  'picking>ready': 'ready',
  'picking>pending': 'pending',
  'ready>picking': 'picking',
};

function ageMinutes(createdAt: any): number {
  const ms = createdAt?.toMillis?.() ?? (createdAt?.seconds ? createdAt.seconds * 1000 : 0);
  return ms ? Math.floor((Date.now() - ms) / 60000) : 0;
}

interface Props {
  supermarketId: string;
  orders: any[];
  paymentChip: (o: any) => { label: string; cls: string };
  awaitingOnlinePayment: (o: any) => boolean;
  onOpenOrder: (id: string) => void;
}

export default function OrdersKanban({ supermarketId, orders, paymentChip, awaitingOnlinePayment, onOpenOrder }: Props) {
  const byColumn = new Map<ColumnKey, any[]>(COLUMNS.map((c) => [c.key, []]));
  orders.forEach((o) => {
    const col = columnOf(o);
    if (col) byColumn.get(col)!.push(o);
  });

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    const target = ALLOWED[`${source.droppableId}>${destination.droppableId}`];
    if (!target) return;
    const order = orders.find((o) => o.id === draggableId);
    if (!order) return;
    if (target === 'picking' && awaitingOnlinePayment(order)) {
      alert('Este pedido ainda aguarda o pagamento online do cliente.');
      return;
    }
    try {
      await updateDoc(doc(db, `supermarkets/${supermarketId}/orders/${order.id}`), {
        status: target,
        updatedAt: serverTimestamp(),
      });
      if (target === 'picking') sendPush(order.pushToken, 'Pedido em separação 🧺', 'A loja começou a separar os itens do seu pedido.');
      if (target === 'ready') sendPush(order.pushToken, 'Pedido pronto! 📦', 'Seu pedido está separado e aguardando o entregador.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${supermarketId}/orders`);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const items = byColumn.get(col.key)!;
          return (
            <Droppable droppableId={col.key} key={col.key} isDropDisabled={col.key === 'out'}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`rounded-2xl border-2 p-3 min-h-[280px] transition-colors ${col.tint} ${snapshot.isDraggingOver ? 'ring-2 ring-emerald-400' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-3 px-1">
                    {col.icon}
                    <h4 className="font-bold text-slate-700 text-sm">{col.title}</h4>
                    <span className="ml-auto text-xs font-bold bg-white rounded-full px-2 py-0.5 border border-slate-200">{items.length}</span>
                  </div>

                  <div className="space-y-2">
                    {items.map((order, idx) => {
                      const age = ageMinutes(order.createdAt);
                      const chip = paymentChip(order);
                      const locked = col.key === 'out';
                      return (
                        // React 19: `key` não pode ir direto no Draggable tipado — Fragment resolve.
                        <React.Fragment key={order.id}>
                        <Draggable draggableId={order.id} index={idx} isDragDisabled={locked}>
                          {(drag, dragSnap) => (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              {...drag.dragHandleProps}
                              onClick={() => !locked && onOpenOrder(order.id)}
                              className={`bg-white rounded-xl border-2 p-3 shadow-sm cursor-grab active:cursor-grabbing ${dragSnap.isDragging ? 'border-emerald-400 shadow-lg rotate-1' : 'border-slate-100'}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-mono text-xs text-slate-400">#{order.id.slice(0, 6)}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.key === 'pending' && age > 5 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                  há {age} min
                                </span>
                              </div>
                              <p className="font-bold text-slate-700 text-sm">
                                {order.items?.length || 0} itens • R$ {Number(order.total || 0).toFixed(2)}
                              </p>
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${chip.cls}`}>{chip.label}</span>
                                {order.deliveryStatus && col.key === 'out' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
                                    {order.driverName || 'entregador'}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                        </React.Fragment>
                      );
                    })}
                    {provided.placeholder}
                    {items.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-6">
                        {col.key === 'pending' ? 'Sem pedidos novos' : 'Vazio'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}
