// src/core/api/fastapi.ts

const FASTAPI_BASE_URL = process.env.BACKEND_URL ?? 'http://10.89.12.54:8000';

/**
 * Proxy request ke FastAPI dengan meneruskan cookie auth-token sebagai Bearer token.
 * FastAPI menggunakan Authorization: Bearer <token>
 */
export async function fetchFastAPI(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    token: string;                          // JWT dari cookie Next.js
    body?: Record<string, string | number>; // akan di-encode sebagai form-urlencoded
  }
): Promise<Response> {
  const { method = 'GET', token, body } = options;

  const headers: HeadersInit = {
    'accept': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  let encodedBody: string | undefined;
  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    encodedBody = new URLSearchParams(
      Object.entries(body).map(([k, v]) => [k, String(v)])
    ).toString();
  }

  return fetch(`${FASTAPI_BASE_URL}${path}`, {
    method,
    headers,
    body: encodedBody,
  });
}

/**
 * Ambil token dari cookie string header
 */
export function extractTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/auth-token=([^;]+)/);
  return match ? match[1] : null;
}