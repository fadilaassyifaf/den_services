import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://10.89.12.54:8000';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Invalid form data', detail: 'Could not parse multipart/form-data' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/report/drm-intersite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      let errorData: Record<string, unknown>;
      try {
        const text = await response.text();
        errorData = text ? JSON.parse(text) : { error: 'Backend error' };
      } catch {
        errorData = { error: 'Backend error', detail: response.statusText };
      }
      return NextResponse.json(errorData, { status: response.status });
    }

    // DRM returns ZIP directly — stream it back to client
    const contentType = response.headers.get('Content-Type') ?? 'application/zip';
    const contentDisposition = response.headers.get('Content-Disposition') ?? 'attachment; filename="drm_result.zip"';
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Content-Length': String(body.byteLength),
      },
    });

  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : 'Unexpected proxy error';
    console.error('[DRM Intersite] Proxy error:', detail);
    return NextResponse.json({ error: 'Proxy error', detail }, { status: 500 });
  }
}
