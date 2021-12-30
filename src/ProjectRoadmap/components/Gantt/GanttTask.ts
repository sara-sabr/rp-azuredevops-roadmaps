import { gantt } from "dhtmlx-gantt";
import { ProjectRoadmapTaskEntity } from "../../ProjectRoadmapTask.entity";
import Gantt from "./Gantt";

export class GanttTask {
  id: string = "";
  text: string = "Default Text";
  start_date: string = "";
  end_date: string = "";
  progress: number = 0;
  open: boolean = true;
  parent?: string = undefined;
  type: string = "";
  unscheduled?: boolean = undefined;

  public static convert(entity: ProjectRoadmapTaskEntity): GanttTask {
    const instance = new GanttTask();
    instance.id = entity.id.toString();
    instance.text = entity.title;
    instance.type = "task";
    instance.progress = entity.progress / 100;

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
