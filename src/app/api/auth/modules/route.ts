// app/api/modules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/core/api/db';

export async function GET(request: NextRequest) {
  try {
    const result = await query('SELECT * FROM modules ORDER BY id ASC');
    return NextResponse.json({ modules: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Fetch modules error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}