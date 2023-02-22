import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

import { __client } from "../shared/client";
import { ICommand, IModule, loadStoreFile, saveStoreFile } from "../coreLib";
import { __COMMAND_HANDLER } from "../shared/globals";

interface IStore {
  modlog: TModLog;
  logChannel: ID;
}

type TModLog = Record<string, IModLogEntry[]>;

const infracTypes = {
  1: "Warn",
  2: "Timeout",
  3: "Kick",
  4: "Ban",
} as const;
type TTypeKeys = keyof typeof infracTypes;

interface IModLogEntry {
  timestamp: number;
  reason: string;
  type: typeof infracTypes[TTypeKeys];
}

const modLog: ICommand = {
  info: { name: "Debug", shortDescr: "Debug Slash Command" },
  builder: new DiscordJS.SlashCommandBuilder()
    .setName("mod-log")
    .setDescription("A dummy command used for debugging purposes.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("history")
        .setDescription("View history of user in guild")
        .addUserOption((option) => option.setName("user").setDescription("User to get history of").setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("new-entry")
        .setDescription("Add new infraction against user")
        .addUserOption((option) => option.setName("user").setDescription("User to add new entry for").setRequired(true))
        .addStringOption((option) =>
          option
            .setName("level")
            .setDescription("Infraction type")
            .addChoices(
              { name: "Warn (no repercussion)", value: infracTypes[1] },
              { name: "Timeout", value: infracTypes[2] },
              { name: "Kick", value: infracTypes[3] },
              { name: "Ban", value: infracTypes[4] }
            )
            .setRequired(true)
        )
        .addStringOption((option) => option.setName("reason").setDescription("Reason of infraction").setRequired(true))
        .addAttachmentOption((option) =>
          option.setName("attachment").setDescription("Additional file (is not saved)").setRequired(false)
        )
        .addNumberOption((option) =>
          option
            .setName("length")
            .setDescription("Length of repercussion in hours (currently only used for Timeout)")
            .setMinValue(0)
            .setRequired(false)
        )
        .addBooleanOption((option) =>
          option
            .setName("notify")
            .setDescription("Notify user of infraction? (Does not disclose information)")
            .setRequired(false)
        )
    ),
  episode: async (interaction: DiscordJS.ChatInputCommandInteraction) => {
    const store = loadStoreFile<IStore>(interaction.guildId! as ID, "Moderation")!;

    const user = interaction.options.getUser("user", true);

    switch (interaction.options.getSubcommand()) {
      case "history": {
        if (store.modlog[user.id]) {
          /*
          const infractions = [];
          for (const item of store.modlog[user.id]) {
            infractions.push(generateReportEmbed(item, user));
          }
          await interaction.reply({ ephemeral: true, embeds: infractions });
          */
          const interactionStart = Math.floor(Date.now() / 1000); //Discord uses Seconds instead of Milliseconds
          const interactionTimeoutAmount = 60 * 5; //5 Minutes
          const interactionTimeout = interactionStart + interactionTimeoutAmount;

          function generateButtons(pos: number, sizeOfSet: number) {
            return new DiscordJS.ActionRowBuilder<DiscordJS.ButtonBuilder>().addComponents(
              new DiscordJS.ButtonBuilder()
                .setLabel("Older")
                .setStyle(DiscordJS.ButtonStyle.Secondary)
                .setCustomId("older")
                .setDisabled(!(pos < sizeOfSet - 1)),
              new DiscordJS.ButtonBuilder()
                .setLabel("Newer")
                .setStyle(DiscordJS.ButtonStyle.Secondary)
                .setCustomId("newer")
                .setDisabled(!(pos > 0))
            );
          }
          setTimeout(() => {
            void interaction.deleteReply();
          }, interactionTimeoutAmount * 1000); //Once interaction expires, delete the message.

          const storeSorted = store.modlog[user.id].sort((a, b) => {
            return b.timestamp - a.timestamp;
          });

          let position = 0;

          const message = await interaction.reply({
            ephemeral: true,
            content: `Interaction expires <t:${interactionTimeout}:R>`,
            components: [generateButtons(position, storeSorted.length)],
            embeds: [generateReportEmbed(storeSorted[position], user)],
          });

          const olderFilter = message.createMessageComponentCollector<DiscordJS.ComponentType.Button>({
            filter: (interaction: DiscordJS.ButtonInteraction) => interaction.customId === "older",
            time: interactionTimeoutAmount * 1000,
          });

          const newerFilter = message.createMessageComponentCollector<DiscordJS.ComponentType.Button>({
            filter: (interaction: DiscordJS.ButtonInteraction) => interaction.customId === "newer",
            time: interactionTimeoutAmount * 1000,
          });

          olderFilter.on("collect", async (collectedInter) => {
            position++;
            await interaction.editReply({
              components: [generateButtons(position, storeSorted.length)],
              embeds: [generateReportEmbed(storeSorted[position], user)],
            });
            void collectedInter.update({});
          });

          newerFilter.on("collect", async (collectedInter) => {
            position--;
            await interaction.editReply({
              components: [generateButtons(position, storeSorted.length)],
              embeds: [generateReportEmbed(storeSorted[position], user)],
            });
            void collectedInter.update({});
          });
        } else {
          await interaction.reply({ ephemeral: true, content: "User has no infractions." });
        }
        break;
      }
      case "new-entry": {
        const guildMember = await interaction.guild?.members.fetch(user);

        await interaction.deferReply({ ephemeral: true });

        if (!store.modlog[user.id]) {
          store.modlog[user.id] = [];
        }

        const infraction = {
          timestamp: Date.now(),
          reason: interaction.options.getString("reason", true),
          type: interaction.options.getString("level", true) as typeof infracTypes[TTypeKeys],
        };

        switch (interaction.options.getString("level", true)) {
          case "Timeout": {
            if (!guildMember) {
              await interaction.reply({
                ephemeral: true,
                content: "Cannot timeout user who isn't in server! Aborting.",
              });
              break;
            }
            await guildMember.timeout(
              (interaction.options.getNumber("length") ?? 1) * 1000 * 60 * 60,
              infraction.reason
            );
            break;
          }
          case "Kick": {
            if (!guildMember) {
              await interaction.reply({ ephemeral: true, content: "Cannot kick user who isn't in server! Aborting." });
              break;
            }
            await guildMember.kick(infraction.reason);
            break;
          }
          case "Ban": {
            if (!guildMember) {
              await interaction.reply({
                ephemeral: true,
                content: "Cannot ban user who isn't in server (currently)! Aborting.",
              });
              break;
            }
            await guildMember.ban({ reason: infraction.reason });
            break;
          }
        }

        if (interaction.options.getBoolean("notify") === true) {
          await user.send(
            `**Notice:**\nYou have had a new infraction (${interaction.options.getString(
              "level",
              true
            )}) filed against you from guild: ${interaction.guild!.name}.`
          );
        }

        store.modlog[user.id].push(infraction);

        saveStoreFile(interaction.guildId! as ID, "Moderation", store);

        await ((await interaction.guild!.channels.fetch(store.logChannel)) as DiscordJS.TextBasedChannel).send({
          embeds: [generateReportEmbed(infraction, user)],
          files: interaction.options.getAttachment("attachment")
            ? [interaction.options.getAttachment("attachment")!]
            : [],
        });

        await interaction.editReply({ content: "Filed." });

        break;
      }
    }
  },
};

function generateReportEmbed(details: IModLogEntry, user: DiscordJS.User): DiscordJS.EmbedBuilder {
  const userAvatar = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=2048`
    : user.displayAvatarURL();

  const infracColours = {
    Warn: 0xefdd19,
    Timeout: 0xecb53f,
    Kick: 0xe87543,
    Ban: 0xf12d2d,
  };

  return new DiscordJS.EmbedBuilder()
    .setAuthor({ name: user.username, iconURL: userAvatar })
    .setTitle(details.type)
    .addFields(
      { name: "Reason", value: details.reason },
      { name: "Date", value: `<t:${Math.floor(details.timestamp / 1000)}>` }
    )
    .setColor(infracColours[details.type] as DiscordJS.ColorResolvable);
}

const report: ICommand = {
  info: { name: "Debug", shortDescr: "Debug Slash Command" },
  builder: new DiscordJS.SlashCommandBuilder()
    .setName("report")
    .setDescription("A dummy command used for debugging purposes."),
  episode: async (interaction: DiscordJS.ChatInputCommandInteraction) => {
    //
  },
};

const Module: IModule = {
  tags: ["moderation"],
  info: { name: "Moderation", shortDescr: "Moderation tools" },
  init: () => {
    __COMMAND_HANDLER.addCommandGlobal(modLog, "Moderation");
    __COMMAND_HANDLER.addCommandGlobal(report, "Moderation");
  },
};

export default Module;
