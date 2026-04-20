import { BaseTaskManager } from './base-task-manager';
export class ShortMmpTask extends BaseTaskManager {
  protected readonly taskName = 'Short MMP';
  protected readonly apiPath = '/api/iris/short-mmp';
  protected readonly defaultFilename = 'short_mmp_result.zip';
}
export type { TaskSubmitResult } from '@/core/types/task.types';
