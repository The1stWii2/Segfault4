import * as DiscordJS from "discord.js";

import { ICommand, IModule } from "../coreLib";
import { __COMMAND_HANDLER } from "../shared/globals";

import THREE from "three";
import GIFEncoder from "gifencoder";
import { createCanvas, registerFont } from "node-canvas-webgl";
import { loadJSON5 } from "../common/load-JSON5";

let predefined: {
  PuzInter: string[];
  "8Ball": string[];
};

const ReloadCommands: ICommand = {
  info: { name: "Roulette", shortDescr: "Spin a wheel!" },
  builder: new DiscordJS.SlashCommandBuilder()
    .setName("roulette")
    .setDescription("Spins a wheel.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("existing")
        .setDescription("Roll an existing roulette.")
        .addStringOption((option) =>
          option
            .setName("item")
            .setDescription("Roulette to roll.")
            .addChoices({ name: "Puzzle Interactions", value: "PuzInter" })
            .addChoices({ name: "Magic 8 Ball", value: "8Ball" })
            .setRequired(true),
        )
        .addNumberOption((option) =>
          option
            .setName("time")
            .setDescription(
              "Length of roll animation in seconds. Default is '6'. (Caution: larger takes longer.)",
            )
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20),
        )
        .addBooleanOption((option) =>
          option
            .setName("hide")
            .setDescription("Only show result to you.")
            .setRequired(false),
        )
        .addBooleanOption((option) =>
          option
            .setName("spoiler")
            .setDescription(
              "Uses a spoiler to hide the result of roll (removes embed).",
            )
            .setRequired(false),
        )
        .addBooleanOption((option) =>
          option
            .setName("shuffle")
            .setDescription("Shuffle order of items.")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("title")
            .setDescription("Set title for embed (unused if spoiler enabled).")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("new")
        .setDescription("Roll a new roulette.")
        .addStringOption((option) =>
          option
            .setName("items")
            .setDescription("Semicolon-delimited list of items.")
            .setRequired(false),
        )
        .addNumberOption((option) =>
          option
            .setName("time")
            .setDescription(
              "Length of roll animation in seconds. Default is '5'. (Caution: larger takes longer.)",
            )
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20),
        )
        .addBooleanOption((option) =>
          option
            .setName("use-modal")
            .setDescription("Use a modal to input items instead.")
            .setRequired(false),
        )
        .addBooleanOption((option) =>
          option
            .setName("hide")
            .setDescription("Only show result to you.")
            .setRequired(false),
        )
        .addBooleanOption((option) =>
          option
            .setName("spoiler")
            .setDescription(
              "Uses a spoiler to hide the result of roll (removes embed).",
            )
            .setRequired(false),
        )
        .addBooleanOption((option) =>
          option
            .setName("shuffle")
            .setDescription("Shuffle order of items.")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("title")
            .setDescription("Set title for embed (unused if spoiler enabled).")
            .setRequired(false),
        ),
    ),
  episode: async (interaction: DiscordJS.ChatInputCommandInteraction) => {
    //Collect input if needed
    let inputString = "";
    let modalCollector;

    let options: string[] = [];
    switch (interaction.options.getSubcommand(true)) {
      case "existing": {
        options =
          predefined[
            interaction.options.getString("item", true) as "PuzInter" | "8Ball"
          ];
        break;
      }
      case "new": {
        if (
          interaction.options.getString("items") &&
          !interaction.options.getBoolean("use-modal")
        ) {
          inputString = interaction.options.getString("items")!;
        } else {
          const modal = new DiscordJS.ModalBuilder()
            .setCustomId("editModal")
            .setTitle("Modal expires after 2 minutes")
            .addComponents(
              new DiscordJS.ActionRowBuilder<DiscordJS.TextInputBuilder>().addComponents(
                new DiscordJS.TextInputBuilder()
                  .setCustomId("items")
                  .setLabel("Enter items (semicolon-delimited)")
                  .setStyle(DiscordJS.TextInputStyle.Paragraph)
                  .setValue(
                    interaction.options.getString("items")
                      ? interaction.options.getString("items")!
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
            inputString = modalCollector.fields.getTextInputValue("items");
          }
        }

        options = inputString.split(";");
        break;
      }
    }
    options = options.filter((n) => n);
    if (options.length == 0) {
      await interaction.reply("Bad command!");
      return;
    }

    options = options.map((option) => option.trim());

    while (options.length < 5) {
      options = options.concat(options);
    }
    const sides = options.length;
    if (interaction.options.getBoolean("shuffle")) {
      //https://stackoverflow.com/a/2450976
      function shuffle<T>(array: T[]) {
        let currentIndex = array.length,
          randomIndex;

        // While there remain elements to shuffle.
        while (currentIndex > 0) {
          // Pick a remaining element.
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex--;

          // And swap it with the current element.
          [array[currentIndex], array[randomIndex]] = [
            array[randomIndex],
            array[currentIndex],
          ];
        }

        return array;
      }

      options = shuffle(options);
    }

    //Defer reply
    const interReply = !modalCollector ? interaction : modalCollector;
    const ephemeral = interaction.options.getBoolean("hide") ?? false;
    await interReply.deferReply({ ephemeral: ephemeral });

    const CANVAS_WIDTH = 512;
    const CANVAS_HEIGHT = 512;
    const faceSize = 128;
    const texSize = faceSize * sides;

    const rad = 1 + 0.2 * sides;
    const cylinderHeight = 2 * Math.PI * rad;

    const ctx = createCanvas(texSize, texSize).getContext("2d");

    ctx.globalAlpha = 1;
    ctx.font = "normal 40px CeraPro, serif";
    ctx.fillStyle = "#fff";
    ctx.rotate(Math.PI / 2);
    ctx.translate(ctx.canvas.height / 2, 0);

    const offset = -(ctx.canvas.width / sides);
    ctx.translate(0, -offset / 2);
    for (let i = 0; i < sides; i++) {
      ctx.translate(0, offset);
      const scaleFactor = Math.min(
        1,
        ctx.canvas.width /
          sides /
          (ctx.measureText(options[i]).actualBoundingBoxDescent * 2),
        (texSize * 2) / ctx.measureText(options[i]).width,
      );
      ctx.scale(scaleFactor, scaleFactor);
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(options[i], 0, 0);
      ctx.scale(1 / scaleFactor, 1 / scaleFactor);
    }

    let scalePullback = 0;
    for (const item of options) {
      if (ctx.measureText(item).width > scalePullback) {
        scalePullback = ctx.measureText(item).width;
      }
    }
    scalePullback = scalePullback / texSize;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      CANVAS_WIDTH / CANVAS_HEIGHT,
      0.1,
      1000,
    );
    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas as unknown as HTMLCanvasElement,
      context: canvas.getContext("webgl"),
    });

    const texture = new THREE.CanvasTexture(ctx.canvas);
    texture.minFilter = THREE.LinearFilter;

    const geometry = new THREE.CylinderGeometry(
      rad,
      rad,
      cylinderHeight,
      sides,
    );
    const material = new THREE.MeshPhongMaterial({ map: texture });
    const cylinder = new THREE.Mesh(geometry, material);

    scene.add(cylinder);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 0, 1);
    scene.add(light);

    const FOV = THREE.MathUtils.degToRad(camera.fov);
    const hFOV = 2 * Math.atan(Math.tan(FOV / 2) * camera.aspect);
    const finalDistance = Math.min(
      cylinderHeight / Math.floor(Math.sqrt(sides)) / Math.tan(hFOV / 2),
      cylinderHeight / 2 / Math.tan(hFOV / 2),
    );

    camera.position.set(0, 0, finalDistance + finalDistance * scalePullback);
    camera.lookAt(0, 0, 0);

    const frameTime = 30;
    const encoder = new GIFEncoder(CANVAS_WIDTH, CANVAS_HEIGHT);
    encoder.start();
    encoder.setRepeat(-1);
    encoder.setDelay(frameTime);
    encoder.setQuality(10);

    cylinder.rotation.z = Math.PI / 2;

    function cubicEaseOut(t: number) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;

      return (t - 1) ** 3 + 1;
    }

    const side = Math.floor(Math.random() * sides);

    const time = interaction.options.getNumber("time") ?? 5;
    const steps = (time * 1000) / frameTime;
    const endPos =
      (2 * Math.PI * side + Math.PI) / sides +
      Math.ceil((time / 2) * (2 / 3)) * 2 * Math.PI;

    function update(step: number) {
      cylinder.rotation.x = cubicEaseOut((1 / steps) * step) * endPos;
      renderer.render(scene, camera);
      encoder.addFrame(canvas.__ctx__ as unknown as CanvasRenderingContext2D);
    }

    for (let i = 0; i < steps; i++) {
      update(i);
    }

    encoder.finish();

    if (!interaction.options.getBoolean("spoiler")) {
      const slot = new DiscordJS.AttachmentBuilder(encoder.out.getData(), {
        name: "random.gif",
      });

      const title = interaction.options.getString("title");

      await interReply.editReply({
        embeds: [
          new DiscordJS.EmbedBuilder()
            .setTitle(title ?? "Rolling...")
            .setImage("attachment://random.gif"),
        ],
        files: [slot],
      });

      setTimeout(
        () => {
          void interReply.editReply({
            embeds: [
              new DiscordJS.EmbedBuilder()
                .setTitle(`${title ?? "Rolled"}\n"${options[side]}"`)
                .setImage("attachment://random.gif"),
            ],
          });
        },
        Math.max((time * 1000) / 0.75, time * 1000 + 2000),
      );
    } else {
      const slot = new DiscordJS.AttachmentBuilder(encoder.out.getData(), {
        name: "SPOILER_random.gif",
      });

      await interReply.editReply({
        files: [slot],
      });
    }
  },
};

const Module: IModule = {
  tags: ["fun"],
  info: { name: "Roulette", shortDescr: "Spin a wheel!" },
  init: () => {
    __COMMAND_HANDLER.addCommandGlobal(ReloadCommands, "Roulette");

    registerFont("storage/CeraPro-Bold.otf", {
      family: "CeraPro",
      weight: "bold",
      style: "sans-serif",
    });

    predefined = loadJSON5("storage/global.Roulette.json");
  },
};

export default Module;
