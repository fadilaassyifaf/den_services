import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/core/api/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nik: string }> }
) {
  try {
    const { nik } = await params;

    const result = await query(
      `SELECT m.id, m.module_name, m.endpoint 
       FROM modules m
       INNER JOIN user_modules um ON m.id = um.module_id
       WHERE um.user_nik = $1
       ORDER BY m.id ASC`,
      [nik]
    );

    return NextResponse.json({ modules: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Get user modules error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ nik: string }> }
) {
  try {
    const { nik } = await params;
    const { moduleIds } = await request.json();

    // Hapus semua akses modul lama
    await query('DELETE FROM user_modules WHERE user_nik = $1', [nik]);

    // Insert akses modul baru
    if (moduleIds && moduleIds.length > 0) {
      for (const moduleId of moduleIds) {
        await query(
          'INSERT INTO user_modules (user_nik, module_id) VALUES ($1, $2)',
          [nik, moduleId]
        );
      }
    }

    return NextResponse.json({ message: 'Modules updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Update user modules error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}