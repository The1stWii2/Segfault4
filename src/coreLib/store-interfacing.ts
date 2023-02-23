import fs from "fs";
import path from "path";
import __CONFIGURATION__ from "../shared/globals";
import { CoreLibError } from "./command-definitions";

interface JSONLoose {
  [key: string]: any[] | any; //A looser definition for JSON Objects, which TypeScript can better parse.
}

export function loadStoreFile<T = JSONValue>(guildID: `${number}` | "global", group: string): T | undefined {
  if (fs.existsSync(path.join(__CONFIGURATION__.filepaths.storageLocation, `${guildID}.${group}.json`))) {
    const file = fs.readFileSync(path.join(__CONFIGURATION__.filepaths.storageLocation, `${guildID}.${group}.json`));

    const store = JSON.parse(String(file)) as JSONLoose;

    return store as T;
  }
  throw new InvalidStorageFile(
    `Storage file for "${guildID}, ${group ?? "(Shared)"}" was requested, but no such file exists!`
  );
}

//TODO, ideally "command" should be implicitly passed, but that'll have to wait till I replace
//objects with classes
export function saveStoreFile<T = JSONValue>(guildID: `${number}` | "global", group: string, data: T) {
  let store: JSONLoose = {};
  if (fs.existsSync(path.join(__CONFIGURATION__.filepaths.storageLocation, `${guildID}.${group}.json`))) {
    store = JSON.parse(
      String(fs.readFileSync(path.join(__CONFIGURATION__.filepaths.storageLocation, `${guildID}.${group}.json`)))
    ) as JSONLoose;
  }
  store[group] = data;

  fs.writeFileSync(
    path.join(__CONFIGURATION__.filepaths.storageLocation, `${guildID}.${group}.json`),
    JSON.stringify(store)
  );
}

export class InvalidStorageFile extends CoreLibError {
  constructor(message: string) {
    super(message);
  }
}
