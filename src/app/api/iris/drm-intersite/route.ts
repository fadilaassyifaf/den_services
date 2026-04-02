import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://10.83.10.16:8000';

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 [Proxy] POST /api/iris/drm-intersite received');

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error('❌ [Proxy] Failed to parse form data:', parseError);
      return NextResponse.json(
        { error: 'Invalid form data', detail: 'Could not parse multipart/form-data' },
        { status: 400 }
      );
    }

    let response: Response;
    try {
      response = await fetch(`${BACKEND_URL}/report/drm-intersite`, {
        method: 'POST',
        body: formData,
      });
    } catch (fetchError: unknown) {
      const detail =
        fetchError instanceof Error ? fetchError.message :
        typeof fetchError === 'string' ? fetchError :
        'Cannot reach backend';
      console.error('❌ [Proxy] Cannot reach backend:', detail);
      return NextResponse.json(
        { error: 'Backend unreachable', detail },
        { status: 503 }
      );
    }

    console.log('📡 [Proxy] Backend response status:', response.status, response.statusText);

    if (!response.ok) {
      let errorData: Record<string, unknown>;
      try {
        const rawText = await response.text();
        errorData = rawText ? JSON.parse(rawText) : { error: 'Backend error' };
      } catch {
        errorData = { error: 'Backend error', detail: response.statusText };
      }
      return NextResponse.json(errorData, { status: response.status });
    }

    let data: unknown;
    try {
      const rawText = await response.text();
      data = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON from backend', detail: 'Backend returned non-JSON response' },
        { status: 502 }
      );
    }

    return NextResponse.json(data);

  } catch (error: unknown) {
    const detail =
      error instanceof Error ? error.message :
      typeof error === 'string' ? error :
      'Unexpected proxy error';
    console.error('❌ [Proxy] Unexpected error:', detail);
    return NextResponse.json(
      { error: 'Proxy error', detail },
      { status: 500 }
    );
  }
}