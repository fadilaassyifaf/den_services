// src/core/auth/verifyToken.ts
import { NextRequest } from 'next/server';
import { jwtVerify, JWTPayload } from 'jose';

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRole = 'admin' | 'user' | 'guest' | 'superuser';

export interface TokenPayload extends JWTPayload {
  id?: number;        // users.id (PK) — dikonfirmasi dari FastAPI JWT
  sub?: string;
  username?: string;
  fullname?: string;
  role?: UserRole;
}

export interface AuthenticatedUser {
  nik: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
}

// ─── Error Class ──────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    public override message: string,
    public status: 401 | 403 = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ─── Core Functions ───────────────────────────────────────────────────────────

export async function verifyToken(request: NextRequest): Promise<TokenPayload> {
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    throw new AuthError('No token provided');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[verifyToken] JWT_SECRET is not set');
    throw new Error('Server misconfiguration');
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    return payload as TokenPayload;
  } catch (err: any) {
    if (err?.code === 'ERR_JWT_EXPIRED') {
      throw new AuthError('Token expired');
    }
    throw new AuthError('Invalid token');
  }
}

export async function verifyAdmin(request: NextRequest): Promise<TokenPayload> {
  const payload = await verifyToken(request);

  const adminRoles: UserRole[] = ['admin', 'superuser'];
  if (!adminRoles.includes(payload.role as UserRole)) {
    throw new AuthError('Admin access required', 403);
  }

  return payload;
}

export function extractUser(payload: TokenPayload): AuthenticatedUser {
  return {
    nik: '',  // tidak ada di JWT — diisi dari DB di validate-token
    username: payload.username ?? payload.sub ?? '',
    name: payload.fullname ?? payload.username ?? '',
    email: '',
    role: (payload.role ?? 'user') as UserRole,
  };
}