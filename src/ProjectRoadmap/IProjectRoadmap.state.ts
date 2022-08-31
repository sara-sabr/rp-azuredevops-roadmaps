import { IGanttConfig } from "./components/Gantt/IGantt.config";
import { ProjectRoadmapTaskEntity } from "./ProjectRoadmapTask.entity";

/**
 * Used by the project reoadmap.
 */
export interface IProjectRoadmap {
  /**
   * The current user's display name.
   */
  userDisplayName?: string;

  /**
   * What will be displayed ont he screen.
   */
  roadmap: ProjectRoadmapTaskEntity[];

  /**
   * The gantt configuration including the data.
   */
  ganttConfig: IGanttConfig;

  /**
   * Retreive the data based on now (undefined) or as of a given date.
   */
  asOf: Date | undefined;

  /**
   * Query only work items that have been changed after this date.
   */
  modifiedAfter: Date | undefined;

  /**
   * True if the roadmap for the project is properly configured.
   */
  isProperlyConfigured: boolean;
}
