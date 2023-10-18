import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

import { __client } from "../shared/client";
import { ICommand, IModule, loadAllModules } from "../coreLib";
import { __COMMAND_HANDLER, __LOADED_MODULES } from "../shared/globals";

import sharp from "sharp";

//All this boilerplate is /just/ for Mathjax
import { mathjax } from "mathjax-full/js/mathjax";
import { TeX } from "mathjax-full/js/input/tex";
import { SVG as mathjaxSVG } from "mathjax-full/js/output/svg";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html";
import { LiteElement } from "mathjax-full/js/adaptors/lite/Element";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const document = mathjax.document("", {
  InputJax: new TeX({ packages: AllPackages }),
  OutputJax: new mathjaxSVG({ fontCache: "local" }),
});

const mathJaxOptions = {
  em: 32,
  ex: 16,
  containerWidth: 1280,
};

//Lazy lack, bundle a boolean with it for error checking
function TexToSVG(math: string): { svg: string; errored: boolean } {
  const node = document.convert(math, mathJaxOptions) as LiteElement;

  //Lazy check for any errors
  //node               -> ...the node
  //children[0]        -> <svg>
  //children[1]        -> <g> ([0] is the def tag)
  //children[0]        -> <g> "math" tag
  //children[0]        -> <g> "error" tag
  //attributes         -> Attribute data, we're looking for the error
  //["data-mjx-error"] -> If one exists, it's here
  //
  //It's /awful/
  const error: string | undefined = (
    (
      ((node.children[0] as LiteElement).children[1] as LiteElement)
        .children[0] as LiteElement
    ).children[0] as LiteElement
  ).attributes["data-mjx-error"] as string | undefined;

  if (error) {
    return { svg: error, errored: true };
  }
  return { svg: adaptor.innerHTML(node), errored: false };
}

const TexRender: ICommand = {
  info: { name: "TexRender", shortDescr: "Display output of TeX" },
  builder: new DiscordJS.SlashCommandBuilder()
    .setName("tex-render")
    .setDescription("Displays the result of a TeX input as an image")
    .addStringOption((option) =>
      option
        .setName("equation")
        .setDescription("Equation to display.")
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("use-modal")
        .setDescription(
          "Use a modal to input equation instead (allows multiple lines)",
        )
        .setRequired(false),
    ),
  episode: async (interaction: DiscordJS.ChatInputCommandInteraction) => {
    let inputString = "";
    let modalCollector;

    if (
      interaction.options.getString("equation") &&
      !interaction.options.getBoolean("use-modal")
    ) {
      inputString = interaction.options.getString("equation")!;
    } else {
      const modal = new DiscordJS.ModalBuilder()
        .setCustomId("editModal")
        .setTitle("Modal expires after 2 minutes")
        .addComponents(
          new DiscordJS.ActionRowBuilder<DiscordJS.TextInputBuilder>().addComponents(
            new DiscordJS.TextInputBuilder()
              .setCustomId("equation")
              .setLabel("Enter TeX equation")
              .setStyle(DiscordJS.TextInputStyle.Paragraph)
              .setValue(
                interaction.options.getString("equation")
                  ? interaction.options.getString("equation")!
                  : "",
              ),
          ),
        );

      await interaction.showModal(modal);

      //Collect the output of the modal
      modalCollector = await interaction.awaitModalSubmit({
        time: 2 * 60 * 1000, //Give them 2 minutes
      });

      if (modalCollector) {
        inputString = modalCollector.fields.getTextInputValue("equation");
      }
    }

    let outputString = `**Input**\n\`\`\`${inputString}\`\`\`\n**Output**`;
    let attachment: DiscordJS.AttachmentBuilder | undefined;

    const TeXResult = TexToSVG(inputString);
    if (TeXResult.errored) {
      outputString += `\nError:\n\`\`\`${TeXResult.svg}\`\`\``;
    } else {
      const image = await sharp(Buffer.from(TeXResult.svg))
        .resize(1024)
        .png()
        .toBuffer();

      attachment = new DiscordJS.AttachmentBuilder(image).setName("result.png");
    }

    const output = {
      content: outputString,
      files: attachment ? [attachment] : [],
    };

    if (!modalCollector) {
      await interaction.reply(output);
    } else {
      await modalCollector.reply(output);
    }
  },
};

const Module: IModule = {
  tags: ["misc"],
  info: { name: "Maths", shortDescr: "Tools for maths" },
  init: () => {
    __COMMAND_HANDLER.addCommandGlobal(TexRender, "Maths");
  },
};

export default Module;
