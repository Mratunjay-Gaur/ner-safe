import crypto from 'crypto';

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.JWT_SECRET ||
  'ner-safe-secure-cluster-auth-key-2026-v1';

// 30 days session expiration
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionPayload {
  userId?: string;
  email: string;
  iat: number;
  exp: number;
}

export function createSessionToken(user: { id?: string; email: string }): string {
  const now = Date.now();
  const payload: SessionPayload = {
    userId: user.id ? String(user.id) : undefined,
    email: user.email.trim().toLowerCase(),
    iat: now,
    exp: now + SESSION_TTL_MS,
  };

  const payloadString = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadString)
    .digest('base64url');

  return `${payloadString}.${signature}`;
}

export function verifySessionToken(token: string): {
  valid: boolean;
  payload?: SessionPayload;
  error?: string;
} {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token missing' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed token structure' };
  }

  const [payloadString, signature] = parts;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadString)
      .digest('base64url');

    // Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expSigBuffer = Buffer.from(expectedSignature);

    if (
      sigBuffer.length !== expSigBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expSigBuffer)
    ) {
      return { valid: false, error: 'Invalid token signature' };
    }

    const payload: SessionPayload = JSON.parse(
      Buffer.from(payloadString, 'base64url').toString('utf-8')
    );

    if (!payload.email || typeof payload.email !== 'string') {
      return { valid: false, error: 'Invalid token payload' };
    }

    if (Date.now() > payload.exp) {
      return { valid: false, error: 'Session token has expired' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Token verification failed' };
  }
}
