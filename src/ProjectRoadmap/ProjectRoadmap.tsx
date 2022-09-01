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
  DropdownMultiSelection,
  DropdownSelection,
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
import { Image } from "azure-devops-ui/Image";
import { KeywordFilterBarItem } from "azure-devops-ui/TextFilterBarItem";
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";
import { Page } from "azure-devops-ui/Page";
import { Panel } from "azure-devops-ui/Panel";
import {
  RadioButton,
  RadioButtonGroup,
  RadioButtonGroupDirection,
} from "azure-devops-ui/RadioButton";
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
import { ProjectRoadmapUtil } from "./ProjectRoadmap.util";

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

  /**
   * Filter key for tag.
   */
  private static readonly FILTER_KEY_TAGS = "tags";

  /**
   * Filter tag mode where all items must have any of the tags.
   */
  private static readonly FILTER_TAG_MODE_ANY = "filterTagAny";

  /**
   * Filter tag mode where all items must have all tags.
   */
  private static readonly FILTER_TAG_MODE_ALL = "filterTagAll";

  /**
   * Filter tag mode where only the top level item has any of the tags.
   */
  private static readonly FILTER_TAG_MODE_ANY_TOP = "filterTagAnyTop";

  /**
   * Filter tag mode where only the top level item has all tags.
   */
  private static readonly FILTER_TAG_MODE_ALL_TOP = "filterTagAllTop";

  /**
   * Filter key for fiscal.
   */
  private static readonly FILTER_KEY_FISCAL = "filterFiscal";

  /**
   * Menu bar buttons.
   */
  private commandButtons: ProjectRoadmapCommandMenu;

  /**
   * Filter object for binding.
   */
  private filter: Filter = new Filter();

  /**
   * Filter for fiscal.
   */
  private filterFiscal = new DropdownSelection();

  /**
   * Filter for Area Path.
   */
  private filterAreaPath = new DropdownMultiSelection();

  /**
   * Filter for Work Item Type.
   */
  private filterWorkItem = new DropdownMultiSelection();

  /**
   * Filter for tag.
   */
  private filterTag = new DropdownMultiSelection();

  /**
   * The given filter needs a full re-query.
   */
  private filterRequiresFullQuery: boolean = false;

  /**
   * Filter for tag mode. Root or all.
   * - All: All items must have the tag.
   * - Top: Only the top level needs the tag.
   */
  private filterTagMode = new ObservableValue<string>(
    ProjectRoadmap.FILTER_TAG_MODE_ANY_TOP
  );

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
   * Tags available.
   */
  private availableTags: string[] = [];

  /**
   * Available Fiscals.
   */
  private availableFiscals: { id: string; text: string }[] =
    ProjectRoadmapUtil.getFiscalYearLists();

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
      modifiedAfter: ProjectRoadmapUtil.getPreviousFiscalYear(),
      isProperlyConfigured: true,
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

    that.filter.setFilterItemState(ProjectRoadmap.FILTER_KEY_FISCAL, {
      value: [that.availableFiscals[2].id],
    });

    that.filter.subscribe(() => {
      that.filterRoadmap();
    }, FILTER_CHANGE_EVENT);

    that.filterTagMode.subscribe((source, event) => {
      if (event === "select" || event === "unselect") {
        that.filterRoadmap();
      }
    });
  }

  /**
   * Update the filter fiscal.
   */
  private updateCurrentFilterSelected(): void {
    if (
      this.filterFiscal === undefined ||
      this.filterFiscal.value[0] === undefined
    ) {
      this.filterRequiresFullQuery = true;
      this.pageData.modifiedAfter = undefined;
      return;
    }

    var currentFiscalSelected =
      this.availableFiscals[this.filterFiscal.value[0].beginIndex].id;

    if (currentFiscalSelected === "Any") {
      this.filterRequiresFullQuery = this.pageData.modifiedAfter !== undefined;
      this.pageData.modifiedAfter = undefined;
    } else {
      this.filterRequiresFullQuery =
        this.pageData.modifiedAfter !== new Date(currentFiscalSelected);
      this.pageData.modifiedAfter = new Date(currentFiscalSelected);
    }
  }

  /**
   * Filter the roadmap.
   */
  private async filterRoadmap(): Promise<void> {
    this.updateCurrentFilterSelected();
    if (this.filterRequiresFullQuery) {
      this.pageData.roadmap = await ProjectRoadmapService.createGantt(
        this.pageData.modifiedAfter,
        // For future use to query historic roadmaps.
        this.pageData.asOf
      );
      this.filterRequiresFullQuery = false;
    }

    // Area Filtering
    const areaPaths: string[] = this.filter.getFilterItemState(
      ProjectRoadmap.FILTER_KEY_AREAPATH
    )?.value;

    // Keyword
    const keyword: string = this.filter.getFilterItemState(
      ProjectRoadmap.FILTER_KEY_KEYWORD
    )?.value;

    // Work Item Types.
    const workItemTypes: string[] = this.filter.getFilterItemState(
      ProjectRoadmap.FILTER_KEY_WIT
    )?.value;

    const workingAvailableTags: Set<string> = new Set();
    const visibleParents: Set<number> = new Set();

    // tags.
    const visibleTags: string[] = this.filter.getFilterItemState(
      ProjectRoadmap.FILTER_KEY_TAGS
    )?.value;

    // Loop over tasks to determine visibility and build up tag list.
    this.pageData.roadmap.forEach((entry) => {
      // See if it hidden.
      entry.hide =
        this.isHiddenWorkItemAreaPath(areaPaths, entry) ||
        this.isHiddenWorkItemType(workItemTypes, entry.type) ||
        this.isHiddenWorkItemKeyword(keyword, entry) ||
        this.isHiddenWorkItemTag(visibleTags, entry, visibleParents);

      // Add to tag list.
      if (entry.tags) {
        for (let tag of entry.tags) {
          workingAvailableTags.add(tag);
        }
      }
    });

    this.availableTags = Array.from(workingAvailableTags);
    this.populateGantt();
    this.refreshState();
  }

  /**
   * Check if the work item is hidden based off a tag.
   *
   * @param visibleTags tags that should be shown
   * @param currentTask the current task
   * @returns true if task should be hidden.
   */
  private isHiddenWorkItemTag(
    visibleTags: string[] | undefined,
    currentTask: ProjectRoadmapTaskEntity,
    visibleParents: Set<number>
  ): boolean {
    if (visibleTags && visibleTags.length > 0) {
      if (
        (this.filterTagMode.value === ProjectRoadmap.FILTER_TAG_MODE_ANY_TOP ||
          this.filterTagMode.value ===
            ProjectRoadmap.FILTER_TAG_MODE_ALL_TOP) &&
        !currentTask.top
      ) {
        if (visibleParents.has(currentTask.parent)) {
          visibleParents.add(currentTask.id);
          return false;
        }

        return true;
      }

      if (currentTask.tags.length === 0) {
        return true;
      }

      const filterAny =
        this.filterTagMode.value === ProjectRoadmap.FILTER_TAG_MODE_ANY ||
        this.filterTagMode.value === ProjectRoadmap.FILTER_TAG_MODE_ANY_TOP;
      let matches = 0;

      // Current task must have the tag.
      for (const t of visibleTags) {
        if (currentTask.tags.indexOf(t) !== -1) {
          matches++;

          if (filterAny) {
            // Matched one tag.
            visibleParents.add(currentTask.id);
            return false;
          }
        }
      }

      if (!filterAny && visibleTags.length === matches) {
        // Matched all tags.
        visibleParents.add(currentTask.id);
        return false;
      }

      return true;
    }

    return false;
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
      visibleWorkItemTypes &&
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
    this.pageData.isProperlyConfigured = true;
    this.filterRequiresFullQuery = true;
    this.refreshState();

    try {
      this.filterRoadmap();
    } catch (e) {
      console.log(e);
      this.pageData.isProperlyConfigured = false;
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

  private renderFilterMode(): JSX.Element {
    return (
      <div className="flex-grow center">
        <RadioButtonGroup
          direction={RadioButtonGroupDirection.Vertical}
          onSelect={(selectedId) => (this.filterTagMode.value = selectedId)}
          selectedButtonId={this.filterTagMode}
          text={"That have:"}
        >
          <RadioButton
            id={ProjectRoadmap.FILTER_TAG_MODE_ANY}
            text="Any tag"
            key={ProjectRoadmap.FILTER_TAG_MODE_ANY}
          />
          <RadioButton
            id={ProjectRoadmap.FILTER_TAG_MODE_ALL}
            text="All tags"
            key={ProjectRoadmap.FILTER_TAG_MODE_ALL}
          />
          <RadioButton
            id={ProjectRoadmap.FILTER_TAG_MODE_ANY_TOP}
            text="Top level any tag"
            key={ProjectRoadmap.FILTER_TAG_MODE_ANY_TOP}
          />
          <RadioButton
            id={ProjectRoadmap.FILTER_TAG_MODE_ALL_TOP}
            text="Top level all tags"
            key={ProjectRoadmap.FILTER_TAG_MODE_ALL_TOP}
          />
        </RadioButtonGroup>
        <hr />
      </div>
    );
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
            this.state.isProperlyConfigured === false && (
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
            this.state.roadmap.length === 0 && this.state.isProperlyConfigured && (
              <div className="flex-row v-align-middle justify-center full-size">
                <Spinner size={SpinnerSize.large} label="Please wait ..." />
              </div>
            )
          }
          {
            /**
             * Print on data.
             */
            this.state.roadmap.length > 0 && this.state.isProperlyConfigured && (
              <div className="flex-grow">
                <FilterBar filter={this.filter}>
                  <KeywordFilterBarItem
                    filterItemKey={ProjectRoadmap.FILTER_KEY_KEYWORD}
                    filter={this.filter}
                    placeholder="Filter by text contained in title (case-insensitive)"
                  />
                  <DropdownFilterBarItem
                    showFilterBox={true}
                    filterItemKey={ProjectRoadmap.FILTER_KEY_FISCAL}
                    filter={this.filter}
                    items={this.availableFiscals}
                    selection={this.filterFiscal}
                    placeholder="Modified After"
                  />
                  <DropdownFilterBarItem
                    showFilterBox={true}
                    filterItemKey={ProjectRoadmap.FILTER_KEY_WIT}
                    filter={this.filter}
                    items={this.getBacklogLevelItems()}
                    selection={this.filterWorkItem}
                    placeholder="Work Item Type"
                  />
                  <DropdownFilterBarItem
                    renderBeforeContent={this.renderFilterMode.bind(this)}
                    showFilterBox={true}
                    filterItemKey={ProjectRoadmap.FILTER_KEY_TAGS}
                    filter={this.filter}
                    items={this.availableTags}
                    selection={this.filterTag}
                    placeholder="Tags"
                  />

                  {this.areaPathList.length > 0 && (
                    // Only allow filtering area path if an area path does exist for a project.
                    <DropdownFilterBarItem
                      showFilterBox={true}
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
                  this.state.ganttConfig.data.tasks.length > 0 && (
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
                  this.state.ganttConfig.data.tasks.length === 0 && (
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
