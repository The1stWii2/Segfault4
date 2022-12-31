import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

import { __client } from "../shared/client";
import { ICommand, IModule, loadAllModules } from "../coreLib";
import { __COMMAND_HANDLER, __LOADED_MODULES } from "../shared/globals";

const SegInfo: ICommand = {
  info: { name: "Info", shortDescr: "Information about Segfault" },
  builder: new DiscordJS.SlashCommandBuilder().setName("info").setDescription("Information about Segfault."),
  episode: async (interaction: DiscordJS.ContextMenuCommandInteraction) => {
    const embed = new DiscordJS.EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("Segfault")
      .setDescription("https://github.com/The1stWii2/Segfault4")
      .setImage("https://media.discordapp.net/attachments/588736222415814660/1058426064868753558/segfault.png")
      .setFooter({ text: "Version: 4.2.0α" });

    await interaction.reply({ ephemeral: true, embeds: [embed] });
  },
};

const Module: IModule = {
  tags: ["basic"],
  info: { name: "Info", shortDescr: "Provides Information about Modules" },
  init: () => {
    __COMMAND_HANDLER.addCommandGlobal(SegInfo, "Info");
  },
};

export default Module;
