// src/features/iris/sub-features/intersite/utils/polygon-intersite-task-manager.ts
import { BaseTaskManager } from './base-task-manager';
export class PolygonIntersiteTask extends BaseTaskManager {
  protected readonly taskName = 'Polygon Intersite';
  protected readonly apiPath = '/api/iris/polygon-intersite';
  protected readonly defaultFilename = 'polygon_intersite_result.zip';
}
export type { TaskSubmitResult } from '@/core/types/task.types';