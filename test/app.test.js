const request = require("supertest");
const express = require("express");
const assert = require("assert");

const { sequelize } = require("./db/models");
const { User, Post } = sequelize.models;
const { seed } = require("./db/seed");
const { migrate } = require("./db/migrate");
const restify = require("../src");

before("Test connexion", done => {
  sequelize
    .sync({ force: true })
    .then(() => migrate())
    .then(() => seed())
    .then(() => {
      console.log("Synced has been established successfully.");
      done();
    })
    .catch(err => {
      console.error("Unable to connect to the database:", err);
      done(err);
    });
});

function getApp() {
  const app = express();
  app.use(express.json());
  app.use(
    restify({
      sequelize
    })
  );
  return app;
}

describe("Routes are added", () => {
  it("should initialize without crashing", done => {
    getApp();
    done();
  });

  it("should define GET /users", done => {
    request(getApp())
      .get("/users")
      .expect(200)
      .end((err, res) => {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });

  it("should define GET /users/:id", async () => {
    const users = await User.findAll();

    await new Promise((resolve, reject) => {
      request(getApp())
        .get(`/users/${users[0].id}`)
        .expect(200)
        .end((err, res) => {
          assert(res.body.id === users[0].id, "not fetched");
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
    });
  });

  it("should define PUT /users/:id", async () => {
    const users = await User.findAll();

    await new Promise((resolve, reject) => {
      request(getApp())
        .put(`/users/${users[0].id}`)
        .send({
          username: "xan"
        })
        .expect(201)
        .end((err, res) => {
          console.log(res.body);
          assert(res.body.id === users[0].id, "not fetched");
          assert(res.body.username === "xan", "not updated");
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
    });
  });
});
