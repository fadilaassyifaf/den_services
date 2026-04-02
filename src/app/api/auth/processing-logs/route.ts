// app/api/processing-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/core/api/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userNik = searchParams.get('user_nik');

    let result;
    if (userNik) {
      result = await query(
        `SELECT id, user_nik, filename, task_name, status, progress, file_url, created_at
         FROM processing_logs 
         WHERE user_nik = $1 
         ORDER BY created_at DESC 
         LIMIT 20`,
        [userNik]
      );
    } else {
      result = await query(
        `SELECT id, user_nik, filename, task_name, status, progress, file_url, created_at
         FROM processing_logs 
         ORDER BY created_at DESC 
         LIMIT 20`
      );
    }

    return NextResponse.json({ logs: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Get logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user_nik, task_name, status, progress, file_url } = await request.json();

    const result = await query(
      `INSERT INTO processing_logs 
        (user_nik, filename, task_name, status, progress, file_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [user_nik, task_name, task_name, status || 'Processing', progress || 0, file_url || null]
    );

    return NextResponse.json({ log: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}