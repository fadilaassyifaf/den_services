// generate-hash.ts
// Generate password hash untuk insert ke database

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { hashPassword } from './lib/auth.js';

async function generateHash() {
  const password = 'password123';
  const hash = await hashPassword(password);
  
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\n=== Copy SQL ini ke pgAdmin ===');
  console.log(`
INSERT INTO users (nik, email, name, password_hash, role) 
VALUES 
(1234567890, 'admin@example.com', 'Admin User', '${hash}', 'admin'),
(9876543210, 'user@example.com', 'Regular User', '${hash}', 'user')
ON CONFLICT (nik) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW();
  `);
}

generateHash();