"use strict";
// inspired by https://github.com/sequelize/sequelize/issues/326#issuecomment-334424621
const path = require("path");
const Sequelize = require("sequelize");
const Umzug = require("umzug");

const { sequelize } = require("./models");
const umzug = new Umzug({
  storage: "sequelize",
  logging: console.debug,

  storageOptions: {
    sequelize
  },

  migrations: {
    params: [sequelize.getQueryInterface(), Sequelize],
    path: path.join(__dirname, "./migrations"),
    pattern: /^\d+[\w-]+\.migration.js$/
  }
});

async function migrate() {
  let errors = false;
  console.info("starting PROGRAMMATIC MIGRATION...");
  console.info("directory migrations: ", path.join(__dirname, "./migrations"));
  try {
    await umzug.up();
  } catch (err) {
    console.error("An error occur during the migration : ", err.message);
    errors = true;
  }
  console.info(
    `PROGRAMMATIC MIGRATION: terminated ${
      errors ? "with errors :(" : "successfully"
    }`
  );
}

module.exports = { migrate };
