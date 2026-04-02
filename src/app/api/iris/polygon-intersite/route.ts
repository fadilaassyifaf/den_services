// src/app/api/iris/polygon-intersite/route.ts
import { createToolProxy, BACKEND_BASE } from '../_proxy-factory';
export const POST = createToolProxy(`${BACKEND_BASE}/intersite/polygon-intersite`, 'Polygon Intersite');