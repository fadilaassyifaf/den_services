// src/app/api/iris/topology-intersite/route.ts
import { createToolProxy, BACKEND_BASE } from '../_proxy-factory';
export const POST = createToolProxy(`${BACKEND_BASE}/intersite/topology-intersite`, 'Topology Intersite');