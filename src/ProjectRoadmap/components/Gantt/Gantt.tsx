import * as React from "react";
import { Component } from "react";
import { gantt } from "dhtmlx-gantt";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import "./Gantt.css";
import { IGanttConfig } from "./IGantt.config";
import { DisplayInterval } from "../../DisplayInterval.enum";

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

    this.configureUI();
    this.configurePlugins();
    this.setScaleConfig(this.props.config.unit);
  }

  /**
   * Configure Gantt plugins.
   */
  private configurePlugins(): void {
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

    gantt.templates.tooltip_text = function (start: Date, end: Date, task) {
      let buildStr = "<b>Title:</b> " + task.text + "<br/>";

      if (task.unplanned) {
        buildStr += "<b>Progress:</b> Unplanned<br/>";
      } else {
        buildStr +=
          "<b>Progress:</b> " +
          task.progress +
          "<br/>" +
          "<b>Start:</b> " +
          Gantt.DATE_TO_STR(start) +
          "<br/><b>End:</b> " +
          Gantt.DATE_TO_STR(end) +
          "<br/>";
      }

      return buildStr;
    };
  }

  /**
   * Mounting event
   */
  componentDidMount() {
    if (this.ganttContainer) {
      gantt.init(this.ganttContainer);
      gantt.parse(this.props.config.data);
    }
  }

  /**
   * Configure the UI.
   */
  private configureUI(): void {
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
      { name: "end_date", label: "End Date", align: "center", width: 100 },
    ];

    // Timeline tasks display.
    gantt.templates.rightside_text = function (start, end, task) {
      return task.text;
    };

    gantt.templates.task_text = function (start, end, task) {
      return "";
    };
  }

  /**
   * Scale change
   *
   * @param level defined as either day, week, biweek, month, quarter or year.
   */
  private setScaleConfig(level: DisplayInterval): void {
    console.log("Set " + level);
    switch (level) {
      case DisplayInterval.Day:
        gantt.config.scales = [{ unit: "day", step: 1, format: "%M %d" }];
        gantt.config.scale_height = 27;
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
      case DisplayInterval.Sprint:
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
          { unit: "month", step: 1, format: "%F, %Y" },
          { unit: "day", step: 7, format: "%j" },
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
        gantt.config.scales = [
          { unit: "year", step: 1, format: "%Y" },
          { unit: "month", step: 1, format: "%M" },
        ];
        gantt.config.scale_height = 90;
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
        style={{ width: "100%", height: "650px" }}
      ></div>
    );
  }
}
