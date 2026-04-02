// src/features/iris/sub-features/intersite/utils/insert-ring-task-manager.ts
import { BaseTaskManager } from './base-task-manager';
export class InsertRingTask extends BaseTaskManager {
  protected readonly taskName = 'Insert Ring';
  protected readonly apiPath = '/api/iris/insert-ring';
  protected readonly defaultFilename = 'insert_ring_result.zip';
}
export type { TaskSubmitResult } from '@/core/types/task.types';