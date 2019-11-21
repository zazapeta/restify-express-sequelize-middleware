const express = require("express");

const { User, Post, sequelize } = require("./db/models");
const { seed } = require("./db/seed");
const { migrate } = require("./db/migrate");
const restify = require("../src");

sequelize
  .sync({ force: true })
  .then(() => migrate())
  .then(() => seed())
  .then(() => {
    console.log("Synced has been established successfully.");
    const app = express();
    restify({
      sequelize,
      app,
      auth: req => {
        /* handle global auth logic here -- create user*/
        req.app.restify = {};
        req.app.restify.user = { isLogged: true };
        return true;
      },
      swagger: {
        info: { title: "API", version: "1.0.0" },
        host: "localhost",
        basePath: "/",
        file: "./spec.json"
      }
    });

    app.listen(3000);
  })
  .catch(err => {
    console.error("Unable to connect to the database:", err);
  });
