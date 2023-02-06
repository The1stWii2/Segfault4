import * as DiscordJS from "discord.js";
import * as DiscordAPI from "discord-api-types/v10";

export interface IEvent<K extends keyof DiscordJS.ClientEvents> {
  name: string;
  eventDetails: {
    eventType: K;
    function: (...args: DiscordJS.ClientEvents[K]) => Promise<void> | void;
  };
}

//Structure of Event Store:
//GuildID -> { IEvent[] }
type EventStore = Record<ID, IEvent<keyof DiscordJS.ClientEvents>[]>;

export class EventHandler {
  private eventStore: EventStore;
  private client: DiscordJS.Client;

  constructor(client: DiscordJS.Client) {
    this.eventStore = {};
    this.client = client;
  }
}
