const router = require("express").Router();

module.exports = ({ sequelize }) => {
  Object.values(sequelize.models).forEach(model => {
    const path = model.options.name.plural.toLowerCase();

    /**
     * CREATE
     */
    router.post(`/${path}`, (req, res, next) => {
      model.create(req.body).then(createdResource => {
        res.json(createdResource);
      });
    });
    /**
     * READ
     */
    // READ ONE
    router.get(`/${path}/:id`, (req, res, next) => {
      model.findByPk(req.params.id).then(resource => res.json(resource));
    });
    // READ ALL
    router.get(`/${path}`, (req, res, next) => {
      model.findAll().then(resources => {
        res.json(resources);
      });
    });
    /**
     * UPDATE
     */
    router.put(`/${path}/:id`, async (req, res, next) => {
      let resource = await model.findByPk(req.params.id);
      await resource.update(req.body);
      res.status(201).json(resource);
    });

    /**
     * DELETE
     */
    router.delete(`/${path}/:id`, async (req, res, next) => {
      let resource = await model.findByPk(req.params.id);
      await resource.destroy();
      res.json(resource);
    });
  });
  return router;
  // (req, res, next) => {
  //   if (model) {
  //     console.log(model);
  //   } else {
  //     next();
  //   }
  // };
};
