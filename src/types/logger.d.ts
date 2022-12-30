import { LeveledLogMethod, Logger } from "winston";

export {};

declare global {
  class SegLogger extends Logger {
    fatal: LeveledLogMethod;
  }
}
