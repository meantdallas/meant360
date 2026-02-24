import { NextRequest } from 'next/server';
import { getRows, appendRow, getRowById, updateRow, deleteRow } from '@/lib/google-sheets';
import { jsonResponse, errorResponse, requireAuth, requireEditor } from '@/lib/api-helpers';
import { generateId } from '@/lib/utils';
import { SHEET_TABS } from '@/types';

const SHEET = SHEET_TABS.SPONSORSHIP;

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const eventName = searchParams.get('event');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const year = searchParams.get('year');

    let rows = await getRows(SHEET);

    if (eventName) rows = rows.filter((r) => r.eventName === eventName);
    if (status) rows = rows.filter((r) => r.status === status);
    if (type) rows = rows.filter((r) => r.type === type);
    if (year) rows = rows.filter((r) => r.year === year);

    return jsonResponse(rows);
  } catch (error) {
    console.error('GET /api/sponsorship error:', error);
    return errorResponse('Failed to fetch sponsorship records', 500);
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
      sponsorName: body.sponsorName || '',
      year: body.year || String(new Date().getFullYear()),
      sponsorEmail: body.sponsorEmail || '',
      sponsorPhone: body.sponsorPhone || '',
      type: body.type || 'Annual',
      amount: body.amount || 0,
      eventName: body.eventName || '',
      paymentMethod: body.paymentMethod || '',
      paymentDate: body.paymentDate || now.split('T')[0],
      status: body.status || 'Pending',
      notes: body.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    await appendRow(SHEET, record);
    return jsonResponse(record, 201);
  } catch (error) {
    console.error('POST /api/sponsorship error:', error);
    return errorResponse('Failed to create sponsorship record', 500);
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
    console.error('PUT /api/sponsorship error:', error);
    return errorResponse('Failed to update sponsorship record', 500);
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
    console.error('DELETE /api/sponsorship error:', error);
    return errorResponse('Failed to delete sponsorship record', 500);
  }
}
