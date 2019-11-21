const express = require("express");
const Boom = require("@hapi/boom");

const {
  modelsSelector,
  validateModelSelector,
  pathModelSelector,
  authModelSelector,
  applyAuthModel,
  applyValidateModel
} = require("./utils");

function boomIt(res, b) {
  res.status(b.output.statusCode).json(b.output.payload);
}

const authAndValidate = req => async (
  defaultAuth,
  authHandler,
  validateHandler
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
  return { error, value };
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

    /**
     * CREATE
     */
    app.post(`/${path}`, async (req, res) => {
      // AUTH & VALIDATE
      const { error, value } = await authAndValidate(req)(
        auth,
        authCreate,
        validateCreate
      );
      if (error) {
        return boomIt(res, error);
      }
      // SEND
      const createdResource = await model.create(value);
      res.status(201).json(createdResource);
    });

    /**
     * READ
     */
    // READ ONE
    app.get(`/${path}/:id`, async (req, res) => {
      // AUTH & VALIDATE
      const { error } = await authAndValidate(req)(
        auth,
        authReadOne,
        validateReadOne
      );
      if (error) {
        return boomIt(res, error);
      }
      // SEND
      const resource = await model.findByPk(req.params.id);
      res.json(resource);
    });
    // READ ALL
    app.get(`/${path}`, async (req, res, next) => {
      const resources = await model.findAll();
      res.json(resources);
    });

    /**
     * UPDATE
     */
    app.put(`/${path}/:id`, async (req, res, next) => {
      let resource = await model.findByPk(req.params.id);
      await resource.update(req.body);
      res.status(200).json(resource);
    });

    /**
     * DELETE
     */
    app.delete(`/${path}/:id`, async (req, res, next) => {
      let resource = await model.findByPk(req.params.id);
      await resource.destroy();
      res.json(resource);
    });
  });
  return app;
};
