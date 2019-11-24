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
      publicPath: "/docs"
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
    it("should initialize a route /docs with documentations", done => {
      const app = getApp();
      request(app)
        .get("/docs/")
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            expect(res.text).to.contain("swagger-ui");
            done();
          }
        });
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
    it("Should get 401 and an error msg as the combo email/password is invalid", async () => {
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

  describe("Errors", () => {
    it("# 403 : Should get a 403 for the listed private routes", async () => {
      const privateRoutes = [
        { path: "/posts", method: "post" },
        { path: "/posts/:id", method: "get" },
        { path: "/posts", method: "get" },
        { path: "/posts/:id", method: "put" },
        { path: "/posts/:id", method: "delete" },
        { path: "/users", method: "post" },
        { path: "/users/:id", method: "get" },
        /* public { path: "/users", method: "get" }, */
        { path: "/users/:id", method: "put" },
        { path: "/users/:id", method: "delete" }
      ];
      await Promise.all(
        privateRoutes.map(
          ({ path, method }) =>
            new Promise((resolve, reject) =>
              request(getApp())
                [method](path)
                .expect(403)
                .end(err => (err ? reject(err) : resolve()))
            )
        )
      );
    });
    it("# 404 : Should get a 404 for the not reachable private routes", async () => {
      const token = await getToken("johndoe@demo.com", "unlock");
      const routes = [
        { path: "/posts/123", method: "get" },
        { path: "/posts/456", method: "put" },
        { path: "/posts/789", method: "delete" },
        { path: "/users/101112", method: "get" },
        /* modified in the model { path: "/users/131415", method: "put" },*/
        { path: "/users/161718", method: "delete" }
      ];
      await Promise.all(
        routes.map(
          ({ path, method }) =>
            new Promise((resolve, reject) =>
              request(getApp())
                [method](path)
                .set("authorization", token)
                .expect(404)
                .end(err => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve();
                  }
                })
            )
        )
      );
    });
    it("# 400 : Should get a 400 for the routes as the payload is not validated", async () => {
      const token = await getToken("johndoe@demo.com", "unlock");
      const routes = [
        { path: "/posts", method: "post" },
        { path: "/posts/1", method: "put" },
        { path: "/users", method: "post" },
        { path: "/users/1", method: "put" }
      ];
      await Promise.all(
        routes.map(
          ({ path, method }) =>
            new Promise((resolve, reject) =>
              request(getApp())
                [method](path)
                .set("authorization", token)
                .send({ randomBody: true })
                .expect(400)
                .end(err => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve();
                  }
                })
            )
        )
      );
    });
  });
  describe("POST /resources - create", () => {
    it("# POST /users : should authenticate and create a particular user and hash his password and retrieve a token for the new user", async () => {
      const token = await getToken("johndoe@demo.com", "unlock");
      let createdUserId = await new Promise((resolve, reject) => {
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
              resolve(res.body.id);
            }
          });
      });
      const createdUser = await User.findByPk(createdUserId);
      expect(createdUser.password).to.not.eq("toto");
      const createdUserToken = await getToken("marc.billal@gmail.com", "toto");
      expect(createdUserToken).to.exist;
    });
    it("# POST /posts : should create a particular post", async () => {
      const user = await User.findOne({ where: { email: "johndoe@demo.com" } });
      const token = await getToken("johndoe@demo.com", "unlock");
      const createdPost = await new Promise((resolve, reject) => {
        request(getApp())
          .post(`/posts`)
          .send({
            title: "rere",
            message: "xan"
          })
          .set("authorization", token)
          .expect(201)
          .end((err, res) => (err ? reject(err) : resolve(res.body)));
      });
      expect(createdPost.message).to.be.eq("xan");
      expect(createdPost.title).to.be.eq("rere");
      expect(createdPost.UserId).to.be.eq(user.id);
    });
  });

  describe("GET /resources - readAll", () => {
    it("# GET /users : should retrieve all users using no token as auth.readAll is free access + no passwords in the response", async () => {
      const users = (await User.findAll()).map(user => {
        const d = user.toJSON();
        delete d.password;
        return JSON.parse(JSON.stringify(d));
      });
      return new Promise((resolve, reject) => {
        request(getApp())
          .get("/users")
          .expect(200)
          .end((err, res) => {
            if (err) {
              reject(err);
            } else {
              expect(res.body).to.have.deep.members(users);
              resolve();
            }
          });
      });
    });
    it("# GET /posts : should retrieve all posts", async () => {
      const posts = (await Post.findAll()).map(post =>
        JSON.parse(JSON.stringify(post))
      );
      const token = await getToken("johndoe@demo.com", "unlock");
      const requestedPosts = await new Promise((resolve, reject) => {
        request(getApp())
          .get("/posts")
          .set("authorization", token)
          .expect(200)
          .end((err, res) => {
            if (err) {
              reject(err);
            } else {
              resolve(res.body);
            }
          });
      });
      expect(requestedPosts).to.deep.members(posts);
    });
  });

  describe("GET /resources/:id - readOne", () => {
    it("# GET /users/:id : should retrieve a particular user (with token)", async () => {
      const user = await User.findOne({ where: { email: "johndoe@demo.com" } });
      const token = await getToken("johndoe@demo.com", "unlock");
      await new Promise((resolve, reject) => {
        request(getApp())
          .get(`/users/${user.id}`)
          .set("authorization", token)
          .expect(200)
          .end((err, res) => {
            if (err) {
              reject(err);
            } else {
              expect(res.body.id).to.equal(user.id, "not fetched");
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
    it("# GET /posts/:id : should retrieve a particular post", async () => {
      const token = await getToken("johndoe@demo.com", "unlock");
      const posts = (await Post.findAll()).map(post =>
        JSON.parse(JSON.stringify(post))
      );
      await new Promise(resolve => {
        request(getApp())
          .get(`/posts/${posts[0].id}`)
          .set("authorization", token)
          .expect(200)
          .end((err, res) => {
            if (err) {
              reject(err);
            } else {
              expect(res.body).to.deep.include(posts[0]);
              resolve();
            }
          });
      });
    });
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
