// CSS
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import "./Gantt.css";

// Library
import * as React from "react";
import { Button } from "azure-devops-ui/Button";
import { Component } from "react";
import { gantt } from "dhtmlx-gantt";
import { TextField, TextFieldWidth } from "azure-devops-ui/TextField";

// Project
import { DisplayInterval } from "../../DisplayInterval.enum";
import { GanttTask } from "./GanttTask";
import { IGanttConfig } from "./IGantt.config";
import {
  ProjectService,
  WorkItemProcessService,
} from "@esdc-it-rp/azuredevops-common";

/**
 * Gantt component leveraging dhtmlxGantt which is an open source JavaScript
 * Gantt chart that helps you illustrate a project schedule in a nice-looking chart.
 *
 * @see https://github.com/DHTMLX/gantt
 * @see https://docs.dhtmlx.com/gantt/
 */
export default class Gantt extends Component<
  { config: IGanttConfig },
  { findId: string }
> {
  /**
   * The expected format of the date.
   */
  public static DATE_FORMAT = "%Y-%m-%d";

  /**
   * Format the date function.
   * Call it by Gantt.DATE_TO_STR(date) to return a string in the configured format.
   */
  public static DATE_TO_STR = gantt.date.date_to_str(Gantt.DATE_FORMAT);

  /**
   * The container.
   */
  private ganttContainer: HTMLElement | null = null;

  /**
   * The ID requesting focus.
   */
  private focusSearchId: string = "";

  /**
   * Constructor.
   *
   * @param props props being sent in.
   */
  constructor(props: { config: IGanttConfig }) {
    super(props);
    this.state = {
      findId: this.focusSearchId,
    };

    gantt.config.date_format = Gantt.DATE_FORMAT;
    gantt.config.show_unscheduled = true;
    gantt.config.show_errors = false;
    gantt.config.currentUnit = this.props.config.unit;

    // Temp disable editting, we'll need to do api calls to update the items.
    gantt.config.readonly = true;

    this.configureUI();
    this.configurePlugins();
    this.setScaleConfig(this.props.config.unit);
  }

  public toggleGrid(visible: boolean): void {
    if (this.ganttContainer) {
      gantt.config.layout = visible
        ? gantt.config.layout_full
        : gantt.config.layout_ganttonly;
      gantt.init(this.ganttContainer);
    }
  }

  /**
   * Toggle open and close of tree nodes.
   *
   * @param open true to expand all, otherwise false to collapse all.
   */
  public toggleOpenAll(open: boolean): void {
    gantt.eachTask(function (task) {
      task.$open = open;
    });
    gantt.render();
  }

  /**
   * Select a task and give it focus.
   *
   * @param event the event fired.
   * @param id the task ID to focus on.
   */
  public selectTask(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    id: string
  ): void {
    this.focusSearchId = id;
    let parentId: string | number = id;

    if (gantt.isTaskExists(id)) {
      while ((parentId = gantt.getParent(parentId)) !== 0) {
        gantt.open(parentId);
      }

      gantt.selectTask(id);
      gantt.showTask(id);
    }

    this.setState({
      findId: this.focusSearchId,
    });
  }

  /**
   * Configure Gantt plugins.
   */
  private configurePlugins(): void {
    const _self = this;

    gantt.plugins({
      // https://docs.dhtmlx.com/gantt/desktop__extensions_list.html#keyboardnavigation
      keyboard_navigation: true,
      // https://docs.dhtmlx.com/gantt/desktop__extensions_list.html#quickinfo
      quick_info: true,
      // https://docs.dhtmlx.com/gantt/desktop__extensions_list.html#verticalmarker
      marker: true,
      // https://docs.dhtmlx.com/gantt/desktop__extensions_list.html#tooltip
      tooltip: true,
    });

    gantt.templates.tooltip_text = function (
      start: Date,
      end: Date,
      task: GanttTask
    ) {
      let buildStr =
        "<b>Title:</b> " +
        task.text +
        "<br/><b>State:</b> " +
        task.state +
        "<br/>";

      if (task.unscheduled) {
        buildStr += "<b>Progress:</b> Unplanned<br/>";
      } else {
        buildStr +=
          "<b>Progress:</b> " +
          Math.round(task.progress * 100) +
          "%<br/>" +
          "<b>" +
          (task.calculatedStart ? "Estimated " : "") +
          "Start:</b> " +
          Gantt.DATE_TO_STR(start) +
          "<br/><b>" +
          (task.calculatedEnd ? "Estimated " : "") +
          "Target:</b> " +
          Gantt.DATE_TO_STR(end) +
          "<br/>";
      }

      return buildStr;
    };

    // Configure the quick info
    gantt.config.quickinfo_buttons = ["edit_details_button"];
    gantt.locale.labels["edit_details_button"] = "Edit Item";
    gantt.$click.buttons.edit_details_button = function (id: string) {
      _self.openWorkitem(id);
      return false; //blocks the default behavior
    };

    // Default is to substring at 50, prevent that.
    gantt.templates.quick_info_title = function (
      start: Date,
      end: Date,
      task: GanttTask
    ) {
      return task.text;
    };

    gantt.templates.quick_info_date = function (
      start: Date,
      end: Date,
      task: GanttTask
    ) {
      return Gantt.DATE_TO_STR(start) + " - " + Gantt.DATE_TO_STR(end);
    };

    gantt.templates.quick_info_content = function (
      start: Date,
      end: Date,
      task: GanttTask
    ) {
      return (
        '<div class="gantt-qi-description">' +
        (task.description ? task.description : "") +
        "</div>"
      );
    };
  }

  /**
   * Handle when select is clicked.
   *
   * @param id the work item ID
   */
  private async openWorkitem(id: string): Promise<void> {
    const witItemUrl = await ProjectService.generateWitEditUrl(id);
    window.open(witItemUrl, "_blank");
  }

  /**
   * Mounting event
   */
  componentDidMount() {
    if (this.ganttContainer) {
      gantt.init(this.ganttContainer);
      gantt.clearAll();
      gantt.parse(this.props.config.data);
      this.toggleOpenAll(false);
      // Configure marker.
      gantt.addMarker({
        start_date: new Date(),
        css: "today",
        text: "Today",
      });
    }
  }

  /**
   * Configure the UI.
   */
  private configureUI(): void {
    const _self = this;

    // Configure the Container.
    gantt.config.layout_full = {
      css: "gantt_container",
      cols: [
        {
          width: 400,
          min_width: 300,
          rows: [
            {
              view: "grid",
              scrollX: "gridScroll",
              scrollable: true,
              scrollY: "scrollVer",
            },

            // horizontal scrollbar for the grid
            { view: "scrollbar", id: "gridScroll", group: "horizontal" },
          ],
        },
        { resizer: true, width: 1 },
        {
          rows: [
            { view: "timeline", scrollX: "scrollHor", scrollY: "scrollVer" },

            // horizontal scrollbar for the timeline
            { view: "scrollbar", id: "scrollHor", group: "horizontal" },
          ],
        },
        { view: "scrollbar", id: "scrollVer" },
      ],
    };

    gantt.config.layout_ganttonly = {
      css: "gantt_container",
      cols: [
        gantt.config.layout_full.cols[2],
        gantt.config.layout_full.cols[3],
      ],
    };

    gantt.config.layout = gantt.config.layout_full;

    // Task table columns.
    gantt.config.columns = [
      { name: "id", label: "ID", width: "50" },
      { name: "text", label: "Title", width: "*", tree: true },
      { name: "start_date", label: "Start Date", align: "center", width: 100 },
      { name: "end_date", label: "Target Date", align: "center", width: 100 },
    ];

    // Timeline tasks display.
    gantt.templates.rightside_text = function (
      start: Date,
      end: Date,
      task: GanttTask
    ) {
      return task.text;
    };

    gantt.templates.task_text = function (
      start: Date,
      end: Date,
      task: GanttTask
    ) {
      return "";
    };

    gantt.templates.task_class = function (
      start: Date,
      end: Date,
      task: GanttTask
    ) {
      const workItemType = WorkItemProcessService.getCachedWorkItemTypes().get(
        task.azureType
      );
      if (
        workItemType &&
        workItemType.stateCompleted.indexOf(task.state) === -1 &&
        workItemType.stateInProgress.indexOf(task.state) === -1
      ) {
        return "gantt-estimated";
      }

      return "";
    };

    // Table
    gantt.templates.grid_folder = function (task: GanttTask) {
      return _self.generateIndicator(task);
    };

    gantt.templates.grid_file = function (task: GanttTask) {
      return _self.generateIndicator(task);
    };

    // Indicate holidays and weekends in gantt chart.
    gantt.templates.scale_cell_class = function (date: Date): string {
      if (gantt.config.currentUnit === DisplayInterval.Day) {
        if (date.getDay() == 0 || date.getDay() == 6) {
          return "gantt-chart-holiday";
        }
      }

      return "";
    };

    gantt.templates.timeline_cell_class = function (
      task: GanttTask,
      date: Date
    ): string {
      if (gantt.config.currentUnit === DisplayInterval.Day) {
        if (date.getDay() == 0 || date.getDay() == 6) {
          return "gantt-chart-holiday";
        }
      }

      return "";
    };
  }

  /**
   * Generate the visual "border" for the work item types.
   * @param azureType the work item
   * @returns the HTML to show the different types.
   */
  private generateIndicator(task: GanttTask): string {
    let backgroundColor = "";

    const workItemType = WorkItemProcessService.getCachedWorkItemTypes().get(
      task.azureType
    );
    if (workItemType) {
      backgroundColor = "background-color: " + workItemType.color;
    }

    return (
      "<div aria-label='" +
      task.azureType +
      "' class='gantt-symbol' role='figure' style='" +
      backgroundColor +
      "'></div>"
    );
  }

  /**
   * Scale change
   *
   * @param level defined as either day, week, biweek, month, quarter or year.
   */
  private setScaleConfig(level: DisplayInterval): void {
    switch (level) {
      case DisplayInterval.Day:
        gantt.config.scales = [
          { unit: "month", step: 1, format: "%Y %F" },
          { unit: "day", step: 1, format: "%j" },
        ];
        gantt.config.scale_height = 50;
        break;
      case DisplayInterval.Week:
        var weekScaleTemplate = function (date: Date) {
          var dateToStr = gantt.date.date_to_str("%M %d");
          var endDate = gantt.date.add(
            gantt.date.add(date, 1, "week"),
            -1,
            "day"
          );
          return (
            "Week " +
            gantt.date.getWeek(date) +
            ":  " +
            dateToStr(date) +
            " - " +
            dateToStr(endDate)
          );
        };
        gantt.config.scales = [
          { unit: "week", step: 1, format: weekScaleTemplate },
          { unit: "day", step: 1, format: "%D" },
        ];
        gantt.config.scale_height = 50;
        break;
      case DisplayInterval["Bi-Weekly"]:
        var weekScaleTemplate = function (date: Date) {
          var dateToStr = gantt.date.date_to_str("%d %M");
          var endDate = gantt.date.add(
            gantt.date.add(date, 2, "week"),
            -1,
            "day"
          );
          return dateToStr(date) + " - " + dateToStr(endDate);
        };
        gantt.config.scales = [
          { unit: "week", step: 2, format: weekScaleTemplate },
          { unit: "day", step: 1, format: "%D" },
        ];
        gantt.config.scale_height = 50;
        break;
      case DisplayInterval.Month:
        gantt.config.scales = [
          { unit: "year", step: 1, format: "%Y" },
          { unit: "month", step: 1, format: "%M" },
        ];
        gantt.config.scale_height = 50;
        break;
      case DisplayInterval.Quarter:
        var quarterLabel = function (date: Date) {
          var month = date.getMonth();
          var qNumber;

          if (month >= 9) {
            qNumber = 3;
          } else if (month >= 6) {
            qNumber = 2;
          } else if (month >= 3) {
            qNumber = 1;
          } else {
            qNumber = 4;
          }

          return "Q" + qNumber;
        };
        gantt.config.scales = [
          { unit: "year", step: 1, format: "%Y" },
          { unit: "quarter", step: 1, format: quarterLabel },
        ];
        gantt.config.scale_height = 50;
        break;
      case DisplayInterval.Year:
        gantt.config.scales = [{ unit: "year", step: 1, format: "%Y" }];
        break;
    }
  }

  render() {
    return (
      <div>
        <div className="flex-row margin-bottom-8">
          <TextField
            ariaLabel="Go to"
            containerClassName="gantt-id-lookup"
            prefixIconProps={{ iconName: "Search" }}
            value={this.focusSearchId}
            onChange={this.selectTask.bind(this)}
            placeholder="ID"
            width={TextFieldWidth.standard}
          />
          <div className="flex-column padding-left-16">
            <Button text="Show Chart" onClick={() => this.toggleGrid(true)} />
          </div>
          <div className="flex-column padding-left-4 gantt-buttons">
            <Button text="Hide Chart" onClick={() => this.toggleGrid(false)} />
          </div>
          <div className="flex-column padding-left-16 gantt-buttons">
            <Button
              text="Show Today"
              onClick={() => gantt.showDate(new Date())}
            />
          </div>
          <div className="flex-column padding-left-16">
            <Button
              text="Expand All"
              iconProps={{ iconName: "ZoomIn" }}
              onClick={() => this.toggleOpenAll(true)}
            />
          </div>
          <div className="flex-column padding-left-4 flex-end">
            <Button
              text="Collapse All"
              iconProps={{ iconName: "ZoomOut" }}
              onClick={() => this.toggleOpenAll(false)}
            />
          </div>
        </div>
        <div
          className="full-size"
          ref={(input) => {
            this.ganttContainer = input;
          }}
          style={{ width: "100%", height: "700px" }}
        ></div>
      </div>
    );
  }
}
