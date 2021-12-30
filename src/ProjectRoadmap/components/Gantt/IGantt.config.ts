import { DisplayInterval } from "../../DisplayInterval.enum";
import { GanttLink } from "./GanttLink";
import { GanttTask } from "./GanttTask";

/**
 * Configuration for the Gantt.
 */
export interface IGanttConfig {
  unit: DisplayInterval;
  data: { tasks: GanttTask[]; links: GanttLink[] };
}
