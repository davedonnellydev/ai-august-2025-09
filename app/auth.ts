import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db, usersTable, gmailTokensTable } from './db';
import { eq } from 'drizzle-orm';

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV === 'development',
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            'openid email profile https://www.googleapis.com/auth/gmail.readonly',
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
        console.log('JWT callback - user data:', {
          id: user.id,
          email: user.email,
          name: user.name,
        });

        // Store user ID in token (use sub if available, otherwise user.id)
        const oauthUserId = token.sub || user.id;
        token.email = user.email;
        token.name = user.name;
        
        // Store user info and tokens in database and get the actual user ID
        try {
          const actualUserId = await storeUserAndTokensInDatabase(oauthUserId, user, account);
          token.userId = actualUserId;
        } catch (error) {
          console.error('Failed to store user in database:', error);
          token.userId = oauthUserId; // fallback to OAuth ID
        }
      }

      return token;
    },
    async session({ session, token }: any) {
      if (token.userId) {
        session.user.id = token.userId;
      }
      if (token.email) {
        session.user.email = token.email;
      }
      if (token.name) {
        session.user.name = token.name;
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
});

// Helper function to store user info and tokens in database
async function storeUserAndTokensInDatabase(userId: string, user: any, account: any): Promise<string> {
  try {
    console.log('Storing user and tokens in database:', {
      userId,
      email: user.email,
      name: user.name,
      hasRefreshToken: !!account.refresh_token,
      hasAccessToken: !!account.access_token,
    });

    // First, try to find existing user by email
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, user.email || ''))
      .limit(1);

    let actualUserId = userId;

    if (existingUser.length > 0) {
      // Use existing user ID
      actualUserId = existingUser[0].id;
      console.log('Found existing user, using existing ID:', {
        existingId: actualUserId,
        oauthId: userId,
        email: user.email,
      });

      // Update the existing user's display name if needed
      await db
        .update(usersTable)
        .set({
          displayName: user.name || null,
        })
        .where(eq(usersTable.id, actualUserId));
    } else {
      // Create new user with OAuth ID
      await db
        .insert(usersTable)
        .values({
          id: userId,
          email: user.email || '',
          displayName: user.name || null,
        });
    }

    console.log('User upserted successfully:', {
      id: actualUserId,
      email: user.email,
      name: user.name,
    });

    // Upsert Gmail tokens using the actual user ID
    if (account.refresh_token) {
      await db
        .insert(gmailTokensTable)
        .values({
          userId: actualUserId,
          accessToken: account.access_token || null,
          refreshToken: account.refresh_token,
          expiryDate: account.expires_at
            ? new Date(account.expires_at * 1000)
            : null,
          scope:
            account.scope ||
            'https://www.googleapis.com/auth/gmail.readonly',
          tokenType: account.token_type || 'Bearer',
        })
        .onConflictDoUpdate({
          target: gmailTokensTable.userId,
          set: {
            accessToken: account.access_token || null,
            refreshToken: account.refresh_token,
            expiryDate: account.expires_at
              ? new Date(account.expires_at * 1000)
              : null,
            scope:
              account.scope ||
              'https://www.googleapis.com/auth/gmail.readonly',
            tokenType: account.token_type || 'Bearer',
            updatedAt: new Date(),
          },
        });

      console.log('Gmail tokens stored successfully for user:', actualUserId);
    }

    return actualUserId;
  } catch (error) {
    console.error('Failed to store user and tokens in database:', error);
    throw error; // Re-throw to let the JWT callback handle it
  }
}
