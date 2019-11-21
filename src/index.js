const fs = require("fs");
const express = require("express");
const Boom = require("@hapi/boom");

const SpecTransformer = require("./spec-transform");

const {
  modelsSelector,
  validateModelSelector,
  pathModelSelector,
  authModelSelector,
  applyAuthModel,
  applyValidateModel,
  queryModelSelector
} = require("./utils");

function boomIt(res, b) {
  res.status(b.output.statusCode).json(b.output.payload);
}

/**
 * @returns {Object} {error, resource}
 */
const authAndValidateAndQuery = req => async (
  defaultAuth,
  authHandler,
  validateHandler,
  queryHandler
) => {
  // - AUTH
  const isValid = await applyAuthModel(defaultAuth)(authHandler, req);
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
  return { error, resource };
};

module.exports = ({
  app,
  sequelize,
  auth = () => {
    throw new Error(
      "A model try to use auth. You must implement auth option in the constructor"
    );
  },
  swagger
}) => {
  app.use(express.json());
  let spec = {
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
            403: { description: "Forbidden - the request is not authentified" }
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
            403: { description: "Forbidden - the request is not authentified" }
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
            403: { description: "Forbidden - the request is not authentified" }
          }
        }
      };
    }
    const {
      create: validateCreate,
      readOne: validateReadOne,
      readAll: validateReadAll,
      update: validateUpdate,
      delete: validateDelete
    } = validateModelSelector(model);
    const {
      create: authCreate,
      readOne: authReadOne,
      readAll: authReadAll,
      update: authUpdate,
      delete: authDelete
    } = authModelSelector(model);
    const {
      create: queryCreate = async (req, value) => model.create(value),
      readOne: queryReadOne = async (req, value) => {
        return model.findByPk(req.params.id);
      },
      readAll: queryReadAll = async (req, value) => model.findAll(),
      update: queryUpdate = async (req, value) => {
        const resource = await model.findByPk(req.params.id);
        await resource.update(value);
        return resource;
      },
      delete: queryDelete = async (req, value) => {
        const resource = await model.findByPk(req.params.id);
        await resource.destroy();
        return resource;
      }
    } = queryModelSelector(model);
    /**
     * CREATE
     */
    app.post(`/${path}`, async (req, res) => {
      // AUTH & VALIDATE & QUERY
      const { error, resource } = await authAndValidateAndQuery(req)(
        auth,
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
        auth,
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
        auth,
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
        auth,
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
        auth,
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
