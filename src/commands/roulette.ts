import * as DiscordJS from "discord.js";

import { __client } from "../shared/client";
import { ICommand, IModule } from "../coreLib";
import { __COMMAND_HANDLER, __LOADED_MODULES } from "../shared/globals";

import THREE from "three";
import GIFEncoder from "gifencoder";
import { createCanvas, registerFont } from "node-canvas-webgl";
import logger from "../shared/logger";

//Lazy solution
const puz_options = ["No cheating! ;P"];

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
            .addChoices({ name: "Puzzle Interactions", value: "puz_inter" })
            .setRequired(true),
        )
        .addBooleanOption((option) =>
          option
            .setName("hide")
            .setDescription("Only show result to you.")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("new")
        .setDescription("Roll a nw roulette.")
        .addStringOption((option) =>
          option
            .setName("items")
            .setDescription("Semicolon-delimited list of items.")
            .setRequired(true),
        )
        .addBooleanOption((option) =>
          option
            .setName("hide")
            .setDescription("Only show result to you.")
            .setRequired(false),
        ),
    ),
  episode: async (interaction: DiscordJS.ChatInputCommandInteraction) => {
    const ephemeral = interaction.options.getBoolean("hide") ?? false;
    await interaction.deferReply({ ephemeral: ephemeral });

    let options: string[] = [];
    switch (interaction.options.getSubcommand(true)) {
      case "existing": {
        if (interaction.options.getString("item", true) == "puz_inter") {
          options = puz_options;
        }
        break;
      }
      case "new": {
        const str = interaction.options.getString("items", true);
        options = str.split(";");
        break;
      }
    }
    options = options.filter((n) => n);
    if (options.length == 0) {
      await interaction.editReply("Bad command!");
      return;
    }

    while (options.length < 5) {
      options.concat(options, options);
    }
    const sides = options.length;

    const CANVAS_WIDTH = 512;
    const CANVAS_HEIGHT = 512;
    const texSize = Math.max(1024, 128 * sides);

    const ctx = createCanvas(texSize, texSize).getContext("2d");

    ctx.globalAlpha = 1;
    ctx.font = "normal 40px CeraPro, serif";
    ctx.fillStyle = "#fff";
    ctx.rotate(Math.PI / 2);
    ctx.translate(ctx.canvas.height / 2, 0);
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const offset = -(ctx.canvas.width / sides);
    ctx.translate(0, -offset / 2);
    for (let i = 0; i < sides; i++) {
      ctx.translate(0, offset);
      const scaleFactor = Math.min(
        1,
        ctx.canvas.width /
          sides /
          (ctx.measureText(options[i]).actualBoundingBoxDescent * 2),
        1024 / ctx.measureText(options[i]).width,
      );
      ctx.scale(scaleFactor, scaleFactor);
      ctx.fillText(options[i], 0, 0);
      ctx.scale(1 / scaleFactor, 1 / scaleFactor);
    }

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

    const rad = 1 + 0.2 * sides ** 1.25;
    const geometry = new THREE.CylinderGeometry(
      rad,
      rad,
      2 * Math.PI * rad,
      sides,
    );
    const material = new THREE.MeshPhongMaterial({ map: texture });
    const cylinder = new THREE.Mesh(geometry, material);

    scene.add(cylinder);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 0, 1);
    scene.add(light);

    const FOV = THREE.MathUtils.degToRad(camera.fov);
    const HFOV = 2 * Math.atan(Math.tan(FOV / 2) * camera.aspect);
    const finalDistance = (2 * Math.PI * rad) / (2 * Math.tan(HFOV / 2));

    camera.position.set(0, 0, finalDistance * 0.75);
    camera.lookAt(0, 0, 0);

    const encoder = new GIFEncoder(CANVAS_WIDTH, CANVAS_HEIGHT);
    encoder.start();
    encoder.setRepeat(-1);
    encoder.setDelay(30);
    encoder.setQuality(10);

    cylinder.rotation.z = Math.PI / 2;

    function cubicEaseOut(t: number) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;

      return (t - 1) ** 3 + 1;
    }

    const side = Math.floor(Math.random() * sides + 1);

    const steps = 200;
    const endPos = (2 * Math.PI * side + Math.PI) / sides + 4 * Math.PI;

    function update(step: number) {
      cylinder.rotation.x = cubicEaseOut((1 / steps) * step) * endPos;
      renderer.render(scene, camera);
      encoder.addFrame(canvas.__ctx__ as unknown as CanvasRenderingContext2D);
    }

    for (let i = 0; i < steps; i++) {
      update(i);
    }

    encoder.finish();

    const slot = new DiscordJS.AttachmentBuilder(encoder.out.getData(), {
      name: "random.gif",
    });

    await interaction.editReply({
      embeds: [
        new DiscordJS.EmbedBuilder()
          .setTitle("Rolling...")
          .setImage("attachment://random.gif"),
      ],
      files: [slot],
    });

    setTimeout(() => {
      void interaction.editReply({
        embeds: [
          new DiscordJS.EmbedBuilder()
            .setTitle(`Rolled "${options[side]}"`)
            .setImage("attachment://random.gif"),
        ],
      });
    }, 8000);
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
  },
};

export default Module;
