import * as DiscordJS from "discord.js";
import { TEpisode } from "./command-definitions";

/**
 * Interface describing the Module object.
 *
 * @typeParam GlobalStore - Type describing *expected* shape of the Module's block
 *  in the Global store.
 * @typeParam GuildStore - Type describing *expected* shape of the Module's block in
 *  the Guild store.
 *
 * @param tags - Array of `strings` that will be used to search for this Module.
 * @param info - An {@link IInfo} object used to describe this Module.
 * @param init - An __optional__ method that is called during Initialisation.
 * @param guildLoad - An __optional__ method that is called during Initialisation.
 * @param postLoad - An __optional__ method that is called after Initialisation.
 * @param config - An __optional__ method that is called for configuration purposes.
 */
export interface IModule<GlobalStore extends JSONValue = JSONValue, GuildStore extends JSONValue = JSONValue> {
  /**
   * Array of `strings` that will be used to search for this Module.
   *
   * @remarks
   * This property may also be used to determine certain properties about the
   * Module in later releases.
   *
   * @alpha
   */
  tags: string[];
  /**
   * An {@link IInfo} object used to describe this Module.
   * This object will be used by the `/help` Command.
   *
   * @alpha
   */
  info: IInfo;
  /**
   * An __optional__ method that is called during Initialisation.
   * This method should be used to initialise anything the Module needs.
   *
   * @param store - A `JSON` object which is the Module's block in the Global
   *  store. `Undefined` if no block exists.
   */
  init?: (store: GlobalStore | undefined) => void;
  /**
   * An __optional__ method that is called during Initialisation, for _every_
   * guild this Module is enabled in as well as whenever a Guild enables this
   * module.
   *
   * This method should be used to initialise anything related to Guilds (e.g.,
   * Guild-specific Commands).
   *
   * @param guildID - The ID of a Guild.
   * @param store - A `JSON` object which is the Module's block in the corresponding
   *  Guild store. `Undefined` if no block exists.
   */
  guildLoad?: (guildID: DiscordJS.Snowflake, store: GuildStore | undefined) => void;
  /**
   * An __optional__ method that is called after Initialisation.
   * This method should be used for anything that needs to occur just before
   * logging in.
   *
   * @param store - A `JSON` object which is the Module's block in the Global
   *  store. `Undefined` if no block exists.
   */
  postLoad?: () => void;
  config?: TEpisode;
}

export interface IInfo {
  name: string;
  shortDescr: string;
  longDescr?: string;
  authors?: string[];
}
