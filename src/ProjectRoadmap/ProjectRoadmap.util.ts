/**
 * Project roadmap utilities.
 */
export class ProjectRoadmapUtil {
  /**
   * Available fiscal year cache.
   */
  static fiscalYears: { id: string; text: string }[] = [];

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
   * Get the previous fiscal year ago.
   *
   * @return the previous fiscal year.
   */
  static getPreviousFiscalYear(): Date {
    const date = this.getFiscalYear();
    date.setFullYear(date.getFullYear() - 1);
    return date;
  }

  /**
   * Get the previous fiscal year ago.
   *
   * @return the previous fiscal year.
   */
  static getFiscalYear(): Date {
    const date = this.getDateBeginningOfMonth();
    if (date.getMonth() < 3) {
      date.setFullYear(date.getFullYear() - 1);
    }
    date.setMonth(3);

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
   * Get the fiscal year
   *
   * @returns the current fiscal year
   */
  static getFiscalYearLists(): { id: string; text: string }[] {
    if (this.fiscalYears.length === 0) {
      this.fiscalYears = [{ id: "Any", text: "Changed After: Any" }];
      this.fiscalYears = [
        { id: "2022-08-30", text: "Changed After: 2022-08-30" },
      ];
      var fiscalYear: Date = this.getFiscalYear();
      for (var i = 0; i < 5; i++) {
        this.fiscalYears.push({
          id: this.getDateOnly(fiscalYear),
          text: "Changed After: " + this.getDateOnly(fiscalYear),
        });
        fiscalYear.setFullYear(fiscalYear.getFullYear() - 1);
      }
    }

    return this.fiscalYears;
  }

  /**
   * Get just the date part of the date object which includes time.
   *
   * @param date the date
   * @returns returns just the YYYY-MM-DD
   */
  static getDateOnly(date: Date): string {
    return date.toISOString().substring(0, 10);
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
