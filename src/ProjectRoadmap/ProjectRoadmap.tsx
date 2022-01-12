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
import { DropdownMultiSelection } from "azure-devops-ui/Utilities/DropdownSelection";
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
import { Image } from "azure-devops-ui/Image";
import { KeywordFilterBarItem } from "azure-devops-ui/TextFilterBarItem";
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";
import { Page } from "azure-devops-ui/Page";
import { Panel } from "azure-devops-ui/Panel";
import { Spinner, SpinnerSize } from "azure-devops-ui/Spinner";
import { Observer } from "azure-devops-ui/Observer";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { ZeroData } from "azure-devops-ui/ZeroData";

// Project level.
import { BacklogEntity } from "./Backlog.entity";
import { DisplayInterval } from "./DisplayInterval.enum";
import { IProjectRoadmap } from "./IProjectRoadmap.state";
import Gantt from "./components/Gantt/Gantt";
import { GanttLink } from "./components/Gantt/GanttLink";
import { GanttTask } from "./components/Gantt/GanttTask";
import { ProjectRoadmapCommandMenu } from "./ProjectRoadmapCommandMenu.ui";
import { ProjectRoadmapService } from "./ProjectRoadmap.service";
import { WorkItemProcessService } from "@esdc-it-rp/azuredevops-common";
import { ProjectRoadmapTaskEntity } from "./ProjectRoadmapTask.entity";

/**
 * The status report page.
 */
class ProjectRoadmap extends React.Component<{}, IProjectRoadmap> {
  /**
   * Filter key for Area Path.
   */
  private static readonly FILTER_KEY_AREAPATH = "areaPath";

  /**
   * Filter key for Work Item Type.
   */
  private static readonly FILTER_KEY_WIT = "wit";

  /**
   * Filter key for keyword.
   */
  private static readonly FILTER_KEY_KEYWORD = "keyword";

  private commandButtons: ProjectRoadmapCommandMenu;

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
  private backlogLevels: BacklogEntity[] = [];

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
   * Sets to true if the environment is properly configured.
   */
  private isProperlyConfigured = true;

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
  }

  /**
   * Setup Filter.
   */
  private setupFilter(): void {
    var that = this;

    that.filter.setFilterItemState(ProjectRoadmap.FILTER_KEY_AREAPATH, {
      value: [],
      operator: FilterOperatorType.and,
    });

    that.filter.setFilterItemState(ProjectRoadmap.FILTER_KEY_WIT, {
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
    const areaPaths: string[] = this.filter.getFilterItemState(
      ProjectRoadmap.FILTER_KEY_AREAPATH
    )?.value;

    // Keyword
    const keyword: string = this.filter.getFilterItemState(
      ProjectRoadmap.FILTER_KEY_KEYWORD
    )?.value;

    // Now hide the levels.
    const workItemTypes: string[] = this.filter.getFilterItemState(
      ProjectRoadmap.FILTER_KEY_WIT
    )?.value;

    this.pageData.roadmap.forEach((entry) => {
      entry.hide =
        this.isHiddenWorkItemAreaPath(areaPaths, entry) ||
        this.isHiddenWorkItemType(workItemTypes, entry.type) ||
        this.isHiddenWorkItemKeyword(keyword, entry);
    });
    this.populateGantt();
    this.refreshState();
  }

  /**
   * Is the area path hidden.
   *
   * @param areaPaths area paths to show or empty to show all
   * @param currentTask the current task
   * @returns true if task should be hidden.
   */
  private isHiddenWorkItemAreaPath(
    areaPaths: string[],
    currentTask: ProjectRoadmapTaskEntity
  ): boolean {
    if (areaPaths && areaPaths.length > 0) {
      let topArea: string;
      topArea = ProjectRoadmapService.getTopLevelAreaPath(currentTask.areaPath);
      return areaPaths.indexOf(topArea) === -1;
    }

    return false;
  }

  /**
   * Checks to see if we should hide a work item based on title.
   *
   * @param keyword the keyword
   * @param currentTask the current task
   * @returns true to hide the task, otherwise false.
   */
  private isHiddenWorkItemKeyword(
    keyword: string | undefined,
    currentTask: ProjectRoadmapTaskEntity
  ): boolean {
    // Presently we hide just on title. Later on, if needed, we can expand the keyword to include other task information.
    if (keyword) {
      return (
        currentTask.title.toLowerCase().indexOf(keyword.toLowerCase()) === -1
      );
    }

    // Default is show
    return false;
  }

  /**
   * Checks to see if we need to display the work item type or not.
   *
   * @param visibleWorkItemTypes work items we should show. An empty array results in all visible
   * @param currentWorkItemType work type to check
   * @returns true to show work item type or false to hide it.
   */
  private isHiddenWorkItemType(
    visibleWorkItemTypes: string[],
    currentWorkItemType: string
  ): boolean {
    return (
      visibleWorkItemTypes.length !== 0 &&
      visibleWorkItemTypes.indexOf(currentWorkItemType) === -1
    );
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

    try {
      this.pageData.roadmap = await ProjectRoadmapService.createGantt(
        // For future use to query historic roadmaps.
        this.pageData.asOf
      );

      this.isProperlyConfigured = true;
      this.filterRoadmap();
    } catch (e) {
      this.isProperlyConfigured = false;
      this.refreshState();
    }
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

    // Load in the cache.
    await WorkItemProcessService.getWorkItemTypes();
    this.backlogLevels = await ProjectRoadmapService.getBacklogLevels();
    await this.refreshGantt();
  }

  /**
   * Update the area path;
   */
  private async populateAreaPath(): Promise<void> {
    const areaPaths = await ProjectRoadmapService.getAreaPathsForProject();
    let pathCleaned: string;

    if (areaPaths) {
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
  }

  /**
   * Get the backlog levels.
   *
   * @returns the list of backlog levels.
   */
  private getBacklogLevelItems(): IListBoxItem[] {
    const listItems: IListBoxItem[] = [];

    for (const b of this.backlogLevels) {
      for (const w of b.workItemTypes) {
        listItems.push({ id: w, text: w, data: w });
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
    const parentChildMap: Map<string, string> = new Map();
    const allLinks: GanttLink[] = [];
    const visibleLinks: GanttLink[] = [];
    const visibleIDs: string[] = [];

    this.pageData.roadmap.forEach((azureItem) => {
      if (azureItem.parent) {
        parentChildMap.set(
          azureItem.id.toString(),
          azureItem.parent.toString()
        );
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
        let currentParentId: string | undefined;
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
            /** Print this on misconfiguration. */
            this.isProperlyConfigured === false && (
              <div>
                <MessageCard
                  className="flex-self-stretch"
                  severity={MessageCardSeverity.Error}
                >
                  Please ensure the project is properly configured for Roadmaps.
                </MessageCard>
                <p>Configure your project by:</p>
                <ol>
                  <li style={{ listStyle: "inherit", paddingBottom: "5px" }}>
                    Create the query folder structure{" "}
                    <em>Automation &gt; Roadmap</em> insde the{" "}
                    <em>Shared Queries</em>.
                  </li>
                  <li style={{ listStyle: "inherit" }}>
                    Create a new query named <em>Latest</em> and save it to
                    folder structure{" "}
                    <em>Shared Queries &gt; Automation &gt; Roadmap</em>.
                    <ul style={{ paddingLeft: "15px" }}>
                      <li style={{ listStyle: "inherit" }}>
                        <b>Type of Query</b>: Either{" "}
                        <em>Flat list of work items</em> or{" "}
                        <em>Tree of work items</em>
                      </li>
                      <li style={{ listStyle: "inherit" }}>
                        Only when Type of Query: <em>Tree of work items</em>,
                        choose Fiilter Options:{" "}
                        <em>Match top-level work items first</em> and Type of
                        Tree: <em>Parent/Child</em>
                      </li>
                      <li style={{ listStyle: "inherit" }}>
                        Under Columns Options, please add at least:
                        <ul style={{ paddingLeft: "15px" }}>
                          <li style={{ listStyle: "inherit" }}>ID</li>
                          <li style={{ listStyle: "inherit" }}>
                            Work Item Type
                          </li>
                          <li style={{ listStyle: "inherit" }}>Title</li>
                          <li style={{ listStyle: "inherit" }}>Description</li>
                          <li style={{ listStyle: "inherit" }}>
                            Start Date - used to determine start date of work
                            items
                          </li>
                          <li style={{ listStyle: "inherit" }}>
                            Target Date - used to determine finish date of work
                            items
                          </li>
                          <li style={{ listStyle: "inherit" }}>
                            Parent - only required if Type of Query is{" "}
                            <em>Tree of work items</em>
                          </li>
                          <li style={{ listStyle: "inherit" }}>Area Path</li>
                          <li style={{ listStyle: "inherit" }}>Iteration</li>
                        </ul>
                      </li>
                    </ul>
                  </li>
                </ol>
                <p>
                  Note: A <b>Type of Query</b>: <em>Tree of work items</em> has
                  the following benefits:
                </p>
                <ul>
                  <li style={{ listStyle: "inherit" }}>
                    Calculation Start/Target Date based on
                    grandchildren/children.
                  </li>
                  <li style={{ listStyle: "inherit" }}>
                    Calculation of progress percentage based on work items
                    "completed". A "completed" item is either in the state
                    category "Removed" or "Completed".
                  </li>
                  <li style={{ listStyle: "inherit" }}>
                    Show/Hide work item types in the middle of the tree hierachy
                    and still retain a tree structure.
                  </li>
                </ul>
              </div>
            )
          }
          {
            /** Print this on no data. */
            this.state.roadmap.length === 0 && this.isProperlyConfigured && (
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
                  <KeywordFilterBarItem
                    filterItemKey={ProjectRoadmap.FILTER_KEY_KEYWORD}
                    filter={this.filter}
                    placeholder="Filter by text contained in title (case-insensitive)"
                  />
                  <DropdownFilterBarItem
                    filterItemKey={ProjectRoadmap.FILTER_KEY_WIT}
                    filter={this.filter}
                    items={this.getBacklogLevelItems()}
                    selection={this.filterWorkItem}
                    placeholder="Work Item Type"
                  />
                  {this.areaPathList.length > 0 && (
                    // Only allow filtering area path if an area path does exist for a project.
                    <DropdownFilterBarItem
                      filterItemKey={ProjectRoadmap.FILTER_KEY_AREAPATH}
                      filter={this.filter}
                      items={this.areaPathList}
                      selection={this.filterAreaPath}
                      placeholder="Area Path"
                    />
                  )}
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
                  <div className="flex-center">
                    <Image
                      alt="ESDC IT Research and Prototyping Logo"
                      src={"../static/img/logo.png"}
                      width={128}
                      height={128}
                      className={"padding-16"}
                    />
                    A product initially developed by ESDC IT Research Division.
                  </div>
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
