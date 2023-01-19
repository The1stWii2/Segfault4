import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

import { __client } from "../shared/client";
import { ICommand, IModule, loadAllModules } from "../coreLib";
import { __COMMAND_HANDLER, __LOADED_MODULES } from "../shared/globals";

interface IAssetEmbed {
  author: string;
  title: string;
  fileURL: string;
  description: string;
  includes: string;
  credit: string;
  imageURL?: string;
}

const foo =
  //HACK REMOVE THESE!
  [
    { label: "Models & Textures", value: "890411163777634317" },
    { label: "Hammer & Misc", value: "906608941042106368" },
  ];

class AssetEmbed {
  public embed: IAssetEmbed;

  private _channel: ID;

  constructor(message?: DiscordJS.Message) {
    //TODO Handle message later

    this.embed = { author: "", title: "", fileURL: "", description: "", includes: "", credit: "" };
    this._channel = "0";
  }

  generateEmbed(final = false) {
    const embed = new DiscordJS.EmbedBuilder();
    embed.setColor("#51A8FF");
    embed.setTitle(this.embed.title);
    if (this.embed.fileURL) embed.setURL(this.embed.fileURL);
    embed.setAuthor({ name: this.embed.author });
    embed.addFields(
      { name: "**Description**", value: this.embed.description },
      { name: "**Includes**", value: "```\n" + this.embed.includes + "\n```" },
      { name: "**Credits**", value: this.embed.credit }
    );
    if (this.embed.imageURL) embed.setImage(this.embed.imageURL);
    if (!final) {
      embed.addFields(
        { name: "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯", value: "\u200B" },
        { name: "File URL", value: this.embed.fileURL ? this.embed.fileURL : "None!" },
        { name: "Channel", value: `<#${this._channel}>` }
      );
    }
    embed.setFooter({
      text: "Click the title to download this item!",
      iconURL: "https://images.emojiterra.com/mozilla/512px/1f4be.png",
    });
    embed.setTimestamp(null);
    return embed;
  }

  set channelID(channelID: ID) {
    this._channel = channelID;
  }

  get channelID() {
    return this._channel;
  }

  validate(): 0 | DiscordJS.EmbedBuilder /*Returns 0 if success, otherwise error Embed. A hack way*/ {
    //Nonsense, go!
    const errorList: string[] = [];

    if (this.embed.author.length < 1) {
      errorList.push("Author must have a length greater than 0!");
    }
    if (this.embed.title.length < 1) {
      errorList.push("Title must have a length greater than 0!");
    }
    if (!this.isValidHttpUrl(this.embed.fileURL)) {
      errorList.push("File URL is invalid!");
    }
    if (this.embed.description.length < 1) {
      errorList.push("Description must have a length greater than 0!");
    }
    if (this.embed.includes.length < 1) {
      errorList.push("Includes must have a length greater than 0!");
    }
    if (this.embed.credit.length < 1) {
      errorList.push("Credit must have a length greater than 0!");
    }
    if (this.embed.imageURL && !this.isValidHttpUrl(this.embed.imageURL)) {
      errorList.push("Image URL is invalid!");
    }
    if (__client.channels.cache.get(this._channel) == undefined) {
      errorList.push("Desired channel is unreachable!");
    }

    if (errorList.length > 0) {
      return new DiscordJS.EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Error(s) occurred when generating embed:")
        .setDescription(errorList.join("\n"));
    }
    return 0;
  }

  private isValidHttpUrl(address: string) {
    let url;
    try {
      url = new URL(address);
    } catch (_) {
      return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
  }
}

const PostAsset: ICommand = {
  info: { name: "Post Asset", shortDescr: "foobar" },
  builder: new DiscordJS.SlashCommandBuilder()
    .setName("post-asset")
    .setDescription("This Command is subject to change!"),
  episode: async (interaction: DiscordJS.CommandInteraction) => {
    const submitButton = new DiscordJS.ButtonBuilder()
      .setCustomId("submit")
      .setLabel("All good!")
      .setStyle(DiscordJS.ButtonStyle.Success)
      .setEmoji("📨");

    const editSelect = new DiscordJS.StringSelectMenuBuilder()
      .setCustomId("edit")
      .setPlaceholder("✏️ Edit field(s)")
      .addOptions(
        { label: "Title", description: "Edit Title field", value: "title" },
        { label: "Description", description: "Edit Description field", value: "description" },
        { label: "Includes", description: "Edit Includes", value: "includes" },
        { label: "File URL", description: "Edit File URL", value: "file" },
        { label: "Author", description: "Edit Author field", value: "author" },
        { label: "Credit", description: "Edit Credit field", value: "credit" },
        { label: "imageURL", description: "Edit Image URL", value: "image" }
      )
      .setMaxValues(5);

    const channelSelect = new DiscordJS.StringSelectMenuBuilder()
      .setCustomId("channel")
      .setPlaceholder("🗃️ Select Channel")
      .setOptions(foo);

    const embed = new AssetEmbed();

    const submitRow = new DiscordJS.ActionRowBuilder<DiscordJS.ButtonBuilder>().addComponents(submitButton);
    const editRow = new DiscordJS.ActionRowBuilder<DiscordJS.StringSelectMenuBuilder>().addComponents(editSelect);
    const channelRow = new DiscordJS.ActionRowBuilder<DiscordJS.StringSelectMenuBuilder>().addComponents(channelSelect);

    const message = await interaction.reply({
      embeds: [embed.validate() != 0 ? (embed.validate() as DiscordJS.EmbedBuilder) : embed.generateEmbed()],
      components: [...(embed.validate() == 0 ? [submitRow] : []), editRow, channelRow],
      content: `**Only the user who initiated this interaction can interact.**

      Interaction expires after about 5 minutes`,
    });

    const editCollector = message.createMessageComponentCollector({
      componentType: DiscordJS.ComponentType.StringSelect,
      time: 5 * 60 * 1000, //5 minutes
    });

    editCollector.on("collect", async (collectInter) => {
      //Check if correct user
      if (collectInter.user != interaction.user) {
        await collectInter.deferUpdate();
        return;
      }

      //Check if updating field or channel
      if (collectInter.values[0] == foo[0].value || collectInter.values[0] == foo[1].value) {
        embed.channelID = collectInter.values[0] as `${number}`;

        await collectInter.update({
          embeds: [embed.validate() != 0 ? (embed.validate() as DiscordJS.EmbedBuilder) : embed.generateEmbed()],
          components: [...(embed.validate() == 0 ? [submitRow] : []), editRow, channelRow],
        });
        return;
      }

      const longTitle = `Editing ${collectInter.values.join(", ")}`;

      const modal = new DiscordJS.ModalBuilder()
        .setCustomId("editModal")
        .setTitle(longTitle.length > 45 ? "Editing multiple fields" : longTitle);

      // Add components to modal
      const fields = [];

      for (const value of collectInter.values) {
        const temp = new DiscordJS.TextInputBuilder()
          .setCustomId(value)
          .setLabel(value.charAt(0).toUpperCase() + value.slice(1));

        if (value == "description" || value == "includes") {
          temp.setStyle(DiscordJS.TextInputStyle.Paragraph);
        } else {
          temp.setStyle(DiscordJS.TextInputStyle.Short);
        }

        fields.push(temp);
      }

      const actionRows = [];

      for (let i = 0; i < fields.length; i++) {
        actionRows.push(new DiscordJS.ActionRowBuilder<DiscordJS.TextInputBuilder>().addComponents(fields[i]));
      }

      modal.addComponents(actionRows);
      await collectInter.showModal(modal);

      //Currently I don't have a good way to detect if the user dismisses the Modal
      //I also board a plan in less than 20 hours, so...
      const modalCollector = await collectInter.awaitModalSubmit({
        time: 5 * 60 * 1000,
      });

      //Awful awful-ness
      if (modalCollector) {
        await modalCollector.deferUpdate();
        for (const value of collectInter.values) {
          if (value == "file" || value == "image") {
            embed.embed[value + "URL"] = modalCollector.fields.getTextInputValue(value);
          } else {
            embed.embed[value] = modalCollector.fields.getTextInputValue(value);
          }
        }

        await interaction.editReply({
          embeds: [embed.validate() != 0 ? (embed.validate() as DiscordJS.EmbedBuilder) : embed.generateEmbed()],
          components: [...(embed.validate() == 0 ? [submitRow] : []), editRow, channelRow],
        });
      }
    });

    const submitCollector = message.createMessageComponentCollector({
      componentType: DiscordJS.ComponentType.Button,
      time: 5 * 60 * 1000,
    });

    submitCollector.on("collect", async (collectInter) => {
      if (collectInter.user != interaction.user) return;

      await (__client.channels.cache.get(embed.channelID) as DiscordJS.TextChannel).send({
        embeds: [embed.generateEmbed(true)],
      });

      await interaction.deleteReply();
    });
  },
};

const Module: IModule = {
  tags: ["???"],
  info: { name: "Pin Content", shortDescr: "User selected content" },
  init: () => {
    __COMMAND_HANDLER.addCommandGlobal(PostAsset, "Pin Content");
  },
};

export default Module;
