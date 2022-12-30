import logger from "./shared/logger";
import util from "util";
import fs from "fs";
import path from "path";
import pc from "picocolors";

import { init } from "./init";
import __CONFIGURATION__, { __REST } from "./shared/globals";

//Begin
logger.info("Starting Segfault");

//Hijack crash handler
process.on("uncaughtException", (error) => {
  logger.log({
    level: "critical",
    message: util.format(error),
    header: `${pc.red("An uncaught exception occurred!")}\n--------------------------`,
    footer: "--------------------------",
  });
});

interface IPersistFile {
  events: { [commandName: string]: string[] };
  config: { [commandName: string]: JSONValue };
}

//Check if critical files exist
//If /Storage exists
if (!fs.existsSync(__CONFIGURATION__.filepaths.storageLocation)) {
  logger.warn(
    `No storage directory exists at specified address, "${path.resolve(
      __CONFIGURATION__.filepaths.storageLocation
    )}", ("${__CONFIGURATION__.filepaths.storageLocation}")... Creating one.`
  );
  fs.mkdirSync(__CONFIGURATION__.filepaths.storageLocation);
}
//If global.json exists
if (!fs.existsSync(path.join(__CONFIGURATION__.filepaths.storageLocation, "global.json"))) {
  logger.warn(
    `No global storage exists in Storage location, "${path.resolve(
      path.join(__CONFIGURATION__.filepaths.storageLocation, "global.json")
    )}"... Creating one.`
  );
  fs.writeFileSync(path.join(__CONFIGURATION__.filepaths.storageLocation, "global.json"), "{}");
}

void init(process.argv.includes("-R"));
