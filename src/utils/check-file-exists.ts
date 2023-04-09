import fs from 'fs';

export async function checkFileExists(filepath: string) {
  return fs.promises
    .access(filepath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}
