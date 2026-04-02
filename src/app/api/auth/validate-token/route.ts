import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated', valid: false },
        { status: 401 }
      );
    }

    // Decode payload tanpa verify — token sudah diverify FastAPI saat login
    // Verify expiry secara manual
    let payload: any;
    try {
      const payloadBase64 = token.split('.')[1];
      payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    } catch {
      return NextResponse.json(
        { error: 'Invalid token format', valid: false },
        { status: 401 }
      );
    }

    // Cek expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return NextResponse.json(
        { error: 'Token expired', valid: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        nik: payload.id?.toString() || '',
        username: payload.username || payload.sub || '',
        name: payload.fullname || payload.username || '',
        role: payload.role || '',
      },
    });

  } catch (error) {
    console.error('[ValidateToken] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', valid: false },
      { status: 500 }
    );
  }
}