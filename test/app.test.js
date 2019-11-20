const request = require("supertest");
const express = require("express");
const chai = require("chai");
const should = chai.should(); // Using Should style
const expect = chai.expect;

const { User, Post, sequelize } = require("./db/models");
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
  restify({
    sequelize,
    app
  });
  return app;
}

describe("Routes are added", () => {
  it("should initialize without crashing", done => {
    const app = getApp();
    expect(
      app._router.stack
        .filter(layer => layer.route && layer.route.path)
        .map(layer => ({
          path: layer.route.path,
          method: layer.route.stack[0].method
        }))
    ).to.have.deep.members([
      { path: "/posts", method: "post" },
      { path: "/posts/:id", method: "get" },
      { path: "/posts", method: "get" },
      { path: "/posts/:id", method: "put" },
      { path: "/posts/:id", method: "delete" },
      { path: "/users", method: "post" },
      { path: "/users/:id", method: "get" },
      { path: "/users", method: "get" },
      { path: "/users/:id", method: "put" },
      { path: "/users/:id", method: "delete" }
    ]);
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
          expect(res.body.id).to.equal(users[0].id, "not fetched");
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
          if (err) {
            reject(err);
          } else {
            expect(res.body.id).to.equal(users[0].id, "not fetched");
            expect(res.body.username).to.equal("xan", "not updated");
            resolve();
          }
        });
    });
  });

  it("should define POST /users", async () => {
    await new Promise((resolve, reject) => {
      request(getApp())
        .post(`/users`)
        .send({
          username: "xan"
        })
        .expect(201)
        .end((err, res) => {
          console.log(res.body);
          if (err) {
            reject(err);
          } else {
            expect(res.body.username).to.equal("xan", "not updated");
            resolve();
          }
        });
    });
  });
});
