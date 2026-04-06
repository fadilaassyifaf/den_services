import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractUser, AuthError } from '@/core/auth/verifyToken';
import { query } from '@/core/api/db';

export async function GET(request: NextRequest) {
  try {
    const payload = await verifyToken(request);
    const user = extractUser(payload);

    // payload.id = users.id (PK), bukan NIK
    const userId = payload.id;
    if (!userId) {
      return NextResponse.json(
        { valid: false, error: 'Invalid token: missing user id' },
        { status: 401 }
      );
    }

    // Ambil nik, email, dan modules sekaligus
    const result = await query(
      `SELECT
         u.nik,
         u.email,
         COALESCE(
           json_agg(
             json_build_object(
               'id', mi.id,
               'module_name', mi.module_name,
               'module_group', mi.module_group
             )
           ) FILTER (WHERE mi.id IS NOT NULL),
           '[]'
         ) AS modules
       FROM users u
       LEFT JOIN module_auth ma ON u.id = ma.user_id
       LEFT JOIN module_information mi ON ma.module_id = mi.id
       WHERE u.id = $1
       GROUP BY u.nik, u.email`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { valid: false, error: 'User not found' },
        { status: 401 }
      );
    }

    const { nik, email, modules } = result.rows[0];

    return NextResponse.json({
      valid: true,
      user: { ...user, nik, email },
      modules,
    });

  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { valid: false, error: err.message },
        { status: err.status }
      );
    }
    console.error('[ValidateToken] unexpected error:', err);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}