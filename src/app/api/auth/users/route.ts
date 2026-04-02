import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/core/api/db';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const result = await query(`
      SELECT u.nik, u.name, u.email, u.role,
        COALESCE(
          json_agg(
            json_build_object('id', m.id, 'module_name', m.module_name)
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'
        ) as modules
      FROM users u
      LEFT JOIN user_modules um ON u.nik = um.user_nik
      LEFT JOIN modules m ON um.module_id = m.id
      GROUP BY u.nik, u.name, u.email, u.role
      ORDER BY u.name ASC
    `);

    return NextResponse.json({ users: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nik, name, email, password, role, moduleIds } = await request.json();

    // Gunakan password_hash sesuai schema database
    const password_hash = await bcrypt.hash(password, 10);

    await query(
      'INSERT INTO users (nik, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
      [nik, name, email, password_hash, role]
    );

    if (moduleIds && moduleIds.length > 0) {
      for (const moduleId of moduleIds) {
        await query(
          'INSERT INTO user_modules (user_nik, module_id) VALUES ($1, $2)',
          [nik, moduleId]
        );
      }
    }

    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Create user error:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'NIK or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}