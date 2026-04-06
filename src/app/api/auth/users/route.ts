import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/core/api/db';
import { verifyAdmin, AuthError } from '@/core/auth/verifyToken';
import { fetchFastAPI } from '@/core/api/fastapi';

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const result = await query(
      `SELECT
         u.id,
         u.nik,
         u.username,
         u.fullname  AS name,
         u.email,
         u.role,
         u.department,
         COALESCE(
           json_agg(
             json_build_object('id', mi.id, 'module_name', mi.module_name)
           ) FILTER (WHERE mi.id IS NOT NULL),
           '[]'
         ) AS modules
       FROM users u
       LEFT JOIN module_auth ma ON u.id = ma.user_id
       LEFT JOIN module_information mi ON ma.module_id = mi.id
       GROUP BY u.id, u.nik, u.username, u.fullname, u.email, u.role, u.department
       ORDER BY u.fullname ASC`
    );

    return NextResponse.json({ users: result.rows });

  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[GetUsers]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await verifyAdmin(request);

    const { username, nik, email, name, password, role, department, moduleIds } =
      await request.json();

    if (!username || !nik || !email || !name || !password || !department) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ── Step 1: Register via FastAPI ────────────────────────────────────────
    const registerRes = await fetchFastAPI('/auth/register', {
      method: 'POST',
      token,
      body: {
        username,
        password,
        nik,
        fullname: name,
        email,
        department,
        role: role ?? 'user',
      },
    });

    if (!registerRes.ok) {
      const err = await registerRes.json().catch(() => ({}));
      if (registerRes.status === 400) {
        return NextResponse.json(
          { error: err.detail ?? 'Username or NIK already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: err.detail ?? 'Failed to register user' },
        { status: registerRes.status }
      );
    }

    // ── Step 2: Assign modules via FastAPI ──────────────────────────────────
    if (Array.isArray(moduleIds) && moduleIds.length > 0) {
      const newUser = await query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (newUser.rows.length > 0) {
        const userId = newUser.rows[0].id;
        const backendUrl = process.env.BACKEND_URL;

        if (!backendUrl) {
          console.error('[CreateUser] BACKEND_URL is not set');
          // User sudah terbuat, tapi modules gagal — return warning
          return NextResponse.json(
            { message: 'User created but modules could not be assigned: server config error' },
            { status: 207 }
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

        const failed = results.filter((r) => r.status === 'rejected');
        if (failed.length > 0) {
          console.error('[CreateUser] Some modules failed to assign:', failed);
          // User sudah terbuat, sebagian modules gagal — return warning
          return NextResponse.json(
            { message: `User created but ${failed.length} module(s) failed to assign` },
            { status: 207 }
          );
        }
      }
    }

    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });

  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[CreateUser]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}