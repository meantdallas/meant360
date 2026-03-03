import { jsonResponse, errorResponse, requireAuth } from '@/lib/api-helpers';
import { sentEmailRepository } from '@/repositories';

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const history = await sentEmailRepository.findAll();
    return jsonResponse(history);
  } catch (error) {
    console.error('GET /api/email/history error:', error);
    return errorResponse('Failed to fetch email history', 500, error);
  }
}
