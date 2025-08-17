# Authentication Setup

This directory contains the authentication pages for the Job Application Manager application.

## Files

- `signin/page.tsx` - Sign-in page with Google OAuth
- `error/page.tsx` - Error page for authentication failures

## Architecture

### Session Management
- **SessionProvider** wraps the entire application in `app/providers.tsx`
- **Client-side session state** available via `useSession()` hook
- **Automatic session refresh** and token management
- **Protected route handling** with authentication status checks

### Authentication Flow
1. User visits application → sees "Sign In" button
2. User clicks "Sign In" → redirected to `/auth/signin`
3. User clicks "Continue with Google" → OAuth flow
4. Google redirects back → NextAuth processes tokens
5. User session created → redirected to home page
6. Navigation shows authenticated state → "Sign Out" button visible

## How to Test

### 1. Environment Variables

Make sure you have the following environment variables set:

```bash
# Required for NextAuth
NEXTAUTH_SECRET=your-32-character-secret-here
NEXTAUTH_URL=http://localhost:3000

# Required for Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Required for database
DATABASE_URL=your-neon-postgres-connection-string
```

### 2. Test the Authentication Flow

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Visit the application:**
   - Go to `http://localhost:3000`
   - You should see a "Sign In" button in the header

3. **Test sign-in:**
   - Click the "Sign In" button
   - You'll be redirected to `/auth/signin`
   - Click "Continue with Google"
   - Complete the Google OAuth flow
   - You should be redirected back to the home page

4. **Test authenticated state:**
   - After signing in, you should see "Dashboard", "Leads", and "Sign Out" buttons
   - The navigation should update to show authenticated options
   - Your user ID should be available in components via `session.user.id`

5. **Test sign-out:**
   - Click "Sign Out" button
   - You should be signed out and see the "Sign In" button again

6. **Test error handling:**
   - If authentication fails, you'll be redirected to `/auth/error`
   - The error page will display the specific error message

### 3. Expected Behavior

- **Unauthenticated:** Shows "Sign In" button, limited navigation
- **Loading:** Shows "Loading..." message while fetching session
- **Authenticated:** Shows full navigation with "Sign Out" option
- **Successful sign-in:** User is redirected to home page with full access
- **Failed sign-in:** User sees error message with retry option
- **OAuth errors:** User is redirected to error page with details

## Using Sessions in Components

### Client Components
```tsx
import { useSession } from 'next-auth/react';

export function MyComponent() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') return <div>Please sign in</div>;
  
  return <div>Welcome, {session.user.email}!</div>;
}
```

### Server Components
```tsx
import { auth } from '@/app/auth';

export async function MyServerComponent() {
  const session = await auth();
  
  if (!session) {
    return <div>Please sign in</div>;
  }
  
  return <div>Welcome, {session.user.email}!</div>;
}
```

## Troubleshooting

### Common Issues

1. **"Configuration" error:** Check `NEXTAUTH_SECRET` and `NEXTAUTH_URL`
2. **"AccessDenied" error:** Check Google OAuth credentials
3. **Database errors:** Check `DATABASE_URL` and database connection
4. **Redirect errors:** Ensure `NEXTAUTH_URL` matches your domain
5. **Session not persisting:** Check that SessionProvider is properly wrapped

### Debug Mode

To enable NextAuth debug mode, add to your environment:

```bash
NEXTAUTH_DEBUG=true
```

This will provide detailed logging in the console.

## Security Notes

- `NEXTAUTH_SECRET` should be at least 32 characters long
- Never commit environment variables to version control
- Use different secrets for development and production
- Ensure HTTPS in production for secure cookie transmission
- Session cookies are automatically secured by NextAuth
