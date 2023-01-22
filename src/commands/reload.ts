import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

import { __client } from "../shared/client";
import { ICommand, IModule, initialiseModules, loadAllModules, postLoadModules, setUpModules } from "../coreLib";
import { __COMMAND_HANDLER } from "../shared/globals";

const ReloadModules: ICommand = {
  info: { name: "Reload Modules", shortDescr: "Rescan directories and reload Modules" },
  builder: new DiscordJS.SlashCommandBuilder()
    .setName("reload-modules")
    .setDescription("Rescan directories and reload Modules")
    .addBooleanOption((option) =>
      option.setName("resync").setDescription("Resynchronise commands with Discord").setRequired(false)
    ),
  episode: async (interaction: DiscordJS.ChatInputCommandInteraction) => {
    try {
      await loadAllModules();
      await setUpModules(__COMMAND_HANDLER);
      await postLoadModules();

      if (interaction.options.getBoolean("resync")) {
        await __COMMAND_HANDLER.sync("all");
      }

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
