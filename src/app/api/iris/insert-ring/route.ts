// src/app/api/iris/insert-ring/route.ts
import { createToolProxy, BACKEND_BASE } from '../_proxy-factory';
export const POST = createToolProxy(`${BACKEND_BASE}/intersite/insert-ring`, 'Insert Ring');