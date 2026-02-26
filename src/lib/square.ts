import { Client, Environment } from 'square';
import type { Transaction } from '@/types';
import { generateId } from './utils';

// ========================================
// Square API Integration (Read-Only)
// ========================================

function getClient(): Client {
  return new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment:
      process.env.SQUARE_ENVIRONMENT === 'production'
        ? Environment.Production
        : Environment.Sandbox,
  });
}

export interface SquareSyncResult {
  imported: number;
  skipped: number;
  transactions: Transaction[];
}

export async function fetchSquareTransactions(
  startDate: string,
  endDate: string,
): Promise<Transaction[]> {
  const client = getClient();
  const locationId = process.env.SQUARE_LOCATION_ID;

  if (!locationId) {
    throw new Error('SQUARE_LOCATION_ID is not configured');
  }

  const transactions: Transaction[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.ordersApi.searchOrders({
      locationIds: [locationId],
      query: {
        filter: {
          dateTimeFilter: {
            createdAt: {
              startAt: new Date(startDate).toISOString(),
              endAt: new Date(endDate).toISOString(),
            },
          },
          stateFilter: {
            states: ['COMPLETED'],
          },
        },
        sort: {
          sortField: 'CREATED_AT',
          sortOrder: 'DESC',
        },
      },
      cursor,
    });

    const orders = response.result.orders || [];

    for (const order of orders) {
      const totalMoney = order.totalMoney;
      const amount = totalMoney ? Number(totalMoney.amount) / 100 : 0;

      transactions.push({
        id: generateId(),
        externalId: order.id || '',
        source: 'Square',
        amount,
        fee: 0, // Square fees come from a separate API
        netAmount: amount,
        description: order.lineItems?.map((li) => li.name).join(', ') || 'Square Payment',
        payerName: '',
        payerEmail: '',
        date: order.createdAt || new Date().toISOString(),
        tag: 'Untagged',
        eventName: '',
        syncedAt: new Date().toISOString(),
        notes: `Square Order ${order.id}`,
      });
    }

    cursor = response.result.cursor;
  } while (cursor);

  return transactions;
}

export async function createSquarePayment(
  sourceId: string,
  amountCents: number,
  currency: string,
  note: string,
): Promise<{ paymentId: string; status: string }> {
  const client = getClient();
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) throw new Error('SQUARE_LOCATION_ID is not configured');

  const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const response = await client.paymentsApi.createPayment({
    sourceId,
    idempotencyKey,
    amountMoney: {
      amount: BigInt(amountCents),
      currency,
    },
    locationId,
    note,
  });

  const payment = response.result.payment;
  if (!payment?.id) throw new Error('Square payment failed: no payment ID returned');

  return {
    paymentId: payment.id,
    status: payment.status || 'UNKNOWN',
  };
}

export async function testSquareConnection(): Promise<boolean> {
  try {
    const client = getClient();
    const response = await client.locationsApi.listLocations();
    return (response.result.locations?.length ?? 0) > 0;
  } catch {
    return false;
  }
}
