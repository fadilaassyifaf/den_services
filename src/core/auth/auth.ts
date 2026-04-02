import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// ============================================
// OTP — masih dipakai untuk forgot password
// ============================================

export function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function hashOTP(otp: string): Promise<string> {
  return await bcrypt.hash(otp, 10);
}

export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(otp, hash);
}