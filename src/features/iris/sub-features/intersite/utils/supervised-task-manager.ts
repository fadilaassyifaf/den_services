// src/features/iris/sub-features/intersite/utils/supervised-task-manager.ts
import { BaseTaskManager } from './base-task-manager';
export class SupervisedTask extends BaseTaskManager {
  protected readonly taskName = 'Supervised Algorithm';
  protected readonly apiPath = '/api/iris/supervised';
  protected readonly defaultFilename = 'supervised_result.zip';
}
export type { TaskSubmitResult } from '@/core/types/task.types';