import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from './auth';
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
  role: UserRole | null;
  email: string;
  authenticated: boolean;
}> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { role: null, email: '', authenticated: false };
  }
  const role = (session.user as Record<string, unknown>).role as UserRole | null ?? null;
  return { role, email: session.user.email, authenticated: true };
}

export async function requireAuth(): Promise<
  { role: UserRole; email: string } | NextResponse
> {
  const { role, email, authenticated } = await getSessionRole();
  if (!authenticated) {
    return errorResponse('Unauthorized', 401);
  }
  if (!role) {
    return errorResponse('Forbidden: access denied', 403);
  }
  return { role, email };
}

export async function requireAdmin(): Promise<
  { role: UserRole; email: string } | NextResponse
> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (!isAdmin(result.role)) {
    return errorResponse('Forbidden: insufficient permissions', 403);
  }
  return result;
}

export async function requireMember(): Promise<
  { role: UserRole; email: string } | NextResponse
> {
  return requireAuth();
}
