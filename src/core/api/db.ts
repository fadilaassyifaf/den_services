// src/core/api/db.ts
import { Pool } from 'pg';


const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'login_system',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);

  // SOLUSI: Menggunakan rest parameter (...args: any[]) untuk menghindari error spread
  client.query = async (...args: any[]) => {
    const start = Date.now();
    try {
      // TypeScript sekarang mengizinkan spread karena tipe args didefinisikan eksplisit
      const res = await (originalQuery as any)(...args);
      const duration = Date.now() - start;
      console.log('Executed query', { duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  };

  const originalRelease = client.release.bind(client);
  client.release = () => {
    console.log('Client released back to pool');
    return originalRelease();
  };

  return client;
}

export default pool;