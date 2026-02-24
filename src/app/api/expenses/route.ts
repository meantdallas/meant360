import { NextRequest } from 'next/server';
import { getRows, appendRow, getRowById, updateRow, deleteRow } from '@/lib/google-sheets';
import { jsonResponse, errorResponse, requireAuth, requireEditor } from '@/lib/api-helpers';
import { generateId } from '@/lib/utils';
import { SHEET_TABS } from '@/types';
import { deleteFile } from '@/lib/google-drive';

const SHEET = SHEET_TABS.EXPENSES;

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const eventName = searchParams.get('event');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let rows = await getRows(SHEET);

    if (eventName) rows = rows.filter((r) => r.eventName === eventName);
    if (category) rows = rows.filter((r) => r.category === category);
    if (startDate) rows = rows.filter((r) => r.date >= startDate);
    if (endDate) rows = rows.filter((r) => r.date <= endDate);

    return jsonResponse(rows);
  } catch (error) {
    console.error('GET /api/expenses error:', error);
    return errorResponse('Failed to fetch expense records', 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireEditor();
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const now = new Date().toISOString();
    const record = {
      id: generateId(),
      expenseType: body.expenseType || 'General',
      eventName: body.eventName || '',
      category: body.category || 'Miscellaneous',
      description: body.description || '',
      amount: body.amount || 0,
      date: body.date || now.split('T')[0],
      paidBy: body.paidBy || 'Organization',
      receiptUrl: body.receiptUrl || '',
      receiptFileId: body.receiptFileId || '',
      notes: body.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    await appendRow(SHEET, record);
    return jsonResponse(record, 201);
  } catch (error) {
    console.error('POST /api/expenses error:', error);
    return errorResponse('Failed to create expense record', 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireEditor();
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    if (!body.id) return errorResponse('Missing id');

    const existing = await getRowById(SHEET, body.id);
    if (!existing) return errorResponse('Record not found', 404);

    const updated = {
      ...existing.record,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    await updateRow(SHEET, existing.rowIndex, updated);
    return jsonResponse(updated);
  } catch (error) {
    console.error('PUT /api/expenses error:', error);
    return errorResponse('Failed to update expense record', 500);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireEditor();
  if (auth instanceof Response) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('Missing id');

    const existing = await getRowById(SHEET, id);
    if (!existing) return errorResponse('Record not found', 404);

    // Delete receipt from Drive if exists
    if (existing.record.receiptFileId) {
      await deleteFile(existing.record.receiptFileId);
    }

    await deleteRow(SHEET, existing.rowIndex);
    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/expenses error:', error);
    return errorResponse('Failed to delete expense record', 500);
  }
}
