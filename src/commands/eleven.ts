import * as DiscordJS from "discord.js";

import { __client } from "../shared/client";
import { ICommand, IModule } from "../coreLib";
import { __COMMAND_HANDLER } from "../shared/globals";

let APIKey = "";

interface IVoiceInfo {
  name: string;
  ID: string;
  stability: number;
  similarity: number;
  style: number;
}

const VOICE_INFO: Record<string, IVoiceInfo> = {
  announcer: {
    name: "Announcer",
    ID: "gAgx9hrgU1ijmYuEaKpX",
    stability: 40,
    similarity: 90,
    style: 25,
  },
  glados_p2: {
    name: "GLaDOS (Portal 2)",
    ID: "7gh6CRadnDKMtkIbubep",
    stability: 40,
    similarity: 75,
    style: 10,
  },
  glados_p1: {
    name: "GLaDOS (Portal 1)",
    ID: "6f1EAecsX153p4qw5ubr",
    stability: 65,
    similarity: 85,
    style: 0,
  },
  cave_peti: {
    name: "Cave Johnson (PeTI)",
    ID: "LVRtmxvVhI42ynMKLgyg",
    stability: 50,
    similarity: 75,
    style: 2,
  },
  cave_under: {
    name: "Cave Johnson (Underground)",
    ID: "6tFIZamUfIusBqI7BgL7",
    stability: 30,
    similarity: 75,
    style: 2,
  },
  wheatley: {
    name: "Wheatley",
    ID: "wDqJ37DOfdVtjro6T8vh",
    stability: 35,
    similarity: 80,
    style: 5,
  },
};

interface ISubscriptionResp {
  allowed_to_extend_character_limit: boolean;
  can_extend_character_limit: boolean;
  can_extend_voice_limit: boolean;
  can_use_instant_voice_cloning: boolean;
  can_use_professional_voice_cloning: boolean;
  character_count: number;
  character_limit: number;
  currency: number;
  has_open_invoices: boolean;
  max_voice_add_edits: number;
  next_character_count_reset_unix: number;
  next_invoice: {
    amount_due_cents: number;
    next_payment_attempt_unix: number;
  };
  professional_voice_limit: number;
  status:
    | "trialing"
    | "active"
    | "incomplete"
    | "incomplete_expired"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "free";
  tier: string;
  voice_add_edit_counter: number;
  voice_limit: number;
}

const Eleven: ICommand = {
  info: { name: "Eleven", shortDescr: "Temp stuff" },
  builder: new DiscordJS.SlashCommandBuilder()
    .setName("eleven")
    .setDescription("Use ElevenLabs' Speech Synthesis system.")
    .addStringOption((option) =>
      option
        .setName("voice")
        .setDescription("Voice to use.")
        .setRequired(true)
        .addChoices(
          { name: VOICE_INFO["announcer"].name, value: "announcer" },
          { name: VOICE_INFO["glados_p2"].name, value: "glados_p2" },
          { name: VOICE_INFO["glados_p1"].name, value: "glados_p1" },
          { name: VOICE_INFO["cave_peti"].name, value: "cave_peti" },
          { name: VOICE_INFO["cave_under"].name, value: "cave_under" },
          { name: VOICE_INFO["wheatley"].name, value: "wheatley" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("script")
        .setDescription("Script to use.")
        .setRequired(false)
        .setMaxLength(4000),
    )
    .addBooleanOption((option) =>
      option
        .setName("use-modal")
        .setDescription("Use a modal to input script instead.")
        .setRequired(false),
    )
    .addNumberOption((option) =>
      option
        .setName("stability")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(100)
        .setDescription("Sets the stability of the generation (0-100)"),
    )
    .addNumberOption((option) =>
      option
        .setName("similarity")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(100)
        .setDescription(
          "Sets the similarity enhancement of the generation (0-100)",
        ),
    )
    .addNumberOption((option) =>
      option
        .setName("style")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(100)
        .setDescription(
          "Sets the style exaggeration of the generation (0-100)",
        ),
    ),
  episode: async (interaction: DiscordJS.ChatInputCommandInteraction) => {
    //Get script
    let script: string;
    let modalCollector;
    if (
      interaction.options.getString("script") &&
      !interaction.options.getBoolean("use-modal")
    ) {
      script = interaction.options.getString("script")!;
    } else {
      const modal = new DiscordJS.ModalBuilder()
        .setCustomId("editModal")
        .setTitle("Modal expires after 5 minutes")
        .addComponents(
          new DiscordJS.ActionRowBuilder<DiscordJS.TextInputBuilder>().addComponents(
            new DiscordJS.TextInputBuilder()
              .setCustomId("script")
              .setLabel("Enter script (max 4000 characters)")
              .setStyle(DiscordJS.TextInputStyle.Paragraph)
              .setValue(
                interaction.options.getString("script")
                  ? interaction.options.getString("script")!
                  : "",
              )
              .setMaxLength(4000),
          ),
        );

      await interaction.showModal(modal);

      //Collect the output of the modal
      modalCollector = await interaction.awaitModalSubmit({
        time: 5 * 60 * 1000, //Give them 5 minutes
      });

      if (modalCollector) {
        script = modalCollector.fields.getTextInputValue("script");
      } else {
        return;
      }
    }

    //Defer reply
    const interReply = !modalCollector ? interaction : modalCollector;
    await interReply.deferReply();

    //Get details
    const voiceName = interaction.options.getString(
      "voice",
      true,
    ) as unknown as keyof typeof VOICE_INFO;
    const voiceDetails = VOICE_INFO[voiceName];

    //Set details
    if (interaction.options.getNumber("similarity")) {
      voiceDetails.similarity = interaction.options.getNumber("similarity")!;
    }
    if (interaction.options.getNumber("stability")) {
      voiceDetails.stability = interaction.options.getNumber("stability")!;
    }
    if (interaction.options.getNumber("style")) {
      voiceDetails.style = interaction.options.getNumber("style")!;
    }

    //Okay, we can generate the voice
    const voiceURL = `https://api.elevenlabs.io/v1/text-to-speech/${voiceDetails.ID}`;

    const voiceResponse = await fetch(voiceURL, {
      method: "POST",
      body: JSON.stringify({
        text: script,
        model_id: "eleven_multilingual_v2", //Just use Multi v2 for now
        voice_settings: {
          similarity_boost: voiceDetails.similarity / 100,
          stability: voiceDetails.stability / 100,
          style: voiceDetails.style / 100,
        },
      }),
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "xi-api-key": APIKey,
      },
    });

    const possibleFile = await voiceResponse.arrayBuffer();
    const data = new DataView(possibleFile);
    //Lazy check to see if it has mp3 magic bytes
    //https://en.wikipedia.org/wiki/List_of_file_signatures
    if (
      data.getUint8(0) == 0xff &&
      (data.getUint8(1) == 0xfb ||
        data.getUint8(1) == 0xf3 ||
        data.getUint8(1) == 0xf2)
    ) {
      const attachment = new DiscordJS.AttachmentBuilder(
        Buffer.from(possibleFile),
      ).setName("output.mp3");

      //Get the number of remaining tokens...
      const subscriptionResponse = (await (
        await fetch("https://api.elevenlabs.io/v1/user/subscription", {
          method: "GET",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            "xi-api-key": APIKey,
          },
        })
      ).json()) as ISubscriptionResp;

      await interReply.editReply({
        embeds: [
          new DiscordJS.EmbedBuilder().setTitle(voiceDetails.name).addFields(
            {
              name: "Stability",
              value: `${voiceDetails.stability}%`,
            },
            {
              name: "Clarity + Similarity Enhancement",
              value: `${voiceDetails.similarity}%`,
            },
            {
              name: "Style Exaggeration",
              value: `${voiceDetails.style}%`,
            },
            { name: "\u200B", value: "\u200B" },
            {
              name: "Remaining characters for subscription cycle",
              value: `${
                subscriptionResponse.character_limit -
                subscriptionResponse.character_count
              }`,
            },
            { name: "\u200B", value: "\u200B" },
            {
              name: "Script",
              value: script,
            },
          ),
        ],
        files: [attachment],
      });

      return;
    }

    //Otherwise, something went wrong...
    //Check to see if it subscription is active.

    //Get the number of remaining tokens...
    const subscriptionResponse = (await (
      await fetch("https://api.elevenlabs.io/v1/user/subscription", {
        method: "GET",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "xi-api-key": APIKey,
        },
      })
    ).json()) as ISubscriptionResp;

    if (subscriptionResponse.status == "active") {
      //Subscription is active
      await interReply.editReply({
        content: `An error occurred!\nStatus code:\n\`\`\`\n${voiceResponse.status}\n${voiceResponse.statusText}\n\`\`\``,
      });
    } else {
      await interReply.editReply({
        content: `An error occurred!\nPossibly subscription expired?\nStatus code:\n\`\`\`\n${voiceResponse.status}\n${voiceResponse.statusText}\n\`\`\``,
      });
    }
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
