import { createToolProxy, BACKEND_BASE } from '../_proxy-factory';

export const POST = createToolProxy(
  `${BACKEND_BASE}/intersite/short-mmp`,
  'Short MMP'
);
