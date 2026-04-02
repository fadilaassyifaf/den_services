import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://10.83.10.16:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const response = await fetch(`${BACKEND_URL}/report/boq-intersite`, {
      method: 'POST',
      body: formData,
    });

    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/zip') || contentType.includes('application/octet-stream')) {
      const blob = await response.blob();
      return new NextResponse(blob, {
        status: response.status,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment; filename="boq_intersite_result.zip"',
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('BOQ Intersite proxy error:', error);
    return NextResponse.json({ error: 'Failed to connect to backend' }, { status: 500 });
  }
}