"use strict";
// inspired by https://github.com/sequelize/sequelize/issues/326#issuecomment-334424621
const path = require("path");
const Sequelize = require("sequelize");
const Umzug = require("umzug");

const { sequelize } = require("./models");
const umzug = new Umzug({
  storage: "none",
  logging: console.debug,

  storageOptions: {
    sequelize
  },

  migrations: {
    params: [sequelize.getQueryInterface(), Sequelize],
    path: path.join(__dirname, "./seeders"),
    pattern: /^\d+[\w-]+\.seed.js$/
  }
});

async function seed() {
  let errors = false;
  console.info("starting PROGRAMMATIC SEED...");
  console.info("directory seeder: ", path.join(__dirname, "./seeders"));
  try {
    await umzug.up();
  } catch (err) {
    console.log(err);
    console.error("An error occur during the seed : ", err.message);
    errors = true;
  }
  console.info(
    `PROGRAMMATIC SEED: terminated ${
      errors ? "with errors :(" : "successfully"
    }`
  );
}

module.exports = { seed };
