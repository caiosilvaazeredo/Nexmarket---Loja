import React from 'react';
import { Megaphone, Send } from 'lucide-react';
import { Button } from '../ui/Button';

export default function MarketingManager({ supermarketId }: { supermarketId: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
       <div className="p-6 border-b border-slate-100 bg-slate-50">
        <h3 className="text-xl font-bold text-slate-800">Marketing e Notificações</h3>
        <p className="text-slate-500 text-sm">Envie notificações push e gerencie campanhas para seus clientes.</p>
      </div>
      <div className="p-6">
         <div className="max-w-xl mx-auto space-y-4">
            <div>
               <label className="font-bold text-slate-700 text-sm block mb-1">Título da Notificação</label>
               <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500" placeholder="Ex: Oferta Relâmpago!"/>
            </div>
            <div>
               <label className="font-bold text-slate-700 text-sm block mb-1">Mensagem</label>
               <textarea className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 min-h-[100px]" placeholder="Ex: Venha conferir nossas ofertas de hoje..."></textarea>
            </div>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"><Send className="w-4 h-4 mr-2 inline"/> Enviar para todos os clientes</Button>
         </div>
      </div>
    </div>
  );
}
