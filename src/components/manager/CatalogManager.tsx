import React, { useState } from 'react';
import { Package, Search, Edit3, Trash2, CheckCircle2, PauseCircle, Tag, TrendingUp, Plus } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Button } from '../ui/Button';

interface CatalogManagerProps {
  supermarketId: string;
  products: any[];
  gondolas: any[];
  onAddProduct: () => void;
  onEditProduct: (pr: any) => void;
  onDeleteProduct: (prId: string) => void;
}

export default function CatalogManager({ supermarketId, products, gondolas, onAddProduct, onEditProduct, onDeleteProduct }: CatalogManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');

  const toggleActive = async (pr: any) => {
    try {
      await updateDoc(doc(db, `supermarkets/${supermarketId}/products/${pr.id}`), {
        active: !pr.active,
        updatedAt: serverTimestamp()
      });
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${supermarketId}/products`);
    }
  };

  const handlePriceSave = async (prId: string) => {
    if (!newPrice) return;
    try {
      await updateDoc(doc(db, `supermarkets/${supermarketId}/products/${prId}`), {
        price: Number(newPrice),
        updatedAt: serverTimestamp()
      });
      setEditingPriceId(null);
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${supermarketId}/products`);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.ean && p.ean.includes(searchQuery))
  );

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 gap-4">
         <div className="relative max-w-md w-full">
             <Search className="w-5 h-5 absolute text-slate-400 left-3 top-2.5" />
             <input 
                 type="text"
                 placeholder="Buscar por nome ou EAN..."
                 className="pl-10 pr-4 py-2 w-full bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-orange-400 text-slate-700 font-medium"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
             />
         </div>
         <Button onClick={onAddProduct} disabled={gondolas.length === 0}>
             <Plus className="w-5 h-5 mr-2 inline" /> Adicionar Produto
         </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-100/50 text-slate-500 text-sm tracking-wide uppercase border-b border-slate-200">
                    <th className="p-4 font-bold">Produto</th>
                    <th className="p-4 font-bold">Prateleira</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-right">Preço</th>
                    <th className="p-4 font-bold text-right">Menor 30d (CDC)</th>
                    <th className="p-4 font-bold text-center">Classificação</th>
                    <th className="p-4 font-bold text-center">Ações</th>
                </tr>
            </thead>
            <tbody>
                {filteredProducts.map(pr => (
                    <tr key={pr.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                        <td className="p-4">
                            <div className="flex items-center gap-3">
                                {pr.imageUrl ? (
                                    <img src={pr.imageUrl} alt={pr.name} className="w-10 h-10 rounded border border-slate-200 object-contain bg-white" />
                                ) : (
                                    <div className="w-10 h-10 rounded border border-slate-200 flex items-center justify-center bg-slate-100 text-slate-400">
                                        <Package className="w-5 h-5"/>
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-slate-800">{pr.name}</h3>
                                    <span className="text-xs text-slate-400 font-mono">EAN: {pr.ean || 'N/A'}</span>
                                </div>
                            </div>
                        </td>
                        <td className="p-4 text-slate-600 font-medium">
                            {gondolas.find(g => g.id === pr.gondolaId)?.name || '-'}
                        </td>
                        <td className="p-4">
                            <button 
                                onClick={() => toggleActive(pr)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${pr.active !== false ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                            >
                                {pr.active !== false ? <><CheckCircle2 className="w-3.5 h-3.5"/> Ativo</> : <><PauseCircle className="w-3.5 h-3.5"/> Pausado</>}
                            </button>
                        </td>
                        <td className="p-4 text-right">
                            {editingPriceId === pr.id ? (
                                <div className="flex items-center justify-end gap-2">
                                    <span className="text-slate-400">R$</span>
                                    <input 
                                        type="number" 
                                        autoFocus
                                        className="w-20 p-1 border-2 border-orange-400 rounded-lg text-right font-bold text-slate-700 outline-none" 
                                        value={newPrice}
                                        onChange={(e) => setNewPrice(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handlePriceSave(pr.id)}
                                        onBlur={() => handlePriceSave(pr.id)}
                                    />
                                </div>
                            ) : (
                                <div 
                                    className="font-extrabold text-slate-800 cursor-pointer hover:text-orange-500 border-b border-transparent hover:border-orange-500 inline-block transition-colors"
                                    onClick={() => { setEditingPriceId(pr.id); setNewPrice(pr.price?.toString() || ''); }}
                                >
                                    R$ {pr.price?.toFixed(2) || '0.00'}
                                </div>
                            )}
                        </td>
                        <td className="p-4 text-right">
                            {/* CDC Price mock logic */}
                            <span className="text-sm font-medium text-slate-500">R$ {(pr.lowestPrice30Days || pr.price || 0).toFixed(2)}</span>
                        </td>
                        <td className="p-4 text-center">
                            {pr.salesCount > 50 ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold border border-emerald-100"><TrendingUp className="w-3 h-3"/> A</span>
                            ) : pr.salesCount > 10 ? (
                                <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-bold border border-blue-100">B</span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-0.5 rounded text-xs font-bold border border-slate-200">C</span>
                            )}
                        </td>
                        <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                                <button onClick={() => onEditProduct(pr)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4"/></button>
                                <button onClick={() => onDeleteProduct(pr.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        </td>
                    </tr>
                ))}
                {filteredProducts.length === 0 && (
                    <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">Nenhum produto encontrado.</td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}
