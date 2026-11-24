import { createClerkClient, verifyToken } from '@clerk/backend';

export interface AuthResult {
  userId: string;
}

export interface ClerkUserProfile {
  userId: string;
  email: string;
  emailLower: string;
  displayName: string;
  avatarUrl: string | null;
}

function getSecretKey(): string {
  const secretKey =
    process.env.DATENBANKEN_CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    console.error('[auth] Missing DATENBANKEN_CLERK_SECRET_KEY / CLERK_SECRET_KEY');
    throw new Error('Clerk server secret key is not configured.');
  }
  return secretKey;
}

let cachedClerk: ReturnType<typeof createClerkClient> | null = null;

export function getClerkClient() {
  if (!cachedClerk) {
    cachedClerk = createClerkClient({ secretKey: getSecretKey() });
  }
  return cachedClerk;
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

  try {
    const payload = await verifyToken(token, { secretKey: getSecretKey() });
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

export async function fetchClerkUserProfile(userId: string): Promise<ClerkUserProfile> {
  const clerk = getClerkClient();
  const user = await clerk.users.getUser(userId);

  const primaryEmail =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    '';

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const displayName =
    fullName || user.username || primaryEmail.split('@')[0] || 'Mitglied';

  return {
    userId,
    email: primaryEmail,
    emailLower: primaryEmail.trim().toLowerCase(),
    displayName,
    avatarUrl: user.hasImage ? user.imageUrl : null,
  };
}
