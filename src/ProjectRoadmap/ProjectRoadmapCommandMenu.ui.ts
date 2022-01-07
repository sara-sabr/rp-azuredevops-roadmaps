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
   * Refresh button.
   */
  private refreshButton: IHeaderCommandBarItem = {
    iconProps: {
      iconName: "Refresh",
    },
    id: "itrp-pm-roadmap-header-refresh",
    text: "Refresh",
    important: true,
  };

  /**
   * About button.
   */
  private aboutButton: IHeaderCommandBarItem = {
    iconProps: {
      iconName: "About",
    },
    id: "itrp-pm-roadmap-header-about",
    text: "About",
    important: false,
  };

  /**
   * Interval button options.
   */
  private intervalOptionItems: IMenuItem[];

  /**
   * Interval button.
   */
  private intervalButton: IHeaderCommandBarItem = {
    id: "itrp-pm-roadmap-header-interval",
    text: "Interval",
    disabled: false,
    important: true,
  };

  /** Used to trigger update. */
  buttons: ObservableValue<IHeaderCommandBarItem[]> = new ObservableValue([
    this.intervalButton,
    this.refreshButton,
    this.aboutButton,
  ]);

  constructor() {
    this.intervalOptionItems = [];
    for (let v in DisplayInterval) {
      if (isNaN(Number(v))) {
        this.intervalOptionItems.push({
          id: ProjectRoadmapCommandMenu.INTERVAL_PREFIX_ID + v,
          text: v,
          onActivate: function () {},
          data: DisplayInterval[v],
          readonly: true,
        });
      }
    }

    this.intervalButton.subMenuProps = {
      items: this.intervalOptionItems,
      id: "itrp-pm-roadmap-header-interval.submenu",
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

    this.intervalOptionItems.forEach((item) => {
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
    this.intervalOptionItems.forEach((button) => {
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
   * Attach the event to an about button click.
   *
   * @param event event to fire
   */
  public attachOnAboutActivate(
    event: (
      menuItem: IMenuItem,
      event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
    ) => boolean | void
  ): void {
    this.aboutButton.onActivate = event;
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
    this.attachOnRefreshActivate(event);
    this.attachOnIntervalActivate(event);
  }
}
