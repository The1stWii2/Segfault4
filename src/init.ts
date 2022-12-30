import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

import util from "util";
import logger from "./shared/logger";
import fs from "fs";
import path from "path";

import { __client } from "./shared/client";
import __CONFIGURATION__, { __COMMAND_HANDLER, __LOADED_MODULES } from "./shared/globals";
import { initialiseModules, loadAllModules, loadStoreFile, setUpModules, TInteraction } from "./coreLib";
import pc from "picocolors";

export async function init(registerCommands = false) {
  //Load Modules
  logger.verbose(`\n${pc.underline(pc.bold("Stage 1/5"))}\nLoading Modules\n`);
  await loadAllModules();

  //Initialise Modules
  logger.verbose(`\n${pc.underline(pc.bold("Stage 2/5"))}\nInitialising Modules\n`);
  await setUpModules(__COMMAND_HANDLER);

  //Set-up Client
  logger.verbose(`\n${pc.underline(pc.bold("Stage 3/5"))}\nConfiguring Client\n`);
  __client.once("ready", async () => {
    logger.info("Logged in");
  });

  __client.on(DiscordJS.Events.InteractionCreate, (interaction) => {
    void handleInteraction(interaction);
  });
  if (registerCommands) await __COMMAND_HANDLER.sync("all");

  //Load any Events
  logger.verbose(`\n${pc.underline(pc.bold("Stage 4/5"))}\nLoading Events\n`);
  //TODO, this

  //Login Client
  logger.verbose(`\n${pc.underline(pc.bold("Stage 5/5"))}\nLogging in\n`);
  void __client.login(__CONFIGURATION__.secrets.discordToken);
}

async function handleInteraction(interaction: DiscordJS.Interaction<DiscordJS.CacheType>) {
  switch (interaction.type) {
    //Interaction is a Command... (Slash or ContextMenu)
    case DiscordAPI.InteractionType.ApplicationCommand: {
      //Slash Command
      logger.debug(`Received interaction: ${String(interaction)}`);

      try {
        await __COMMAND_HANDLER.call(interaction as TInteraction, interaction.commandName);
      } catch (err) {
        logger.error(err);

        if (interaction instanceof DiscordJS.ChatInputCommandInteraction) debugErrorMessageOnFail(err, interaction);
      }
    }
  }
}

function debugErrorMessageOnFail(error: unknown, interaction: DiscordJS.ChatInputCommandInteraction) {
  const errorMessage = "An error occurred.";

  if (
    (interaction.member?.permissions as DiscordJS.PermissionsBitField).has(DiscordAPI.PermissionFlagsBits.Administrator)
  ) {
    //Only show error if no-one can see it.
    //If reply already exists AND was ephemeral
    if (interaction.replied && interaction.ephemeral) {
      void interaction.editReply({ content: `${errorMessage}\n\`\`\`${util.format(error)}\`\`\`` });
    }
    //Else, if it has been replied to yet, we can still go ahead
    else if (!interaction.replied) {
      void interaction.reply({
        ephemeral: true,
        content: `${errorMessage}\n\`\`\`${util.format(error)}\`\`\``,
      });
    }
    //Oops, this message is public. Better hide it.
    else {
      void interaction.reply({ ephemeral: true, content: errorMessage });
    }
    //Else, hide the error
  } else {
    if (interaction.replied) void interaction.editReply({ content: errorMessage });
    else void interaction.reply({ ephemeral: true, content: errorMessage });
  }
}
