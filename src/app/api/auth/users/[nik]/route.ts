import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/core/api/db';
import bcrypt from 'bcryptjs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nik: string }> }
) {
  try {
    const { nik } = await params;

    const result = await query(
      `SELECT u.nik, u.name, u.email, u.role,
        COALESCE(
          json_agg(
            json_build_object('id', m.id, 'module_name', m.module_name)
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'
        ) as modules
      FROM users u
      LEFT JOIN user_modules um ON u.nik = um.user_nik
      LEFT JOIN modules m ON um.module_id = m.id
      WHERE u.nik = $1
      GROUP BY u.nik, u.name, u.email, u.role`,
      [nik]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ nik: string }> }
) {
  try {
    const { nik } = await params;
    const { name, email, role, password } = await request.json();

    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      await query(
        `UPDATE users 
         SET name = $1, email = $2, role = $3, password_hash = $4, updated_at = NOW() 
         WHERE nik = $5`,
        [name, email, role, password_hash, nik]
      );
    } else {
      await query(
        `UPDATE users 
         SET name = $1, email = $2, role = $3, updated_at = NOW() 
         WHERE nik = $4`,
        [name, email, role, nik]
      );
    }

    return NextResponse.json({ message: 'User updated successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Update user error:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ nik: string }> }
) {
  try {
    const { nik } = await params;

    // Hapus modules dulu karena ada foreign key
    await query('DELETE FROM user_modules WHERE user_nik = $1', [nik]);
    await query('DELETE FROM sessions WHERE user_nik = $1', [nik]);
    await query('DELETE FROM users WHERE nik = $1', [nik]);

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}