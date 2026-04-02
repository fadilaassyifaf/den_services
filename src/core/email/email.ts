// lib/email.ts
// Helper untuk kirim email

import nodemailer from 'nodemailer';

/**
 * Kirim email OTP untuk reset password
 * @param to - Email tujuan
 * @param otp - OTP 4 digit
 */
export async function sendOTPEmail(to: string, otp: string): Promise<void> {
  // Buat transporter (koneksi ke email server)
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false, // true untuk port 465, false untuk port 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Email content
  const mailOptions = {
    from: `"Login System" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: 'Reset Password OTP',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
          }
          .otp-box {
            background-color: #f4f4f4;
            padding: 20px;
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 10px;
            margin: 20px 0;
            border-radius: 8px;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Reset Password Request</h2>
          <p>Anda menerima email ini karena ada permintaan reset password untuk akun Anda.</p>
          <p>Gunakan kode OTP berikut untuk reset password:</p>
          
          <div class="otp-box">${otp}</div>
          
          <p>Kode OTP ini akan expired dalam <strong>10 menit</strong>.</p>
          <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
          
          <div class="footer">
            <p>Email ini dikirim otomatis, mohon tidak membalas.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    // Kirim email
    await transporter.sendMail(mailOptions);
    console.log('OTP email sent to:', to);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send OTP email');
  }
}