// src/app/api/iris/unsupervised/route.ts
import { createToolProxy, BACKEND_BASE } from '../_proxy-factory';
export const POST = createToolProxy(`${BACKEND_BASE}/intersite/unsupervised`, 'Unsupervised Algorithm');