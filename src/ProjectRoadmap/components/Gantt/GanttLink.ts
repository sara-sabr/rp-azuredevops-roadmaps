import { ProjectRoadmapTaskEntity } from "../../ProjectRoadmapTask.entity";

/**
 * Gantt Links are refrences to relationships where we have predecessor "source" must
 * happen before successfor "target".
 */
export class GanttLink {
  /**
   * Unique ID for a GanttLink
   */
  id: string = "";

  /**
   * The predecessor ID.
   */
  source: string = "";

  /**
   * The successor ID.
   */
  target: string = "";

  /**
   * Assume finish to start.
   *
   * @see https://docs.dhtmlx.com/gantt/api__gantt_links_config.html
   */
  type: string = "0";

  /**
   * Create the relationships for Gantt.
   *
   * @param entity the eneity
   * @returns an array of relationships
   */
  public static convert(entity: ProjectRoadmapTaskEntity): GanttLink[] {
    const relations: GanttLink[] = [];
    let r: GanttLink;

    if (entity.predecessor && entity.predecessor.length > 0) {
      for (let predcessor of entity.predecessor) {
        r = new GanttLink();
        r.id = predcessor + "-" + entity.id;
        r.source = predcessor.toString();
        r.target = entity.id.toString();
        relations.push(r);
      }
    }

    return relations;
  }
}
