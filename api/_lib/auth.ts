import { verifyToken } from '@clerk/backend';

export interface AuthResult {
  userId: string;
}

/**
 * Verifies the Clerk session JWT sent in `Authorization: Bearer <token>`.
 * Never trusts any client-supplied user ID.
 */
export async function authenticateRequest(request: Request): Promise<AuthResult | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  const secretKey =
    process.env.DATENBANKEN_CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    console.error('[auth] Missing DATENBANKEN_CLERK_SECRET_KEY / CLERK_SECRET_KEY');
    throw new Error('Clerk server secret key is not configured.');
  }

  try {
    const payload = await verifyToken(token, { secretKey });
    if (!payload.sub || typeof payload.sub !== 'string') {
      return null;
    }
    return { userId: payload.sub };
  } catch (err) {
    console.warn(
      '[auth] Token verification failed:',
      err instanceof Error ? err.message : 'invalid'
    );
    return null;
  }
}
