// backend/utils/crypto.js
const crypto = require("crypto");
const fs = require("fs");

/**
 * For streaming simplicity we use AES-256-CTR.
 * (GCM adds integrity/auth but complicates pure streaming for large files;
 *  you can switch to GCM later if you persist the auth tag.)
 */

function generateKey() {
  return crypto.randomBytes(32); // 256-bit key
}

function encryptFile(inputPath, outputPath, key, iv) {
  return new Promise((resolve, reject) => {
    const cipher = crypto.createCipheriv("aes-256-ctr", key, iv);
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    input.on("error", reject);
    output.on("error", reject);
    output.on("close", resolve);

    input.pipe(cipher).pipe(output);
  });
}

function createDecryptionStream(encryptedPath, key, iv) {
  const decipher = crypto.createDecipheriv("aes-256-ctr", key, iv);
  const input = fs.createReadStream(encryptedPath);
  return input.pipe(decipher);
}

module.exports = {
  generateKey,
  encryptFile,
  createDecryptionStream
};
