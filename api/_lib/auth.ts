import { verifyToken } from '@clerk/backend';

export interface AuthResult {
  userId: string;
}

const MAX_TOKEN_LENGTH = 8192;

function parseOrigin(candidate: string): string | null {
  try {
    const parsed = new URL(candidate);
    if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.origin !== 'null') {
      return parsed.origin;
    }
  } catch {
    // Ignore malformed origin strings
  }
  return null;
}

function normalizeHost(rawHost: string): string | null {
  const host = rawHost.trim().replace(/^https?:\/\//i, '');
  if (!host || /[\s/\\@]/.test(host)) {
    return null;
  }
  return host;
}

function resolveAuthorizedParties(request: Request): string[] | undefined {
  const configured = process.env.CLERK_AUTHORIZED_PARTIES;
  if (configured && configured.trim().length > 0) {
    const allowlist = new Set<string>();
    for (const rawEntry of configured.split(',')) {
      const origin = parseOrigin(rawEntry.trim());
      if (origin) allowlist.add(origin);
    }
    return allowlist.size > 0 ? Array.from(allowlist) : undefined;
  }

  const origins = new Set<string>();

  const requestOrigin = parseOrigin(request.url);
  if (requestOrigin) {
    origins.add(requestOrigin);
  }

  const rawProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  const rawHost = request.headers.get('x-forwarded-host')?.split(',')[0];
  const forwardedHost = rawHost ? normalizeHost(rawHost) : null;
  if ((rawProto === 'http' || rawProto === 'https') && forwardedHost) {
    const forwardedOrigin = parseOrigin(`${rawProto}://${forwardedHost}`);
    if (forwardedOrigin) origins.add(forwardedOrigin);
  }

  const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? normalizeHost(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    : null;
  if (prodHost) {
    const prodOrigin = parseOrigin(`https://${prodHost}`);
    if (prodOrigin) origins.add(prodOrigin);
  }

  const deployHost = process.env.VERCEL_URL ? normalizeHost(process.env.VERCEL_URL) : null;
  if (deployHost) {
    const deployOrigin = parseOrigin(`https://${deployHost}`);
    if (deployOrigin) origins.add(deployOrigin);
  }

  return origins.size > 0 ? Array.from(origins) : undefined;
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
  if (!token || token.length > MAX_TOKEN_LENGTH) {
    return null;
  }

  const secretKey =
    process.env.DATENBANKEN_CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    console.error('[auth] Missing DATENBANKEN_CLERK_SECRET_KEY / CLERK_SECRET_KEY');
    throw new Error('Clerk server secret key is not configured.');
  }

  try {
    const authorizedParties = resolveAuthorizedParties(request);
    const payload = await verifyToken(token, {
      secretKey,
      ...(authorizedParties ? { authorizedParties } : {}),
    });
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
