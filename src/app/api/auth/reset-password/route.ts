// app/api/reset-password/route.ts
// API endpoint untuk reset password

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/core/api/db';
import { verifyOTP, hashPassword } from '@/core/auth/auth';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { email, otp, newPassword } = body;

    // 2. Validasi input
    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: 'Email, OTP, and new password are required' },
        { status: 400 }
      );
    }

    // Validasi panjang password
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // 3. Cari user berdasarkan email
    const userResult = await query(
      'SELECT nik, email FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // 4. Cari OTP yang masih valid
    const otpResult = await query(
      'SELECT id, otp_hash, expired_at FROM password_resets WHERE user_nik = $1 AND expired_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [user.id]
    );

    if (otpResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'OTP not found or has expired. Please request a new one.' },
        { status: 404 }
      );
    }

    const otpData = otpResult.rows[0];

    // 5. Verify OTP (double check)
    const isOTPValid = await verifyOTP(otp, otpData.otp_hash);

    if (!isOTPValid) {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 401 }
      );
    }

    // 6. Hash password baru
    const newPasswordHash = await hashPassword(newPassword);

    // 7. Update password di database
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE nik = $2',
      [newPasswordHash, user.id]
    );

    // 8. Hapus OTP dari database (sudah digunakan)
    await query(
      'DELETE FROM password_resets WHERE user_nik = $1',
      [user.id]
    );

    // 9. Opsional: Hapus semua session lama (logout dari semua device)
    await query(
      'DELETE FROM sessions WHERE user_nik = $1',
      [user.id]
    );

    // 10. Return success
    return NextResponse.json(
      {
        message: 'Password has been reset successfully',
        email: user.email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}