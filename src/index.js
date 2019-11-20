const express = require("express");
const Joi = require("@hapi/joi");
const Boom = require("@hapi/boom");

const {
  modelsSelector,
  validateModelSelector,
  pathModelSelector
} = require("./utils");

function boomIt(res, b) {
  res.status(b.output.statusCode).json(b.output.payload);
}

module.exports = ({ app, sequelize }) => {
  app.use(express.json());
  modelsSelector(sequelize).forEach(model => {
    const path = pathModelSelector(model);
    const {
      create,
      readOne,
      readlAll,
      update,
      delete: deletion
    } = validateModelSelector(model);
    /**
     * CREATE
     */
    app.post(`/${path}`, async (req, res, next) => {
      let resourceData = req.body;
      let boom;
      if (create && typeof create === "object") {
        const { error, value } = Joi.object(create).validate(resourceData);
        if (error) {
          boom = Boom.badRequest(error);
        } else {
          resourceData = value;
        }
      } else if (create && typeof create === "function") {
        // create validator should return a object { error, value }
        const { error, value } = create(req, res, next);
        if (error) {
          boom = Boom.badRequest(error);
        } else {
          resourceData = value;
        }
      }
      if (boom) {
        boomIt(res, boom);
      } else {
        const createdResource = await model.create(resourceData);
        res.status(201).json(createdResource);
      }
    });

    /**
     * READ
     */
    // READ ONE
    app.get(`/${path}/:id`, (req, res, next) => {
      model.findByPk(req.params.id).then(resource => res.json(resource));
    });
    // READ ALL
    app.get(`/${path}`, (req, res, next) => {
      model.findAll().then(resources => {
        res.json(resources);
      });
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
  // (req, res, next) => {
  //   if (model) {
  //     console.log(model);
  //   } else {
  //     next();
  //   }
  // };
};
