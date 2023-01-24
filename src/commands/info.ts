import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

import { __client } from "../shared/client";
import { ICommand, IModule, loadAllModules } from "../coreLib";
import { __COMMAND_HANDLER, __LOADED_MODULES } from "../shared/globals";

const SegInfo: ICommand = {
  info: { name: "Info", shortDescr: "Information about Segfault" },
  builder: new DiscordJS.SlashCommandBuilder().setName("info").setDescription("Information about Segfault."),
  episode: async (interaction: DiscordJS.CommandInteraction) => {
    const embed = new DiscordJS.EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("Segfault")
      .setDescription("https://github.com/The1stWii2/Segfault4")
      .setImage("https://media.discordapp.net/attachments/588736222415814660/1058426064868753558/segfault.png")
      .setFooter({ text: "Version: 4.2.0α" });

    await interaction.reply({ ephemeral: true, embeds: [embed] });
  },
};

//==========================
//User Info
//==========================

async function generateUserEmbed(member: DiscordJS.GuildMember) {
  const roleNames: string[] = [];

  for (const role of member.roles.cache) {
    if (role[1].rawPosition != 0) roleNames.push(role[1].name);
  }

  //This seems inefficient
  const guildMembers = member.guild.members.cache;
  guildMembers.sort((a, b) => a.joinedTimestamp! - b.joinedTimestamp!);

  let memberPos = 0;
  for (const GuildMember of guildMembers) {
    if (GuildMember[1].id == member.id) break;
    memberPos++;
  }

  //Update to avoid stale cache
  await member.guild.members.list({ after: member.id, limit: 3 });

  const joinList: string[] = [];
  const joinSize = 3;
  for (let i = Math.max(memberPos - joinSize, 0); i <= memberPos + joinSize; i++) {
    if (guildMembers.keyAt(i)) {
      const user = guildMembers.get(guildMembers.keyAt(i)!)!.user;
      const username = `${user.tag}`;
      joinList.push(
        `${String(i).padStart(String(memberPos + joinSize).length)}.` + (i != memberPos ? "    " : "  > ") + username
      );
    }
  }

  const userAvatar = member.user.avatar
    ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png?size=2048`
    : member.user.displayAvatarURL();

  const guildAvatar = member.avatar
    ? `https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png?size=2048`
    : userAvatar;

  const embed = new DiscordJS.EmbedBuilder()
    .setAuthor({
      name: `${member.nickname ? member.nickname : member.user.username}`,
      iconURL: userAvatar,
    })
    .setThumbnail(guildAvatar)
    .addFields(
      {
        name: "Username",
        value: `${member.user.tag}`,
        inline: true,
      },
      {
        name: "ID",
        value: `${member.user.id}`,
        inline: true,
      },
      { name: "\u200B", value: "\u200B" },
      {
        name: "Joined at:",
        value: `<t:${String(Math.floor(member.joinedTimestamp! / 1000))}>`,
        inline: true,
      },
      {
        name: "Created at:",
        value: `<t:${String(Math.floor(member.user.createdTimestamp / 1000))}>`,
        inline: true,
      }
    );

  const status = member.presence?.clientStatus;
  embed.addFields(
    { name: "\u200B", value: "\u200B" },
    {
      name: status ? "Statuses" : "Status",
      value: member.presence ? `Currently ${member.presence.status}` : "Unable to fetch status",
    }
  );

  //If can get status information
  if (status) {
    embed.addFields(
      { name: "Web", value: status.web ? "✔️" : "❌", inline: true },
      { name: "Mobile", value: status.mobile ? "✔️" : "❌", inline: true },
      { name: "Desktop", value: status.desktop ? "✔️" : "❌", inline: true }
    );
  }

  //If Custom Status
  const activity = member.presence?.activities.find((item) => item.type === DiscordJS.ActivityType.Custom);
  if (activity) {
    embed.addFields({
      name: "Custom Status:",
      value: `${activity.emoji ? activity.emoji.toString() + " " : ""}${activity.state ? activity.state : ""}`,
      inline: true,
    });
  }

  //If boosting
  if (member.premiumSinceTimestamp) {
    embed.addFields(
      { name: "\u200B", value: "\u200B" },
      {
        name: "Boosting Since:",
        value: `<t:${String(Math.floor(member.premiumSinceTimestamp / 1000))}>`,
        inline: true,
      }
    );
  }

  embed.addFields(
    { name: "\u200B", value: "\u200B" },
    {
      name: "Roles:",
      value: `\`\`\`\n${roleNames.join("\n")}\`\`\``,
    },
    { name: "\u200B", value: "\u200B" },
    {
      name: "Join Position:",
      value: `\`\`\`py\n${joinList.join("\n")}\`\`\``,
    }
  );

  //Update User data to avoid stale cache
  await member.user.fetch(true);

  //If banner
  if (member.user.banner) {
    embed.setImage(`https://cdn.discordapp.com/banners/${member.user.id}/${member.user.banner}.png?size=2048`);
  }

  if (member.user.accentColor) {
    embed.setColor(member.user.accentColor);
  }

  return embed;
}

async function UserInfoFunction(
  interaction: DiscordJS.UserContextMenuCommandInteraction | DiscordJS.ChatInputCommandInteraction
) {
  let targetUser;

  //@ts-expect-error Perform basic check to figure out shape.
  if (interaction.targetId) {
    targetUser = (interaction as DiscordJS.UserContextMenuCommandInteraction).targetId;
  } else {
    //Lazily get ID, we'll being tuning this back into a User object in a minute, but for consistency, let's just have the ID.
    targetUser = (interaction as DiscordJS.ChatInputCommandInteraction).options.getUser("user")!.id;
  }

  const embed = await generateUserEmbed(await interaction.guild!.members.fetch(targetUser));

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

const UserInfoContext: ICommand = {
  info: { name: "User Info Context", shortDescr: "Displays information about user" },
  builder: new DiscordJS.ContextMenuCommandBuilder()
    .setName("user-info")
    .setType(DiscordJS.ApplicationCommandType.User),
  episode: UserInfoFunction,
};

const UserInfoSlash: ICommand = {
  info: { name: "User Info Slash", shortDescr: "Displays information about user" },
  builder: new DiscordJS.SlashCommandBuilder()
    .setName("user-info")
    .setDescription("Displays information about user")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to get information from.").setRequired(true)
    ),
  episode: UserInfoFunction,
};

const Module: IModule = {
  tags: ["basic"],
  info: { name: "Info", shortDescr: "Provides Information about things" },
  init: () => {
    __COMMAND_HANDLER.addCommandGlobal(SegInfo, "Info");

    __COMMAND_HANDLER.addCommandGlobal(UserInfoContext, UserInfoContext.info.name);

    __COMMAND_HANDLER.addCommandGlobal(UserInfoSlash, UserInfoSlash.info.name);
  },
};

export default Module;
