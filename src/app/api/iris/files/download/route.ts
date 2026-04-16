import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://10.89.12.54:8000';

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  // Normalisasi path: pastikan diawali /
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  const fileUrl = `${BACKEND_URL}${normalizedPath}`;

  try {
    const upstream = await fetch(fileUrl, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Backend returned ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get('Content-Type') ?? 'application/octet-stream';
    const contentDisposition = upstream.headers.get('Content-Disposition') ?? '';
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition || `attachment`,
        'Content-Length': String(body.byteLength),
      },
    });
  } catch (err) {
    console.error('[FileDownload] Failed to fetch from backend:', fileUrl, err);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
