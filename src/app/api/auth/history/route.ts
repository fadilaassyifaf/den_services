import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/core/api/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nik = searchParams.get('nik');

    if (!nik) {
      return NextResponse.json({ error: 'nik is required' }, { status: 400 });
    }

    const result = await query(
      `SELECT 
        st.id,
        st.service_name   AS task_name,
        st.upload_file    AS filename,
        st.status,
        st.result_path    AS file_url,
        st.processing_time,
        st.created_at
       FROM services_task st
       WHERE st.user_id = $1
       ORDER BY st.created_at DESC
       LIMIT 50`,
      [nik]
    );

    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('[History GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_nik, task_name, filename, status, progress, file_url } = body;

    if (!user_nik || !task_name) {
      return NextResponse.json(
        { error: 'user_nik and task_name are required' },
        { status: 400 }
      );
    }

    // Cek task yang sama masih processing → UPDATE
    const existing = await query(
      `SELECT id FROM services_task 
       WHERE user_id = $1 AND service_name = $2 AND status = 'processing'
       ORDER BY created_at DESC LIMIT 1`,
      [parseInt(user_nik), task_name]
    );

    if (existing.rows.length > 0) {
      await query(
        `UPDATE services_task 
         SET status = $1, result_path = $2, processing_time = $3
         WHERE id = $4`,
        [status, file_url || null, progress || 0, existing.rows[0].id]
      );
    } else {
      await query(
        `INSERT INTO services_task 
          (user_id, service_name, service_router, status, upload_file, result_path, processing_time, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          user_nik,
          task_name,
          task_name.toLowerCase().replace(/\s+/g, '-'),
          status || 'processing',
          filename || '',
          file_url || null,
          progress || 0,
        ]
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[History POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}