// src/app/api/iris/supervised/route.ts
import { createToolProxy, BACKEND_BASE } from '../_proxy-factory';
export const POST = createToolProxy(`${BACKEND_BASE}/intersite/supervised`, 'Supervised Algorithm');