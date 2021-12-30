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
}
