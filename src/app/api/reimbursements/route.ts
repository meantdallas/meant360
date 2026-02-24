import { NextRequest } from 'next/server';
import { getRows, appendRow, getRowById, updateRow, deleteRow } from '@/lib/google-sheets';
import { jsonResponse, errorResponse, requireAuth, requireEditor } from '@/lib/api-helpers';
import { generateId } from '@/lib/utils';
import { SHEET_TABS } from '@/types';

const SHEET = SHEET_TABS.REIMBURSEMENTS;

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const eventName = searchParams.get('event');
    const requestedBy = searchParams.get('requestedBy');

    let rows = await getRows(SHEET);

    if (status) rows = rows.filter((r) => r.status === status);
    if (eventName) rows = rows.filter((r) => r.eventName === eventName);
    if (requestedBy) rows = rows.filter((r) => r.requestedBy === requestedBy);

    return jsonResponse(rows);
  } catch (error) {
    console.error('GET /api/reimbursements error:', error);
    return errorResponse('Failed to fetch reimbursement records', 500);
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
      expenseId: body.expenseId || '',
      requestedBy: body.requestedBy || '',
      amount: body.amount || 0,
      description: body.description || '',
      eventName: body.eventName || '',
      category: body.category || '',
      receiptUrl: body.receiptUrl || '',
      receiptFileId: body.receiptFileId || '',
      status: 'Pending',
      approvedBy: '',
      approvedDate: '',
      reimbursedDate: '',
      notes: body.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    await appendRow(SHEET, record);
    return jsonResponse(record, 201);
  } catch (error) {
    console.error('POST /api/reimbursements error:', error);
    return errorResponse('Failed to create reimbursement record', 500);
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

    const now = new Date().toISOString();
    const updated: Record<string, string> = {
      ...existing.record,
      ...body,
      updatedAt: now,
    };

    // Auto-set dates based on status change
    if (body.status === 'Approved' && existing.record.status !== 'Approved') {
      updated.approvedDate = now.split('T')[0];
    }
    if (body.status === 'Reimbursed' && existing.record.status !== 'Reimbursed') {
      updated.reimbursedDate = now.split('T')[0];
    }

    await updateRow(SHEET, existing.rowIndex, updated);
    return jsonResponse(updated);
  } catch (error) {
    console.error('PUT /api/reimbursements error:', error);
    return errorResponse('Failed to update reimbursement record', 500);
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

    await deleteRow(SHEET, existing.rowIndex);
    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/reimbursements error:', error);
    return errorResponse('Failed to delete reimbursement record', 500);
  }
}
