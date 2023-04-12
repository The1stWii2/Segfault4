import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

const botIntents = [
  DiscordAPI.GatewayIntentBits.Guilds,
  DiscordAPI.GatewayIntentBits.GuildWebhooks,
  DiscordAPI.GatewayIntentBits.GuildMessages,
  DiscordAPI.GatewayIntentBits.GuildMessageReactions,
  DiscordAPI.GatewayIntentBits.GuildMessageTyping,
  DiscordAPI.GatewayIntentBits.DirectMessages,
  DiscordAPI.GatewayIntentBits.DirectMessageReactions,
  DiscordAPI.GatewayIntentBits.DirectMessageTyping,
  DiscordAPI.GatewayIntentBits.MessageContent,
  DiscordAPI.GatewayIntentBits.GuildScheduledEvents,
  DiscordAPI.GatewayIntentBits.GuildPresences,
  DiscordAPI.GatewayIntentBits.GuildMembers,
];

export const __client = new DiscordJS.Client({ intents: botIntents });
