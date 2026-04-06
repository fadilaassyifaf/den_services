import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/core/api/db';
import { verifyToken, AuthError } from '@/core/auth/verifyToken';

export async function GET(request: NextRequest) {
  try {
    await verifyToken(request);   // semua user yang login boleh lihat

    const result = await query(
      `SELECT id, module_name, module_group, description
       FROM module_information
       ORDER BY module_group ASC, id ASC`
    );

    return NextResponse.json({ modules: result.rows });

  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[GetModules]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}