import { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { type UserRole } from '@/types';

// ========================================
// NextAuth Configuration
// ========================================

function getUserRole(email: string): UserRole {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
  const treasurerEmails = (process.env.TREASURER_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
  const lowerEmail = email.toLowerCase();

  if (adminEmails.includes(lowerEmail)) return 'admin';
  if (treasurerEmails.includes(lowerEmail)) return 'treasurer';
  return 'viewer';
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
        token.role = getUserRole(user.email);
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

export function canEdit(role: UserRole): boolean {
  return role === 'admin' || role === 'treasurer';
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}
