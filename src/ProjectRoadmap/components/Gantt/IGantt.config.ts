import { DisplayInterval } from "../../DisplayInterval.enum";
import { GanttLink } from "./GanttLink";
import { GanttTask } from "./GanttTask";

/**
 * Configuration for the Gantt.
 */
export interface IGanttConfig {
  /**
   * Defined what unit of measurement is currently displayed on the Gantt chart.
   */
  unit: DisplayInterval;

  /**
   * The data for a given Gantt chart.
   */
  data: { tasks: GanttTask[]; links: GanttLink[] };
}
