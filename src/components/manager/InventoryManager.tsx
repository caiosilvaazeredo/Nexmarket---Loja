import React, { useState } from 'react';
import { PackageX, AlertTriangle, CheckCircle, PackageSearch, Save } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Button } from '../ui/Button';

export default function InventoryManager({ supermarketId, products }: { supermarketId: string, products: any[] }) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [localStock, setLocalStock] = useState<Record<string, number>>({});

  const trackedProducts = products.filter(p => p.trackInventory);

  const getStockStatus = (stock: number, alertQty: number, criticalQty: number) => {
      if (stock <= criticalQty) return { color: 'text-red-600 bg-red-100', icon: <PackageX className="w-4 h-4 mr-1"/>, label: 'Crítico' };
      if (stock <= alertQty) return { color: 'text-yellow-600 bg-yellow-100', icon: <AlertTriangle className="w-4 h-4 mr-1"/>, label: 'Alerta' };
      return { color: 'text-green-600 bg-green-100', icon: <CheckCircle className="w-4 h-4 mr-1"/>, label: 'Normal' };
  };

  const handleStockChange = (productId: string, value: string) => {
      setLocalStock(prev => ({ ...prev, [productId]: Number(value) }));
  };

  const saveStock = async (product: any) => {
      const newStock = localStock[product.id];
      if (newStock === undefined || newStock === product.stockQuantity) return;
      
      setUpdating(product.id);
      try {
          await updateDoc(doc(db, `supermarkets/${supermarketId}/products`, product.id), {
              stockQuantity: newStock,
              updatedAt: serverTimestamp()
          });
      } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `supermarkets/${supermarketId}/products`);
      } finally {
          setUpdating(null);
          setLocalStock(prev => {
              const next = {...prev};
              delete next[product.id];
              return next;
          });
      }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <div>
            <h3 className="text-xl font-bold text-slate-800">Controle de Estoque</h3>
            <p className="text-slate-500 text-sm">Gerencie as quantidades dos produtos controlados.</p>
        </div>
      </div>
      <div className="p-6">
        {trackedProducts.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                <PackageSearch className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-700">Nenhum produto controlado</h3>
                <p className="text-slate-500">Ative o "Controlar Estoque" no cadastro dos produtos para vê-los aqui.</p>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-100 text-slate-500 text-sm">
                            <th className="pb-3 font-bold">Produto</th>
                            <th className="pb-3 font-bold text-center">Status</th>
                            <th className="pb-3 font-bold text-center">Crítico/Alerta</th>
                            <th className="pb-3 font-bold text-center">Estoque Atual</th>
                            <th className="pb-3 font-bold"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {trackedProducts.map(product => {
                            const currentStock = localStock[product.id] !== undefined ? localStock[product.id] : (product.stockQuantity || 0);
                            const isChanged = localStock[product.id] !== undefined && localStock[product.id] !== product.stockQuantity;
                            const status = getStockStatus(currentStock, product.alertQuantity || 0, product.criticalQuantity || 0);

                            return (
                                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden">
                                            {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />}
                                        </div>
                                        <span className="font-bold text-slate-800">{product.name}</span>
                                    </td>
                                    <td className="py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${status.color}`}>
                                            {status.icon} {status.label}
                                        </span>
                                    </td>
                                    <td className="py-4 text-center">
                                        <div className="flex items-center justify-center gap-2 text-sm">
                                            <span className="text-red-500 font-bold px-2 py-1 bg-red-50 rounded-lg" title="Nível Crítico">{product.criticalQuantity}</span>
                                            <span className="text-slate-300">/</span>
                                            <span className="text-yellow-500 font-bold px-2 py-1 bg-yellow-50 rounded-lg" title="Nível de Alerta">{product.alertQuantity}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 text-center">
                                        <input 
                                            type="number" 
                                            min="0"
                                            className="w-24 text-center p-2 border-2 border-slate-200 rounded-lg font-bold text-slate-700 outline-none focus:border-indigo-400"
                                            value={currentStock}
                                            onChange={(e) => handleStockChange(product.id, e.target.value)}
                                        />
                                    </td>
                                    <td className="py-4 text-right">
                                        {isChanged && (
                                            <Button 
                                                onClick={() => saveStock(product)} 
                                                disabled={updating === product.id}
                                                className="px-4 py-1.5 h-auto text-sm bg-indigo-600 hover:bg-indigo-700"
                                            >
                                                <Save className="w-4 h-4 mr-1.5" />
                                                {updating === product.id ? 'Salvando...' : 'Salvar'}
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
}
