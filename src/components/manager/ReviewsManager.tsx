import React from 'react';
import { Star, MessageSquare } from 'lucide-react';

export default function ReviewsManager({ supermarketId }: { supermarketId: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
       <div className="p-6 border-b border-slate-100 bg-slate-50">
        <h3 className="text-xl font-bold text-slate-800">Avaliações de Clientes</h3>
        <p className="text-slate-500 text-sm">Acompanhe o que os clientes estão dizendo sobre a loja e os produtos.</p>
      </div>
      <div className="p-6">
         <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
            <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
             <p className="text-slate-500">Nenhuma avaliação recebida ainda.</p>
        </div>
      </div>
    </div>
  );
}
