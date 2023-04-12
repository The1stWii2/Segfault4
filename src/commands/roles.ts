import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

import { __client } from "../shared/client";
import { ICommand, IModule, loadAllModules } from "../coreLib";
import { __COMMAND_HANDLER, __LOADED_MODULES } from "../shared/globals";

const roleToggleStore: Record<string, ID[]> = {};
const roleAddStore: Record<string, ID[]> = {};
const roleRemoveStore: Record<string, ID[]> = {};

const GiveRole: ICommand = {
  info: { name: "Manage Roles", shortDescr: "Command that manages user roles" },
  builder: new DiscordJS.SlashCommandBuilder()
    .setName("manage-roles")
    .setDescription("Manage your roles.")
    .addBooleanOption((option) => option.setName("hide").setDescription("Only show result to you.").setRequired(false)),
  episode: async (interaction: DiscordJS.ChatInputCommandInteraction) => {
    const interactionStart = Math.floor(Date.now() / 1000); //Discord uses Seconds instead of Milliseconds
    const interactionTimeout = interactionStart + 60; //1 Minute later
    const ephemeral = interaction.options.getBoolean("hide") ?? false;

    let content = ephemeral ? "" : "(Only the user who called this interaction can use it)\n";

    setTimeout(() => {
      if (ephemeral) void interaction.deleteReply();
      else {
        void interaction.editReply({ components: [], embeds: [] });
      }
    }, 60 * 1000); //Once interaction expires, delete the message.

    const message = await interaction.reply({
      content: content,
      ephemeral: ephemeral,
      components: generateDropDowns(interaction),
      embeds: [generateGiveRoleEmbed(interaction, interactionTimeout)],
    });

    //Capture Add Roles
    const addFilter = (interaction: DiscordJS.StringSelectMenuInteraction) => interaction.customId === "add";
    const addCollector = message.createMessageComponentCollector<DiscordJS.ComponentType.StringSelect>({
      filter: addFilter,
      time: 60 * 1000, //1 Minute
    });

    addCollector.on("collect", async (collectedInter) => {
      if (interaction.user != collectedInter.user) {
        void collectedInter.deferUpdate();
        return;
      }

      await (interaction.member! as DiscordJS.GuildMember).roles.add(collectedInter.values);

      //Update to avoid stale cache
      await (interaction.member! as DiscordJS.GuildMember).fetch(true);

      const roleNames: string[] = [];

      //The Remove method simply puts in a request to update the user roles, it doesn't actually wait for it to happen.
      //The only real way to know would be to hook into the Audit Log, but I haven't done the logic needed for that,
      //and this is only a stop-gap implementation anyway.
      //So instead, just wait a second. Should be good for the majority of situations.
      setTimeout(() => {
        content += `\n**Added:** ${roleNames.join(", ")}`;
        void interaction.editReply({
          content: content,
          components: generateDropDowns(interaction),
          embeds: [generateGiveRoleEmbed(interaction, interactionTimeout)],
        });
      }, 500);

      for (const value of collectedInter.values) {
        roleNames.push((await interaction.guild!.roles.fetch(value))!.name);
      }

      await collectedInter.deferUpdate();
    });

    //Capture Remove Roles
    const removeFilter = (interaction: DiscordJS.StringSelectMenuInteraction) => interaction.customId === "remove";
    const removeCollector = message.createMessageComponentCollector<DiscordJS.ComponentType.StringSelect>({
      filter: removeFilter,
      time: 60 * 1000, //1 Minute
    });

    removeCollector.on("collect", async (collectedInter) => {
      if (interaction.user != collectedInter.user) {
        void collectedInter.deferUpdate();
        return;
      }

      await (interaction.member! as DiscordJS.GuildMember).roles.remove(collectedInter.values);

      //Update to avoid stale cache
      await (interaction.member! as DiscordJS.GuildMember).fetch(true);

      const roleNames: string[] = [];

      //The Remove method simply puts in a request to update the user roles, it doesn't actually wait for it to happen.
      //The only real way to know would be to hook into the Audit Log, but I haven't done the logic needed for that,
      //and this is only a stop-gap implementation anyway.
      //So instead, just wait a second. Should be good for the majority of situations.
      setTimeout(() => {
        content += `\n**Removed:** ${roleNames.join(", ")}`;
        void interaction.editReply({
          content: content,
          components: generateDropDowns(interaction),
          embeds: [generateGiveRoleEmbed(interaction, interactionTimeout)],
        });
      }, 500);

      for (const value of collectedInter.values) {
        roleNames.push((await interaction.guild!.roles.fetch(value))!.name);
      }

      await collectedInter.deferUpdate();
    });
  },
};

function generateGiveRoleEmbed(interaction: DiscordJS.CommandInteraction, timestamp: number) {
  //TODO Remove duplicate code
  const userRoles = Array.from((interaction.member! as DiscordJS.GuildMember).roles.cache.keys());

  //Get all roles that can be added.
  const userRolesCanAdd = roleToggleStore[interaction.guildId!].filter((item) => !userRoles.includes(item));
  const userRolesCanAddOnce = roleAddStore[interaction.guildId!].filter((item) => !userRoles.includes(item));

  //Get all roles that can be removed.
  const userRolesCanRemove = roleToggleStore[interaction.guildId!].filter((item) => userRoles.includes(item));
  const userRolesCanRemoveOnce = roleRemoveStore[interaction.guildId!].filter((item) => userRoles.includes(item));

  const embedFields = [];

  if (userRolesCanAdd.length + userRolesCanAddOnce.length > 0) {
    const inactiveRoles: DiscordJS.APIEmbedField = { name: "**Inactive Roles**", value: "" };
    for (const roleID of userRolesCanAdd) {
      const role = interaction.guild!.roles.cache.get(roleID)!;

      inactiveRoles.value += role.name + "\n";
    }
    for (const roleID of userRolesCanAddOnce) {
      const role = interaction.guild!.roles.cache.get(roleID)!;

      inactiveRoles.value += role.name + " `(This role cannot be removed if added)`" + "\n";
    }
    embedFields.push(inactiveRoles);
    embedFields.push({ name: "\u200B", value: "\u200B" });
  }

  if (userRolesCanRemove.length + userRolesCanRemoveOnce.length > 0) {
    const activeRoles: DiscordJS.APIEmbedField = { name: "**Active Roles**", value: "" };
    for (const roleID of userRolesCanRemove) {
      const role = interaction.guild!.roles.cache.get(roleID)!;

      activeRoles.value += role.name + "\n";
    }
    for (const roleID of userRolesCanRemoveOnce) {
      const role = interaction.guild!.roles.cache.get(roleID)!;

      activeRoles.value += role.name + " `(This role cannot be readded if removed)`" + "\n";
    }
    embedFields.push(activeRoles);
    embedFields.push({ name: "\u200B", value: "\u200B" });
  }

  embedFields.push({ name: "Interaction expires", value: `<t:${timestamp}:R>` });

  const embed = new DiscordJS.EmbedBuilder()
    .setColor(interaction.user.accentColor ? interaction.user.accentColor : "#5865f2")
    .setTitle("Role Management")
    .addFields(embedFields);
  return embed;
}

function generateDropDowns(interaction: DiscordJS.CommandInteraction) {
  const output = [];

  const userRoles = Array.from((interaction.member! as DiscordJS.GuildMember).roles.cache.keys());

  //Get all roles that can be added.
  const userRolesCanAdd = roleToggleStore[interaction.guildId!].filter((item) => !userRoles.includes(item));
  const userRolesCanAddOnce = roleAddStore[interaction.guildId!].filter((item) => !userRoles.includes(item));

  //Get all roles that can be removed.
  const userRolesCanRemove = roleToggleStore[interaction.guildId!].filter((item) => userRoles.includes(item));
  const userRolesCanRemoveOnce = roleRemoveStore[interaction.guildId!].filter((item) => userRoles.includes(item));

  //Add Role Dropdown
  if (userRolesCanAdd.length + userRolesCanAddOnce.length > 0) {
    const rolesCanAdd: DiscordJS.SelectMenuComponentOptionData[] = [];
    for (const roleID of userRolesCanAdd) {
      const role = interaction.guild!.roles.cache.get(roleID)!;

      rolesCanAdd.push({ label: role.name, value: roleID });
    }
    for (const roleID of userRolesCanAddOnce) {
      const role = interaction.guild!.roles.cache.get(roleID)!;

      rolesCanAdd.push({ label: role.name + " (This role cannot be removed if added)", value: roleID });
    }

    const roleAddSelect = new DiscordJS.StringSelectMenuBuilder()
      .setCustomId("add")
      .setPlaceholder("➕ Add Role(s)")
      .addOptions(rolesCanAdd)
      .setMaxValues(rolesCanAdd.length);
    const rowAdd = new DiscordJS.ActionRowBuilder<DiscordJS.StringSelectMenuBuilder>().addComponents(roleAddSelect);
    output.push(rowAdd);
  }

  //Remove Role Dropdown
  if (userRolesCanRemove.length + userRolesCanRemoveOnce.length > 0) {
    const rolesCanRemove: DiscordJS.SelectMenuComponentOptionData[] = [];
    for (const roleID of userRolesCanRemove) {
      const role = interaction.guild!.roles.cache.get(roleID)!;

      rolesCanRemove.push({ label: role.name, value: roleID });
    }
    for (const roleID of userRolesCanRemoveOnce) {
      const role = interaction.guild!.roles.cache.get(roleID)!;

      rolesCanRemove.push({ label: role.name + " (This role cannot be readded if removed)", value: roleID });
    }

    const RoleRemoveSelect = new DiscordJS.StringSelectMenuBuilder()
      .setCustomId("remove")
      .setPlaceholder("➖ Remove Role(s)")
      .addOptions(rolesCanRemove)
      .setMaxValues(rolesCanRemove.length);
    const rowRemove = new DiscordJS.ActionRowBuilder<DiscordJS.StringSelectMenuBuilder>().addComponents(
      RoleRemoveSelect
    );
    output.push(rowRemove);
  }

  return output;
}

function generatePrevNextButtons(pos: number, sizeOfSet: number) {
  return new DiscordJS.ActionRowBuilder<DiscordJS.ButtonBuilder>().addComponents(
    new DiscordJS.ButtonBuilder().setLabel("← Previous").setStyle(DiscordJS.ButtonStyle.Secondary).setCustomId("prev"),
    //.setDisabled(!(pos > 0)),
    new DiscordJS.ButtonBuilder().setLabel("Next →").setStyle(DiscordJS.ButtonStyle.Secondary).setCustomId("next")
    //.setDisabled(!(pos < sizeOfSet - 1))
  );
}

const ListMembers: ICommand = {
  info: { name: "List Members", shortDescr: "List members of role" },
  builder: new DiscordJS.SlashCommandBuilder()
    .setName("list-members")
    .setDescription("List the members of a given role.")
    .addRoleOption((option) => option.setName("role").setDescription("Role to check").setRequired(true))
    .addBooleanOption((option) => option.setName("hide").setDescription("Only show result to you.").setRequired(false)),
  episode: async (interaction: DiscordJS.ChatInputCommandInteraction) => {
    const interactionStart = Math.floor(Date.now() / 1000); //Discord uses Seconds instead of Milliseconds
    const interactionTimeoutAmount = 60 * 3; //3 Minutes
    const interactionTimeout = interactionStart + interactionTimeoutAmount;
    const ephemeral = interaction.options.getBoolean("hide") ?? false;

    const role = interaction.options.getRole("role", true);

    //This might take some time
    await interaction.deferReply({
      ephemeral: ephemeral,
    });

    //Update to avoid stale cache
    await interaction.guild!.members.fetch();
    const guildRole = (await interaction.guild!.roles.fetch(role.id, { cache: true, force: true }))!;

    let position = 0;
    const pageSize = 10 * (ephemeral ? 2 : 1);

    const message = await interaction.editReply({
      components: [generatePrevNextButtons(position, Math.ceil(guildRole.members.size / pageSize))],
      embeds: [generateListMembersEmbed(guildRole, pageSize, position, interactionTimeout)],
    });

    const prevFilter = message.createMessageComponentCollector<DiscordJS.ComponentType.Button>({
      filter: (interaction: DiscordJS.ButtonInteraction) => interaction.customId === "prev",
      time: interactionTimeoutAmount * 1000,
    });

    const nextFilter = message.createMessageComponentCollector<DiscordJS.ComponentType.Button>({
      filter: (interaction: DiscordJS.ButtonInteraction) => interaction.customId === "next",
      time: interactionTimeoutAmount * 1000,
    });

    prevFilter.on("collect", async (collectedInter) => {
      if (position == 0) position = Math.ceil(guildRole.members.size / pageSize) - 1;
      else position--;
      await interaction.editReply({
        components: [generatePrevNextButtons(position, Math.ceil(guildRole.members.size / pageSize))],
        embeds: [generateListMembersEmbed(guildRole, pageSize, position, interactionTimeout)],
      });
      void collectedInter.update({});
    });

    nextFilter.on("collect", async (collectedInter) => {
      if (position == Math.ceil(guildRole.members.size / pageSize) - 1) position = 0;
      else position++;
      await interaction.editReply({
        components: [generatePrevNextButtons(position, Math.ceil(guildRole.members.size / pageSize))],
        embeds: [generateListMembersEmbed(guildRole, pageSize, position, interactionTimeout)],
      });
      void collectedInter.update({});
    });

    setTimeout(() => {
      if (ephemeral) void interaction.deleteReply();
      else {
        void interaction.editReply({
          components: [],
          embeds: [generateListMembersEmbed(guildRole, pageSize, position, 0)],
        });
      }
    }, interactionTimeoutAmount * 1000); //Once interaction expires, delete the message.
  },
};

function generateListMembersEmbed(
  guildRole: DiscordJS.Role,
  pageSize: number,
  offset: number,
  timeoutTimestamp: number
) {
  const memberList: string[] = [];
  for (let i = offset * pageSize; i < (offset + 1) * pageSize; ++i) {
    const member = guildRole.members.at(i);
    if (!member) break;

    const user = member.nickname ? `${member.nickname} (${member.user.username})` : member.user.username;

    memberList.push(`${i + 1}. ${user}`);
  }

  const page = Math.ceil(guildRole.members.size / pageSize);

  const embed = new DiscordJS.EmbedBuilder()
    .setAuthor({
      name: `Viewing members of "${guildRole.name}"`,
    })
    .setThumbnail(guildRole.iconURL())
    .setColor(guildRole.color)
    .addFields(
      {
        name: `Page ${offset + 1 != 0 ? offset + 1 : 1}/${page ? page : 1}`,
        value: "\u200B",
      },
      {
        name: "Members",
        value: `\`\`\`py\n${memberList.join("\n")}\`\`\``,
      }
    );

  if (timeoutTimestamp) {
    embed.addFields({ name: "Interaction expires", value: `<t:${timeoutTimestamp}:R>` });
  }
  return embed;
}

const Roles: IModule<JSONValue, { toggle?: ID[]; addOnly?: ID[]; removeOnly?: ID[] }> = {
  tags: ["basic"],
  info: { name: "Roles", shortDescr: "Debug tools" },
  init: () => {
    __COMMAND_HANDLER.addCommandGlobal(GiveRole, "Roles");
    __COMMAND_HANDLER.addCommandGlobal(ListMembers, "Roles");
  },
  guildLoad: (guildID, store) => {
    if (store) {
      roleToggleStore[guildID] = store.toggle ?? [];
      roleAddStore[guildID] = store.addOnly ?? [];
      roleRemoveStore[guildID] = store.removeOnly ?? [];
    }
  },
  postLoad: (store) => {
    //
  },
};

export default Roles;
