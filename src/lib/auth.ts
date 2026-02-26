import { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { type UserRole, SHEET_TABS } from '@/types';
import { getRows } from './google-sheets';

// ========================================
// NextAuth Configuration
// ========================================

// --- Admin email cache (5-minute TTL) ---
let adminEmailCache: { emails: Set<string>; fetchedAt: number } | null = null;
const ADMIN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getAdminEmails(): Promise<Set<string>> {
  const now = Date.now();
  if (adminEmailCache && now - adminEmailCache.fetchedAt < ADMIN_CACHE_TTL) {
    return adminEmailCache.emails;
  }

  try {
    const rows = await getRows(SHEET_TABS.ADMINS);
    const emails = new Set(rows.map((r) => (r.email || '').trim().toLowerCase()).filter(Boolean));
    adminEmailCache = { emails, fetchedAt: now };
    return emails;
  } catch {
    // If sheet doesn't exist yet, return empty set
    return new Set();
  }
}

async function getUserRole(email: string): Promise<UserRole | null> {
  const lowerEmail = email.toLowerCase();

  // 1. Check Admins sheet
  const sheetAdmins = await getAdminEmails();
  if (sheetAdmins.has(lowerEmail)) return 'admin';

  // 2. Fallback: check ADMIN_EMAILS env var (bootstrap)
  const envAdmins = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (envAdmins.includes(lowerEmail)) return 'admin';

  // 3. Check Members sheet (Active status, match loginEmail/email/spouseEmail)
  try {
    const members = await getRows(SHEET_TABS.MEMBERS);
    const isActiveMember = members.some((m) => {
      if (m.status !== 'Active') return false;
      const loginEmail = (m.loginEmail || '').trim().toLowerCase();
      const memberEmail = (m.email || '').trim().toLowerCase();
      const spouseEmail = (m.spouseEmail || '').trim().toLowerCase();
      return loginEmail === lowerEmail || memberEmail === lowerEmail || spouseEmail === lowerEmail;
    });
    if (isActiveMember) return 'member';
  } catch {
    // If sheet read fails, fall through to null
  }

  // 4. Unknown user
  return null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'consent',
          access_type: 'offline',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        token.role = await getUserRole(user.email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin';
}

export function isMember(role: UserRole | null | undefined): boolean {
  return role === 'member';
}

export function isAuthorized(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'member';
}
