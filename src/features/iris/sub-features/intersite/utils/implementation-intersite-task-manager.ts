// src/features/iris/sub-features/intersite/utils/implementation-intersite-task-manager.ts
import { BaseTaskManager } from './base-task-manager';
export class ImplementationIntersiteTask extends BaseTaskManager {
  protected readonly taskName = 'Implementation Intersite';
  protected readonly apiPath = '/api/iris/implementation-intersite';
  protected readonly defaultFilename = 'implementation_intersite_result.zip';
}
export type { TaskSubmitResult } from '@/core/types/task.types';