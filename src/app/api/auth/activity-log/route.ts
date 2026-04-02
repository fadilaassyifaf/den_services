import { NextResponse } from 'next/server';
import { query } from '@/core/api/db';

export async function GET() {
  try {
    const result = await query(`
      SELECT 
        st.id,
        st.user_id,
        u.username,
        u.fullname,
        st.service_name,
        st.service_router,
        st.status,
        st.upload_file,
        st.result_path,
        st.processing_time,
        st.created_at
      FROM services_task st
      JOIN users u ON u.id = st.user_id
      ORDER BY st.created_at DESC
      LIMIT 500
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('[ActivityLog GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}