const fs = require("fs");
const express = require("express");
const Boom = require("@hapi/boom");
const jsonWebToken = require("jsonwebtoken");

const SpecTransformer = require("./spec-transform");

const {
  modelsSelector,
  validateModelSelector,
  pathModelSelector,
  authModelSelector,
  applyValidateModel,
  queryModelSelector
} = require("./utils");

const { verifyPassword, hashPassword } = require("./auth");

function boomIt(res, b) {
  res.status(b.output.statusCode).json(b.output.payload);
}

/**
 * @returns {Object} {error, resource}
 */
const authAndValidateAndQuery = req => async (
  authHandler,
  validateHandler,
  queryHandler
) => {
  // - AUTH
  const isValid = await authHandler(req);
  if (!isValid) {
    return { error: Boom.forbidden("not allowed"), value: null };
  }
  // - VALIDATE
  const { error, value } = await applyValidateModel(validateHandler, req);
  if (error) {
    return { error: Boom.badRequest(error), value: null };
  }
  // - QUERY
  const resource = await queryHandler(req, value);
  if (!resource) {
    return { error: Boom.notFound("resource not found"), value: null };
  }
  return { error, resource };
};

module.exports = ({ app, sequelize, auth, swagger }) => {
  app.use(express.json());
  app.use((req, res, next) => {
    if (!req.app.restify) {
      req.app.restify = {};
    }
    next();
  });

  const {
    loginRoute: { method, path },
    secret,
    model: authModel,
    identityKey,
    passwordKey,
    headersKey
  } = auth;

  // POST /login
  app[method](path, async (req, res) => {
    const { [identityKey]: email, [passwordKey]: password } = req.body;
    if (!email || !password) {
      return boomIt(res, Boom.unauthorized("email or password is missing"));
    }
    const user = await authModel.findOne({ where: { [identityKey]: email } });
    if (!user) {
      return boomIt(
        res,
        Boom.unauthorized("no user found or password invalid")
      );
    }
    const verification = await verifyPassword(password, user.password);
    if (!verification) {
      return boomIt(
        res,
        Boom.unauthorized("no user found or password invalid")
      );
    }
    // sign with default (HMAC SHA256)
    const jwtUser = user.toJSON();
    delete jwtUser[passwordKey];
    res.json({
      token: jsonWebToken.sign(jwtUser, secret)
    });
  });

  const defaultAuthHandler = async req => {
    const reqToken = req.headers[headersKey];
    if (reqToken) {
      try {
        const jwtUser = jsonWebToken.verify(reqToken, secret);
        if (jwtUser && jwtUser[identityKey]) {
          const user = await authModel.findOne({
            where: { [identityKey]: jwtUser[identityKey] }
          });
          if (user) {
            req.app.restify.auth = { user, isLogged: true };
            return true;
          }
        }
      } catch (e) {
        return false;
      }
    }
    return false;
  };

  const spec = {
    ...swagger,
    swagger: "2.0",
    paths: {},
    definitions: {}
  };

  modelsSelector(sequelize).forEach(model => {
    const path = pathModelSelector(model);
    if (swagger) {
      spec.definitions[model.name] = SpecTransformer(model);
      spec.paths[`/${path}`] = {
        post: {
          tags: [model.name],
          summary: `Create a new ${model.name}`,
          parameters: [
            {
              in: "body",
              name: "body",
              description: `${model.name} object that need to be created`,
              required: true,
              schema: { $ref: `#/definitions/${model.name}` }
            }
          ],
          responses: {
            201: {
              description: "Created",
              schema: { $ref: `#/definitions/${model.name}` }
            },
            400: { description: "Bad Request - the payload is not validated" },
            403: { description: "Forbidden - the request is not authentified" }
          }
        },
        get: {
          tags: [model.name],
          summary: `List all of ${model.name}`,
          parameters: [],
          responses: {
            200: {
              description: "Success",
              schema: {
                type: "array",
                items: { $ref: `#/definitions/${model.name}` }
              }
            },
            400: { description: "Bad Request - the payload is not validated" },
            403: { description: "Forbidden - the request is not authentified" }
          }
        }
      };
      spec.paths[`/${path}/:id`] = {
        get: {
          tags: [model.name],
          summary: `Read ${model.name} with the given id`,
          parameters: [],
          responses: {
            200: {
              description: "Success",
              schema: { $ref: `#/definitions/${model.name}` }
            },
            400: { description: "Bad Request - the payload is not validated" },
            403: { description: "Forbidden - the request is not authentified" },
            404: { description: " Not Found - the given id is not reachable" }
          }
        },
        put: {
          tags: [model.name],
          summary: `Update ${model.name} with the given id and the body attached to`,
          parameters: [
            {
              in: "body",
              name: "body",
              description: `${model.name} object that need to be updated`,
              required: true,
              schema: { $ref: `#/definitions/${model.name}` }
            }
          ],
          responses: {
            200: {
              description: "Success",
              schema: { $ref: `#/definitions/${model.name}` }
            },
            400: { description: "Bad Request - the payload is not validated" },
            403: { description: "Forbidden - the request is not authentified" },
            404: { description: " Not Found - the given id is not reachable" }
          }
        },
        delete: {
          tags: [model.name],
          summary: `Delete ${model.name} with the given id`,
          parameters: [],
          responses: {
            200: {
              description: "Success",
              schema: { $ref: `#/definitions/${model.name}` }
            },
            400: { description: "Bad Request - the payload is not validated" },
            403: { description: "Forbidden - the request is not authentified" },
            404: { description: " Not Found - the given id is not reachable" }
          }
        }
      };
    }
    const {
      create: authCreate = defaultAuthHandler,
      readOne: authReadOne = defaultAuthHandler,
      readAll: authReadAll = defaultAuthHandler,
      update: authUpdate = defaultAuthHandler,
      delete: authDelete = defaultAuthHandler
    } = authModelSelector(model);
    const {
      create: validateCreate,
      readOne: validateReadOne,
      readAll: validateReadAll,
      update: validateUpdate,
      delete: validateDelete
    } = validateModelSelector(model);
    const {
      create: queryCreate = async (req, value) => {
        const resourceToCreate = { ...value };
        if (model === authModel) {
          resourceToCreate[passwordKey] = hashPassword(
            resourceToCreate[passwordKey]
          );
        }
        const resource = await model.create(resourceToCreate);
        const resourceToSend = resource.toJSON();
        if (model === authModel) {
          delete resourceToSend[passwordKey];
        }
        return resourceToSend;
      },
      readOne: queryReadOne = async (req, value) => {
        return model.findByPk(req.params.id);
      },
      readAll: queryReadAll = async (req, value) => model.findAll(),
      update: queryUpdate = async (req, value) => {
        const resource = await model.findByPk(req.params.id);
        if (resource) {
          await resource.update(value);
        }
        return resource;
      },
      delete: queryDelete = async (req, value) => {
        const resource = await model.findByPk(req.params.id);
        if (resource) {
          await resource.destroy();
        }
        return resource;
      }
    } = queryModelSelector(model);
    /**
     * CREATE
     */
    app.post(`/${path}`, async (req, res) => {
      // AUTH & VALIDATE & QUERY
      const { error, resource } = await authAndValidateAndQuery(req)(
        authCreate,
        validateCreate,
        queryCreate
      );
      if (error) {
        return boomIt(res, error);
      }
      // SEND
      res.status(201).json(resource);
    });

    /**
     * READ
     */
    // READ ONE
    app.get(`/${path}/:id`, async (req, res) => {
      // AUTH & VALIDATE & QUERY
      const { error, resource } = await authAndValidateAndQuery(req)(
        authReadOne,
        validateReadOne,
        queryReadOne
      );
      if (error) {
        return boomIt(res, error);
      }
      // SEND
      res.json(resource);
    });
    // READ ALL
    app.get(`/${path}`, async (req, res) => {
      // AUTH & VALIDATE & QUERY
      const { error, resource } = await authAndValidateAndQuery(req)(
        authReadAll,
        validateReadAll,
        queryReadAll
      );
      if (error) {
        return boomIt(res, error);
      }
      res.json(resource);
    });

    /**
     * UPDATE
     */
    app.put(`/${path}/:id`, async (req, res, next) => {
      // AUTH & VALIDATE & QUERY
      const { error, resource } = await authAndValidateAndQuery(req)(
        authUpdate,
        validateUpdate,
        queryUpdate
      );
      if (error) {
        return boomIt(res, error);
      }
      res.json(resource);
    });

    /**
     * DELETE
     */
    app.delete(`/${path}/:id`, async (req, res, next) => {
      // AUTH & VALIDATE & QUERY
      const { error, resource } = await authAndValidateAndQuery(req)(
        authDelete,
        validateDelete,
        queryDelete
      );
      if (error) {
        return boomIt(res, error);
      }
      res.json(resource);
    });
  });

  if (swagger) {
    delete spec.file;
    fs.writeFileSync(swagger.file, JSON.stringify(spec));
  }
  return app;
};
