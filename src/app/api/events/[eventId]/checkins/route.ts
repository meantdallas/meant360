import { NextRequest } from 'next/server';
import { getRows, appendRow, getRowById, updateRow } from '@/lib/google-sheets';
import { jsonResponse, errorResponse, requireAuth } from '@/lib/api-helpers';
import { generateId } from '@/lib/utils';
import { SHEET_TABS } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const rows = await getRows(SHEET_TABS.EVENT_CHECKINS);
    const filtered = rows.filter((r) => r.eventId === params.eventId);
    return jsonResponse(filtered);
  } catch (error) {
    console.error('GET /api/events/[eventId]/checkins error:', error);
    return errorResponse('Failed to fetch check-ins', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  try {
    const body = await request.json();
    const eventId = params.eventId;

    // Validate event exists and is not Cancelled
    const event = await getRowById(SHEET_TABS.EVENTS, eventId);
    if (!event) return errorResponse('Event not found', 404);
    if (event.record.status === 'Cancelled') {
      return errorResponse('Event is cancelled');
    }

    const emailLower = (body.email || '').toLowerCase().trim();
    if (!emailLower) return errorResponse('Email is required');

    // Duplicate prevention — return 200 with flag, not error
    const checkins = await getRows(SHEET_TABS.EVENT_CHECKINS);
    const existingCheckin = checkins.find(
      (c) => c.eventId === eventId && c.email?.toLowerCase().trim() === emailLower,
    );
    if (existingCheckin) {
      return jsonResponse({
        alreadyCheckedIn: true,
        checkedInAt: existingCheckin.checkedInAt,
      });
    }

    const now = new Date().toISOString();
    const isMember = body.type === 'Member';

    // For guests: find or create Guest record, update stats
    let guestId = body.guestId || '';
    if (!isMember) {
      const guests = await getRows(SHEET_TABS.GUESTS);
      const existingGuest = guests.find(
        (g) => g.email?.toLowerCase().trim() === emailLower,
      );

      if (existingGuest) {
        guestId = existingGuest.id;
        // Update eventsAttended and lastEventDate
        const guestRow = await getRowById(SHEET_TABS.GUESTS, guestId);
        if (guestRow) {
          const attended = parseInt(guestRow.record.eventsAttended || '0', 10) + 1;
          await updateRow(SHEET_TABS.GUESTS, guestRow.rowIndex, {
            ...guestRow.record,
            eventsAttended: attended,
            lastEventDate: now.split('T')[0],
            updatedAt: now,
          });
        }
      } else {
        guestId = generateId();
        await appendRow(SHEET_TABS.GUESTS, {
          id: guestId,
          name: body.name || '',
          email: emailLower,
          phone: body.phone || '',
          city: body.city || '',
          referredBy: body.referredBy || '',
          eventsAttended: 1,
          lastEventDate: now.split('T')[0],
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const record = {
      id: generateId(),
      eventId,
      type: isMember ? 'Member' : 'Guest',
      memberId: body.memberId || '',
      guestId,
      name: body.name || '',
      email: emailLower,
      phone: body.phone || '',
      adults: body.adults || 0,
      kids: body.kids || 0,
      checkedInAt: now,
      totalPrice: body.totalPrice || '0',
      priceBreakdown: body.priceBreakdown || '',
      paymentStatus: body.paymentStatus || '',
      paymentMethod: body.paymentMethod || '',
      transactionId: body.transactionId || '',
    };

    await appendRow(SHEET_TABS.EVENT_CHECKINS, record);
    return jsonResponse(record, 201);
  } catch (error) {
    console.error('POST /api/events/[eventId]/checkins error:', error);
    return errorResponse('Failed to check in', 500);
  }
}
