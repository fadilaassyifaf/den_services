/**
 * Path: src/app/api/iris/tasks/status/[task_id]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.BACKEND_URL || 'http://10.89.12.54:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ task_id: string }> }
) {
  try {
    const { task_id } = await params;

    if (!task_id?.trim()) {
      return NextResponse.json({ error: 'task_id is required' }, { status: 400 });
    }

    console.log('🔍 [Proxy:TaskStatus] GET:', task_id);

    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_BASE}/tasks/status/${task_id}`, {
      method:  'GET',
      headers: {
        Accept:        'application/json, application/zip',
        Authorization: `Bearer ${authToken}`,
      },
    });

    const contentType = response.headers.get('Content-Type') || '';
    console.log('📄 [Proxy:TaskStatus] Content-Type:', contentType, '| HTTP:', response.status);

    // SUCCESS = ZIP langsung
    if (contentType.includes('application/zip')) {
      const buffer             = await response.arrayBuffer();
      const contentDisposition =
        response.headers.get('Content-Disposition') || 'attachment; filename=result.zip';

      return new NextResponse(buffer, {
        status:  200,
        headers: {
          'Content-Type':        'application/zip',
          'Content-Disposition': contentDisposition,
          'Content-Length':      buffer.byteLength.toString(),
        },
      });
    }

    if (!response.ok) {
      let errorData: Record<string, unknown>;
      try {
        const text = await response.text();
        errorData  = text ? JSON.parse(text) : { error: 'Backend error' };
      } catch {
        errorData = { error: 'Backend error', detail: response.statusText };
      }
      console.error('❌ [Proxy:TaskStatus] Backend error:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    let rawData: Record<string, unknown>;
    try {
      rawData = JSON.parse(await response.text());
    } catch {
      return NextResponse.json({ error: 'Invalid JSON from backend' }, { status: 502 });
    }

    // Normalisasi task_id
    if (rawData.celery_task_id && !rawData.task_id) {
      rawData = { ...rawData, task_id: rawData.celery_task_id };
    }
    if (!rawData.task_id) {
      rawData = { ...rawData, task_id };
    }

    // Log progress untuk debug
    const info = rawData.info as Record<string, unknown> | undefined;
    const progressLog =
      info?.progress ??
      (info?.current != null ? `${info.current}/${info.total}` : null) ??
      rawData.progress ??
      '-';

    console.log(
      '✅ [Proxy:TaskStatus] status:', rawData.status,
      '| task_id:', rawData.task_id,
      '| progress:', progressLog
    );

    return NextResponse.json(rawData);

  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : 'Unexpected proxy error';
    console.error('❌ [Proxy:TaskStatus] Unexpected error:', detail);
    return NextResponse.json({ error: 'Proxy error', detail }, { status: 500 });
  }
}