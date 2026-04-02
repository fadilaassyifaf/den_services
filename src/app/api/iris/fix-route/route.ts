// src/app/api/iris/fix-route/route.ts

import { createToolProxy, BACKEND_BASE } from '../_proxy-factory';

export const POST = createToolProxy(
  `${BACKEND_BASE}/intersite/fixroute`,
  'Fix Route'
);