import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://10.89.12.54:8000';

function extractErrorMessage(detail: any): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
  }
  if (detail && typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  return 'Invalid username or password';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const formBody = new URLSearchParams();
    formBody.append('grant_type', 'password');
    formBody.append('username', username);
    formBody.append('password', password);
    formBody.append('scope', '');
    formBody.append('client_id', 'string');
    formBody.append('client_secret', 'string');

    const fastapiResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formBody.toString(),
    });

    if (!fastapiResponse.ok) {
      const errorData = await fastapiResponse.json().catch(() => ({}));
      const message = extractErrorMessage(errorData.detail || errorData.error || errorData);
      return NextResponse.json(
        { error: message },
        { status: 401 }
      );
    }

    const data = await fastapiResponse.json();

    // Decode payload JWT dari FastAPI
    const payloadBase64 = data.access_token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

    const userData = {
      nik: payload.id?.toString() || '',
      username: payload.username || payload.sub || '',
      name: payload.fullname || payload.username || '',
      role: payload.role || '',
    };

    // Hitung sisa waktu hidup token dalam detik
    // payload.exp = Unix timestamp saat token expire (dari FastAPI)
    // now          = Unix timestamp sekarang
    // tokenTTL     = selisihnya = berapa detik lagi token masih valid
    const now = Math.floor(Date.now() / 1000);
    const tokenTTL = payload.exp && payload.exp > now
      ? payload.exp - now   // gunakan sisa waktu token FastAPI
      : 60 * 60;            // fallback 1 jam kalau exp tidak ada

    const response = NextResponse.json({
      message: 'Login successful',
      user: userData,
    });

    response.cookies.set('auth-token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenTTL, // ← PERUBAHAN: cookie expire tepat saat token expire
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}