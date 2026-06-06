import React, { useState, useEffect } from 'react';
import { Settings, Clock, CreditCard, Save, MapPin, Navigation } from 'lucide-react';
import { Button } from '../ui/Button';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';

const VOUCHER_OPTIONS = [
  'Alelo Alimentação', 'Alelo Refeição', 
  'Ticket Alimentação', 'Ticket Restaurante', 
  'Sodexo Alimentação', 'Sodexo Refeição', 
  'VR Alimentação', 'VR Refeição', 
  'Ben Visa Vale', 'Valecard'
];

const DAYS_OF_WEEK = [
  { id: 'mon', label: 'Segunda-feira' },
  { id: 'tue', label: 'Terça-feira' },
  { id: 'wed', label: 'Quarta-feira' },
  { id: 'thu', label: 'Quinta-feira' },
  { id: 'fri', label: 'Sexta-feira' },
  { id: 'sat', label: 'Sábado' },
  { id: 'sun', label: 'Domingo' },
];

export default function StoreSettingsManager({ supermarketId }: { supermarketId: string }) {
  const [openingHours, setOpeningHours] = useState<Record<string, { isOpen: boolean, openTime: string, closeTime: string }>>({
    mon: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
    tue: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
    wed: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
    thu: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
    fri: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
    sat: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    sun: { isOpen: false, openTime: '08:00', closeTime: '12:00' },
  });

  const [paymentMethods, setPaymentMethods] = useState({
    pix: true,
    creditCardDelivery: true,
    debitCardDelivery: true,
    creditCardOnline: false,
    vouchers: [] as string[]
  });

  // Store address + geo, consumed by the entregador app to route pickups.
  const [storeLocation, setStoreLocation] = useState<{ address: string; lat: number | null; lng: number | null }>({
    address: '', lat: null, lng: null,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, `supermarkets/${supermarketId}/settings/storeInfo`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.openingHours) setOpeningHours(data.openingHours);
          if (data.paymentMethods) setPaymentMethods(data.paymentMethods);
          if (data.storeLocation) setStoreLocation({ address: '', lat: null, lng: null, ...data.storeLocation });
        }
      } catch (error) {
         handleFirestoreError(error, OperationType.GET, `supermarkets/${supermarketId}/settings/storeInfo`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [supermarketId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, `supermarkets/${supermarketId}/settings/storeInfo`), {
        openingHours,
        paymentMethods,
        storeLocation,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `supermarkets/${supermarketId}/settings/storeInfo`);
      alert('Erro ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleHourChange = (dayId: string, field: 'isOpen' | 'openTime' | 'closeTime', value: any) => {
    setOpeningHours(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], [field]: value }
    }));
  };

  const toggleVoucher = (voucher: string) => {
    setPaymentMethods(prev => {
      const isSelected = prev.vouchers.includes(voucher);
      if (isSelected) {
        return { ...prev, vouchers: prev.vouchers.filter(v => v !== voucher) };
      } else {
        return { ...prev, vouchers: [...prev.vouchers, voucher] };
      }
    });
  };

  if (isLoading) return <div className="p-10 text-center text-slate-500">Carregando configurações...</div>;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 z-10">
        <div>
            <h3 className="text-xl font-bold text-slate-800">Configurações da Loja</h3>
            <p className="text-slate-500 text-sm">Horários de funcionamento e métodos de pagamento.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
      
      <div className="p-6 space-y-8">
         <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50/50">
            <h4 className="font-bold flex items-center gap-2 mb-4 text-lg"><MapPin className="w-6 h-6 text-[#58CC02]"/> Endereço da Loja</h4>
            <p className="text-slate-500 text-sm mb-4">Usado pelo app do entregador para guiar a coleta dos pedidos.</p>
            <input
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#58CC02] outline-none font-medium text-slate-700 transition-colors"
              placeholder="Endereço completo (rua, número, bairro, cidade)"
              value={storeLocation.address}
              onChange={e => setStoreLocation({ ...storeLocation, address: e.target.value })}
            />
            <button type="button" onClick={() => {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => setStoreLocation(s => ({ ...s, lat: pos.coords.latitude, lng: pos.coords.longitude })),
                        () => alert('Não foi possível obter a localização.')
                    );
                } else { alert('Geolocalização não suportada neste navegador.'); }
            }} className={`mt-3 text-sm font-bold flex items-center gap-1 ${storeLocation.lat ? 'text-[#58CC02]' : 'text-slate-500'}`}>
                <Navigation className="w-4 h-4"/> {storeLocation.lat ? `Coordenadas salvas (${storeLocation.lat.toFixed(4)}, ${storeLocation.lng?.toFixed(4)})` : 'Definir localização atual (GPS)'}
            </button>
         </div>
         <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50/50">
            <h4 className="font-bold flex items-center gap-2 mb-6 text-lg"><Clock className="w-6 h-6 text-blue-500"/> Horário de Funcionamento</h4>
            <div className="space-y-4">
              {DAYS_OF_WEEK.map(day => (
  <div
    key={day.id}
    className="bg-white px-4 py-3 rounded-xl border border-slate-200"
  >
    {/* Linha superior: checkbox + nome */}
    <div className="flex items-center justify-between">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="w-5 h-5 shrink-0 text-blue-500 rounded focus:ring-blue-500"
          checked={openingHours[day.id]?.isOpen}
          onChange={e => handleHourChange(day.id, 'isOpen', e.target.checked)}
        />
        <span className="font-medium text-slate-700">{day.label}</span>
      </label>

      {/* "Fechado" aparece inline no desktop quando fechado */}
      {!openingHours[day.id]?.isOpen && (
        <span className="hidden sm:inline text-slate-400 italic text-sm">Fechado</span>
      )}

      {/* Horários inline no desktop quando aberto */}
      {openingHours[day.id]?.isOpen && (
        <div className="hidden sm:flex items-center gap-2">
          <input
            type="time"
            className="p-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500
                       text-slate-600 font-medium text-sm"
            value={openingHours[day.id]?.openTime}
            onChange={e => handleHourChange(day.id, 'openTime', e.target.value)}
          />
          <span className="text-slate-400 text-sm">às</span>
          <input
            type="time"
            className="p-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500
                       text-slate-600 font-medium text-sm"
            value={openingHours[day.id]?.closeTime}
            onChange={e => handleHourChange(day.id, 'closeTime', e.target.value)}
          />
        </div>
      )}
    </div>

    {/* Linha inferior: horários no mobile (só quando aberto) */}
    {openingHours[day.id]?.isOpen && (
      <div className="flex sm:hidden items-center gap-2 mt-2 pl-8">
        <input
          type="time"
          className="flex-1 p-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500
                     text-slate-600 font-medium text-sm"
          value={openingHours[day.id]?.openTime}
          onChange={e => handleHourChange(day.id, 'openTime', e.target.value)}
        />
        <span className="text-slate-400 text-sm shrink-0">às</span>
        <input
          type="time"
          className="flex-1 p-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500
                     text-slate-600 font-medium text-sm"
          value={openingHours[day.id]?.closeTime}
          onChange={e => handleHourChange(day.id, 'closeTime', e.target.value)}
        />
      </div>
    )}

    {/* "Fechado" abaixo do nome no mobile */}
    {!openingHours[day.id]?.isOpen && (
      <p className="sm:hidden pl-8 mt-1 text-slate-400 italic text-sm">Fechado</p>
    )}
  </div>
))}
            </div>
         </div>

         <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50/50">
            <h4 className="font-bold flex items-center gap-2 mb-6 text-lg"><CreditCard className="w-6 h-6 text-emerald-500"/> Métodos de Pagamento</h4>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                   <h5 className="font-bold text-slate-700 mb-4">No momento da Entrega</h5>
                   <div className="space-y-3">
                     <label className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 cursor-pointer hover:border-emerald-200 transition-colors">
                       <input type="checkbox" className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500" checked={paymentMethods.creditCardDelivery} onChange={e => setPaymentMethods(p => ({...p, creditCardDelivery: e.target.checked}))} />
                       <span className="font-medium text-slate-700">Cartão de Crédito</span>
                     </label>
                     <label className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 cursor-pointer hover:border-emerald-200 transition-colors">
                       <input type="checkbox" className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500" checked={paymentMethods.debitCardDelivery} onChange={e => setPaymentMethods(p => ({...p, debitCardDelivery: e.target.checked}))} />
                       <span className="font-medium text-slate-700">Cartão de Débito</span>
                     </label>
                     <label className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 cursor-pointer hover:border-emerald-200 transition-colors">
                       <input type="checkbox" className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500" checked={paymentMethods.pix} onChange={e => setPaymentMethods(p => ({...p, pix: e.target.checked}))} />
                       <span className="font-medium text-slate-700">PIX</span>
                     </label>
                   </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                   <h5 className="font-bold text-slate-700 mb-4">Pagamento Online</h5>
                   <div className="space-y-3">
                     <label className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 cursor-pointer hover:border-emerald-200 transition-colors">
                       <input type="checkbox" className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500" checked={paymentMethods.creditCardOnline} onChange={e => setPaymentMethods(p => ({...p, creditCardOnline: e.target.checked}))} />
                       <span className="font-medium text-slate-700">Cartão de Crédito Online (App)</span>
                     </label>
                   </div>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-slate-700 mb-3">Vales Refeição / Alimentação (VR, VA)</h5>
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3">
                  {VOUCHER_OPTIONS.map(voucher => (
                    <label key={voucher} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentMethods.vouchers.includes(voucher) ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500"
                        checked={paymentMethods.vouchers.includes(voucher)}
                        onChange={() => toggleVoucher(voucher)}
                      />
                      <span className="font-medium text-sm text-slate-700">{voucher}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
         </div>
      </div>
    </div>
  );
}
