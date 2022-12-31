import * as DiscordJS from "discord.js";
import { ICommand, IModule, saveStoreFile } from "../coreLib";
import { __client } from "../shared/client";

import { __COMMAND_HANDLER } from "../shared/globals";

const emojis = {} as IEmojis;

interface IEmojis {
  entry: DiscordJS.GuildEmoji;
  exit: DiscordJS.GuildEmoji;
}

interface IGlobalStore {
  entry: string;
  exit: string;
}

const ReloadCommands: ICommand = {
  info: { name: "Portal", shortDescr: "Move the conversation" },
  builder: new DiscordJS.SlashCommandBuilder()
    .setName("portal")
    .setDescription("Keep the conversation going by portalling over to a different channel.")
    .addChannelOption((option) =>
      option
        .setName("destination")
        .setDescription("Portal on over to which channel?")
        .setRequired(true)
        .addChannelTypes(
          DiscordJS.ChannelType.GuildText,
          DiscordJS.ChannelType.GuildAnnouncement,
          DiscordJS.ChannelType.AnnouncementThread,
          DiscordJS.ChannelType.PublicThread
        )
    ),
  episode: async (interaction: DiscordJS.ContextMenuCommandInteraction) => {
    if (!emojis.entry || !emojis.exit) {
      await interaction.reply({
        ephemeral: true,
        content:
          "Emojis for this command have not been correctly configured, please run `/config Portal Portal` first.",
      });
      return;
    }

    const channelResp = interaction.options.get("destination");
    if (!channelResp) {
      await interaction.reply({
        ephemeral: true,
        content: "An unknown error is preventing me from accessing that channel",
      });
      return;
    }
    if (channelResp.channel?.id == interaction.channelId) {
      await interaction.reply({
        ephemeral: true,
        content: "Destination cannot be the same channel as the current one!",
      });
      return;
    }
    let exitMessage;
    try {
      exitMessage = await (channelResp.channel as DiscordJS.TextBasedChannel).send(emojis.entry.toString());
    } catch (err) {
      console.error(err);
      await interaction.reply({ ephemeral: true, content: "I am unable to post to that channel!" });
      return;
    }
    await interaction.deferReply();

    const reply = await interaction.fetchReply();

    const entryButton = new DiscordJS.ActionRowBuilder<DiscordJS.ButtonBuilder>().addComponents(
      new DiscordJS.ButtonBuilder()
        .setLabel(`Portal on over to #${(exitMessage.channel as DiscordJS.TextChannel).name}`)
        .setStyle(DiscordJS.ButtonStyle.Link)
        .setURL(exitMessage.url)
    );

    const exitButton = new DiscordJS.ActionRowBuilder<DiscordJS.ButtonBuilder>().addComponents(
      new DiscordJS.ButtonBuilder()
        .setLabel(`Portal back to #${(reply.channel as DiscordJS.TextChannel).name}`)
        .setStyle(DiscordJS.ButtonStyle.Link)
        .setURL(reply.url)
    );

    await interaction.editReply({ content: emojis.exit.toString(), components: [entryButton] });

    await exitMessage.edit({ components: [exitButton] });
  },
};

const Module: IModule<IGlobalStore> = {
  tags: ["communication"],
  info: { name: "Portal", shortDescr: "Move from one channel to another" },
  init: (store) => {
    __COMMAND_HANDLER.addCommandGlobal(ReloadCommands, "Portal");
  },
  postLoad: (store) => {
    //Read in Emojis
    if (store) {
      emojis.entry = __client.emojis.cache.get(store.entry)!;
      emojis.exit = __client.emojis.cache.get(store.exit)!;
    } else {
      const newConfig: IGlobalStore = { entry: "1234", exit: "0987" };
      saveStoreFile("global", "Portal", newConfig);
    }

    const foo = __client;
    console.log(store);
  },
};

export default Module;
