const crypto = require("crypto");
const util = require("util");
const randomBytes = util.promisify(crypto.randomBytes);
const pbkdf2 = util.promisify(crypto.pbkdf2);

// larger numbers mean better security, less
const config = {
  // size of the generated hash
  hashBytes: 32,
  // larger salt means hashed passwords are more resistant to rainbow table, but
  // you get diminishing returns pretty fast
  saltBytes: 16,
  // more iterations means an attacker has to take longer to brute force an
  // individual password, so larger is better. however, larger also means longer
  // to hash the password. tune so that hashing the password takes about a
  // second
  iterations: 872791,
  digest: "sha512"
};

function hashPassword(password) {
  const { iterations, hashBytes, digest, saltBytes } = config;
  const salt = crypto.randomBytes(saltBytes).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, hashBytes, digest)
    .toString("hex");
  return [salt, hash].join("$");
}

function verifyPassword(password, combined) {
  const { iterations, hashBytes, digest } = config;
  const [salt, originalHash] = combined.split("$");
  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, hashBytes, digest)
    .toString("hex");

  return hash === originalHash;
}

module.exports.verifyPassword = verifyPassword;
module.exports.hashPassword = hashPassword;
