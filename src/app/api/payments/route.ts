import { NextRequest } from 'next/server';
import { jsonResponse, errorResponse } from '@/lib/api-helpers';
import { createSquarePayment } from '@/lib/square';
import { createPayPalOrder, capturePayPalOrder } from '@/lib/paypal';
import { appendRow } from '@/lib/google-sheets';
import { generateId } from '@/lib/utils';
import { SHEET_TABS } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'square-pay') {
      const { sourceId, amount, currency, eventName, payerName, payerEmail } = body;
      if (!sourceId || !amount) {
        return errorResponse('sourceId and amount are required');
      }

      const amountCents = Math.round(Number(amount) * 100);
      const note = `Event Entry: ${eventName || 'Event'} - ${payerName || 'Unknown'}`;

      const result = await createSquarePayment(sourceId, amountCents, currency || 'USD', note);

      // Log to Transactions sheet
      const now = new Date().toISOString();
      await appendRow(SHEET_TABS.TRANSACTIONS, {
        id: generateId(),
        externalId: result.paymentId,
        source: 'Square',
        amount: Number(amount),
        fee: 0,
        netAmount: Number(amount),
        description: note,
        payerName: payerName || '',
        payerEmail: payerEmail || '',
        date: now,
        tag: 'Event Entry',
        eventName: eventName || '',
        syncedAt: now,
        notes: `Square Payment ${result.paymentId}`,
      });

      return jsonResponse({ transactionId: result.paymentId });
    }

    if (action === 'paypal-create') {
      const { amount, currency, description } = body;
      if (!amount) {
        return errorResponse('amount is required');
      }

      const result = await createPayPalOrder(
        String(amount),
        currency || 'USD',
        description || 'Event Payment',
      );

      return jsonResponse({ orderId: result.orderId });
    }

    if (action === 'paypal-capture') {
      const { orderId, eventName, payerName, payerEmail, amount } = body;
      if (!orderId) {
        return errorResponse('orderId is required');
      }

      const result = await capturePayPalOrder(orderId);

      // Log to Transactions sheet
      const now = new Date().toISOString();
      const note = `Event Entry: ${eventName || 'Event'} - ${payerName || 'Unknown'}`;
      await appendRow(SHEET_TABS.TRANSACTIONS, {
        id: generateId(),
        externalId: result.transactionId,
        source: 'PayPal',
        amount: Number(amount) || 0,
        fee: 0,
        netAmount: Number(amount) || 0,
        description: note,
        payerName: payerName || '',
        payerEmail: payerEmail || '',
        date: now,
        tag: 'Event Entry',
        eventName: eventName || '',
        syncedAt: now,
        notes: `PayPal Transaction ${result.transactionId}`,
      });

      return jsonResponse({ transactionId: result.transactionId });
    }

    return errorResponse(`Unknown action: ${action}`, 400);
  } catch (error) {
    console.error('POST /api/payments error:', error);
    const message = error instanceof Error ? error.message : 'Payment failed';
    return errorResponse(message, 500);
  }
}
