import {Logger} from "@tsed/logger";
import "@tsed/logger-file";

export let exportlogger = new Logger("loggerName");

exportlogger.appenders.set("everything", {
  type: "file",
  layout: {type: "basic"},
  filename: "logs/logs.log",
  pattern: ".yyyy-MM-dd-hh-mm",
  compress: true
});
