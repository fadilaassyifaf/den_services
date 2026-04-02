// src/features/iris/sub-features/intersite/utils/unsupervised-task-manager.ts
import { BaseTaskManager } from './base-task-manager';
export class UnsupervisedTask extends BaseTaskManager {
  protected readonly taskName = 'Unsupervised Algorithm';
  protected readonly apiPath = '/api/iris/unsupervised';
  protected readonly defaultFilename = 'unsupervised_result.zip';
}
export type { TaskSubmitResult } from '@/core/types/task.types';