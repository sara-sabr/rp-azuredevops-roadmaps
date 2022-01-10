import tinycolor2 from "tinycolor2";
import { WorkItemProcessService } from "@esdc-it-rp/azuredevops-common";
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
   * Cache color calculations.
   */
  private static colorMap: Map<string, string> = new Map();

  /**
   * An unique ID.
   *
   * Do not rename as tied to DHTML Gantt.
   */
  id: string = "";

  /**
   * The text to display for the task .
   *
   * Do not rename as tied to DHTML Gantt.
   */
  text: string = "Default Text";

  /**
   * The start date for a task or empty string if not defined.
   *
   * Do not rename as tied to DHTML Gantt.
   */
  start_date: string = "";

  /**
   * The end date for a task or empty string if not defined.
   *
   * Do not rename as tied to DHTML Gantt.
   */
  end_date: string = "";

  /**
   * The percentage of completeness for the task where 1 is completed and anything below 1 is treated as the percent.
   *
   * Do not rename as tied to DHTML Gantt.
   */
  progress: number = 0;

  /**
   * Whether this item is expanded in the display or not.
   *
   * Do not rename as tied to DHTML Gantt.
   */
  open: boolean = true;

  /**
   * The parent ID if this is a child task.
   *
   * Do not rename as tied to DHTML Gantt.
   */
  parent?: string = undefined;

  /**
   * The type of task.
   *
   * @see https://docs.dhtmlx.com/gantt/desktop__task_types.html
   *
   * Do not rename as tied to DHTML Gantt.
   */
  type: string = "";

  /**
   * The actual type in Azure (PBI, Epic, etc...)
   */
  azureType: string = "";

  /**
   * Whether this task is scheduled or not.
   *
   * To be scheduled, both start_date and end_date must be defined.
   *
   * Do not rename as tied to DHTML Gantt.
   */
  unscheduled?: boolean = undefined;

  /**
   * Description of work item.
   */
  description: string = "";

  /**
   * Current task is a forcast and may be inaccurate.
   */
  forcast: boolean = false;

  /**
   * Current task didn't have a start date defined, therefore this becomes derived.
   */
  calculatedStart: boolean = false;

  /**
   * Current task didn't have an end date defined, therefore this becomes derived.
   */
  calculatedEnd: boolean = false;

  /**
   * Current task state.
   */
  state: string = "";

  /**
   * The background color if set, otherwise default.
   *
   * Valid colors:
   * - #FF0000
   * - red
   * - rgb(255,0,0)
   *
   * Do not rename as tied to DHTML Gantt.
   */
  color: string | undefined;

  /**
   * The background progress color if set, otherwise default.
   * Valid colors:
   * - #FF0000
   * - red
   * - rgb(255,0,0)
   *
   * Do not rename as tied to DHTML Gantt.
   */
  progressColor: string | undefined;

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
    instance.azureType = entity.type;
    instance.progress = entity.progress / 100;
    instance.description = entity.description;
    instance.forcast = entity.forcast;
    instance.calculatedStart = entity.calculatedStart;
    instance.calculatedEnd = entity.calculatedEnd;
    instance.state = entity.state;

    if (entity.start && entity.end) {
      instance.start_date = Gantt.DATE_TO_STR(entity.start);
      instance.end_date = Gantt.DATE_TO_STR(entity.end);
    } else {
      instance.unscheduled = true;
    }

    if (entity.parent && entity.parent !== 0) {
      instance.parent = entity.parent.toString();
    }

    // Intentionally flipping colors as we want the fully completed to be the
    // work item color.
    instance.progressColor =
      WorkItemProcessService.getCachedWorkItemTypes().get(entity.type)?.color;

    if (instance.progressColor) {
      if (!this.colorMap.has(instance.progressColor)) {
        const lighter = tinycolor2(instance.progressColor);
        this.colorMap.set(
          instance.progressColor,
          lighter.brighten(20).toHexString()
        );
      }

      instance.color = this.colorMap.get(instance.progressColor);
    }

    return instance;
  }
}
