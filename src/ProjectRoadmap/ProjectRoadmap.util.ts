/**
 * Project roadmap utilities.
 */
export class ProjectRoadmapUtil {
  /**
   * Get the date for the beginning of the month.
   */
  static getDateBeginningOfMonth(): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(1);
    return date;
  }

  /**
   * Get the date for the beginning of the year.
   *
   * @return the beginning of the year.
   */
  static getDateBeginningOfYear(): Date {
    const date = this.getDateBeginningOfMonth();
    date.setMonth(1);
    return date;
  }

  /**
   * Get the date for the beginning of the quarter.
   */
  static getDateBeginningOfQuarter(): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(1);

    if (date.getMonth() < 4) {
      date.setMonth(1);
    } else if (date.getMonth() < 7) {
      date.setMonth(4);
    } else if (date.getMonth() < 10) {
      date.setMonth(7);
    } else {
      date.setMonth(10);
    }

    return date;
  }
}
