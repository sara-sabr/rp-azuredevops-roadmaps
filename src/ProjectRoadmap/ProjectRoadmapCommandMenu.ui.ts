// Library Level
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";
import { IMenuItem } from "azure-devops-ui/Menu";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { IProjectRoadmap } from "./IProjectRoadmap.state";
import { DisplayInterval } from "./DisplayInterval.enum";

/**
 * The menu bar for status report page.
 */
export class ProjectRoadmapCommandMenu {
  /**
   * Prefix for interval ID.
   */
  static readonly INTERVAL_PREFIX_ID = "itrp-pm-roadmap-header-interval.sub.";

  /**
   * Prefix for as of ID.
   */
  static readonly AS_OF_PREFIX_ID = "itrp-pm-roadmap-header-asof.sub.";

  /**
   * The download button
   */
  private printButton: IHeaderCommandBarItem = {
    iconProps: {
      iconName: "Print"
    },
    id: "itrp-pm-roadmap-header-print",
    important: true,
    text: "Print",
    disabled: true,
    onActivate: function() {}
  };

  /**
   * Refresh button.
   */
  private refreshButton: IHeaderCommandBarItem = {
    iconProps: {
      iconName: "Refresh"
    },
    id: "itrp-pm-roadmap-header-refresh",
    text: "Refresh",
    disabled: true
  };

  /**
   * Interval button options.
   */
  private intervalOptionItems: IMenuItem[];

  private asOfOptionItems: IMenuItem[] = [
    {
      id: ProjectRoadmapCommandMenu.AS_OF_PREFIX_ID + "now",
      text: "Now",
      onActivate: function() {},
      data: "Now",
      readonly: true
    },
    {
      id: ProjectRoadmapCommandMenu.AS_OF_PREFIX_ID + "beginningOfMonth",
      text: "Beginning of the Month",
      onActivate: function() {},
      data: "Month",
      readonly: true
    },
    {
      id: ProjectRoadmapCommandMenu.AS_OF_PREFIX_ID + "beginningOfQuarter",
      text: "Beginning of the Quarter",
      onActivate: function() {},
      data: "Quarter",
      readonly: true
    },
    {
      id: ProjectRoadmapCommandMenu.AS_OF_PREFIX_ID + "beginningOfFYYear",
      text: "Beginning of the Year",
      onActivate: function() {},
      data: "Year",
      readonly: true
    },
    {
      id: ProjectRoadmapCommandMenu.AS_OF_PREFIX_ID + "custom",
      text: "Custom",
      onActivate: function() {},
      data: "Custom",
      readonly: true
    }
  ];

  /**
   * As of button.
   */
  private asOfButton: IHeaderCommandBarItem = {
    id: "itrp-pm-roadmap-header-asOf",
    text: "As Of",
    disabled: false,
    subMenuProps: {
      items: this.asOfOptionItems,
      id: "itrp-pm-roadmap-header-asof.submenu"
    }
  };

  /**
   * Interval button.
   */
  private intervalButton: IHeaderCommandBarItem = {
    id: "itrp-pm-roadmap-header-interval",
    text: "Interval",
    disabled: false
  };

  /** Used to trigger update. */
  buttons: ObservableValue<IHeaderCommandBarItem[]> = new ObservableValue([
    this.asOfButton,
    this.intervalButton,
    this.printButton,
    this.refreshButton
  ]);

  constructor() {
    this.intervalOptionItems = [];
    for (let v in DisplayInterval) {
      if (isNaN(Number(v))) {
        this.intervalOptionItems.push({
          id: ProjectRoadmapCommandMenu.INTERVAL_PREFIX_ID + v,
          text: v,
          onActivate: function() {},
          data: DisplayInterval[v],
          readonly: true
        });
      }
    }

    this.intervalButton.subMenuProps = {
      items: this.intervalOptionItems,
      id: "itrp-pm-roadmap-header-interval.submenu"
    };
  }

  /**
   * Update the button states.
   *
   * @param currentPage the current page data
   */
  public updateButtonStatuses(currentPage: IProjectRoadmap): void {
    this.intervalButton.text =
      "Interval: " + DisplayInterval[currentPage.ganttConfig.unit];

    this.intervalOptionItems.forEach(item => {
      if (currentPage.ganttConfig.unit === item.data) {
        item.checked = true;
      } else {
        item.checked = false;
      }
    });

    // Notify the subscribers.
    this.buttons.notify(this.buttons.value, "updateButtonStatus");
  }

  /**
   * Attach the event to a interval button click.
   *
   * @param event event to fire
   */
  public attachOnIntervalActivate(
    event: (
      menuItem: IMenuItem,
      event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
    ) => boolean | void
  ): void {
    this.intervalOptionItems.forEach(button => {
      button.onActivate = event;
    });
  }

  /**
   * Attach the event to a refresh button click.
   *
   * @param event event to fire
   */
  public attachOnRefreshActivate(
    event: (
      menuItem: IMenuItem,
      event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
    ) => boolean | void
  ): void {
    this.refreshButton.onActivate = event;
  }

  /**
   * Attach the event to a print button click.
   *
   * @param event event to fire
   */
  public attachOnPrintActivate(
    event: (
      menuItem: IMenuItem,
      event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
    ) => boolean | void
  ): void {
    this.printButton.onActivate = event;
  }

  /**
   * Bulk attach the event to all buttons.
   *
   * @param event the event to fire
   */
  public attachOnButtonActivate(
    event: (
      menuItem: IMenuItem,
      event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
    ) => boolean | void
  ): void {
    this.attachOnPrintActivate(event);
    this.attachOnRefreshActivate(event);
  }
}
