import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

import logger from "../shared/logger";
import { IInfo } from "./module-definitions";

type TBuilder =
  | DiscordJS.SlashCommandBuilder
  | DiscordJS.ContextMenuCommandBuilder
  | Omit<DiscordJS.SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;

export interface ICommand {
  info: IInfo;
  builder: TBuilder;
  episode: TEpisode;
}

interface ICommandStoreItem {
  command: ICommand;
  moduleName: string;
  guilds?: DiscordJS.Snowflake[];
}

export class CommandHandler {
  private commandStore: { [key in DiscordJS.ApplicationCommandType]: Record<string, ICommandStoreItem> };
  private appID: ID;
  private REST: DiscordJS.REST;

  constructor(appID: ID, REST: DiscordJS.REST) {
    this.commandStore = { 1: {}, 2: {}, 3: {} };
    this.appID = appID;
    this.REST = REST;
  }

  addCommand(command: ICommand, moduleName: string, guilds?: DiscordJS.Snowflake[]) {
    //TODO: Combine identical Commands, with different guilds
    //Also, overhaul this real crappy logic
    if (command.builder instanceof DiscordJS.SlashCommandBuilder) {
      if (this.commandStore[1][command.builder.name]) throw new CoreLibError("Command already exists with name!");
      else this.commandStore[1][command.builder.name] = { command: command, moduleName: moduleName, guilds: guilds };
    } else if ((command.builder as DiscordJS.ContextMenuCommandBuilder).type == DiscordJS.ApplicationCommandType.User) {
      if (this.commandStore[2][command.builder.name]) throw new CoreLibError("Command already exists with name!");
      else this.commandStore[2][command.builder.name] = { command: command, moduleName: moduleName, guilds: guilds };
    } else if (
      (command.builder as DiscordJS.ContextMenuCommandBuilder).type == DiscordJS.ApplicationCommandType.Message
    ) {
      if (this.commandStore[3][command.builder.name]) throw new CoreLibError("Command already exists with name!");
      else this.commandStore[3][command.builder.name] = { command: command, moduleName: moduleName, guilds: guilds };
    }
  }

  //TODO: Redo function
  addCommandGlobal(command: ICommand, moduleName: string) {
    this.addCommand(command, moduleName);
  }

  removeCommand(commandName: string, guilds?: DiscordJS.Snowflake[] | "all") {
    //TODO: Implement
  }

  removeCommandByModule(moduleName: string) {
    //TODO: Implement
  }

  clear() {
    this.commandStore = { 1: {}, 2: {}, 3: {} };
    logger.debug("Command Store cleared");
  }

  async call(interaction: TInteraction, commandName: string, guild?: string | "global") {
    const commandType = interaction.commandType as 1 | 2 | 3;
    for (const command in this.commandStore[commandType]) {
      //TODO: Awful comparison
      if (
        this.commandStore[commandType][commandName].command.builder.name == commandName &&
        (((guild == "global" || guild == undefined) &&
          (this.commandStore[commandType][commandName].guilds === undefined ||
            this.commandStore[commandType][commandName].guilds!.length === 0)) ||
          (this.commandStore[commandType][commandName].guilds &&
            guild &&
            this.commandStore[commandType][commandName].guilds!.includes(guild)))
      ) {
        await this.commandStore[commandType][commandName].command.episode(interaction);
        return;
      }
    }

    if (guild == "global" || guild === undefined)
      throw new InvalidCommand(`Command "${commandName}" does not exist globally`);
    else throw new InvalidCommand(`Command "${commandName}" does not exist in Guild "${guild}"`);
  }

  async sync(guilds: DiscordJS.Snowflake[] | "all" | "global") {
    const commandList: TBuilder[] = [];

    //TODO: Populate this with the actual correct items to populate
    for (let commandType = 1; commandType < 3; commandType++) {
      for (const commandName in this.commandStore[commandType as 1 | 2 | 3]) {
        if (
          this.commandStore[commandType as 1 | 2 | 3][commandName].guilds === undefined ||
          this.commandStore[commandType as 1 | 2 | 3][commandName].guilds!.length === 0
        ) {
          commandList.push(this.commandStore[commandType as 1 | 2 | 3][commandName].command.builder);
        }
      }
    }

    await this.REST.put(DiscordAPI.Routes.applicationCommands(this.appID), {
      body: commandList,
    })
      .then(() => logger.info("Successfully registered global commands."))
      .catch((err) => {
        throw err;
      });
  }
}

export type TInteraction = DiscordJS.CommandInteraction;

export type TEpisode = (interaction: any) => Promise<void>;

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
