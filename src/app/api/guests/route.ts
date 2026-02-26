import { NextRequest } from 'next/server';
import { getRows, appendRow, getRowById, updateRow, deleteRow } from '@/lib/google-sheets';
import { jsonResponse, errorResponse, requireAuth, requireAdmin } from '@/lib/api-helpers';
import { generateId } from '@/lib/utils';
import { SHEET_TABS } from '@/types';

const SHEET = SHEET_TABS.GUESTS;

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let rows = await getRows(SHEET);

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q),
      );
    }

    return jsonResponse(rows);
  } catch (error) {
    console.error('GET /api/guests error:', error);
    return errorResponse('Failed to fetch guests', 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const now = new Date().toISOString();
    const record = {
      id: generateId(),
      name: body.name || '',
      email: body.email || '',
      phone: body.phone || '',
      city: body.city || '',
      referredBy: body.referredBy || '',
      eventsAttended: body.eventsAttended || 0,
      lastEventDate: body.lastEventDate || '',
      createdAt: now,
      updatedAt: now,
    };

    await appendRow(SHEET, record);
    return jsonResponse(record, 201);
  } catch (error) {
    console.error('POST /api/guests error:', error);
    return errorResponse('Failed to create guest', 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
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
    console.error('PUT /api/guests error:', error);
    return errorResponse('Failed to update guest', 500);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
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
    console.error('DELETE /api/guests error:', error);
    return errorResponse('Failed to delete guest', 500);
  }
}
