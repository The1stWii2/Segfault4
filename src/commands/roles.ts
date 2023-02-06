import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

import { __client } from "../shared/client";
import { ICommand, IModule, loadAllModules } from "../coreLib";
import { __COMMAND_HANDLER, __LOADED_MODULES } from "../shared/globals";

const roleToggleStore: Record<string, ID[]> = {};
const roleAddStore: Record<string, ID[]> = {};
const roleRemoveStore: Record<string, ID[]> = {};

const GiveRole: ICommand = {
  info: { name: "manage-roles", shortDescr: "Command that manages user roles" },
  builder: new DiscordJS.SlashCommandBuilder().setName("manage-roles").setDescription("Manage your roles."),
  episode: async (interaction: DiscordJS.CommandInteraction) => {
    const interactionStart = Math.floor(Date.now() / 1000); //Discord uses Seconds instead of Milliseconds
    const interactionTimeout = interactionStart + 60; //1 Minute later

    setTimeout(() => {
      void interaction.deleteReply();
    }, 60 * 1000); //Once interaction expires, delete the message.

    const message = await interaction.reply({
      ephemeral: true,
      components: generateDropDowns(interaction),
      embeds: [generateEmbed(interaction, interactionTimeout)],
    });

    //Capture Add Roles
    const addFilter = (interaction: DiscordJS.StringSelectMenuInteraction) => interaction.customId === "add";
    const addCollector = message.createMessageComponentCollector<DiscordJS.ComponentType.StringSelect>({
      filter: addFilter,
      time: 60 * 1000, //1 Minute
    });

    addCollector.on("collect", async (collectedInter) => {
      await (interaction.member! as DiscordJS.GuildMember).roles.add(collectedInter.values);

      //Update to avoid stale cache
      await (interaction.member! as DiscordJS.GuildMember).fetch(true);

      //The Remove method simply puts in a request to update the user roles, it doesn't actually wait for it to happen.
      //The only real way to know would be to hook into the Audit Log, but I haven't done the logic needed for that,
      //and this is only a stop-gap implementation anyway.
      //So instead, just wait a second. Should be good for the majority of situations.
      setTimeout(() => {
        void interaction.editReply({
          components: generateDropDowns(interaction),
          embeds: [generateEmbed(interaction, interactionTimeout)],
        });
      }, 500);

      await collectedInter.deferUpdate();
    });

    //Capture Remove Roles
    const removeFilter = (interaction: DiscordJS.StringSelectMenuInteraction) => interaction.customId === "remove";
    const removeCollector = message.createMessageComponentCollector<DiscordJS.ComponentType.StringSelect>({
      filter: removeFilter,
      time: 60 * 1000, //1 Minute
    });

    removeCollector.on("collect", async (collectedInter) => {
      await (interaction.member! as DiscordJS.GuildMember).roles.remove(collectedInter.values);

      //Update to avoid stale cache
      await (interaction.member! as DiscordJS.GuildMember).fetch(true);

      //The Remove method simply puts in a request to update the user roles, it doesn't actually wait for it to happen.
      //The only real way to know would be to hook into the Audit Log, but I haven't done the logic needed for that,
      //and this is only a stop-gap implementation anyway.
      //So instead, just wait a second. Should be good for the majority of situations.
      setTimeout(() => {
        void interaction.editReply({
          components: generateDropDowns(interaction),
          embeds: [generateEmbed(interaction, interactionTimeout)],
        });
      }, 500);

      await collectedInter.deferUpdate();
    });
  },
};

function generateEmbed(interaction: DiscordJS.CommandInteraction, timestamp: number) {
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

const Roles: IModule<JSONValue, { toggle?: ID[]; addOnly?: ID[]; removeOnly?: ID[] }> = {
  tags: ["basic"],
  info: { name: "Roles", shortDescr: "Debug tools" },
  init: () => {
    __COMMAND_HANDLER.addCommandGlobal(GiveRole, "Roles");
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
