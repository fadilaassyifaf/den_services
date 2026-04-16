import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/core/api/db';
import { verifyAdmin, AuthError } from '@/core/auth/verifyToken';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ nik: string }> }
) {
  try {
    await verifyAdmin(request);
    const { nik } = await context.params;

    const result = await query(
      `SELECT mi.id, mi.module_name, mi.module_group
       FROM module_information mi
       INNER JOIN module_auth ma ON mi.id = ma.module_id
       INNER JOIN users u ON ma.user_id = u.id
       WHERE u.nik = $1
       ORDER BY mi.id ASC`,
      [nik]
    );

    return NextResponse.json({ modules: result.rows });

  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[GetUserModules]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ nik: string }> }
) {
  try {
    await verifyAdmin(request);
    const { nik } = await context.params;
    const { moduleIds } = await request.json();

    if (!Array.isArray(moduleIds)) {
      return NextResponse.json(
        { error: 'moduleIds must be an array' },
        { status: 400 }
      );
    }

    // Ambil users.id dari DB
    const userResult = await query(
      'SELECT id FROM users WHERE nik = $1',
      [nik]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    // Step 1: Hapus semua module lama via DB
    await query('DELETE FROM module_auth WHERE user_id = $1', [userId]);

    // Step 2: Assign module baru via FastAPI (satu per satu)
    if (moduleIds.length > 0) {
      const token = request.cookies.get('auth-token')?.value;
      const backendUrl = process.env.BACKEND_URL;

      if (!backendUrl) {
        console.error('[UpdateUserModules] BACKEND_URL is not set');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      const results = await Promise.allSettled(
        moduleIds.map((moduleId: number) => {
          const body = new URLSearchParams({
            module_id: String(moduleId),
            user_id: String(userId),
          });

          return fetch(`${backendUrl}/modules/modules/auth/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Bearer ${token}`,
            },
            body: body.toString(),
          });
        })
      );

      // Log detail error per module jika ada yang gagal
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        console.error('[UpdateUserModules] Some modules failed to assign:', failed);
        return NextResponse.json(
          { error: `${failed.length} module(s) failed to assign` },
          { status: 207 }
        );
      }
    }

    return NextResponse.json({ message: 'Modules updated successfully' });

  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[UpdateUserModules]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}