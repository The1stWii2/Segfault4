import * as Winston from "winston";
import dayjs from "dayjs";
import __CONFIGURATION__ from "./globals";
import util from "util";

const logLevels = {
  levels: {
    critical: 0,
    error: 1,
    warn: 2,
    info: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
  },
  colours: {
    critical: "white redBG bold",
    error: "red bold",
    warn: "yellow bold",
    info: "cyan",
    verbose: "white underline",
    debug: "grey",
    silly: "black whiteBG",
  },
};

const matchANSI = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

Winston.addColors(logLevels.colours);

interface ILogEntry {
  level: keyof typeof logLevels.levels;
  message: unknown;
  stack?: string;
  timestamp: string;
  header?: string;
  footer?: string;
}

function parseLog(log: ILogEntry) {
  //Strip ANSI, to get actual word length
  const wordDiff = log.level.length - log.level.replace(matchANSI, "").length;

  const timestamp = dayjs().format("HH:mm:ss");
  const logLines = (
    (log.header ? log.header + "\n" : "") +
    (log.stack ? log.stack : util.format(log.message)) +
    (log.footer ? "\n" + log.footer : "")
  ).split("\n");

  const output = [];
  for (let i = 0; i < logLines.length; i++) {
    if (i == 0) output.push(`[${timestamp}] ${log.level}:`.padEnd(wordDiff + 21));

    if (i != 0) {
      if (i == logLines.length - 1) output.push(" ".repeat(11), "╙".padEnd(10));
      else output.push(" ".repeat(11), "║".padEnd(10));
    }

    output.push(logLines[i]);

    if (i != logLines.length - 1) output.push("\n");
  }

  return output.join("");

  //return `[${}] ${log.level}:`.padEnd(wordDiff + 20) + log.message + log.stack;
}

const logger = Winston.createLogger({
  levels: logLevels.levels,
  format: Winston.format.errors({ stack: true }),
  transports: [
    new Winston.transports.Console({
      level: __CONFIGURATION__.other.consoleLoggingLevel,
      format: Winston.format.combine(
        Winston.format.colorize(),
        Winston.format.printf((log) => parseLog(log as ILogEntry))
      ),
    }),
    new Winston.transports.File({
      filename: `logs/Segfault ${dayjs().format("YYYY-MM-DD HH-mm-ss")}.log`,
      level: "info",
      format: Winston.format.combine(Winston.format.timestamp(), Winston.format.prettyPrint()),
    }),
  ],
}) as SegLogger;

export default logger;

//Welcome to the Land of TypeScript and ESLint Complaints.
/* eslint-disable @typescript-eslint/no-unsafe-argument */

//Hijack Console outputs
//@ts-expect-error The arguments are fine.
console.log = (...args) => logger.info.call(logger, ...args);
//@ts-expect-error The arguments are fine.
console.info = (...args) => logger.verbose.call(logger, ...args);
//@ts-expect-error The arguments are fine.
console.warn = (...args) => logger.warn.call(logger, ...args);
//@ts-expect-error The arguments are fine.
console.error = (...args) => logger.error.call(logger, ...args);
//@ts-expect-error The arguments are fine.
console.debug = (...args) => logger.debug.call(logger, ...args);
