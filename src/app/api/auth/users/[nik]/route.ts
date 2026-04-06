import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/core/api/db';
import { verifyAdmin, AuthError } from '@/core/auth/verifyToken';
import { fetchFastAPI } from '@/core/api/fastapi';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nik: string }> }
) {
  try {
    await verifyAdmin(request);
    const { nik } = await params;

    const result = await query(
      `SELECT
         u.id, u.nik, u.username, u.fullname AS name, u.email, u.role, u.department,
         COALESCE(
           json_agg(
             json_build_object('id', mi.id, 'module_name', mi.module_name)
           ) FILTER (WHERE mi.id IS NOT NULL),
           '[]'
         ) AS modules
       FROM users u
       LEFT JOIN module_auth ma ON u.id = ma.user_id
       LEFT JOIN module_information mi ON ma.module_id = mi.id
       WHERE u.nik = $1
       GROUP BY u.id, u.nik, u.username, u.fullname, u.email, u.role, u.department`,
      [nik]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: result.rows[0] });

  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[GetUser]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ nik: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await verifyAdmin(request);
    const { nik } = await params;
    const { name, email, role, password, moduleIds } = await request.json();

    if (!name || !email || !role || !Array.isArray(moduleIds)) {
      return NextResponse.json(
        { error: 'name, email, role, and moduleIds are required' },
        { status: 400 }
      );
    }

    // ── Ambil username dan users.id dari DB ──────────────────────────────────
    const userResult = await query(
      'SELECT id, username FROM users WHERE nik = $1',
      [nik]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id: userId, username } = userResult.rows[0];

    // ── Step 1: Update profile via FastAPI ───────────────────────────────────
    const fastapiBody: Record<string, string | number> = {
      username,
      fullname: name,
      role,
    };
    if (password) fastapiBody.password = password;

    const updateRes = await fetchFastAPI('/users/update-user', {
      method: 'POST',
      token,
      body: fastapiBody,
    });

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.detail ?? 'Failed to update user' },
        { status: updateRes.status }
      );
    }

    // ── Step 2: Update email di DB ───────────────────────────────────────────
    // Email tidak di-handle FastAPI, jadi update langsung ke DB
    try {
      await query('UPDATE users SET email = $1 WHERE id = $2', [email, userId]);
    } catch (err: any) {
      if (err.code === '23505') {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }
      throw err;
    }

    // ── Step 3: Replace modules via FastAPI ──────────────────────────────────
    const backendUrl = process.env.BACKEND_URL;

    if (!backendUrl) {
      console.error('[UpdateUser] BACKEND_URL is not set');
      return NextResponse.json(
        { message: 'User updated but modules could not be assigned: server config error' },
        { status: 207 }
      );
    }

    // Hapus semua module lama via DB
    await query('DELETE FROM module_auth WHERE user_id = $1', [userId]);

    // Assign module baru via FastAPI
    if (moduleIds.length > 0) {
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

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        console.error('[UpdateUser] Some modules failed to assign:', failed);
        return NextResponse.json(
          { message: `User updated but ${failed.length} module(s) failed to assign` },
          { status: 207 }
        );
      }
    }

    return NextResponse.json({ message: 'User updated successfully' });

  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[UpdateUser]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ nik: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await verifyAdmin(request);
    const { nik } = await params;

    const userResult = await query(
      'SELECT username FROM users WHERE nik = $1',
      [nik]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { username } = userResult.rows[0];

    // FastAPI handle cascade delete di sisinya
    const deleteRes = await fetchFastAPI('/users/delete-user', {
      method: 'POST',
      token,
      body: { username },
    });

    if (!deleteRes.ok) {
      const err = await deleteRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.detail ?? 'Failed to delete user' },
        { status: deleteRes.status }
      );
    }

    return NextResponse.json({ message: 'User deleted successfully' });

  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[DeleteUser]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}