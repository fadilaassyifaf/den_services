// src/features/iris/sub-features/intersite/utils/fix-route-task-manager.ts
import { BaseTaskManager } from './base-task-manager';
export class FixRouteTask extends BaseTaskManager {
  protected readonly taskName = 'Fixroute Ring';
  protected readonly apiPath = '/api/iris/fix-route';
  protected readonly defaultFilename = 'fixroute_result.zip';
}
export type { TaskSubmitResult } from '@/core/types/task.types';