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
    auth: {
      secret: "my holly secret should be an env var",
      loginRoute: { method: "post", path: "/login" },
      model: User,
      identityKey: "email",
      passwordKey: "password",
      headersKey: "authorization"
    },
    swagger: {
      info: { title: "API", version: "1.0.0" },
      host: "localhost",
      basePath: "/",
      file: "./spec.json"
    }
  });
  return app;
}

async function getToken(email, password) {
  const token = await new Promise((resolve, reject) => {
    request(getApp())
      .post("/login")
      .send({
        email,
        password
      })
      .expect(200)
      .end((err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.body.token);
        }
      });
  });
  return token;
}

describe.skip("Unit", () => {
  it("# modelsSelector : Should return a list of models", () => {});
  it("# validateModelSelector : Should return a validate object", () => {});
  it("# pathModelSelector : Should return a path string", () => {});
  it("# authModelSelector : Should return a auth object", () => {});
});

describe("Restify", () => {
  describe("General", () => {
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
        { path: "/users/:id", method: "delete" },
        { path: "/login", method: "post" }
      ]);
    });
  });
  describe("POST /login", () => {
    it("Should get a token as the combo email/password is valid", async () => {
      await new Promise((resolve, reject) => {
        request(getApp())
          .post(`/login`)
          .send({
            email: "johndoe@demo.com",
            password: "unlock"
          })
          .expect(200)
          .end((err, res) => {
            if (err) {
              reject(err);
            } else {
              expect(res.body.token).exist;
              resolve();
            }
          });
      });
    });
    it("Should get an error msg as the combo email/password is invalid", async () => {
      await new Promise((resolve, reject) => {
        request(getApp())
          .post(`/login`)
          .send({
            email: "johndoe@demo.com",
            password: "failing password"
          })
          .expect(401)
          .end((err, res) => {
            if (err) {
              reject(err);
            } else {
              expect(res.body.token).to.not.exist;
              resolve();
            }
          });
      });
    });
  });
  describe("POST /resources - create", () => {
    it("# POST /users : should authenticate and create a particular user", async () => {
      const token = await getToken("johndoe@demo.com", "unlock");
      await new Promise((resolve, reject) => {
        request(getApp())
          .post("/users")
          .set("authorization", token)
          .send({
            firstName: "Marc",
            lastName: "Billal",
            email: "marc.billal@gmail.com",
            username: "mbil",
            password: "toto"
          })
          .expect(201)
          .end((err, res) => {
            console.log(res.body);
            if (err) {
              reject(err);
            } else {
              expect(res.body.password).to.not.exist;
              expect(res.body).to.include(
                {
                  firstName: "Marc",
                  lastName: "Billal",
                  email: "marc.billal@gmail.com",
                  username: "mbil"
                },
                "not created"
              );
              resolve();
            }
          });
      });
    });
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

  describe.skip("GET /resources - readAll", () => {
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

  describe.skip("GET /resources/:id - readOne", () => {
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

  describe.skip("PUT /resources/:id - update", () => {
    it.skip("# PUT /users/:id : should update a particular user", done => {});
    it.skip("# PUT /posts/:id : should update a particular post", done => {});
    it.skip("# PUT /posts/:id : should 'auth option' be called with correct params", () => {});
  });

  describe.skip("DELETE /resources/:id - update", () => {
    it.skip("# DELETE /users/:id : should delete a particular user", done => {});
    it.skip("# DELETE /posts/:id : should delete a particular post", done => {});
    it.skip("# DELETE /posts/:id : should 'auth option' be called with correct params", () => {});
  });

  it.skip("should define GET /users", done => {
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

  it.skip("should define GET /users/:id", async () => {
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

  it.skip("should define PUT /users/:id", async () => {
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
