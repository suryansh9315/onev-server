const crypto = require("crypto");

const password = process.env["CRYPT_PASSWORD"];
const iv = Buffer.from(process.env["IV"], 'hex');
const ivstring = iv.toString("hex");

const sha1 = (input) => {
  return crypto.createHash("sha1").update(input).digest();
};

const password_derive_bytes = (password, salt, iterations, len) => {
  let key = Buffer.from(password + salt);
  for (let i = 0; i < iterations; i++) {
    key = sha1(key);
  }
  if (key.length < len) {
    const hx = password_derive_bytes(password, salt, iterations - 1, 20);
    for (let counter = 1; key.length < len; ++counter) {
      key = Buffer.concat([
        key,
        sha1(Buffer.concat([Buffer.from(counter.toString()), hx])),
      ]);
    }
  }
  return Buffer.alloc(len, key);
};

const encode = async (string) => {
  const key = password_derive_bytes(password, "", 100, 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const part1 = cipher.update(string, "utf8");
  const part2 = cipher.final();
  const encrypted = Buffer.concat([part1, part2]).toString("base64");
  return encrypted;
};

const decode = async (string) => {
  const key = password_derive_bytes(password, "", 100, 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(string, "base64", "utf8");
  decrypted += decipher.final();
  return decrypted;
};

module.exports = { encode, decode }