import React, { useState, useEffect } from 'react';
import { Users, UserPlus, X, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';

const ROLES = [
  { id: 'manager', label: 'Gerente' },
  { id: 'picker', label: 'Separador' },
  { id: 'cashier', label: 'Caixa' }
];

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function StaffManager({ supermarketId }: { supermarketId: string }) {
  const [staff, setStaff] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'picker' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, `supermarkets/${supermarketId}/staff`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setStaff(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `supermarkets/${supermarketId}/staff`));
    return () => unsubscribe();
  }, [supermarketId]);

  const handleSave = async () => {
    if (!formData.name || !formData.email) return;
    setIsSaving(true);
    try {
      const id = generateId();
      await setDoc(doc(db, `supermarkets/${supermarketId}/staff`, id), {
         name: formData.name,
         email: formData.email,
         role: formData.role,
         createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setFormData({ name: '', email: '', role: 'picker' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `supermarkets/${supermarketId}/staff`);
      alert('Erro ao adicionar funcionário.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este funcionário?')) return;
    try {
      await deleteDoc(doc(db, `supermarkets/${supermarketId}/staff/${id}`));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `supermarkets/${supermarketId}/staff`);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <div>
            <h3 className="text-xl font-bold text-slate-800">Gestão de Equipe</h3>
            <p className="text-slate-500 text-sm">Gerencie separadores, operadores de caixa e gerentes.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}><UserPlus className="w-4 h-4 mr-2 inline"/> Adicionar Funcionário</Button>
      </div>
      <div className="p-6">
        {staff.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                 <p className="text-slate-500">Nenhum funcionário cadastrado ainda.</p>
            </div>
        ) : (
            <div className="space-y-3">
              {staff.map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold">
                       {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{member.name}</div>
                      <div className="text-sm text-slate-500">{member.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium">
                       {ROLES.find(r => r.id === member.role)?.label || member.role}
                    </span>
                    <button onClick={() => handleDelete(member.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
            </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-md border-2 border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Novo Funcionário</h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">Nome Completo</label>
                        <input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 outline-none font-medium text-slate-700" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nome do funcionário" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">E-mail</label>
                        <input type="email" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 outline-none font-medium text-slate-700" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="funcionario@email.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">Cargo / Função</label>
                        <select className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 outline-none font-medium text-slate-700 bg-white" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                            {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                        </select>
                    </div>
                    <Button className="w-full mt-4" variant="secondary" onClick={handleSave} disabled={isSaving || !formData.name || !formData.email}>
                       {isSaving ? 'Salvando...' : 'Adicionar Funcionário'}
                    </Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
