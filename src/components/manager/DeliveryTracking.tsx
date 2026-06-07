import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Truck, MapPin, User, Phone, Navigation, PackageCheck, Clock, CircleAlert } from 'lucide-react';

interface DeliveryTrackingProps {
  supermarketId: string;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  awaiting_driver: { label: 'Aguardando entregador', cls: 'bg-amber-100 text-amber-700' },
  going_to_store: { label: 'A caminho da loja', cls: 'bg-blue-100 text-blue-700' },
  arrived_store: { label: 'Na loja', cls: 'bg-blue-100 text-blue-700' },
  picked_up: { label: 'Coletado', cls: 'bg-indigo-100 text-indigo-700' },
  going_to_customer: { label: 'A caminho do cliente', cls: 'bg-indigo-100 text-indigo-700' },
  delivered: { label: 'Entregue', cls: 'bg-green-100 text-green-700' },
  problem: { label: 'Problema', cls: 'bg-red-100 text-red-700' },
};

export default function DeliveryTracking({ supermarketId }: DeliveryTrackingProps) {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, `supermarkets/${supermarketId}/orders`));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: any[] = [];
        snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
        // Only orders that go through delivery.
        setOrders(data.filter((o) => o.deliveryStatus));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `supermarkets/${supermarketId}/orders`),
    );
    return () => unsub();
  }, [supermarketId]);

  const active = orders.filter((o) => o.deliveryStatus !== 'delivered');
  const done = orders.filter((o) => o.deliveryStatus === 'delivered');

  const fmtAddr = (a: any) => {
    if (!a) return 'Endereço não informado';
    const line = [a.street, a.number].filter(Boolean).join(', ');
    const rest = [a.neighborhood, a.city].filter(Boolean).join(' - ');
    return [line, rest].filter(Boolean).join(' • ') || 'Endereço não informado';
  };

  const Card = ({ order }: { order: any }) => {
    const meta = STATUS_META[order.deliveryStatus] || { label: order.deliveryStatus, cls: 'bg-slate-100 text-slate-700' };
    const loc = order.driverLocation;
    return (
      <div className="bg-white p-6 rounded-3xl border-2 border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${meta.cls}`}>{meta.label}</span>
          <span className="text-slate-400 font-mono text-sm">#{order.id.slice(0, 6)}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-700">
              <User className="w-4 h-4 text-slate-400" />
              <span className="font-bold">{order.customerName || 'Cliente'}</span>
              {order.customerPhone ? (
                <a href={`tel:${order.customerPhone}`} className="text-[#58CC02] flex items-center gap-1 text-sm font-bold">
                  <Phone className="w-3.5 h-3.5" /> {order.customerPhone}
                </a>
              ) : null}
            </div>
            <div className="flex items-start gap-2 text-slate-500 text-sm">
              <MapPin className="w-4 h-4 text-red-400 mt-0.5" />
              <span className="font-medium">{fmtAddr(order.deliveryAddress)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-700">
              <Truck className="w-4 h-4 text-indigo-400" />
              <span className="font-bold">{order.driverName || 'Sem entregador ainda'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-sm font-medium">
                {order.items?.length || 0} itens • R$ {Number(order.total || 0).toFixed(2)}
              </span>
              {loc?.lat && loc?.lng ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 flex items-center gap-1 text-sm font-bold"
                >
                  <Navigation className="w-3.5 h-3.5" /> Ver no mapa
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {order.problemReport ? (
          <div className="mt-3 flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-xl text-sm font-medium">
            <CircleAlert className="w-4 h-4" /> Problema reportado: {order.problemReport.type}
            {order.problemReport.note ? ` — ${order.problemReport.note}` : ''}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border-2 border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Truck className="w-5 h-5 text-indigo-500" /> Rastreio de Entregas
        </h3>
        <p className="text-slate-500 text-sm mt-1">
          Acompanhe em tempo real os pedidos com entregadores Nexmarket.
        </p>
      </div>

      <div>
        <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" /> Em andamento ({active.length})
        </h4>
        {active.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border-2 border-slate-100 text-center text-slate-400 font-medium">
            Nenhuma entrega em andamento.
          </div>
        ) : (
          <div className="space-y-4">{active.map((o) => <React.Fragment key={o.id}>{Card({ order: o })}</React.Fragment>)}</div>
        )}
      </div>

      {done.length > 0 ? (
        <div>
          <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-green-500" /> Entregues ({done.length})
          </h4>
          <div className="space-y-4">{done.map((o) => <React.Fragment key={o.id}>{Card({ order: o })}</React.Fragment>)}</div>
        </div>
      ) : null}
    </div>
  );
}
