# CLAUDE.md — Design Engineering Frontend

Dokumen ini berisi konteks proyek, hasil audit kode, dan panduan untuk Claude Code.

---

## Arsitektur Proyek

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Backend:** FastAPI di `http://10.89.12.54:8000` (IP resmi, jangan gunakan IP lain)
- **Auth:** Cookie-based (httpOnly), tidak ada token di sessionStorage/localStorage
- **Pattern:** Frontend adalah pure consumer API — tidak boleh ada business logic berat di frontend

### Struktur Folder

```
src/
├── app/
│   ├── (protected)/iris/         # Halaman fitur utama (auth required)
│   │   ├── (Intersite)/          # Tools intersite: insert-ring, polygon, supervised, dll
│   │   └── (Report)/             # Tools laporan: DRM, BOQ
│   ├── (public)/                 # Login, home, access-management, activity-log
│   └── api/                      # Route handlers (proxy ke FastAPI)
│       ├── auth/                 # Auth routes: login, users, modules, history
│       └── iris/                 # Tool routes: semua proxy ke FastAPI
├── features/iris/
│   ├── components/               # Header, Sidebar, HistoryPanel, ProgressLog, ModuleGuard, Logo
│   └── sub-features/intersite/
│       └── utils/                # Task manager classes
├── shared/
│   ├── context/                  # AuthContext, progress-context
│   ├── hooks/                    # useAuth, useAuthContext
│   └── services/                 # (kosong / minimal)
└── core/types/                   # task.types.ts, dll
```

---

## Backend & API

### URL Backend
- **Benar:** `http://10.89.12.54:8000`
- **Salah (lama):** `http://10.83.10.16:8000` — sudah diganti semua per April 2026

### Konfigurasi env yang digunakan di route handler:
```
BACKEND_URL=http://10.89.12.54:8000
```

### Pattern Proxy Route (pakai ini untuk route baru):
```ts
import { createToolProxy, BACKEND_BASE } from '../_proxy-factory';
export const POST = createToolProxy(`${BACKEND_BASE}/intersite/<endpoint>`, 'Nama Tool');
```

### Route yang masih pakai pattern lama (inline manual — belum dimigrasi):
- `src/app/api/iris/drm-intersite/route.ts`
- `src/app/api/iris/boq-intersite/route.ts`
- `src/app/api/iris/boq-mmp/route.ts`

---

## Audit Kode — April 2026

Hasil audit setelah beberapa kali refactor dari mock/local logic ke FastAPI.

### A. Dead Code yang Perlu Dihapus

| File | Alasan |
|------|--------|
| `src/shared/hooks/useModuleAccess.ts` | Tidak dipakai, endpoint `/api/auth/modules` tidak ada. Gunakan `hasAccess()` dari AuthContext |
| `src/shared/hooks/usePolling.ts` | Tidak dipakai di mana pun. BaseTaskManager sudah punya polling sendiri |

**Cara verifikasi sebelum hapus:**
```bash
grep -r "useModuleAccess\|usePolling" src/ --include="*.tsx" --include="*.ts"
```

### B. Duplikasi yang Perlu Direfaktor

#### Task Manager Classes (8 file hampir identik)
Setiap child class hanya mendefinisikan 3 property:
```
src/features/iris/sub-features/intersite/utils/
├── base-task-manager.ts                   # 479 baris — implementasi lengkap
├── insert-ring-task-manager.ts            # 7 baris
├── polygon-intersite-task-manager.ts      # 7 baris
├── supervised-task-manager.ts             # 7 baris
├── topology-task-manager.ts               # 7 baris
├── unsupervised-task-manager.ts           # 7 baris
├── fix-route-task-manager.ts              # 7 baris
└── implementation-intersite-task-manager.ts # 7 baris
```

**Rekomendasi:** Ganti 7 child class dengan factory function.

#### Status Normalization Duplikat
- `src/core/types/task.types.ts` — `CELERY_STATUS_MAP`
- `src/features/iris/sub-features/intersite/utils/base-task-manager.ts` — `normalizeStatus()`

Pastikan keduanya menggunakan mapping yang sama.

### C. Inkonsistensi yang Sudah Diperbaiki (April 2026)

- [x] IP `10.83.10.16` di `boq-intersite/route.ts` → `10.89.12.54`
- [x] IP `10.83.10.16` di `boq-mmp/route.ts` → `10.89.12.54`
- [x] IP `10.83.10.16` di `drm-intersite/route.ts` → `10.89.12.54`
- [x] IP `10.83.10.16` di semua `page.tsx` (9 file window.open) → `10.89.12.54`

### D. Hal yang Perlu Diperhatikan

#### localStorage di alur password reset
File berikut menggunakan localStorage untuk alur OTP/reset password:
- `src/app/(public)/forgot-password/page.tsx` — menulis `reset_email`
- `src/app/(public)/verify-otp/page.tsx` — baca/tulis `verified_otp`
- `src/app/(public)/reset-password/page.tsx` — baca `reset_email` & `verified_otp`

Pertimbangkan migrasi ke server-side session untuk keamanan lebih baik.

#### POST endpoint deprecated di history route
`src/app/api/auth/history/route.ts` — ada `export async function POST` yang dipertahankan untuk backward compatibility tapi sudah tidak dipakai. Bisa dihapus jika tidak ada consumer.

---

## Inventaris API Calls

Semua endpoint yang aktif dipanggil dari frontend:

| Frontend Route | FastAPI Endpoint | Keterangan |
|----------------|-----------------|------------|
| `/api/auth/login` | `POST /auth/login` | Authentication |
| `/api/auth/users` | `POST /auth/register` | User creation |
| `/api/auth/users/[nik]/modules` | `POST /modules/modules/auth/` | Module assignment |
| `/api/auth/activity-log` | `GET /projects/all-projects` | Project history |
| `/api/iris/tasks/status/[task_id]` | `GET /tasks/status/{task_id}` | Poll task progress |
| `/api/iris/insert-ring` | `POST /intersite/insert-ring` | Task submission |
| `/api/iris/fix-route` | `POST /intersite/fixroute` | Task submission |
| `/api/iris/polygon-intersite` | `POST /intersite/polygon-intersite` | Task submission |
| `/api/iris/implementation-intersite` | `POST /intersite/implementation-intersite` | Task submission |
| `/api/iris/supervised` | `POST /intersite/supervised` | Task submission |
| `/api/iris/unsupervised` | `POST /intersite/unsupervised` | Task submission |
| `/api/iris/topology-intersite` | `POST /intersite/topology-intersite` | Task submission |
| `/api/iris/drm-intersite` | `POST /report/drm-intersite` | Report generation |
| `/api/iris/boq-intersite` | `POST /report/boq-intersite` | Report generation |
| `/api/iris/boq-mmp` | `POST /report/boq-mmp` | Report generation |

---

## Prinsip Pengembangan

1. **Frontend = API consumer only.** Filtering, aggregation, dan business logic harus di FastAPI.
2. **Gunakan `_proxy-factory.ts`** untuk semua route handler baru — jangan buat inline proxy manual.
3. **Semua URL backend** harus melalui `process.env.BACKEND_URL` — tidak boleh hardcode IP.
4. **Auth** menggunakan cookie httpOnly — tidak boleh simpan token di localStorage/sessionStorage.
5. **Default values** di form harus sesuai dengan default parameter di FastAPI endpoint.
