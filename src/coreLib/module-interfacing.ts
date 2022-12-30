import __CONFIGURATION__, { __COMMAND_HANDLER, __LOADED_MODULES } from "../shared/globals";
import logger from "../shared/logger";
import fs from "fs";
import path from "path";
import pc from "picocolors";
import importFresh from "import-fresh";

import { IModule } from "./module-definitions";
import { loadStoreFile } from "./store-interfacing";
import { CommandHandler } from "./command-definitions";

//Intermediate interface, as we extract the actual module from default
interface ICommandLoader {
  default: IModule;
}

export async function loadModule(filepath: FilePath) {
  try {
    const { default: module } = importFresh<ICommandLoader>(filepath);

    //If module already loaded.
    if (__LOADED_MODULES[module.info.name]) {
      logger.warn(
        `Module with name "${module.info.name}" already exists, previous Module will be discarded!` +
          "\nIf you are reloading modules, you can ignore this."
      );
      delete __LOADED_MODULES[module.info.name];
      __COMMAND_HANDLER.removeCommandByModule(module.info.name);
    }
    __LOADED_MODULES[module.info.name] = module;

    logger.debug(`Finished loading Module "${module.info.name}"`);
  } catch (e) {
    if (!__CONFIGURATION__.other.suppressNonFatalErrors) throw e;
    logger.log({
      level: "error",
      // @ts-expect-error Winston's type declaration for "message" is incorrect.
      message: e,
      header: `Failed to import "${filepath}"\n--------------------------`,
      footer: "--------------------------",
    });

    logger.warn("Skipping file... This may cause instability!");
  }
}

export async function loadAllModules() {
  logger.info("Importing Modules...");
  const startTime = performance.now();

  //Clear current Store
  for (const key in __LOADED_MODULES) {
    delete __LOADED_MODULES[key];
  }

  //Get and load Modules
  for (const dir of __CONFIGURATION__.filepaths.commandLocations) {
    const files = fs.readdirSync(dir).filter((item) => item.endsWith(".ts"));
    for (const file of files) {
      logger.verbose(`Loading Module "${file}"`);
      await loadModule(path.join(dir, file));
    }
  }

  logger.info(`Completed loading Modules. Took ${(performance.now() - startTime).toPrecision(4)}ms`);
}

export async function initialiseModules() {
  //Run any Init functions
  for (const moduleName in __LOADED_MODULES) {
    if (typeof __LOADED_MODULES[moduleName].init === "function") {
      logger.info(`"${moduleName}" running Init function.`);

      const store = loadStoreFile("global", moduleName);
      //@ts-expect-error Apparently TS type inference fails here. It still thinks "once" can be undefined.
      __LOADED_MODULES[moduleName].init(store);
    }
  }
}

export async function loadGuildStoreModules() {
  //Load Guild configs
  const files = fs
    .readdirSync(__CONFIGURATION__.filepaths.storageLocation)
    .filter((item) => item.match(/\d.+?\.json/))
    .map((item) => path.parse(item).name);
  for (const file of files) {
    logger.verbose(`Guild "${file}" store loaded.`);

    //TODO: Should probably extract this logic.
    for (const moduleName in __LOADED_MODULES) {
      if (typeof __LOADED_MODULES[moduleName].guildLoad === "function") {
        logger.info(`"${moduleName}" running Guild Init function.`);

        const store = loadStoreFile(file as `${number}`, moduleName);
        //@ts-expect-error Apparently TS type inference fails here. It still thinks "once" can be undefined.
        __LOADED_MODULES[moduleName].guildLoad(file as `${number}`, store);
      }
    }
  }
}

export async function postLoadModules() {
  //Run any Post Init functions
  for (const moduleName in __LOADED_MODULES) {
    if (typeof __LOADED_MODULES[moduleName].postLoad === "function") {
      logger.info(`"${moduleName}" running Post Init function.`);

      const config = loadStoreFile("global", moduleName);
      //@ts-expect-error Apparently TS type inference fails here. It still thinks "once" can be undefined.
      __LOADED_MODULES[moduleName].postLoad(config);
    }
  }
}

export async function setUpModules(commandHandler: CommandHandler) {
  commandHandler.clear();
  await initialiseModules();
  await loadGuildStoreModules();
  await postLoadModules();
}
