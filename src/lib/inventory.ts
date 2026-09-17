/**
 * Histórico de ruptura de estoque — um registro por item marcado "não tem"
 * durante o checklist de separação (ver OrderPicker.tsx). Alimenta o
 * relatório "produtos que mais faltam" no painel Empresa (RF — checklist de
 * separação, seção 4 da especificação).
 */
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function logStockRupture(
  supermarketId: string,
  orderId: string,
  productId: string,
  productName: string,
): Promise<void> {
  try {
    await addDoc(collection(db, `supermarkets/${supermarketId}/stockRuptures`), {
      supermarketId,
      orderId,
      productId: productId || 'sem-id',
      productName: productName || 'Produto sem nome',
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    // Nunca bloqueia a separação por causa do log de ruptura.
    console.warn('logStockRupture failed', e);
  }
}
