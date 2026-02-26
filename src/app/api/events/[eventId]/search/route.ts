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
    const query = (body.query || '').toLowerCase().trim();
    if (!query || query.length < 2) {
      return jsonResponse([]);
    }

    const eventId = params.eventId;

    // Search registrations for this event
    const [registrations, members] = await Promise.all([
      getRows(SHEET_TABS.EVENT_REGISTRATIONS),
      getRows(SHEET_TABS.MEMBERS),
    ]);

    const results: { name: string; email: string; type: string; source: string }[] = [];
    const seen = new Set<string>();

    // Search event registrations first
    const eventRegs = registrations.filter((r) => r.eventId === eventId);
    for (const reg of eventRegs) {
      if (reg.name?.toLowerCase().includes(query)) {
        const key = reg.email?.toLowerCase() || reg.name?.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            name: reg.name,
            email: reg.email,
            type: reg.type,
            source: 'registration',
          });
        }
      }
    }

    // Search members
    for (const member of members) {
      if (member.name?.toLowerCase().includes(query)) {
        const key = member.email?.toLowerCase() || member.name?.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            name: member.name,
            email: member.email,
            type: 'Member',
            source: 'member',
          });
        }
      }
    }

    return jsonResponse(results.slice(0, 10));
  } catch (error) {
    console.error('POST /api/events/[eventId]/search error:', error);
    return errorResponse('Search failed', 500);
  }
}
