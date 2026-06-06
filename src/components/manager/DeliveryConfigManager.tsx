import React, { useState, useEffect } from 'react';
import { Truck, Save, Info } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Button } from '../ui/Button';

interface DeliveryConfigManagerProps {
  supermarketId: string;
}

export default function DeliveryConfigManager({ supermarketId }: DeliveryConfigManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [config, setConfig] = useState({
    deliveryType: 'own' as 'own' | 'grocify',
    shippingType: 'transparent' as 'transparent' | 'free_diluted',
    flatFeeValue: 0,
    minimumOrderValue: 0,
    pickerType: 'employee' as 'employee' | 'driver'
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, `supermarkets/${supermarketId}/deliveryConfig/main`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig({ ...config, ...docSnap.data() });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `supermarkets/${supermarketId}/deliveryConfig`);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [supermarketId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, `supermarkets/${supermarketId}/deliveryConfig/main`), {
        ...config,
        updatedAt: serverTimestamp()
      });
      alert('Configurações de entrega salvas com sucesso!');
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, `supermarkets/${supermarketId}/deliveryConfig`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-bold animate-pulse">Carregando configurações...</div>;
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
                <h3 className="text-xl font-bold text-slate-800">Configurações de Entrega</h3>
                <p className="text-slate-500 text-sm">Defina como os pedidos chegarão até seus clientes.</p>
            </div>
            <Button onClick={handleSave} disabled={saving}>
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
        </div>

        <div className="p-8 space-y-8 max-w-3xl mx-auto">
            {/* 1. Tipo de Entregador */}
            <div className="space-y-4">
                <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-indigo-500" />
                    Quem fará as entregas?
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${config.deliveryType === 'own' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex items-center gap-3 mb-1">
                            <input type="radio" className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300" 
                                checked={config.deliveryType === 'own'} 
                                onChange={() => setConfig({...config, deliveryType: 'own'})}
                            />
                            <span className="font-bold text-slate-800">Entregador Próprio</span>
                        </div>
                        <p className="text-sm text-slate-500 ml-7">O mercado possui sua própria frota ou equipe de entregadores.</p>
                    </label>
                    <label className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${config.deliveryType === 'grocify' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex items-center gap-3 mb-1">
                            <input type="radio" className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300" 
                                checked={config.deliveryType === 'grocify'} 
                                onChange={() => setConfig({...config, deliveryType: 'grocify'})}
                            />
                            <span className="font-bold text-slate-800">Parceiro Nexmarket</span>
                        </div>
                        <p className="text-sm text-slate-500 ml-7">Entregadores parceiros da Nexmarket farão a coleta e entrega.</p>
                    </label>
                </div>
            </div>

            {/* Sub-opção: Tipo de Separação (SÓ SE FOR GROCIFY) */}
            {config.deliveryType === 'grocify' && (
                <div className="space-y-4 pl-6 border-l-4 border-indigo-100">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <Info className="w-4 h-4 text-indigo-400" />
                        Quem fará a separação dos produtos nas prateleiras?
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${config.pickerType === 'employee' ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 hover:border-slate-300'}`}>
                            <div className="flex items-center gap-3 mb-1">
                                <input type="radio" className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300" 
                                    checked={config.pickerType === 'employee'} 
                                    onChange={() => setConfig({...config, pickerType: 'employee'})}
                                />
                                <span className="font-bold text-slate-800">Funcionário do Mercado</span>
                            </div>
                            <p className="text-sm text-slate-500 ml-7">Sua equipe separa o pedido e entrega pronto para o motorista.</p>
                        </label>
                        <label className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${config.pickerType === 'driver' ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 hover:border-slate-300'}`}>
                            <div className="flex items-center gap-3 mb-1">
                                <input type="radio" className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300" 
                                    checked={config.pickerType === 'driver'} 
                                    onChange={() => setConfig({...config, pickerType: 'driver'})}
                                />
                                <span className="font-bold text-slate-800">Próprio Entregador</span>
                            </div>
                            <p className="text-sm text-slate-500 ml-7">O entregador Nexmarket entra no mercado e faz a separação da compra.</p>
                        </label>
                    </div>
                </div>
            )}

            <hr className="border-slate-100" />

            {/* 2. Tipo de Frete */}
            <div className="space-y-4">
                <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    Como o frete será cobrado?
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${config.shippingType === 'transparent' ? 'border-green-500 bg-green-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex items-center gap-3 mb-1">
                            <input type="radio" className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300" 
                                checked={config.shippingType === 'transparent'} 
                                onChange={() => setConfig({...config, shippingType: 'transparent'})}
                            />
                            <span className="font-bold text-slate-800">Transparente (Taxa Fixa)</span>
                        </div>
                        <p className="text-sm text-slate-500 ml-7 mb-3">O cliente paga um valor de frete fixo estipulado pelo mercado.</p>
                        {config.shippingType === 'transparent' && (
                            <div className="ml-7">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Valor do Frete (R$)</label>
                                <input type="number" step="0.01" className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-green-500 outline-none" 
                                    value={config.flatFeeValue} 
                                    onChange={(e) => setConfig({...config, flatFeeValue: Number(e.target.value)})} 
                                />
                            </div>
                        )}
                    </label>
                    <label className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${config.shippingType === 'free_diluted' ? 'border-green-500 bg-green-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex items-center gap-3 mb-1">
                            <input type="radio" className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300" 
                                checked={config.shippingType === 'free_diluted'} 
                                onChange={() => setConfig({...config, shippingType: 'free_diluted'})}
                            />
                            <span className="font-bold text-slate-800">Frete Grátis (Diluído)</span>
                        </div>
                        <p className="text-sm text-slate-500 ml-7 mb-3">O frete é embutido no preço dos produtos e exige um pedido mínimo.</p>
                        {config.shippingType === 'free_diluted' && (
                            <div className="ml-7">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Valor do Pedido Mínimo (R$)</label>
                                <input type="number" step="0.01" className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-green-500 outline-none" 
                                    value={config.minimumOrderValue} 
                                    onChange={(e) => setConfig({...config, minimumOrderValue: Number(e.target.value)})} 
                                />
                            </div>
                        )}
                    </label>
                </div>
            </div>

        </div>
    </div>
  );
}
