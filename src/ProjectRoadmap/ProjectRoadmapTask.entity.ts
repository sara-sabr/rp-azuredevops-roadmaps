import { TaskEnum } from "./Task.enum";
import { WorkItemBaseEntity, Constants } from "@esdc-it-rp/azuredevops-common";
import { WorkItem } from "azure-devops-extension-api/WorkItemTracking";

/**
 * Represents a project/task/milestone.
 */
export class ProjectRoadmapTaskEntity extends WorkItemBaseEntity {
  /**
   * Start date.
   */
  start: Date = new Date();

  /**
   * Finish date.
   */
  end: Date = new Date();

  /**
   * Progress of completion in percent.
   */
  progress: number = 0;

  /**
   * The EPIC ID.
   */
  project?: string;

  /**
   * The dependencies.
   */
  dependencies: string[] = [];

  /**
   * The children.
   */
  hideChildren: boolean = false;

  /**
   * Is disabled.
   */
  isDisabled: boolean = false;

  /**
   * Hidden from view.
   */
  hide: boolean = false;

  /**
   * The Work Item state .
   */
  state: string = "";

  /**
   * The area path.
   */
  areaPath: string = "";

  /**
   * Work item description.
   */
  description: string = "";

  /**
   * Current task is a forcast and may be inaccurate.
   */
  forcast: boolean = false;

  /**
   * Current task didn't have a start/end date defined, therefore this becomes derived.
   */
  calculatedDates: boolean = false;

  /**
   * @inheritdoc
   */
  public populateFromWorkItem(workItem: WorkItem): void {
    super.populateFromWorkItem(workItem);
    this.start = workItem.fields[Constants.WIT_FIELD_START_DATE];
    this.end = workItem.fields[Constants.WIT_FIELD_FINISH_DATE];
    this.state = workItem.fields[Constants.WIT_FIELD_STATE];
    this.areaPath = workItem.fields[Constants.WIT_FIELD_AREA_PATH];
    this.description = workItem.fields[Constants.WIT_FIELD_DESCRIPTION];
  }
}
