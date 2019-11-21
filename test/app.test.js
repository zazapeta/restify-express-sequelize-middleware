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
    app,
    auth: req => {
      /* handle global auth logic here -- create user*/
      req.app.restify = {};
      req.app.restify.user = { isLogged: true };
      return true;
    }
  });
  return app;
}

describe("Unit", () => {
  it.skip("# modelsSelector : Should return a list of models", () => {});
  it.skip("# validateModelSelector : Should return a validate object", () => {});
  it.skip("# pathModelSelector : Should return a path string", () => {});
  it.skip("# authModelSelector : Should return a auth object", () => {});
});

describe("Restify", () => {
  it("should initialize without crashing", () => {
    const app = getApp();
  });
  it("Should create a bunch of routes in the app", () => {
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
  });
  describe("POST /resources - create", () => {
    it.skip("# POST /users : should create a particular user", done => {});
    it.skip("# POST /posts : should create a particular post", done => {});
    it.skip("# POST /posts : should 'auth option' be called with correct params", () => {});
    it("#POST /users : should return created user as the payload is satisfied", async () => {
      await new Promise((resolve, reject) => {
        request(getApp())
          .post(`/users`)
          .send({
            firstName: "John",
            lastName: "Doe",
            email: "johndoe@demo.com",
            username: "xan",
            password: "await auth.hashPassword('unlock')"
          })
          .expect(201)
          .end((err, res) => {
            console.log(res.body);
            if (err) {
              reject(err);
            } else {
              expect(res.body).to.include(
                {
                  firstName: "John",
                  lastName: "Doe",
                  email: "johndoe@demo.com",
                  username: "xan",
                  password: "await auth.hashPassword('unlock')"
                },
                "not created"
              );
              resolve();
            }
          });
      });
    });

    it("#POST /users : should return Bad Request as the payload is not satisfied", async () => {
      await new Promise(resolve => {
        request(getApp())
          .post(`/users`)
          .send({
            email: "johndoe@demo.com",
            username: "xan",
            password: "await auth.hashPassword('unlock')"
          })
          .expect(400)
          .end(resolve);
      });
    });
  });

  describe("GET /resources - readAll", () => {
    it("# GET /users : should retrieve all users", done => {
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
    it.skip("# GET /posts : should retrieve all posts", done => {});
    it.skip("# GET /posts : should 'auth option' be called with correct params", () => {});
  });

  describe("GET /resources/:id - readOne", () => {
    it("# GET /users/:id : should retrieve a particular user", async () => {
      const users = await User.findAll();

      await new Promise((resolve, reject) => {
        request(getApp())
          .get(`/users/${users[0].id}`)
          .expect(200)
          .end((err, res) => {
            if (err) {
              reject(err);
            } else {
              expect(res.body.id).to.equal(users[0].id, "not fetched");
              resolve();
            }
          });
      });
    });
    it("# GET /users/:id : should respond Bad Request as the payload is not empty", async () => {
      const users = await User.findAll();

      await new Promise(resolve => {
        request(getApp())
          .get(`/users/${users[0].id}`)
          .send({ test: 1 })
          .expect(400)
          .end(resolve);
      });
    });
    it.skip("# GET /posts/:id : should retrieve a particular post", done => {});
    it.skip("# GET /users/:id : should 'auth option' be called with correct params", () => {});
  });

  describe("PUT /resources/:id - update", () => {
    it.skip("# PUT /users/:id : should update a particular user", done => {});
    it.skip("# PUT /posts/:id : should update a particular post", done => {});
    it.skip("# PUT /posts/:id : should 'auth option' be called with correct params", () => {});
  });

  describe("DELETE /resources/:id - update", () => {
    it.skip("# DELETE /users/:id : should delete a particular user", done => {});
    it.skip("# DELETE /posts/:id : should delete a particular post", done => {});
    it.skip("# DELETE /posts/:id : should 'auth option' be called with correct params", () => {});
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
          if (err) {
            reject(err);
          } else {
            expect(res.body.id).to.equal(users[0].id, "not fetched");
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
        .expect(200)
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
});
