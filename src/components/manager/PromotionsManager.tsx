import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Tag, CheckCircle2, Search, Percent, Package, ListTree, DollarSign, X } from 'lucide-react';
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Button } from '../ui/Button';

interface PromotionsManagerProps {
  supermarketId: string;
  promotions: any[];
  gondolas: any[];
  products: any[];
}

export default function PromotionsManager({ supermarketId, promotions, gondolas, products }: PromotionsManagerProps) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'quantity',
    targetType: 'product' as 'product' | 'category' | 'subcategory',
    targetId: '',
    value: 0,
    requiredQuantity: 2,
    active: true
  });

  const subcategories = Array.from(new Set(products.map(p => p.subcategory).filter(Boolean))) as string[];

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const openModal = (promo: any = null) => {
    if (promo) {
      setEditingPromoId(promo.id);
      setFormData({
        name: promo.name,
        type: promo.type,
        targetType: promo.targetType,
        targetId: promo.targetId || '',
        value: promo.value,
        requiredQuantity: promo.requiredQuantity || 2,
        active: promo.active
      });
    } else {
      setEditingPromoId(null);
      setFormData({
        name: '',
        type: 'percentage',
        targetType: 'product',
        targetId: '',
        value: 0,
        requiredQuantity: 2,
        active: true
      });
    }
    setModalOpen(true);
  };

  const savePromotion = async () => {
    if (!formData.name || !formData.targetId) {
        alert("Preencha o nome e selecione um alvo válido.");
        return;
    }

    try {
      if (editingPromoId) {
        await updateDoc(doc(db, `supermarkets/${supermarketId}/promotions`, editingPromoId), {
          ...formData,
          value: Number(formData.value),
          requiredQuantity: Number(formData.requiredQuantity),
          updatedAt: serverTimestamp()
        });
      } else {
        const id = generateId();
        await setDoc(doc(db, `supermarkets/${supermarketId}/promotions`, id), {
          ...formData,
          value: Number(formData.value),
          requiredQuantity: Number(formData.requiredQuantity),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setModalOpen(false);
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `supermarkets/${supermarketId}/promotions`);
    }
  };

  const togglePromoActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, `supermarkets/${supermarketId}/promotions`, id), {
        active: !currentStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `supermarkets/${supermarketId}/promotions`);
    }
  };

  const deletePromo = async (id: string) => {
    if(!confirm('Tem certeza que deseja remover esta promoção?')) return;
    try {
      await deleteDoc(doc(db, `supermarkets/${supermarketId}/promotions`, id));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `supermarkets/${supermarketId}/promotions`);
    }
  };

  const getTargetName = (type: string, id: string) => {
      if (type === 'product') return products.find(p => p.id === id)?.name || id;
      if (type === 'category') return gondolas.find(g => g.id === id)?.name || id;
      return id; // for subcategory, the id is the name
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 gap-4">
            <div>
                <h3 className="text-xl font-bold text-slate-800">Promoções Ativas</h3>
                <p className="text-slate-500 text-sm">Gerencie descontos e regras especiais para os produtos.</p>
            </div>
            <Button onClick={() => openModal()}>
                <Plus className="w-5 h-5 mr-2 inline" /> Nova Promoção
            </Button>
        </div>

        <div className="p-6 space-y-4">
            {promotions.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-700">Nenhuma promoção encontrada</h3>
                    <p className="text-slate-500">Crie sua primeira promoção para alavancar suas vendas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {promotions.map(promo => (
                        <div key={promo.id} className={`p-5 rounded-2xl border-2 transition-all ${promo.active ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-slate-50 opacity-75'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-lg ${promo.active ? 'bg-red-100 text-red-500' : 'bg-slate-200 text-slate-500'}`}>
                                        {promo.type === 'percentage' && <Percent className="w-5 h-5" />}
                                        {promo.type === 'fixed' && <DollarSign className="w-5 h-5" />}
                                        {promo.type === 'quantity' && <ListTree className="w-5 h-5" />}
                                    </div>
                                    <h4 className="font-bold text-slate-800 uppercase tracking-tight">{promo.name}</h4>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => togglePromoActive(promo.id, promo.active)} className={`p-1.5 rounded-lg ${promo.active ? 'text-green-500 hover:bg-green-100' : 'text-slate-400 hover:bg-slate-200'}`}>
                                        <CheckCircle2 className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => openModal(promo)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => deletePromo(promo.id)} className="p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-500 rounded-lg">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-slate-600">
                                <div className="flex justify-between">
                                    <span className="font-medium text-slate-500">Regra:</span>
                                    <span className="font-bold text-slate-800">
                                        {promo.type === 'percentage' && `${promo.value}% de desconto`}
                                        {promo.type === 'fixed' && `R$ ${parseFloat(promo.value).toFixed(2)} de desconto`}
                                        {promo.type === 'quantity' && `Leve ${promo.requiredQuantity} pague R$ ${parseFloat(promo.value).toFixed(2)}`}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-slate-500">Alvo:</span>
                                    <span className="font-bold text-slate-800">
                                        {promo.targetType === 'product' && 'Produto'}
                                        {promo.targetType === 'category' && 'Categoria'}
                                        {promo.targetType === 'subcategory' && 'Subcategoria'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-slate-500">Aplica-se a:</span>
                                    <span className="font-bold text-slate-800 truncate max-w-[150px]" title={getTargetName(promo.targetType, promo.targetId)}>
                                        {getTargetName(promo.targetType, promo.targetId)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-sm">
                <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Tag className="w-6 h-6 text-red-500"/>
                            {editingPromoId ? 'Editar Promoção' : 'Nova Promoção'}
                        </h3>
                        <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-6 h-6"/>
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-1">Nome da Promoção</label>
                            <input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-red-400 outline-none font-medium text-slate-700" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Black Friday, Leve 3 Pague 2..." />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-1">Tipo de Desconto</label>
                                <select className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-red-400 outline-none font-medium text-slate-700 bg-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                                    <option value="percentage">Porcentagem (%)</option>
                                    <option value="fixed">Valor Fixo (R$)</option>
                                    <option value="quantity">Leve X por R$ Y</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-1">Tipo do Alvo</label>
                                <select className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-red-400 outline-none font-medium text-slate-700 bg-white" value={formData.targetType} onChange={e => setFormData({...formData, targetType: e.target.value as any, targetId: ''})}>
                                    <option value="product">Produto Específico</option>
                                    <option value="category">Categoria (Gôndola)</option>
                                    <option value="subcategory">Subcategoria</option>
                                </select>
                            </div>
                        </div>

                        {formData.type === 'quantity' && (
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-1">Quantidade Necessária (X)</label>
                                <input type="number" min="2" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-red-400 outline-none font-medium text-slate-700" value={formData.requiredQuantity} onChange={e => setFormData({...formData, requiredQuantity: Number(e.target.value)})} placeholder="Ex: 3" />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-1">
                                {formData.type === 'percentage' ? 'Valor do Desconto (%)' : formData.type === 'fixed' ? 'Valor do Desconto (R$)' : 'Preço Especial (R$ y)'}
                            </label>
                            <input type="number" step="0.01" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-red-400 outline-none font-medium text-slate-700" value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})} placeholder="Ex: 10" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-1">Selecionar Alvo</label>
                            {formData.targetType === 'product' && (
                                <select className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-red-400 outline-none font-medium text-slate-700 bg-white" value={formData.targetId} onChange={e => setFormData({...formData, targetId: e.target.value})}>
                                    <option value="" disabled>Selecione um produto</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            )}
                            {formData.targetType === 'category' && (
                                <select className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-red-400 outline-none font-medium text-slate-700 bg-white" value={formData.targetId} onChange={e => setFormData({...formData, targetId: e.target.value})}>
                                    <option value="" disabled>Selecione uma categoria/gôndola</option>
                                    {gondolas.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            )}
                            {formData.targetType === 'subcategory' && (
                                <select className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-red-400 outline-none font-medium text-slate-700 bg-white" value={formData.targetId} onChange={e => setFormData({...formData, targetId: e.target.value})}>
                                    <option value="" disabled>Selecione uma subcategoria</option>
                                    {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            )}
                        </div>

                    </div>
                    
                    <div className="p-6 border-t border-slate-100 bg-slate-50">
                        <Button className="w-full" onClick={savePromotion}>Salvar Promoção</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
