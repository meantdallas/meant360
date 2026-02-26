import { NextRequest } from 'next/server';
import { getRows, appendRow, getRowById } from '@/lib/google-sheets';
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
    const rows = await getRows(SHEET_TABS.EVENT_REGISTRATIONS);
    const filtered = rows.filter((r) => r.eventId === params.eventId);
    return jsonResponse(filtered);
  } catch (error) {
    console.error('GET /api/events/[eventId]/registrations error:', error);
    return errorResponse('Failed to fetch registrations', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  try {
    const body = await request.json();
    const eventId = params.eventId;

    // Validate event exists and is Upcoming
    const event = await getRowById(SHEET_TABS.EVENTS, eventId);
    if (!event) return errorResponse('Event not found', 404);
    if (event.record.status !== 'Upcoming') {
      return errorResponse('Event is not open for registration');
    }

    const emailLower = (body.email || '').toLowerCase().trim();
    if (!emailLower) return errorResponse('Email is required');

    // Prevent duplicate registration
    const registrations = await getRows(SHEET_TABS.EVENT_REGISTRATIONS);
    const existing = registrations.find(
      (r) => r.eventId === eventId && r.email?.toLowerCase().trim() === emailLower,
    );
    if (existing) {
      return errorResponse('Already registered for this event');
    }

    const now = new Date().toISOString();
    const isMember = body.type === 'Member';

    // For guests: find or create Guest record
    let guestId = body.guestId || '';
    if (!isMember && !guestId) {
      const guests = await getRows(SHEET_TABS.GUESTS);
      const existingGuest = guests.find(
        (g) => g.email?.toLowerCase().trim() === emailLower,
      );
      if (existingGuest) {
        guestId = existingGuest.id;
      } else {
        guestId = generateId();
        await appendRow(SHEET_TABS.GUESTS, {
          id: guestId,
          name: body.name || '',
          email: emailLower,
          phone: body.phone || '',
          city: body.city || '',
          referredBy: body.referredBy || '',
          eventsAttended: 0,
          lastEventDate: '',
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
      registeredAt: now,
      totalPrice: body.totalPrice || '0',
      priceBreakdown: body.priceBreakdown || '',
      paymentStatus: body.paymentStatus || '',
      paymentMethod: body.paymentMethod || '',
      transactionId: body.transactionId || '',
    };

    await appendRow(SHEET_TABS.EVENT_REGISTRATIONS, record);
    return jsonResponse(record, 201);
  } catch (error) {
    console.error('POST /api/events/[eventId]/registrations error:', error);
    return errorResponse('Failed to register', 500);
  }
}
