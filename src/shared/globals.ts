import * as DiscordJS from "discord.js";

import { loadJSON5 } from "../common/load-JSON5";
import { ICommand, IModule } from "../coreLib";

import { CommandHandler } from "../coreLib/command-definitions";

/**
 * This is split into categories.
 * This is so certain categories can be disabled/unobservable by Modules.
 *
 */
interface IConfig {
  secrets: {
    //This will be hidden to Modules
    applicationID: ID;
    discordToken: string;
  };
  filepaths: {
    //This will be hidden to Modules
    commandLocations: FilePath[];
    storageLocation: FilePath;
    logLocation: FilePath;
  };
  other: {
    //This will be VISIBLE to Modules
    suppressNonFatalErrors: boolean;
    consoleLoggingLevel: "fatal" | "error" | "warn" | "info" | "verbose" | "debug" | "silly";
  };
}

//====================
//READ ONLYS
//====================
const __CONFIGURATION__ = loadJSON5<IConfig>("config.json5");
//Perform any modifications here
export default Object.freeze(__CONFIGURATION__);

//====================
//CONSTANTS
//====================
export const __REST = new DiscordJS.REST({ version: "10" }).setToken(__CONFIGURATION__.secrets.discordToken);

export const __LOADED_MODULES: Record<string, IModule> = {};

export const __GUILD_MODULES: Record<DiscordJS.Snowflake, string[]> = {};

export const __COMMAND_HANDLER = new CommandHandler(__CONFIGURATION__.secrets.applicationID, __REST);
