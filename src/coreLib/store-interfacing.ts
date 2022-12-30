import fs from "fs";
import path from "path";
import __CONFIGURATION__ from "../shared/globals";

interface JSONLoose {
  [key: string]: any[] | any; //A looser definition for JSON Objects, which TypeScript can better parse.
}

export function loadStoreFile<T = JSONValue>(guildID: `${number}` | "global", command?: string): T | undefined {
  if (fs.existsSync(path.join(__CONFIGURATION__.filepaths.storageLocation, `${guildID}.json`))) {
    const store = JSON.parse(
      String(fs.readFileSync(path.join(__CONFIGURATION__.filepaths.storageLocation, `${guildID}.json`)))
    ) as JSONLoose;

    if (command === undefined) {
      return store as T;
    }
    //This returns the object still within the command's Object. We'll need to unwrap that.
    //TODO: Actually unwrap the top level. Object.values()[0] just crashes for some reason.
    //But doesn't crash depending where its called???
    return store[command] as T;
  }
  throw new Error(`Storage file for "${guildID}" was requested, but no such file exists!`);
}

//TODO, ideally "command" should be implicitly passed, but that'll have to wait till I replace
//objects with classes
export function saveStoreFile(guildID: `${number}` | "global", command: string, data: JSONValue) {
  let store: JSONValue = {};
  if (fs.existsSync(path.join(__CONFIGURATION__.filepaths.storageLocation, `${guildID}.json`))) {
    store = JSON.parse(
      String(fs.readFileSync(path.join(__CONFIGURATION__.filepaths.storageLocation, `${guildID}.json`)))
    ) as JSONLoose;
  }
  store[command] = data;

  fs.writeFileSync(path.join(__CONFIGURATION__.filepaths.storageLocation, `${guildID}.json`), JSON.stringify(store));
}
