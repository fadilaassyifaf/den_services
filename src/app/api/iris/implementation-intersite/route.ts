// src/app/api/iris/implementation-intersite/route.ts
import { createToolProxy, BACKEND_BASE } from '../_proxy-factory';
export const POST = createToolProxy(`${BACKEND_BASE}/intersite/implementation-intersite`, 'Implementation Intersite');


