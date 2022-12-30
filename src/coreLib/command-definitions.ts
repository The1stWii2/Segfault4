import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

import logger from "../shared/logger";
import { IInfo } from "./module-definitions";

export interface ICommand {
  info: IInfo;
  builder: DiscordJS.SlashCommandBuilder | DiscordJS.ContextMenuCommandBuilder;
  episode: TEpisode;
}

interface ICommandStoreItem {
  command: ICommand;
  moduleName: string;
  guilds?: DiscordJS.Snowflake[];
}

export class CommandHandler {
  private commandStore: ICommandStoreItem[];
  private appID: ID;
  private REST: DiscordJS.REST;

  constructor(appID: ID, REST: DiscordJS.REST) {
    this.commandStore = [];
    this.appID = appID;
    this.REST = REST;
  }

  addCommand(command: ICommand, moduleName: string, guilds: DiscordJS.Snowflake[]) {
    //TODO: Combine identical Commands, with different guilds
    this.commandStore.push({ command: command, moduleName: moduleName, guilds: guilds });
  }

  addCommandGlobal(command: ICommand, moduleName: string) {
    //TODO: Combine identical Commands, with different guilds
    this.commandStore.push({ command: command, moduleName: moduleName });
  }

  removeCommand(commandName: string, guilds?: DiscordJS.Snowflake[] | "all") {
    //TODO: Implement
  }

  removeCommandByModule(moduleName: string) {
    let index = -2;
    do {
      index = this.commandStore.findIndex((element) => element.moduleName == moduleName);
      if (index >= 0) this.commandStore.splice(index, 1);
    } while (index >= 0);
  }

  clear() {
    this.commandStore = [];
    logger.debug("Command Store cleared");
  }

  async call(interaction: TInteraction, commandName: string, guild?: string | "global") {
    for (const command of this.commandStore) {
      //TODO: Awful comparison
      if (
        command.command.builder.name == commandName &&
        (((guild == "global" || guild == undefined) && (command.guilds === undefined || command.guilds.length === 0)) ||
          (command.guilds && guild && command.guilds.includes(guild)))
      ) {
        await command.command.episode(interaction);
        return;
      }
    }
    if (guild == "global" || guild === undefined)
      throw new InvalidCommand(`Command "${commandName}" does not exist globally`);
    else throw new InvalidCommand(`Command "${commandName}" does not exist in Guild "${guild}"`);
  }

  async sync(guilds: DiscordJS.Snowflake[] | "all" | "global") {
    const commandList: (DiscordJS.SlashCommandBuilder | DiscordJS.ContextMenuCommandBuilder)[] = [];

    //TODO: Populate this with the actual correct items to populate
    for (const command of this.commandStore) {
      if (command.guilds === undefined || command.guilds.length === 0) {
        commandList.push(command.command.builder);
      }
    }

    await this.REST.put(DiscordAPI.Routes.applicationCommands(this.appID), {
      body: commandList,
    })
      .then(() => logger.info("Successfully registered global commands."))
      .catch((err) => logger.error(String(err)));
  }
}

export type TInteraction = DiscordJS.ContextMenuCommandInteraction & DiscordJS.ChatInputCommandInteraction;

export type TEpisode = (interaction: TInteraction) => Promise<void>;

class CoreLibError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidCommand extends CoreLibError {
  constructor(message: string) {
    super(message);
  }
}
