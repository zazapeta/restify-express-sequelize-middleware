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
  queryModelSelector,
  endModelSelector
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
  const { isValid, user, role } = await authHandler(req);
  if (!isValid || !user || !role) {
    return { error: Boom.forbidden("not allowed"), value: null };
  }
  req.app.restify.auth = { isValid, user, role };

  // - VALIDATE
  const { error, value } = await applyValidateModel(validateHandler, req);
  if (error) {
    return { error: Boom.badRequest(error), value: null };
  }
  // - QUERY
  let resource;
  if (typeof queryHandler === "function") {
    resource = await queryHandler(req, value);
  } else if (typeof queryHandler === "object") {
    if (typeof queryHandler[role] !== "function") {
      throw new Error(
        "model.query handler for the role :" +
          role +
          " (given by the constructor 'getRole()') is not defined !"
      );
    }
    resource = await queryHandler[role](req, value);
  }
  if (!resource) {
    return { error: Boom.notFound("resource not found"), value: null };
  }
  return { error, resource };
};

module.exports = ({ app, sequelize, auth, swagger }) => {
  // --------------------------
  // #region RESTIFY APP
  // --------------------------
  // BODY PARSER
  app.use(express.json());
  // RESTIFY INIT APP
  app.use((req, res, next) => {
    if (!req.app.restify) {
      req.app.restify = {};
    }
    next();
  });
  // AUTH PARSER
  const {
    loginRoute: { method, path },
    secret,
    model: authModel,
    identityKey,
    passwordKey,
    headersKey,
    getRole
  } = auth;
  // AUTH MODEL WRAPPER - DECORATOR - REMOVAL PASSWORD KEY
  class AuthModel extends authModel {
    static get name() {
      return super.name;
    }
    static create(values) {
      if (values[passwordKey]) {
        const hashedPassword = hashPassword(values[passwordKey]);
        return super.create({ ...values, [passwordKey]: hashedPassword });
      }
      return super.create(values);
    }

    toJSON() {
      const copyOfTheResource = super.toJSON();
      delete copyOfTheResource[passwordKey];
      return copyOfTheResource;
    }
  }
  // POST /login
  app[method](path, async (req, res) => {
    const { [identityKey]: email, [passwordKey]: password } = req.body;
    if (!email || !password) {
      return boomIt(res, Boom.unauthorized("email or password is missing"));
    }
    const user = await AuthModel.findOne({ where: { [identityKey]: email } });
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
    res.json({
      token: jsonWebToken.sign(user.toJSON(), secret)
    });
  });
  // DEFAULT AUTH HANDLER : If model is not providing a auth.create - it wiil use this one in place of.
  /**
   * 
   * @param {*} req 
   * @returns {
              user,
              isValid: true,
              role: await getRole(req, user)
            }
   */
  const defaultAuthHandler = async req => {
    const reqToken = req.headers[headersKey];
    if (reqToken) {
      try {
        const jwtUser = jsonWebToken.verify(reqToken, secret);
        if (jwtUser && jwtUser[identityKey]) {
          const user = await AuthModel.findOne({
            where: { [identityKey]: jwtUser[identityKey] }
          });
          if (user) {
            return {
              user,
              isValid: true,
              role: await getRole(req, user)
            };
          }
        }
      } catch (e) {
        return { isValid: false };
      }
    }
    return { isValid: false };
  };
  // --------------------------
  // #region SWAGGER BASE
  // --------------------------
  const spec = {
    ...swagger,
    swagger: "2.0",
    paths: {},
    definitions: {}
  };
  // --------------------------
  // #endregion SWAGGER BASE
  // --------------------------
  // --------------------------
  // #endregion RESTIFY APP
  // --------------------------

  // --------------------------
  // #region RESTIFY MODELS LOOP
  // --------------------------
  modelsSelector(sequelize).forEach(sequelizeModel => {
    // use the decorated auth model if the current model is the 'authModel' to avoid using nativ .toJSON.
    // We have to use the new .toJSON to ensure password is removed from responses
    const model = sequelizeModel === authModel ? AuthModel : sequelizeModel;

    const path = pathModelSelector(model);
    // --------------------------
    // #region SWAGGER GENERATION
    // --------------------------
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
    // --------------------------
    // #endregion SWAGGER GENERATION
    // --------------------------

    // --------------------------
    // #region MODEL restify options
    // --------------------------
    // model.auth parser
    const {
      create: authCreate = defaultAuthHandler,
      readOne: authReadOne = defaultAuthHandler,
      readAll: authReadAll = defaultAuthHandler,
      update: authUpdate = defaultAuthHandler,
      delete: authDelete = defaultAuthHandler
    } = authModelSelector(model);
    // model.validate parser
    const {
      create: validateCreate,
      readOne: validateReadOne,
      readAll: validateReadAll,
      update: validateUpdate,
      delete: validateDelete
    } = validateModelSelector(model);
    // model.query parser
    const {
      create: queryCreate = async (req, value) => model.create(value),
      readOne: queryReadOne = async req => {
        const resource = await model.findByPk(req.params.id);
        if (resource) {
          return resource;
        }
      },
      readAll: queryReadAll = async req => model.findAll(),
      update: queryUpdate = async (req, value) => {
        const resource = await model.findByPk(req.params.id);
        if (resource) {
          await resource.update(value);
          return resource;
        }
      },
      delete: queryDelete = async req => {
        const resource = await model.findByPk(req.params.id);
        if (resource) {
          await resource.destroy();
          return resource;
        }
      }
    } = queryModelSelector(model);
    // end model parser
    const end = endModelSelector(model);
    // --------------------------
    // #endregion MODEL restify options
    // --------------------------

    // --------------------------
    // #region ROUTES MODEL
    // --------------------------
    /**
     * CREATE
     */
    app.post(`/${path}`, async (req, res, next) => {
      // AUTH & VALIDATE & QUERY
      const { error, resource } = await authAndValidateAndQuery(req)(
        authCreate,
        validateCreate,
        queryCreate
      );
      if (end) {
        return end(req, res, next, {
          model,
          path: `/${path}`,
          method: "post",
          error,
          resource,
          statusCode: 201
        });
      }
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
    app.get(`/${path}/:id`, async (req, res, next) => {
      // AUTH & VALIDATE & QUERY
      const { error, resource } = await authAndValidateAndQuery(req)(
        authReadOne,
        validateReadOne,
        queryReadOne
      );
      if (end) {
        return end(req, res, next, {
          model,
          path: `/${path}/:id`,
          method: "get",
          error,
          resource,
          statusCode: 200
        });
      }
      if (error) {
        return boomIt(res, error);
      }
      // SEND
      res.json(resource);
    });
    // READ ALL
    app.get(`/${path}`, async (req, res, next) => {
      // AUTH & VALIDATE & QUERY
      const { error, resource } = await authAndValidateAndQuery(req)(
        authReadAll,
        validateReadAll,
        queryReadAll
      );
      if (end) {
        return end(req, res, next, {
          model,
          path: `/${path}`,
          method: "get",
          error,
          resource,
          statusCode: 200
        });
      }
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
      if (end) {
        return end(req, res, next, {
          model,
          path: `/${path}/:id`,
          method: "put",
          error,
          resource,
          statusCode: 200
        });
      }
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
      if (end) {
        return end(req, res, next, {
          model,
          path: `/${path}/:id`,
          method: "delete",
          error,
          resource,
          statusCode: 200
        });
      }
      if (error) {
        return boomIt(res, error);
      }
      res.json(resource);
    });

    // --------------------------
    // #endregion ROUTES MODEL
    // --------------------------
  });
  // --------------------------
  // #endregion RESTIFY MODELS LOOP
  // --------------------------

  // --------------------------
  // #region SWAGGER FILE
  // --------------------------
  if (swagger) {
    const swaggerUi = require("swagger-ui-express");
    delete spec.publicPath;
    app.use(swagger.publicPath, swaggerUi.serve, swaggerUi.setup(spec));
  }
  // --------------------------
  // #endregion SWAGGER FILE
  // --------------------------

  return app;
};
