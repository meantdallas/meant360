import { NextRequest } from 'next/server';
import { getRows, appendRow, getRowById, updateRow, deleteRow } from '@/lib/google-sheets';
import { jsonResponse, errorResponse, requireAuth, requireEditor } from '@/lib/api-helpers';
import { generateId } from '@/lib/utils';
import { SHEET_TABS } from '@/types';

const SHEET = SHEET_TABS.MEMBERS;

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const membershipType = searchParams.get('membershipType');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let rows = await getRows(SHEET);

    if (membershipType) {
      rows = rows.filter((r) => r.membershipType === membershipType);
    }
    if (status) {
      rows = rows.filter((r) => r.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.phone?.toLowerCase().includes(q),
      );
    }

    return jsonResponse(rows);
  } catch (error) {
    console.error('GET /api/members error:', error);
    return errorResponse('Failed to fetch members', 500);
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
      name: body.name || '',
      address: body.address || '',
      email: body.email || '',
      phone: body.phone || '',
      spouseName: body.spouseName || '',
      spouseEmail: body.spouseEmail || '',
      spousePhone: body.spousePhone || '',
      children: body.children || '[]',
      membershipType: body.membershipType || 'Yearly',
      membershipYears: body.membershipYears || '',
      registrationDate: body.registrationDate || now.split('T')[0],
      renewalDate: body.renewalDate || '',
      status: body.status || 'Active',
      notes: body.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    await appendRow(SHEET, record);
    return jsonResponse(record, 201);
  } catch (error) {
    console.error('POST /api/members error:', error);
    return errorResponse('Failed to create member', 500);
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
    console.error('PUT /api/members error:', error);
    return errorResponse('Failed to update member', 500);
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
    console.error('DELETE /api/members error:', error);
    return errorResponse('Failed to delete member', 500);
  }
}
