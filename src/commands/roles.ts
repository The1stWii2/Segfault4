import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

import { __client } from "../shared/client";
import { ICommand, IModule, loadAllModules } from "../coreLib";
import { __COMMAND_HANDLER, __LOADED_MODULES } from "../shared/globals";

const roleStore: Record<string, ID[]> = {};

const GiveRole: ICommand = {
  info: { name: "manage-roles", shortDescr: "Debug Slash Command" },
  builder: new DiscordJS.SlashCommandBuilder()
    .setName("manage-roles")
    .setDescription("A dummy command used for debugging purposes."),
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
  const userRolesNotAdded = roleStore[interaction.guildId!].filter((item) => !userRoles.includes(item));

  //Get all roles that can be removed.
  const userRolesAdded = roleStore[interaction.guildId!].filter((item) => userRoles.includes(item));

  const embedFields = [];

  if (userRolesNotAdded.length > 0) {
    const inactiveRoles: DiscordJS.APIEmbedField = { name: "**Inactive Roles**", value: "" };
    for (const roleID of userRolesNotAdded) {
      const role = interaction.guild!.roles.cache.get(roleID)!;

      inactiveRoles.value += role.name + "\n";
    }
    embedFields.push(inactiveRoles);
  }

  if (userRolesAdded.length > 0) {
    const activeRoles: DiscordJS.APIEmbedField = { name: "**Active Roles**", value: "" };
    for (const roleID of userRolesAdded) {
      const role = interaction.guild!.roles.cache.get(roleID)!;

      activeRoles.value += role.name + "\n";
    }
    embedFields.push(activeRoles);
  }

  embedFields.push({ name: "\u200B", value: "\u200B" }, { name: "Interaction expires", value: `<t:${timestamp}:R>` });

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
  const userRolesNotAdded = roleStore[interaction.guildId!].filter((item) => !userRoles.includes(item));

  //Get all roles that can be removed.
  const userRolesAdded = roleStore[interaction.guildId!].filter((item) => userRoles.includes(item));

  //Add Role Dropdown
  if (userRolesNotAdded.length > 0) {
    const rolesCanAdd: DiscordJS.SelectMenuComponentOptionData[] = [];
    for (const roleID of userRolesNotAdded) {
      const role = interaction.guild!.roles.cache.get(roleID)!;

      rolesCanAdd.push({ label: role.name, value: roleID });
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
  if (userRolesAdded.length > 0) {
    const rolesCanRemove: DiscordJS.SelectMenuComponentOptionData[] = [];
    for (const roleID of userRolesAdded) {
      const role = interaction.guild!.roles.cache.get(roleID)!;

      rolesCanRemove.push({ label: role.name, value: roleID });
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

const Roles: IModule = {
  tags: ["basic"],
  info: { name: "Roles", shortDescr: "Debug tools" },
  init: () => {
    __COMMAND_HANDLER.addCommandGlobal(GiveRole, "Roles");
  },
  guildLoad: (guildID, store) => {
    roleStore[guildID] = store as ID[];
  },
  postLoad: (store) => {
    //
  },
};

export default Roles;
