import React from 'react';
import { BarChart3, TrendingUp, Users, ShoppingBag } from 'lucide-react';

export default function AnalyticsManager({ supermarketId }: { supermarketId: string }) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-2">Relatórios e Métricas</h3>
        <p className="text-slate-500">Acompanhe o desempenho das suas vendas e clientes (Em breve - Integração com dados reais).</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col items-center justify-center">
            <TrendingUp className="w-8 h-8 text-green-500 mb-2" />
            <h4 className="font-bold text-slate-800">Faturamento</h4>
            <span className="text-slate-500 text-sm">R$ 0,00Hoje</span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-blue-500 mb-2" />
            <h4 className="font-bold text-slate-800">Pedidos</h4>
            <span className="text-slate-500 text-sm">0 Hoje</span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col items-center justify-center">
            <Users className="w-8 h-8 text-purple-500 mb-2" />
            <h4 className="font-bold text-slate-800">Clientes</h4>
            <span className="text-slate-500 text-sm">0 Novos</span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col items-center justify-center">
            <BarChart3 className="w-8 h-8 text-orange-500 mb-2" />
            <h4 className="font-bold text-slate-800">Ticket Médio</h4>
            <span className="text-slate-500 text-sm">R$ 0,00</span>
        </div>
      </div>
    </div>
  );
}
