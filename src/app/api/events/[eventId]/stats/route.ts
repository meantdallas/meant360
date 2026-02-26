import { NextRequest } from 'next/server';
import { getRows, getRowById } from '@/lib/google-sheets';
import { jsonResponse, errorResponse, requireAuth } from '@/lib/api-helpers';
import { SHEET_TABS } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const event = await getRowById(SHEET_TABS.EVENTS, params.eventId);
    if (!event) return errorResponse('Event not found', 404);

    const allRegistrations = await getRows(SHEET_TABS.EVENT_REGISTRATIONS);
    const registrations = allRegistrations.filter((r) => r.eventId === params.eventId);

    const allCheckins = await getRows(SHEET_TABS.EVENT_CHECKINS);
    const checkins = allCheckins.filter((c) => c.eventId === params.eventId);

    const memberCheckins = checkins.filter((c) => c.type === 'Member').length;
    const guestCheckins = checkins.filter((c) => c.type === 'Guest').length;

    return jsonResponse({
      event: event.record,
      totalRegistrations: registrations.length,
      totalCheckins: checkins.length,
      memberCheckins,
      guestCheckins,
      registrations,
      checkins,
    });
  } catch (error) {
    console.error('GET /api/events/[eventId]/stats error:', error);
    return errorResponse('Failed to fetch event stats', 500);
  }
}
