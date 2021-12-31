import { ProjectRoadmapTaskEntity } from "../../ProjectRoadmapTask.entity";
import Gantt from "./Gantt";

/**
 * A Gantt Task is similar to an entry in the roadmap, whether it is an epic, feature, PBI
 * or task in Azure Boards.
 *
 * A gantt task can have children and be nested ina tree structure, however these fields must tie
 * back to DHTMLX Gantt.
 *
 * @see https://docs.dhtmlx.com/gantt/desktop__task_bars.html
 */
export class GanttTask {
  /**
   * An unique ID.
   */
  id: string = "";

  /**
   * The text to display for the task .
   */
  text: string = "Default Text";

  /**
   * The start date for a task or empty string if not defined.
   */
  start_date: string = "";

  /**
   * The end date for a task or empty string if not defined.
   */
  end_date: string = "";

  /**
   * The percentage of completeness for the task where 1 is completed and anything below 1 is treated as the percent.
   */
  progress: number = 0;

  /**
   * Whether this item is expanded in the display or not.
   */
  open: boolean = true;

  /**
   * The parent ID if this is a child task.
   */
  parent?: string = undefined;

  /**
   * The type of task.
   *
   * @see https://docs.dhtmlx.com/gantt/desktop__task_types.html
   */
  type: string = "";

  /**
   * Whether this task is scheduled or not.
   *
   * To be scheduled, both start_date and end_date must be defined.
   */
  unscheduled?: boolean = undefined;

  /**
   * Description of work item.
   */
  description: string = "";

  /**
   * Convert a ProjectRoadmapTaskEntity information to a Gantt Task.
   *
   * @param entity the object to convert
   * @returns a gantt task object
   */
  public static convert(entity: ProjectRoadmapTaskEntity): GanttTask {
    const instance = new GanttTask();
    instance.id = entity.id.toString();
    instance.text = entity.title;
    instance.type = "task";
    instance.progress = entity.progress / 100;
    instance.description = entity.description;

    if (entity.start && entity.end) {
      instance.start_date = Gantt.DATE_TO_STR(entity.start);
      instance.end_date = Gantt.DATE_TO_STR(entity.end);
    } else {
      instance.unscheduled = true;
    }

    if (entity.parent && entity.parent !== 0) {
      instance.parent = entity.parent.toString();
    }

    return instance;
  }
}
