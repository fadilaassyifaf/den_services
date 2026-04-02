// src/features/iris/sub-features/intersite/utils/topology-intersite-task-manager.ts
import { BaseTaskManager } from './base-task-manager';
export class TopologyIntersiteTask extends BaseTaskManager {
  protected readonly taskName = 'Topology Intersite';
  protected readonly apiPath = '/api/iris/topology-intersite';
  protected readonly defaultFilename = 'topology_intersite_result.zip';
}
export type { TaskSubmitResult } from '@/core/types/task.types';