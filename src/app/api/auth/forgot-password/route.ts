// app/api/forgot-password/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/core/api/db';
import { generateOTP, hashOTP } from '@/core/auth/auth';
import { sendOTPEmail } from '@/core/email/email';

const COOLDOWN_SECONDS = 30;
const MAX_REQUESTS_PER_HOUR = 3;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const result = await query(
      'SELECT nik, email, name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'If the email exists, OTP has been sent' },
        { status: 200 }
      );
    }

    const user = result.rows[0];

    // ✅ Cek anti-spam cooldown 30 detik
    const recentOtp = await query(
      `SELECT created_at FROM password_resets 
       WHERE user_nik = $1 
       AND created_at > NOW() - INTERVAL '${COOLDOWN_SECONDS} seconds'
       ORDER BY created_at DESC LIMIT 1`,
      [user.nik]
    );

    if (recentOtp.rows.length > 0) {
      return NextResponse.json(
        { error: `Please wait ${COOLDOWN_SECONDS} second(s) before requesting a new OTP` },
        { status: 429 }
      );
    }

    // ✅ Cek max request per jam
    const hourlyRequests = await query(
      `SELECT COUNT(*) FROM password_resets 
       WHERE user_nik = $1 
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [user.nik]
    );

    if (parseInt(hourlyRequests.rows[0].count) >= MAX_REQUESTS_PER_HOUR) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please try again in an hour.' },
        { status: 429 }
      );
    }

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);

    // ✅ OTP expired 30 detik
    const expiredAt = new Date();
    expiredAt.setSeconds(expiredAt.getSeconds() + 30);

    await query('DELETE FROM password_resets WHERE user_nik = $1', [user.nik]);
    await query(
      `INSERT INTO password_resets (user_nik, otp_hash, expired_at, is_used, attempt_count) 
       VALUES ($1, $2, $3, FALSE, 0)`,
      [user.nik, otpHash, expiredAt]
    );

    // ✅ Opsi 1: Log OTP ke console jika email gagal
    try {
      await sendOTPEmail(user.email, otp);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);

      if (process.env.NODE_ENV === 'development') {
        console.log('=====================================');
        console.log('⚠️  DEV MODE - OTP for', user.email);
        console.log('🔑 OTP:', otp);
        console.log('⏰ Expired at:', expiredAt);
        console.log('=====================================');

        return NextResponse.json(
          { message: 'If the email exists, OTP has been sent' },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to send OTP email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'If the email exists, OTP has been sent' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}