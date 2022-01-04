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
}
