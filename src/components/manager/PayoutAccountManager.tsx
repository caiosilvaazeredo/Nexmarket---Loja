import React, { useEffect, useState } from 'react';
import { Banknote, CalendarClock, Save, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  PIX_KEY_LABELS,
  describeSchedule,
  getPayoutAccount,
  savePayoutAccount,
  subscribePayoutSchedule,
  validatePayoutAccount,
  type PayoutAccount,
  type PayoutSchedule,
  type PixKeyType,
} from '../../lib/payout';

/**
 * Onde a loja recebe os repasses das vendas.
 *
 * Grava em `supermarkets/{id}/settings/payout` — separado do `storeInfo`
 * público, para que dados bancários não sejam lidos pelo app do cliente. O
 * calendário (quando cai o dinheiro) é definido pela Nexmarket no app da
 * Empresa e apenas exibido aqui.
 */
export default function PayoutAccountManager({ supermarketId }: { supermarketId: string }) {
  const [account, setAccount] = useState<PayoutAccount>({ method: 'pix', pixKeyType: 'cnpj' });
  const [schedule, setSchedule] = useState<PayoutSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    getPayoutAccount(supermarketId)
      .then((a) => {
        if (alive && a) setAccount({ method: 'pix', pixKeyType: 'cnpj', ...a });
      })
      .finally(() => alive && setLoading(false));
    const unsub = subscribePayoutSchedule(setSchedule);
    return () => {
      alive = false;
      unsub();
    };
  }, [supermarketId]);

  const set = (patch: Partial<PayoutAccount>) => {
    setAccount((a) => ({ ...a, ...patch }));
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    const problem = validatePayoutAccount(account);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      await savePayoutAccount(supermarketId, account);
      setSaved(true);
    } catch {
      setError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-400">Carregando dados de recebimento…</div>;
  }

  const isPix = (account.method ?? 'pix') === 'pix';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
          <Banknote className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-black text-slate-800 dark:text-slate-100">Onde você recebe</h3>
          <p className="text-xs text-slate-500">Conta para onde a Nexmarket envia o repasse das vendas</p>
        </div>
      </div>

      {/* Calendário definido pela plataforma */}
      <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-slate-50 dark:bg-slate-800">
        <CalendarClock className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Quando você recebe</p>
          <p className="text-xs text-slate-500">{describeSchedule(schedule)}</p>
        </div>
      </div>

      {/* Método */}
      <div className="flex gap-2 mb-4">
        {(['pix', 'bank'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => set({ method: m })}
            className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition ${
              (account.method ?? 'pix') === m
                ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20'
                : 'border-slate-200 dark:border-slate-700 text-slate-500'
            }`}
          >
            {m === 'pix' ? 'PIX' : 'Conta bancária'}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Nome do titular">
          <input
            className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
            value={account.holderName ?? ''}
            onChange={(e) => set({ holderName: e.target.value })}
            placeholder="Razão social ou nome completo"
          />
        </Field>
        <Field label="CPF/CNPJ do titular">
          <input
            className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
            value={account.holderDocument ?? ''}
            onChange={(e) => set({ holderDocument: e.target.value })}
            placeholder="00.000.000/0001-00"
          />
        </Field>
      </div>

      {isPix ? (
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <Field label="Tipo de chave">
            <select
              className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
              value={account.pixKeyType ?? 'cnpj'}
              onChange={(e) => set({ pixKeyType: e.target.value as PixKeyType })}
            >
              {Object.entries(PIX_KEY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Chave PIX">
            <input
              className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
              value={account.pixKey ?? ''}
              onChange={(e) => set({ pixKey: e.target.value })}
              placeholder="Chave para receber"
            />
          </Field>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <Field label="Banco">
              <input
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
                value={account.bankName ?? ''}
                onChange={(e) => set({ bankName: e.target.value })}
                placeholder="Ex.: Banco do Brasil"
              />
            </Field>
            <Field label="Código do banco (opcional)">
              <input
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
                value={account.bankCode ?? ''}
                onChange={(e) => set({ bankCode: e.target.value })}
                placeholder="001"
              />
            </Field>
          </div>
          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <Field label="Agência">
              <input
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
                value={account.agency ?? ''}
                onChange={(e) => set({ agency: e.target.value })}
                placeholder="0001"
              />
            </Field>
            <Field label="Conta (com dígito)">
              <input
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
                value={account.account ?? ''}
                onChange={(e) => set({ account: e.target.value })}
                placeholder="12345-6"
              />
            </Field>
            <Field label="Tipo">
              <select
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
                value={account.accountType ?? 'checking'}
                onChange={(e) => set({ accountType: e.target.value as 'checking' | 'savings' })}
              >
                <option value="checking">Corrente</option>
                <option value="savings">Poupança</option>
              </select>
            </Field>
          </div>
        </>
      )}

      {error && <p className="mt-3 text-sm font-bold text-red-500">{error}</p>}
      {saved && !error && (
        <p className="mt-3 text-sm font-bold text-green-600">Dados de recebimento salvos!</p>
      )}

      <div className="flex items-center justify-between gap-3 mt-4">
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          Visível apenas para você e para a equipe financeira da Nexmarket.
        </p>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1 text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
