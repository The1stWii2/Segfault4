import fs from "fs";
import path from "path";
import __CONFIGURATION__ from "../shared/globals";

interface JSONLoose {
  [key: string]: any[] | any; //A looser definition for JSON Objects, which TypeScript can better parse.
}

export function loadStoreFile<T = JSONValue>(guildID: `${number}` | "global", command?: string): T | undefined {
  if (fs.existsSync(path.join(__CONFIGURATION__.filepaths.storageLocation, `${guildID}.json`))) {
    const file = fs.readFileSync(path.join(__CONFIGURATION__.filepaths.storageLocation, `${guildID}.json`));

    const store = JSON.parse(String(file)) as JSONLoose;

    if (command === undefined) {
      return store as T;
    }
    return store[command] as T;
  }
  throw new Error(`Storage file for "${guildID}" was requested, but no such file exists!`);
}

//TODO, ideally "command" should be implicitly passed, but that'll have to wait till I replace
//objects with classes
export function saveStoreFile<T = JSONValue>(guildID: `${number}` | "global", command: string, data: T) {
  let store: JSONLoose = {};
  if (fs.existsSync(path.join(__CONFIGURATION__.filepaths.storageLocation, `${guildID}.json`))) {
    store = JSON.parse(
      String(fs.readFileSync(path.join(__CONFIGURATION__.filepaths.storageLocation, `${guildID}.json`)))
    ) as JSONLoose;
  }
  store[command] = data;

  fs.writeFileSync(path.join(__CONFIGURATION__.filepaths.storageLocation, `${guildID}.json`), JSON.stringify(store));
}
