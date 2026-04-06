import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/core/api/db';
import { verifyOTP } from '@/core/auth/auth';

const MAX_ATTEMPTS = 3;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    const userResult = await query(
      'SELECT nik, email FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    const user = userResult.rows[0];

    // ✅ Ambil OTP aktif (belum expired, belum dipakai)
    const otpResult = await query(
      `SELECT id, otp_hash, expired_at, attempt_count, is_used 
       FROM password_resets 
       WHERE user_nik = $1 
         AND expired_at > NOW() 
         AND is_used = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );

    if (otpResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'OTP not found or has expired. Please request a new one.' },
        { status: 404 }
      );
    }

    const otpData = otpResult.rows[0];

    // ✅ Cek apakah sudah melebihi max percobaan
    if (otpData.attempt_count >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'OTP has been locked due to too many failed attempts. Please request a new one.' },
        { status: 429 }
      );
    }

    const isOTPValid = await verifyOTP(otp, otpData.otp_hash);

    if (!isOTPValid) {
      // ✅ Increment attempt_count
      const newAttemptCount = otpData.attempt_count + 1;
      const remainingAttempts = MAX_ATTEMPTS - newAttemptCount;

      await query(
        'UPDATE password_resets SET attempt_count = $1 WHERE id = $2',
        [newAttemptCount, otpData.id]
      );

      if (remainingAttempts <= 0) {
        return NextResponse.json(
          { error: 'OTP locked. You have exceeded the maximum attempts. Please request a new OTP.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { 
          error: 'Invalid OTP',
          remainingAttempts,
        },
        { status: 401 }
      );
    }

    // ✅ OTP valid → tandai sebagai sudah dipakai
    await query(
      'UPDATE password_resets SET is_used = TRUE WHERE id = $1',
      [otpData.id]
    );

    return NextResponse.json(
      { message: 'OTP verified successfully', email: user.email },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}