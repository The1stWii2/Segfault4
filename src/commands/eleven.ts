import fs from "fs";

import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

import { __client } from "../shared/client";
import { ICommand, IModule, loadAllModules } from "../coreLib";
import { __COMMAND_HANDLER, __LOADED_MODULES } from "../shared/globals";

let APIKey = "";

const __HACK_VOICE_ID_STORE = {
  "Cave Johnson": "gLZmPD3FjSBbTjzrslml",
};

const Eleven: ICommand = {
  info: { name: "Eleven", shortDescr: "Temp stuff" },
  builder: new DiscordJS.SlashCommandBuilder()
    .setName("eleven")
    .setDescription("Use ElevenLabs' Speech Synthesis system.")
    .addStringOption((option) => option.setName("input").setDescription("Text to use.").setRequired(true))
    .addNumberOption((option) =>
      option
        .setName("stability")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(1)
        .setDescription("Sets the stability of the generation (default is 0.075)")
    )
    .addNumberOption((option) =>
      option
        .setName("similarity")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(1)
        .setDescription("Sets the similarity of the generation (default is 0.8)")
    ),
  episode: async (interaction: DiscordJS.ChatInputCommandInteraction) => {
    //This will take some time, so let's defer the reply.
    await interaction.deferReply();

    //Set stability & similarity
    const settingsURL = `https://api.elevenlabs.io/v1/voices/${__HACK_VOICE_ID_STORE["Cave Johnson"]}/settings/edit`;
    const settingsResponse = await fetch(settingsURL, {
      method: "POST",
      body: JSON.stringify({
        stability: interaction.options.getNumber("stability") ?? 0.075,
        similarity_boost: interaction.options.getNumber("similarity") ?? 0.8,
      }),
      headers: { accept: "application/json", "Content-Type": "application/json", "xi-api-key": APIKey },
    });

    if (settingsResponse.status != 200) {
      await interaction.editReply({
        content: `An error occurred! Status code:\n\`\`\`\n${settingsResponse.status}\n${settingsResponse.statusText}\n\`\`\``,
      });
      return;
    }

    //Okay, now we can generate the voice

    const voiceURL = "https://api.elevenlabs.io/v1/text-to-speech/" + __HACK_VOICE_ID_STORE["Cave Johnson"];

    const voiceResponse = await fetch(voiceURL, {
      method: "POST",
      body: JSON.stringify({
        text: interaction.options.getString("input")!,
      }),
      headers: { accept: "application/json", "Content-Type": "application/json", "xi-api-key": APIKey },
    });

    const possibleFile = await voiceResponse.arrayBuffer();
    const data = new DataView(possibleFile);
    //Lazy check to see if it has mp3 magic bytes
    //https://en.wikipedia.org/wiki/List_of_file_signatures
    if (
      data.getUint8(0) == 0xff &&
      (data.getUint8(1) == 0xfb || data.getUint8(1) == 0xf3 || data.getUint8(1) == 0xf2)
    ) {
      const attachment = new DiscordJS.AttachmentBuilder(Buffer.from(possibleFile)).setName("output.mp3");

      await interaction.editReply({
        content: "Output",
        files: [attachment],
      });

      return;
    }

    await interaction.editReply({
      content: `An error occurred! Status code:\n\`\`\`\n${voiceResponse.status}\n${voiceResponse.statusText}\n\`\`\``,
    });
  },
};

const Module: IModule = {
  tags: ["misc"],
  info: { name: "Eleven", shortDescr: "Connect to Eleven" },
  init: (store) => {
    APIKey = (store as { key: string }).key;
    __COMMAND_HANDLER.addCommandGlobal(Eleven, "Eleven");
  },
};

export default Module;
