import { NextRequest } from 'next/server';
import { auth } from '../../auth';

/**
 * Get the current user ID from NextAuth session on the server side
 * @param req - Next.js request object
 * @returns Promise<string | null> - User ID if authenticated, null otherwise
 */
export async function getSessionUserId(
  _req: NextRequest
): Promise<string | null> {
  try {
    const session = await auth();
    return session?.user?.id || null;
  } catch (error) {
    // Log warning for debugging
    return null;
  }
}

/**
 * Get the current user ID from NextAuth session (alternative method)
 * @returns Promise<string | null> - User ID if authenticated, null otherwise
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await auth();
    return session?.user?.id || null;
  } catch (error) {
    // Log warning for debugging
    return null;
  }
}
