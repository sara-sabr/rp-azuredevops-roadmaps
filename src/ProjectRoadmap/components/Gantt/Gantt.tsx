import * as React from "react";
import { Component } from "react";
import { gantt } from "dhtmlx-gantt";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import "./Gantt.css";
import { IGanttConfig } from "./IGantt.config";
import { DisplayInterval } from "../../DisplayInterval.enum";
import { Constants, ProjectService } from "@esdc-it-rp/azuredevops-common";
import { GanttTask } from "./GanttTask";

/**
 * Gantt component leveraging dhtmlxGantt which is an open source JavaScript
 * Gantt chart that helps you illustrate a project schedule in a nice-looking chart.
 *
 * @see https://github.com/DHTMLX/gantt
 * @see https://docs.dhtmlx.com/gantt/
 */
export default class Gantt extends Component<{ config: IGanttConfig }> {
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
   * Constructor.
   *
   * @param props props being sent in.
   */
  constructor(props: { config: IGanttConfig }) {
    super(props);

    gantt.config.date_format = Gantt.DATE_FORMAT;
    gantt.config.show_unscheduled = true;
    // Temp disable editting, we'll need to do api calls to update the items.
    gantt.config.readonly = true;
    this.configureUI();
    this.configurePlugins();
    this.setScaleConfig(this.props.config.unit);
  }

  /**
   * Toggle open and close of tree nodes.
   *
   * @param open true to expand all, otherwise false to collapse all.
   */
  public static toggleOpenAll(open: boolean) {
    gantt.eachTask(function(task){
      task.$open = open;
    });
    gantt.render();
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
      let buildStr = "<b>Title:</b> " + task.text + "<br/>";

      if (task.unscheduled) {
        buildStr += "<b>Progress:</b> Unplanned<br/>";
      } else {
        buildStr +=
          "<b>Progress:</b> " +
          Math.round(task.progress * 100) +
          "%<br/>" +
          "<b>" +
          (task.calculatedDates ? "Calculated " : "") +
          "Start:</b> " +
          Gantt.DATE_TO_STR(start) +
          "<br/><b>" +
          (task.calculatedDates ? "Calculated " : "") +
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
    gantt.templates.quick_info_content = function (
      start: Date,
      end: Date,
      task: GanttTask) {
      return task.description;
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
    }
  }

  /**
   * Configure the UI.
   */
  private configureUI(): void {
    const _self = this;

    // Configure the Container.
    gantt.config.layout = {
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
      task: GanttTask) {
      return task.text;
    };

    gantt.templates.task_text = function (
      start: Date,
      end: Date,
      task: GanttTask) {
      return "";
    };

    gantt.templates.task_class = function (
      start: Date,
      end: Date,
      task: GanttTask) {
        return "gantt-" + _self.getTaskSuffixClass(task);
    };

    gantt.templates.grid_folder = function(task: GanttTask) {
      return _self.getSymbolClass(task.azureType);
    };

    gantt.templates.grid_file = function(task: GanttTask) {
      return  _self.getSymbolClass(task.azureType);
    };
  }

  /**
   * Generate the visual "border" for the work item types.
   * @param azureType the work item
   * @returns the HTML to show the different types.
   */
  private getSymbolClass(azureType: string):string {
    let extraClass = "";

    switch (azureType) {
      case Constants.WIT_TYPE_EPIC:
        extraClass = "gantt-symbol-epic";
        break;
      case Constants.WIT_TYPE_FEATURE:
        extraClass = "gantt-symbol-feature";
        break;
      case Constants.WIT_TYPE_PBI:
        extraClass =  "gantt-symbol-pbi";
        break;
      default:
        return "";
    }

    return "<div aria-label='Epic' class='gantt-symbol " + extraClass +  "' role='figure'></div>";
  }

  /**
   * Return the suffix for a given task
   *
   * @param task the task
   * @returns the suffix for the given task.
   */
  private getTaskSuffixClass(task: GanttTask):string {
    switch (task.azureType) {
      case Constants.WIT_TYPE_EPIC: return "epic";
      case Constants.WIT_TYPE_FEATURE: return "feature";
      case Constants.WIT_TYPE_PBI: return "pbi";
      default:
        return "";
    }
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
      <div
        className="full-size"
        ref={(input) => {
          this.ganttContainer = input;
        }}
        style={{ width: "100%", height: "740px" }}
      ></div>
    );
  }
}
