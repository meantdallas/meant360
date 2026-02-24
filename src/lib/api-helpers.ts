import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canEdit } from './auth';
import type { UserRole, ApiResponse } from '@/types';

// ========================================
// API Route Helpers
// ========================================

export function jsonResponse<T>(data: T, status = 200): NextResponse {
  const body: ApiResponse<T> = { success: true, data };
  return NextResponse.json(body, { status });
}

export function errorResponse(message: string, status = 400): NextResponse {
  const body: ApiResponse = { success: false, error: message };
  return NextResponse.json(body, { status });
}

export async function getSessionRole(): Promise<{
  role: UserRole;
  email: string;
  authenticated: boolean;
}> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { role: 'viewer', email: '', authenticated: false };
  }
  const role = (session.user as Record<string, unknown>).role as UserRole || 'viewer';
  return { role, email: session.user.email, authenticated: true };
}

export async function requireAuth(): Promise<
  { role: UserRole; email: string } | NextResponse
> {
  const { role, email, authenticated } = await getSessionRole();
  if (!authenticated) {
    return errorResponse('Unauthorized', 401);
  }
  return { role, email };
}

export async function requireEditor(): Promise<
  { role: UserRole; email: string } | NextResponse
> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (!canEdit(result.role)) {
    return errorResponse('Forbidden: insufficient permissions', 403);
  }
  return result;
}
