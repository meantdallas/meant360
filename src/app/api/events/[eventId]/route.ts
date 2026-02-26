import { NextRequest } from 'next/server';
import { getRowById, getRows } from '@/lib/google-sheets';
import { jsonResponse, errorResponse } from '@/lib/api-helpers';
import { SHEET_TABS } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  try {
    const existing = await getRowById(SHEET_TABS.EVENTS, params.eventId);
    if (!existing) return errorResponse('Event not found', 404);

    const { id, name, date, description, status, parentEventId, pricingRules } = existing.record;

    // Fetch registration, check-in counts, and all events for sub-event/sibling queries
    const [registrations, checkins, allEvents] = await Promise.all([
      getRows(SHEET_TABS.EVENT_REGISTRATIONS),
      getRows(SHEET_TABS.EVENT_CHECKINS),
      getRows(SHEET_TABS.EVENTS),
    ]);

    const eventRegs = registrations.filter((r) => r.eventId === params.eventId);
    const eventCheckins = checkins.filter((c) => c.eventId === params.eventId);

    // Find sub-events (events whose parentEventId is this event)
    const subEvents = allEvents
      .filter((e) => e.parentEventId === id)
      .map((e) => ({ id: e.id, name: e.name, date: e.date, status: e.status, pricingRules: e.pricingRules || '' }));

    // Find sibling events (other events with same parentEventId)
    const siblingEvents = parentEventId
      ? allEvents
          .filter((e) => e.parentEventId === parentEventId && e.id !== id)
          .map((e) => ({ id: e.id, name: e.name, date: e.date, status: e.status, pricingRules: e.pricingRules || '' }))
      : [];

    // Find parent event name if this is a sub-event
    const parentEvent = parentEventId
      ? allEvents.find((e) => e.id === parentEventId)
      : null;

    // Upcoming events: status === 'Upcoming', exclude current event and sub-events, sort by date, limit 5
    const upcomingEvents = allEvents
      .filter((e) => e.status === 'Upcoming' && e.id !== id && !e.parentEventId)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .slice(0, 5)
      .map((e) => ({ id: e.id, name: e.name, date: e.date }));

    return jsonResponse({
      id,
      name,
      date,
      description,
      status,
      parentEventId: parentEventId || '',
      parentEventName: parentEvent?.name || '',
      pricingRules: pricingRules || '',
      totalRegistrations: eventRegs.length,
      totalCheckins: eventCheckins.length,
      memberCheckins: eventCheckins.filter((c) => c.type === 'Member').length,
      guestCheckins: eventCheckins.filter((c) => c.type === 'Guest').length,
      subEvents,
      siblingEvents,
      upcomingEvents,
    });
  } catch (error) {
    console.error('GET /api/events/[eventId] error:', error);
    return errorResponse('Failed to fetch event', 500);
  }
}
