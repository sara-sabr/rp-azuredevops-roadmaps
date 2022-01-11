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
import {
  DropdownMultiSelection
} from "azure-devops-ui/Utilities/DropdownSelection";
import { DropdownFilterBarItem } from "azure-devops-ui/Dropdown";
import { FilterBar } from "azure-devops-ui/FilterBar";
import {
  Filter,
  FILTER_CHANGE_EVENT,
  FilterOperatorType,
} from "azure-devops-ui/Utilities/Filter";
import { HeaderCommandBar } from "azure-devops-ui/HeaderCommandBar";
import { IMenuItem } from "azure-devops-ui/Menu";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { Page } from "azure-devops-ui/Page";
import { Panel } from "azure-devops-ui/Panel";
import { Spinner, SpinnerSize } from "azure-devops-ui/Spinner";
import { Observer } from "azure-devops-ui/Observer";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { ZeroData } from "azure-devops-ui/ZeroData";

// Project level.
import { ProjectRoadmapCommandMenu } from "./ProjectRoadmapCommandMenu.ui";
import { ProjectRoadmapService } from "./ProjectRoadmap.service";
import { IProjectRoadmap } from "./IProjectRoadmap.state";
import Gantt from "./components/Gantt/Gantt";
import { GanttTask } from "./components/Gantt/GanttTask";
import { DisplayInterval } from "./DisplayInterval.enum";
import { GanttLink } from "./components/Gantt/GanttLink";
import { BacklogEntity } from "./Backlog.entity";

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
  private filterWorkItem = new DropdownMultiSelection();

  /**
   * Current page data being used by react.
   */
  private pageData: IProjectRoadmap;

  /**
   * List of area paths for a project (top level).
   */
  private areaPathList: IListBoxItem[] = [];

  /**
   * Backlog levels.
   */
  private backlogLevels:BacklogEntity[] = [];

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
   * About is open.
   */
  private isAboutOpen = new ObservableValue<boolean>(false);

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

    that.filter.setFilterItemState("workItemTypes", {
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
    const workItemTypes: string[] =
      this.filter.getFilterItemState("workItemTypes")?.value;

    if (areaPaths.length === 0) {
      this.pageData.roadmap.forEach((entry) => {
        entry.hide = this.isHiddenWorkItem(workItemTypes, entry.type);
      });
    } else {
      let topArea: string;
      this.pageData.roadmap.forEach((entry) => {
        topArea = ProjectRoadmapService.getTopLevelAreaPath(entry.areaPath);
        entry.hide =
          areaPaths.indexOf(topArea) === -1 ||
          this.isHiddenWorkItem(workItemTypes, entry.type);
      });
    }
    this.populateGantt();
    this.refreshState();
  }

  /**
   * Checks to see if we need to display the work item or not.
   *
   * @param visibleWorkItems work items we should show. An empty array results in all visible
   * @param currentWorkItemType work type to check
   * @returns true to show work item or false to hide it.
   */
  private isHiddenWorkItem(visibleWorkItems:string[], currentWorkItemType:string):boolean {
    return visibleWorkItems.length !== 0 &&
           visibleWorkItems.indexOf(currentWorkItemType) === -1
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
    this.commandButtons.attachOnIntervalActivate(
      this.changeInterval.bind(this)
    );

    // About change.
    this.commandButtons.attachOnAboutActivate(this.toggleAbout.bind(this));
  }

  /**
   * Turn on or off the about page.
   */
  private toggleAbout(): void {
    this.isAboutOpen.value = !this.isAboutOpen.value;
  }

  /**
   * Refresh the gantt chart data by reloading the gantt information and applying the filter.
   */
  private async refreshGantt(): Promise<void> {
    // Force the page to show page loading ...
    this.pageData.roadmap = [];
    this.refreshState();

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
    this.pageData.ganttConfig.unit = menuItem.data;
    this.refreshState();
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
   * Mount activiites that are async.
   */
  private async performMountAsync(): Promise<void> {
    await SDK.init();
    await this.populateAreaPath();
    this.backlogLevels = await ProjectRoadmapService.getBacklogLevels();
    await this.refreshGantt();
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
   * Get the backlog levels.
   *
   * @returns the list of backlog levels.
   */
  private getGranularityLevels(): IListBoxItem[] {
    const listItems:IListBoxItem[] = [];

    for (const b of this.backlogLevels) {
      for (const w of b.workItemTypes) {
        listItems.push(
          { id: w, text: w, data: w}
        );
      }
    }

    return listItems;
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
    const parentChildMap:Map<string, string> = new Map();
    const allLinks: GanttLink[] = [];
    const visibleLinks: GanttLink[] = [];
    const visibleIDs: string[] = [];

    this.pageData.roadmap.forEach((azureItem) => {
      if (azureItem.parent) {
        parentChildMap.set(azureItem.id.toString(), azureItem.parent.toString());
      }

      if (!azureItem.hide) {
        tasks.push(GanttTask.convert(azureItem));
        allLinks.push(...GanttLink.convert(azureItem));
        visibleIDs.push(azureItem.id.toString());
      }
    });

    // Make sure all tasks do exist (if hidden, we need to remove parent).
    tasks.forEach((item) => {
      if (item.parent) {
        let currentParentId:string | undefined;
        currentParentId = item.parent;

        // See if we can find a visible ancestor.
        while (currentParentId) {
          if (visibleIDs.indexOf(currentParentId) > -1) {
            // Exit as we found this ancestor to be visible.
            break;
          } else {
            currentParentId = parentChildMap.get(currentParentId);
            item.parent = currentParentId;
          }
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
                Roadmaps
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
                    filterItemKey="workItemTypes"
                    filter={this.filter}
                    items={this.getGranularityLevels()}
                    selection={this.filterWorkItem}
                    placeholder="Work Item Type"
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
        <Observer isAboutOpen={this.isAboutOpen}>
          {(props: { isAboutOpen: boolean }) => {
            return props.isAboutOpen ? (
              <Panel
                onDismiss={() => (this.isAboutOpen.value = false)}
                titleProps={{ text: "About" }}
                footerButtonProps={[
                  {
                    text: "Close",
                    primary: true,
                    onClick: () => (this.isAboutOpen.value = false),
                  },
                ]}
              >
                <div style={{ height: "100%" }}>
                  <p>
                    This is a MVP and improvements will be added as required or
                    upon{" "}
                    <a href="https://github.com/sara-sabr/rp-azuredevops-roadmaps">
                      contribution
                    </a>
                    .
                  </p>
                  <p>
                    Any issues/suggestions can be reported at{" "}
                    <a href="https://github.com/sara-sabr/rp-azuredevops-roadmaps/issues">
                      GitHub
                    </a>
                  </p>
                </div>
              </Panel>
            ) : null;
          }}
        </Observer>
      </Page>
    );
  }
}
ReactDOM.render(<ProjectRoadmap />, document.getElementById("root"));
