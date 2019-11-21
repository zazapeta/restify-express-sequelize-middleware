const express = require("express");
const Boom = require("@hapi/boom");

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
  }
}) => {
  app.use(express.json());
  modelsSelector(sequelize).forEach(model => {
    const path = pathModelSelector(model);
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
  return app;
};
