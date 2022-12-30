import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

import { __client } from "../shared/client";
import { ICommand, IModule, initialiseModules, loadAllModules, setUpModules } from "../coreLib";
import { __COMMAND_HANDLER } from "../shared/globals";

const ReloadModules: ICommand = {
  info: { name: "Reload Modules", shortDescr: "Rescan directories and reload Modules" },
  builder: new DiscordJS.SlashCommandBuilder()
    .setName("soft-reset")
    .setDescription("Rescan directories and reload Modules"),
  episode: async (interaction: DiscordJS.ChatInputCommandInteraction) => {
    try {
      await loadAllModules();
      await setUpModules(__COMMAND_HANDLER);
      await interaction.reply({ ephemeral: true, content: "Done!" });
    } catch (err) {
      console.error(err);
      await interaction.reply({ ephemeral: true, content: "Something went wrong..." });
    }
  },
};

const Module: IModule = {
  tags: ["basic"],
  info: { name: "Reload", shortDescr: "Commands for resetting parts of the bot" },
  init: () => {
    __COMMAND_HANDLER.addCommandGlobal(ReloadModules, "Reload");
  },
};

export default Module;
