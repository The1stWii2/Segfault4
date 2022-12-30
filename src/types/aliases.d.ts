declare global {
  /**
   * FilePath is just a regular string.
   * Only used for distinction purposes.
   */
  type FilePath = string;

  /**
   * IDs are strings of numbers
   */
  type ID = `${number}`;
}

export {};
