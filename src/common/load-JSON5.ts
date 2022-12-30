import fs from "fs";
import JSON5 from "json5";

export function loadJSON5<T>(filename: string): T {
  const json5File = fs.readFileSync(filename);
  return JSON5.parse<T>(String(json5File));
}
