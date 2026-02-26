import { NextRequest } from 'next/server';
import { getRows } from '@/lib/google-sheets';
import { jsonResponse, errorResponse } from '@/lib/api-helpers';
import { SHEET_TABS } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  try {
    const body = await request.json();
    const { email, phone } = body;

    if (!email && !phone) {
      return errorResponse('Email or phone is required');
    }

    const emailLower = (email || '').toLowerCase().trim();
    const eventId = params.eventId;

    // Fetch the event to check for parentEventId (for multi-event discount)
    const eventRow = await getRows(SHEET_TABS.EVENTS);
    const thisEvent = eventRow.find((e) => e.id === eventId);
    const parentEventId = thisEvent?.parentEventId || '';

    // 1. Check if already checked in (duplicate prevention)
    const checkins = await getRows(SHEET_TABS.EVENT_CHECKINS);
    const existingCheckin = checkins.find(
      (c) => c.eventId === eventId && c.email?.toLowerCase().trim() === emailLower,
    );
    if (existingCheckin) {
      return jsonResponse({
        status: 'already_checked_in',
        name: existingCheckin.name,
        checkedInAt: existingCheckin.checkedInAt,
      });
    }

    // 2. Check members (by email, case-insensitive — also check spouseEmail)
    const members = await getRows(SHEET_TABS.MEMBERS);
    const member = members.find(
      (m) =>
        m.email?.toLowerCase().trim() === emailLower ||
        m.spouseEmail?.toLowerCase().trim() === emailLower,
    );

    // Helper: count how many sibling sub-events this email is registered for
    let siblingEventRegCount = 0;
    if (parentEventId) {
      const siblingEventIds = eventRow
        .filter((e) => e.parentEventId === parentEventId && e.id !== eventId)
        .map((e) => e.id);
      if (siblingEventIds.length > 0) {
        const registrations = await getRows(SHEET_TABS.EVENT_REGISTRATIONS);
        siblingEventRegCount = registrations.filter(
          (r) => siblingEventIds.includes(r.eventId) && r.email?.toLowerCase().trim() === emailLower,
        ).length;
      }
    }

    if (member) {
      if (member.status === 'Active') {
        const profileComplete = !!member.address?.trim();
        const missingFields: string[] = [];
        if (!profileComplete) missingFields.push('address');

        return jsonResponse({
          status: 'member_active',
          memberId: member.id,
          name: member.name,
          email: member.email,
          phone: member.phone,
          profileComplete,
          missingFields,
          siblingEventRegCount,
        });
      } else {
        return jsonResponse({
          status: 'member_expired',
          memberId: member.id,
          name: member.name,
          memberStatus: member.status,
          siblingEventRegCount,
        });
      }
    }

    // 3. Check guests (by email)
    const guests = await getRows(SHEET_TABS.GUESTS);
    const guest = guests.find(
      (g) => g.email?.toLowerCase().trim() === emailLower,
    );

    if (guest) {
      return jsonResponse({
        status: 'returning_guest',
        guestId: guest.id,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        city: guest.city,
        referredBy: guest.referredBy,
        siblingEventRegCount,
      });
    }

    // 4. Not found
    return jsonResponse({ status: 'not_found', siblingEventRegCount });
  } catch (error) {
    console.error('POST /api/events/[eventId]/lookup error:', error);
    return errorResponse('Lookup failed', 500);
  }
}
