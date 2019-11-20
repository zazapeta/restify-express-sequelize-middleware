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
      create: validationCreate,
      readOne: validationReadOne,
      readAll: validationReadAll,
      update: validationUpdate,
      delete: validationDelete
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
      let reqBody = req.body;
      // - AUTH
      const isValid = await applyAuthModel(authCreate)(auth, {
        req,
        verb: "post",
        path: `/${path}`
      });
      if (!isValid) {
        return boomIt(res, Boom.forbidden("not allowed"));
      }
      // - VALIDATE
      const { error, value } = await applyValidateModel(validationCreate)(
        reqBody
      );
      if (error) {
        return boomIt(res, Boom.badRequest(error));
      }
      // SEND
      const createdResource = await model.create(value);
      res.status(201).json(createdResource);
    });

    /**
     * READ
     */
    // READ ONE
    app.get(`/${path}/:id`, async (req, res, next) => {
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
