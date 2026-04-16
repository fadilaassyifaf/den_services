import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/core/api/db';

// ── Types ─────────────────────────────────────────────────────────

interface FileRow {
  project_id:   number;
  filename:     string;
  storage_path: string;
}

// ── GET — ambil history task milik user berdasarkan NIK ───────────

export async function GET(request: NextRequest) {
  try {
    // ── Auth check ───────────────────────────────────────────────
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nik = request.nextUrl.searchParams.get('nik');
    if (!nik) {
      return NextResponse.json({ error: 'nik is required' }, { status: 400 });
    }

    // ── Step 1: Resolve user_id dari NIK ─────────────────────────
    // NIK disimpan di tabel users, project_information pakai user_id
    const userResult = await query(
      `SELECT id FROM users WHERE nik = $1 LIMIT 1`,
      [nik]
    );

    if (userResult.rows.length === 0) {
      // User tidak ditemukan — return array kosong, bukan error
      return NextResponse.json([]);
    }

    const userId = userResult.rows[0].id;

    // ── Step 2: Ambil projects milik user ─────────────────────────
    const projectResult = await query(
      `SELECT
         pi.id,
         pi.module_id,
         pi.status,
         pi.processing_time,
         pi.created_at,
         pi.updated_at,
         mi.module_name,
         mi.module_group
       FROM project_information pi
       JOIN module_information mi ON mi.id = pi.module_id
       WHERE pi.user_id = $1
       ORDER BY pi.created_at DESC
       LIMIT 50`,
      [userId]
    );

    const projects = projectResult.rows;
    if (projects.length === 0) {
      return NextResponse.json([]);
    }

    // ── Step 3: Ambil files per project (input + output) ──────────
    const projectIds = projects.map((p: { id: number }) => p.id);

    const fileResult = await query(
      `SELECT
         project_id,
         filename,
         storage_path,
         created_at
       FROM files
       WHERE project_id = ANY($1::int[])
       ORDER BY project_id, created_at ASC`,
      [projectIds]
    );

    // Group files by project_id
    const filesByProject = new Map<number, FileRow[]>();
    for (const f of fileResult.rows as FileRow[]) {
      const existing = filesByProject.get(f.project_id) ?? [];
      existing.push(f);
      filesByProject.set(f.project_id, existing);
    }

    // ── Step 4: Merge & normalize ke shape yang dibutuhkan HistoryPanel
    const normalized = projects.map((p: {
      id: number;
      module_id: number;
      status: string;
      processing_time: number | null;
      created_at: string;
      updated_at: string;
      module_name: string;
      module_group: string;
    }) => {
      const files      = filesByProject.get(p.id) ?? [];
      const inputFile  = files[0] ?? null;
      const outputFile = files.length > 1 ? files[files.length - 1] : null;

      return {
        id:              p.id,
        // task_name → module_name (yang dipakai HistoryPanel untuk display)
        task_name:       p.module_name,
        // filename → file input yang diupload user
        filename:        inputFile?.filename ?? `Project #${p.id}`,
        // Normalisasi status: FastAPI "success" → UI "completed"
        status:          p.status === 'success' ? 'completed' : p.status,
        // file_url → storage_path file output (untuk download)
        file_url:        outputFile?.storage_path ?? null,
        processing_time: p.processing_time,
        created_at:      p.created_at,
        // Extra fields — tersedia untuk future use
        module_group:    p.module_group,
        module_id:       p.module_id,
      };
    });

    return NextResponse.json(normalized);

  } catch (error) {
    console.error('[History GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST — tidak dipakai lagi (history sekarang dari DB langsung) ──
// Dipertahankan untuk backward compatibility jika ada yang masih hit endpoint ini

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_nik, task_name, filename, status, file_url } = body;

    if (!user_nik || !task_name) {
      return NextResponse.json(
        { error: 'user_nik and task_name are required' },
        { status: 400 }
      );
    }

    // Resolve user_id dari NIK
    const userResult = await query(
      `SELECT id FROM users WHERE nik = $1 LIMIT 1`,
      [String(user_nik)]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // POST sekarang hanya return success — data history dibaca dari project_information
    // Tidak perlu insert ke services_task yang sudah tidak ada
    console.info('[History POST] Deprecated — history now sourced from project_information');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[History POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}