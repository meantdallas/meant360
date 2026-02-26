import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: 'admin' | 'member' | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'admin' | 'member' | null;
  }
}
