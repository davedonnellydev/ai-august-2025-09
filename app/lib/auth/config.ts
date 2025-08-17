import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db, usersTable, gmailTokensTable } from '../../db';

export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }: any) {
      // Initial sign in
      if (account && user) {
        // Store refresh token in database
        try {
          // Upsert user
          const [dbUser] = await db
            .insert(usersTable)
            .values({
              id: user.id,
              email: user.email!,
              displayName: user.name || null,
            })
            .onConflictDoUpdate({
              target: usersTable.email,
              set: {
                displayName: user.name || null,
              },
            })
            .returning();

          // Upsert Gmail tokens
          if (account.refresh_token) {
            await db
              .insert(gmailTokensTable)
              .values({
                userId: user.id,
                accessToken: account.access_token || null,
                refreshToken: account.refresh_token,
                expiryDate: account.expires_at ? new Date(account.expires_at * 1000) : null,
                scope: account.scope || 'https://www.googleapis.com/auth/gmail.readonly',
                tokenType: account.token_type || 'Bearer',
              })
              .onConflictDoUpdate({
                target: gmailTokensTable.userId,
                set: {
                  accessToken: account.access_token || null,
                  refreshToken: account.refresh_token,
                  expiryDate: account.expires_at ? new Date(account.expires_at * 1000) : null,
                  scope: account.scope || 'https://www.googleapis.com/auth/gmail.readonly',
                  tokenType: account.token_type || 'Bearer',
                  updatedAt: new Date(),
                },
              });
          }

          console.log(`User ${user.email} authenticated and tokens stored`);
        } catch (error) {
          console.error('Failed to store user/tokens:', error);
        }
      }

      return token;
    },
    async session({ session, token }: any) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt' as const,
  },
  // Note: Gmail scope is readonly; modify scope can be added later if needed
  // Current scope: https://www.googleapis.com/auth/gmail.readonly
};
