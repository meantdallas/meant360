import { NextRequest } from 'next/server';
import { getRows, appendRow, getRowById, updateRow, deleteRow } from '@/lib/google-sheets';
import { jsonResponse, errorResponse, requireAuth, requireAdmin } from '@/lib/api-helpers';
import { generateId } from '@/lib/utils';
import { SHEET_TABS } from '@/types';

const SHEET = SHEET_TABS.EVENTS;

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const rows = await getRows(SHEET);
    return jsonResponse(rows);
  } catch (error) {
    console.error('GET /api/events error:', error);
    return errorResponse('Failed to fetch events', 500);
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
      date: body.date || '',
      description: body.description || '',
      status: body.status || 'Upcoming',
      createdAt: now,
      parentEventId: body.parentEventId || '',
      pricingRules: body.pricingRules || '',
    };

    await appendRow(SHEET, record);
    return jsonResponse(record, 201);
  } catch (error) {
    console.error('POST /api/events error:', error);
    return errorResponse('Failed to create event', 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    if (!body.id) return errorResponse('Missing id');

    const existing = await getRowById(SHEET, body.id);
    if (!existing) return errorResponse('Event not found', 404);

    const updated = { ...existing.record, ...body };
    await updateRow(SHEET, existing.rowIndex, updated);
    return jsonResponse(updated);
  } catch (error) {
    console.error('PUT /api/events error:', error);
    return errorResponse('Failed to update event', 500);
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
    if (!existing) return errorResponse('Event not found', 404);

    await deleteRow(SHEET, existing.rowIndex);
    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/events error:', error);
    return errorResponse('Failed to delete event', 500);
  }
}
