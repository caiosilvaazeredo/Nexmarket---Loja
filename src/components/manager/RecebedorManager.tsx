import React, { useState, useEffect } from 'react';
import { Wallet, Building2, User, Save, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { paymentsConfigured, getRecipientStatus, registerRecipient, type RecipientStatus } from '../../lib/payments';

/**
 * Cadastro de recebedor Pagar.me da loja — uma vez ativo, entra
 * automaticamente no split de cada venda (90% do subtotal de produtos vai
 * direto para esta conta, ver server/index.js buildStoreSplit no repo
 * nexmarket--Empresa). Sem cadastro, 100% do pedido fica retido na
 * plataforma e o repasse é feito manualmente até a loja se cadastrar.
 */
export default function RecebedorManager({ supermarketId }: { supermarketId: string }) {
  const [status, setStatus] = useState<RecipientStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [type, setType] = useState<'individual' | 'corporation'>('corporation');
  const [document, setDocumentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [branch, setBranch] = useState('');
  const [branchDigit, setBranchDigit] = useState('');
  const [account, setAccount] = useState('');
  const [accountDigit, setAccountDigit] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setStatus(await getRecipientStatus(supermarketId));
      setIsLoading(false);
    };
    load();
  }, [supermarketId]);

  const handleSave = async () => {
    const docDigits = document.replace(/\D/g, '');
    if (type === 'corporation' ? docDigits.length !== 14 : docDigits.length !== 11) {
      alert(type === 'corporation' ? 'Informe um CNPJ válido (14 dígitos).' : 'Informe um CPF válido (11 dígitos).');
      return;
    }
    if (!name || !email || !bankCode || !branch || !account || !accountDigit) {
      alert('Preencha nome/razão social, e-mail e os dados bancários (banco, agência, conta e dígito).');
      return;
    }
    if (type === 'individual' && (!birthdate || !/^\d{4}-\d{2}-\d{2}$/.test(birthdate))) {
      alert('Informe a data de nascimento no formato AAAA-MM-DD.');
      return;
    }

    setIsSaving(true);
    try {
      await registerRecipient({
        smId: supermarketId,
        type,
        document: docDigits,
        email,
        name,
        tradingName: tradingName || undefined,
        birthdate: type === 'individual' ? birthdate : undefined,
        occupation: type === 'individual' ? 'Comerciante' : undefined,
        bank: {
          holderName: name,
          holderDocument: docDigits,
          bank: bankCode,
          branchNumber: branch,
          branchCheckDigit: branchDigit || undefined,
          accountNumber: account,
          accountCheckDigit: accountDigit,
          accountType: 'checking',
        },
      });
      setStatus(await getRecipientStatus(supermarketId));
      alert('Cadastro de recebedor enviado com sucesso!');
    } catch (error: any) {
      alert(error?.message || 'Erro ao enviar o cadastro de recebedor.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-10 text-center text-slate-500">Carregando recebedor...</div>;

  if (!paymentsConfigured()) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500">
        Servidor de pagamentos não configurado (VITE_PAYMENTS_API_URL). Fale com a equipe da plataforma.
      </div>
    );
  }

  const ready = status?.status === 'active';

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Recebimentos</h3>
          <p className="text-slate-500 text-sm">Conta que recebe automaticamente o valor das vendas (Pagar.me).</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Enviando...' : 'Salvar'}
        </Button>
      </div>

      <div className="p-6 space-y-8">
        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${ready ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          {ready ? <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" /> : <Clock className="w-6 h-6 text-amber-600 shrink-0" />}
          <div>
            <p className={`font-bold ${ready ? 'text-emerald-700' : 'text-amber-700'}`}>
              {ready ? 'Recebedor ativo' : status?.configured ? 'Cadastro em análise' : 'Cadastro não iniciado'}
            </p>
            <p className="text-sm text-slate-500">
              {ready
                ? 'Suas vendas já entram automaticamente com split para esta conta — 90% do subtotal de produtos vai direto para você.'
                : 'Enquanto o cadastro não é aprovado, 100% do valor das vendas fica retido na plataforma e o repasse é feito manualmente.'}
            </p>
          </div>
        </div>

        <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50/50">
          <h4 className="font-bold flex items-center gap-2 mb-4 text-lg"><Wallet className="w-6 h-6 text-[#58CC02]"/> Tipo de cadastro</h4>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setType('corporation')}
              className={`flex-1 flex items-center gap-2 p-4 rounded-xl border-2 font-bold transition-colors ${type === 'corporation' ? 'border-[#58CC02] bg-[#58CC02]/10 text-[#3C8C02]' : 'border-slate-200 text-slate-600'}`}
            >
              <Building2 className="w-5 h-5" /> Pessoa jurídica (CNPJ)
            </button>
            <button
              type="button"
              onClick={() => setType('individual')}
              className={`flex-1 flex items-center gap-2 p-4 rounded-xl border-2 font-bold transition-colors ${type === 'individual' ? 'border-[#58CC02] bg-[#58CC02]/10 text-[#3C8C02]' : 'border-slate-200 text-slate-600'}`}
            >
              <User className="w-5 h-5" /> Pessoa física (CPF)
            </button>
          </div>
        </div>

        <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50/50">
          <h4 className="font-bold flex items-center gap-2 mb-4 text-lg">Dados do titular</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#58CC02] outline-none font-medium text-slate-700"
              placeholder={type === 'corporation' ? 'Razão social' : 'Nome completo'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#58CC02] outline-none font-medium text-slate-700"
              placeholder={type === 'corporation' ? 'CNPJ' : 'CPF'}
              value={document}
              onChange={(e) => setDocumentNumber(e.target.value)}
            />
            <input
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#58CC02] outline-none font-medium text-slate-700"
              placeholder="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {type === 'corporation' ? (
              <input
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#58CC02] outline-none font-medium text-slate-700"
                placeholder="Nome fantasia (opcional)"
                value={tradingName}
                onChange={(e) => setTradingName(e.target.value)}
              />
            ) : (
              <input
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#58CC02] outline-none font-medium text-slate-700"
                placeholder="Data de nascimento (AAAA-MM-DD)"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
              />
            )}
          </div>
        </div>

        <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50/50">
          <h4 className="font-bold flex items-center gap-2 mb-4 text-lg">Dados bancários</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <input
              className="col-span-2 md:col-span-1 w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#58CC02] outline-none font-medium text-slate-700"
              placeholder="Código do banco"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
            />
            <input
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#58CC02] outline-none font-medium text-slate-700"
              placeholder="Agência"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
            <input
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#58CC02] outline-none font-medium text-slate-700"
              placeholder="Dígito"
              value={branchDigit}
              onChange={(e) => setBranchDigit(e.target.value)}
            />
            <input
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#58CC02] outline-none font-medium text-slate-700"
              placeholder="Conta"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
            <input
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#58CC02] outline-none font-medium text-slate-700"
              placeholder="Dígito"
              value={accountDigit}
              onChange={(e) => setAccountDigit(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Esses dados vão direto para a Pagar.me (processadora de pagamentos) para validação de KYC — a plataforma não armazena o extrato da sua conta.
          </p>
        </div>
      </div>
    </div>
  );
}
