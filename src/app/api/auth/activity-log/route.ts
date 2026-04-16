import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/core/api/db';

const FASTAPI_BASE = process.env.FASTAPI_URL ?? 'http://10.89.12.54:8000';

// ── Types ─────────────────────────────────────────────────────────

interface FastAPIProject {
  id:              number;
  status:          string;
  created_at:      string;
  user_id:         number;
  module_id:       number;
  processing_time: number | null;
  updated_at:      string;
}

interface UserRow {
  id:       number;
  username: string;
  fullname: string;
}

interface FileRow {
  project_id:   number;
  filename:     string;
  extension:    string;
  storage_path: string;
  created_at:   string;
}

interface ModuleRow {
  id:           number;
  module_name:  string;
  module_group: string;
}

// ── Helper ────────────────────────────────────────────────────────

async function fetchFastAPIInternal<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${FASTAPI_BASE}${path}`, {
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FastAPI ${path} failed [${res.status}]: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── Route Handler ─────────────────────────────────────────────────

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 1. Fetch projects dari FastAPI ────────────────────────────
    const projectsData = await fetchFastAPIInternal<{ projects: FastAPIProject[] }>(
      '/projects/all-projects?offset=0&limit=10000',
      token
    );

    const projects = projectsData?.projects ?? [];
    if (projects.length === 0) {
      return NextResponse.json([]);
    }

    const projectIds   = projects.map((p) => p.id);
    const uniqueUserIds = [...new Set(projects.map((p) => p.user_id))];
    const uniqueModuleIds = [...new Set(projects.map((p) => p.module_id))];

    // ── 2. Parallel DB enrichment ─────────────────────────────────
    // Query users, modules, dan files sekaligus — tidak sequential
    const [userResult, moduleResult, fileResult] = await Promise.all([
      // User info
      query(
        `SELECT id, username, fullname
         FROM users
         WHERE id = ANY($1::int[])`,
        [uniqueUserIds]
      ),

      // Module info (nama + group)
      query(
        `SELECT id, module_name, module_group
         FROM module_information
         WHERE id = ANY($1::int[])`,
        [uniqueModuleIds]
      ),

      // Files per project — ambil semua file, nanti dipisah per project
      // extension dipakai untuk bedakan input vs output
      query(
        `SELECT
           project_id,
           filename,
           extension,
           storage_path,
           created_at
         FROM files
         WHERE project_id = ANY($1::int[])
         ORDER BY project_id, created_at ASC`,
        [projectIds]
      ),
    ]);

    // ── 3. Build lookup maps ──────────────────────────────────────

    const userMap = new Map<number, UserRow>(
      userResult.rows.map((u: UserRow) => [u.id, u])
    );

    const moduleMap = new Map<number, ModuleRow>(
      moduleResult.rows.map((m: ModuleRow) => [m.id, m])
    );

    // Group files by project_id
    // Asumsi: file pertama = input, file terakhir = output (hasil processing)
    const filesByProject = new Map<number, FileRow[]>();
    for (const f of fileResult.rows as FileRow[]) {
      const existing = filesByProject.get(f.project_id) ?? [];
      existing.push(f);
      filesByProject.set(f.project_id, existing);
    }

    // ── 4. Merge semua data ───────────────────────────────────────

    const normalized = projects.map((p) => {
      const user   = userMap.get(p.user_id);
      const module = moduleMap.get(p.module_id);
      const files  = filesByProject.get(p.id) ?? [];

      // Pisahkan file input dan output berdasarkan posisi/urutan
      // Input  = file yang diupload user (pertama, biasanya .zip/.csv/dll)
      // Output = file hasil processing (terakhir, biasanya .zip/.xlsx/dll)
      const inputFile  = files[0] ?? null;
      const outputFile = files.length > 1 ? files[files.length - 1] : null;

      return {
        id:              p.id,
        user_id:         p.user_id,
        username:        user?.username ?? `user_${p.user_id}`,
        fullname:        user?.fullname ?? `User ${p.user_id}`,
        service_name:    module?.module_name  ?? `Module ${p.module_id}`,
        service_router:  module?.module_group ?? `module/${p.module_id}`,
        status:          p.status === 'success' ? 'completed' : p.status,

        // ── File input ──────────────────────────────────────────
        upload_file:      inputFile?.filename     ?? '',
        upload_file_path: inputFile?.storage_path ?? null,
        upload_extension: inputFile?.extension    ?? null,

        // ── File output / hasil ─────────────────────────────────
        result_path:      outputFile?.storage_path ?? null,
        result_filename:  outputFile?.filename     ?? null,
        result_extension: outputFile?.extension    ?? null,

        processing_time: p.processing_time,
        created_at:      p.created_at,
        updated_at:      p.updated_at,
        module_id:       p.module_id,
      };
    });

    return NextResponse.json(normalized);

  } catch (error) {
    console.error('[ActivityLog GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}