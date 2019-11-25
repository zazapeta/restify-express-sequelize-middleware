const express = require("express");
const cors = require("cors");

const { User, Post, sequelize } = require("../test/db/models");
const { seed } = require("../test/db/seed");
const { migrate } = require("../test/db/migrate");
const restify = require(".");

sequelize
  .sync({ force: true })
  .then(() => migrate())
  .then(() => seed())
  .then(() => {
    console.log("Synced has been established successfully.");
    const app = express();
    app.use(cors());
    restify({
      sequelize,
      app,
      auth: {
        secret: "my holly secret should be an env var",
        loginRoute: { method: "post", path: "/login" },
        model: User,
        identityKey: "email",
        passwordKey: "password",
        headersKey: "authorization",
        getRole: async (req, user) => user.role
      },

      swagger: {
        info: { title: "API", version: "1.0.0" },
        host: "localhost:3000",
        basePath: "/",
        publicPath: "/docs",
        file: "./spec.json"
      }
    });

    app.listen(3000);
  })
  .catch(err => {
    console.error("Unable to connect to the database:", err);
  });
