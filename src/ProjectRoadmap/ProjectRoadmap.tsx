import "./ProjectRoadmap.scss";
import "./iconFont.css";
import "azure-devops-ui/Core/override.css";

// Library Level
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as SDK from "azure-devops-extension-sdk";

import {
  CustomHeader,
  HeaderTitle,
  HeaderTitleArea,
  HeaderTitleRow,
  TitleSize,
} from "azure-devops-ui/Header";

import { HeaderCommandBar } from "azure-devops-ui/HeaderCommandBar";
import { FilterBar } from "azure-devops-ui/FilterBar";
import {
  Filter,
  FILTER_CHANGE_EVENT,
  FilterOperatorType,
} from "azure-devops-ui/Utilities/Filter";
import { Page } from "azure-devops-ui/Page";
import { ProjectRoadmapCommandMenu } from "./ProjectRoadmapCommandMenu.ui";
import { IProjectRoadmap } from "./IProjectRoadmap.state";
import { Spinner, SpinnerSize } from "azure-devops-ui/Spinner";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import {
  DropdownMultiSelection,
  DropdownSelection,
} from "azure-devops-ui/Utilities/DropdownSelection";
import { DropdownFilterBarItem } from "azure-devops-ui/Dropdown";
import { ProjectRoadmapService } from "./ProjectRoadmap.service";
import { IMenuItem } from "azure-devops-ui/Menu";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { ZeroData } from "azure-devops-ui/ZeroData";

import { Constants, ProjectService } from "@esdc-it-rp/azuredevops-common";
import Gantt from "./components/Gantt/Gantt";
import { GanttTask } from "./components/Gantt/GanttTask";
import { DisplayInterval } from "./DisplayInterval.enum";
import { GanttLink } from "./components/Gantt/GanttLink";

/**
 * The status report page.
 */
class ProjectRoadmap extends React.Component<{}, IProjectRoadmap> {
  private commandButtons: ProjectRoadmapCommandMenu;

  /**
   * Singleton instance.
   */
  private static singleton: ProjectRoadmap;

  /**
   * The project name.
   */
  private projectName: string = "";

  /**
   * The current filer being applied.
   */
  private currentFilterState = new ObservableValue("");

  /**
   * Filter object for binding.
   */
  private filter: Filter = new Filter();

  /**
   * Filter for Area Path.
   */
  private filterAreaPath = new DropdownMultiSelection();

  /**
   * Filter for Work Item Type.
   */
  private filterWorkItemGranularity = new DropdownSelection();

  /**
   * Current page data being used by react.
   */
  private pageData: IProjectRoadmap;

  /**
   * List of area paths for a project (top level).
   */
  private areaPathList: IListBoxItem[] = [];

  /**
   * This flag is incremented to force component reload.
   *
   * Breaking a reactjs pattern due to state and props being mixed together as our entire
   * Gantt needs to be rebuilt anyways.
   *
   * @see https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
   */
  private forceRefreshFlipper: number = 0;

  /**
   * Visible work item types.
   */
  private visibleWorkItemTypes = [
    Constants.WIT_TYPE_EPIC,
    Constants.WIT_TYPE_FEATURE,
    Constants.WIT_TYPE_PBI,
    Constants.WIT_TYPE_TASK,
  ];

  /**
   * Constructor
   *
   * @param props the properties
   */
  constructor(props: {} | Readonly<{}>) {
    super(props);
    this.pageData = {
      roadmap: [],
      ganttConfig: {
        unit: DisplayInterval.Month,
        data: {
          tasks: [],
          links: [],
        },
      },
      asOf: undefined,
    };
    this.commandButtons = new ProjectRoadmapCommandMenu();

    this.state = this.pageData;
    this.initEvents();
    this.setupFilter();
    ProjectRoadmap.singleton = this;
  }

  /**
   * Get the singleton instance.
   *
   * @returns the singleton
   */
  static getInstance(): ProjectRoadmap {
    return ProjectRoadmap.singleton;
  }

  /**
   * Setup Filter.
   */
  private setupFilter(): void {
    var that = this;

    that.filter.setFilterItemState("areaPath", {
      value: [],
      operator: FilterOperatorType.and,
    });

    that.filter.setFilterItemState("displayGranularity", {
      value: [],
    });

    that.filter.subscribe(() => {
      this.currentFilterState.value = JSON.stringify(
        this.filter.getState(),
        null,
        4
      );

      that.filterRoadmap();
    }, FILTER_CHANGE_EVENT);
  }

  /**
   * Filter the roadmap.
   */
  private filterRoadmap() {
    // Area Filtering
    const areaPaths: string[] =
      this.filter.getFilterItemState("areaPath")?.value;

    // Now hide the levels.
    const visibleLevel: string =
      this.filter.getFilterItemState("displayGranularity")?.value;

    const hiddenTypes: string[] = [];

    // Intentionally no break here.
    switch (visibleLevel[0]) {
      case Constants.WIT_TYPE_EPIC:
        hiddenTypes.push(Constants.WIT_TYPE_FEATURE);
      case Constants.WIT_TYPE_FEATURE:
        hiddenTypes.push(Constants.WIT_TYPE_PBI);
      case Constants.WIT_TYPE_PBI:
        hiddenTypes.push(Constants.WIT_TYPE_TASK);
    }

    if (areaPaths.length === 0) {
      this.pageData.roadmap.forEach((entry) => {
        entry.hide = hiddenTypes.indexOf(entry.type) != -1;
      });
    } else {
      let topArea: string;
      this.pageData.roadmap.forEach((entry) => {
        topArea = ProjectRoadmapService.getTopLevelAreaPath(entry.areaPath);
        entry.hide =
          areaPaths.indexOf(topArea) === -1 ||
          hiddenTypes.indexOf(entry.type) != -1;
      });
    }
    this.populateGantt();
    this.refreshState();
  }

  /**
   * Attach the events.
   */
  private initEvents(): void {
    // Refresh event
    this.commandButtons.attachOnRefreshActivate(() => {
      this.refreshGantt();
    });

    // Interval change.
    this.commandButtons.attachOnIntervalActivate(this.changeInterval);

    // Expand and Collpase change.
    this.commandButtons.attachOnExpandCollapseActivate(this.performExpandOrCollapseAll);
  }

  /**
   * Refresh the gantt chart data by reloading the gantt information and applying the filter.
   */
  private async refreshGantt(): Promise<void> {
    this.pageData.roadmap = await ProjectRoadmapService.createGantt(
      // For future use to query historic roadmaps.
      this.pageData.asOf
    );
    this.filterRoadmap();
  }

  /**
   * User choose to change interval.
   *
   * @param menuItem the menu item that was selected.
   * @param event the event that caused the action
   */
  private changeInterval(
    menuItem: IMenuItem,
    event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
  ): void {
    ProjectRoadmap.getInstance().pageData.ganttConfig.unit = menuItem.data;
    ProjectRoadmap.getInstance().refreshState();
  }

  /**
   * @inheritdoc
   *
   * Note: This is essentially called as part of react lifecycle.
   * https://reactjs.org/docs/state-and-lifecycle.html
   */
  public componentDidMount() {
    this.performMountAsync();
  }


  /**
   * User choose to change interval.
   *
   * @param menuItem the menu item that was selected.
   * @param event the event that caused the action
   */
  private performExpandOrCollapseAll(
    menuItem: IMenuItem,
    event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>):void {
      Gantt.toggleOpenAll(menuItem.data);
  }

  /**
   * Mount activiites that are async.
   */
  private async performMountAsync(): Promise<void> {
    await SDK.init();
    this.projectName = await ProjectService.getProjectName();
    await this.populateAreaPath();
    await this.refreshGantt();
    Gantt.toggleOpenAll(false);
  }

  /**
   * Update the area path;
   */
  private async populateAreaPath(): Promise<void> {
    const areaPaths = await ProjectRoadmapService.getAreaPathsForProject();
    let pathCleaned: string;
    areaPaths.forEach((area) => {
      // Fix the area path as this call generates /<project>/Area/<area path>.
      // We want <project>/<area path>
      pathCleaned = area.path.replace("\\Area\\", "\\");
      pathCleaned = pathCleaned.substring(1);

      this.areaPathList.push({
        id: "itrp-pm-roadmap.areapath." + area.name,
        data: pathCleaned,
        text: area.name,
      });
    });
  }

  /**
   * Refresh the state.
   */
  public refreshState(): void {
    this.commandButtons.updateButtonStatuses(this.pageData);
    this.forceRefreshFlipper++;
    this.setState(this.pageData);
  }

  /**
   * Populate the gantt chart
   *
   * @returns a list of gantt tasks
   */
  private populateGantt(): void {
    const tasks: GanttTask[] = [];
    const allLinks: GanttLink[] = [];
    const visibleLinks: GanttLink[] = [];
    const visibleIDs: string[] = [];

    this.pageData.roadmap.forEach((azureItem) => {
      if (!azureItem.hide) {
        tasks.push(GanttTask.convert(azureItem));
        allLinks.push(...GanttLink.convert(azureItem));
        visibleIDs.push(azureItem.id.toString());
      }
    });

    // Make sure all tasks do exist (if hidden, we need to remove parent).
    tasks.forEach((item) => {
      if (item.parent) {
        if (visibleIDs.indexOf(item.parent) === -1) {
          item.parent = undefined;
        }
      }
    });

    // Make sure all references do exist (if hidden, we need to remove relationship).
    allLinks.forEach((item) => {
      if (
        visibleIDs.indexOf(item.source) != -1 &&
        visibleIDs.indexOf(item.target) != -1
      ) {
        visibleLinks.push(item);
      }
    });

    this.pageData.ganttConfig.data.tasks = tasks;
    this.pageData.ganttConfig.data.links = visibleLinks;
  }

  public render(): JSX.Element {
    return (
      <Page className="flex-grow">
        <CustomHeader className="bolt-header-with-commandbar">
          <HeaderTitleArea>
            <HeaderTitleRow>
              <HeaderTitle ariaLevel={3} titleSize={TitleSize.Large}>
                Project Roadmap
              </HeaderTitle>
            </HeaderTitleRow>
          </HeaderTitleArea>
          <HeaderCommandBar items={this.commandButtons.buttons.value} />
        </CustomHeader>
        <div className="page-content-left page-content-right page-content-top">
          {
            /** Print this on no data. */
            this.state.roadmap.length === 0 && (
              <div className="flex-row v-align-middle justify-center full-size">
                <Spinner size={SpinnerSize.large} label="Please wait ..." />
              </div>
            )
          }
          {
            /**
             * Print on data.
             */
            this.state.roadmap.length > 0 && (
              <div className="flex-grow">
                <FilterBar filter={this.filter}>
                  <DropdownFilterBarItem
                    filterItemKey="displayGranularity"
                    filter={this.filter}
                    items={this.visibleWorkItemTypes}
                    selection={this.filterWorkItemGranularity}
                    placeholder="Granularity"
                  />
                  <DropdownFilterBarItem
                    filterItemKey="areaPath"
                    filter={this.filter}
                    items={this.areaPathList}
                    selection={this.filterAreaPath}
                    placeholder="Area Path"
                  />
                </FilterBar>
                {
                  /**
                   * Show the gantt chart if we have data.
                   */
                  this.pageData.ganttConfig.data.tasks.length > 0 && (
                    <Gantt
                      config={this.pageData.ganttConfig}
                      key={this.forceRefreshFlipper}
                    />
                  )
                }
                {
                  /**
                   * Show no results if a filter or search results has no data.
                   */
                  this.pageData.ganttConfig.data.tasks.length === 0 && (
                    <ZeroData
                      className="flex-row v-align-middle justify-center full-size"
                      primaryText="No data."
                      imageAltText="No Data Image"
                      imagePath="https://cdn.vsassets.io/v/M183_20210324.1/_content/Illustrations/general-no-results-found.svg"
                    />
                  )
                }
              </div>
            )
          }
        </div>
      </Page>
    );
  }
}
ReactDOM.render(<ProjectRoadmap />, document.getElementById("root"));
