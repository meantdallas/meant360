import { NextRequest } from 'next/server';
import { getAllSettings, upsertSetting } from '@/lib/google-sheets';
import { jsonResponse, errorResponse, requireAuth, requireAdmin } from '@/lib/api-helpers';

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const settings = await getAllSettings();
    return jsonResponse(settings);
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return errorResponse('Failed to fetch settings', 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const { settings } = body as { settings: Record<string, string> };

    if (!settings || typeof settings !== 'object') {
      return errorResponse('Invalid request: settings object required');
    }

    const updates = Object.entries(settings);
    for (const [key, value] of updates) {
      await upsertSetting(key, String(value), auth.email);
    }

    return jsonResponse({ updated: updates.length });
  } catch (error) {
    console.error('PUT /api/settings error:', error);
    return errorResponse('Failed to update settings', 500);
  }
}
