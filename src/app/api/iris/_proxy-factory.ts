import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.BACKEND_URL || 'http://10.89.12.54:8000';

async function forwardToBackend(
  endpoint: string,
  formData: FormData,
  toolName: string,
  request: NextRequest
): Promise<Response> {
  const headers: HeadersInit = {};

  // Ekstrak JWT dari httpOnly cookie, kirim sebagai Bearer ke FastAPI
  const authTokenCookie = request.cookies.get('auth-token')?.value;
  if (authTokenCookie) {
    headers['Authorization'] = `Bearer ${authTokenCookie}`;
    console.log(`🔐 [Proxy:${toolName}] Auth from cookie → Bearer token`);
  } else {
    // Fallback ke Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
      console.log(`🔐 [Proxy:${toolName}] Auth from header`);
    }
  }

  if (!headers['Authorization']) {
    console.error(`❌ [Proxy:${toolName}] No auth credentials found`);
    throw new Error('Missing authentication credentials');
  }

  return fetch(endpoint, {
    method: 'POST',
    headers,
    body: formData,
  });
}

export function createToolProxy(backendEndpoint: string, toolName: string) {
  return async function POST(request: NextRequest): Promise<NextResponse> {
    console.log(`🔔 [Proxy:${toolName}] POST received`);

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (err) {
      console.error(`❌ [Proxy:${toolName}] Invalid form data`, err);
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    let response: Response;
    try {
      response = await forwardToBackend(backendEndpoint, formData, toolName, request);
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : 'Forwarding failed';
      return NextResponse.json({ error: 'Proxy failed', detail }, { status: 500 });
    }

    console.log(`📡 [Proxy:${toolName}] Backend status: ${response.status}`);

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: 'Backend error', detail: response.statusText };
      }
      console.error(`❌ [Proxy:${toolName}] Backend error:`, errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    let rawData: any;
    try {
      rawData = await response.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON from backend' }, { status: 502 });
    }

    console.log(`📊 [Proxy:${toolName}] Response:`, rawData);

    if (rawData.celery_task_id && !rawData.task_id) {
      rawData.task_id = rawData.celery_task_id;
    }

    if (!rawData.task_id) {
      return NextResponse.json(
        { error: 'No task_id in response', detail: rawData },
        { status: 502 }
      );
    }

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        responseHeaders.append(key, value);
      }
    });

    return NextResponse.json(rawData, {
      headers: responseHeaders.keys.length > 0 ? responseHeaders : undefined,
    });
  };
}

export { BACKEND_BASE };