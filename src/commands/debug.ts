import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

import { __client } from "../shared/client";
import { ICommand, IModule, loadAllModules } from "../coreLib";
import { __COMMAND_HANDLER, __LOADED_MODULES } from "../shared/globals";

const ReloadCommands: ICommand = {
  info: { name: "Debug", shortDescr: "Debug Slash Command" },
  builder: new DiscordJS.SlashCommandBuilder()
    .setName("debug")
    .setDescription("A dummy command used for debugging purposes."),
  episode: async (interaction: DiscordJS.ChatInputCommandInteraction) => {
    console.debug(__LOADED_MODULES);
    console.debug(__COMMAND_HANDLER);
  },
};

const Module: IModule = {
  tags: ["basic"],
  info: { name: "Debug", shortDescr: "Debug tools" },
  init: () => {
    __COMMAND_HANDLER.addCommandGlobal(ReloadCommands, "Debug");
  },
};

export default Module;
