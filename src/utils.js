/**
 * TODO: test it
 * @param {Object} sequelize
 * @returns {Array<sequelize.Model>} list of models
 */
function modelsSelector({ models }) {
  return Object.values(models).filter(model => model.name !== "SequelizeMeta");
}

/**
 * TODO: test it
 * @param {Object} sequelizeModel
 * @returns {Object} an object within {
      create,
      readOne,
      readlAll,
      update,
      delete
    }
 */
function validateModelSelector({ restify }) {
  return restify.validate;
}

/**
 * TODO: test it
 * return path name from a model
 * @param {Object} model
 * @returns {String} the path name
 */
function pathModelSelector(model) {
  return model.options.name.plural.toLowerCase();
}

/**
* TODO: test it
* @param {Object} sequelizeModel
* @returns {Object} an object within {
     create,
     readOne,
     readlAll,
     update,
     delete
   }
  */
function authModelSelector({ restify }) {
  return restify.auth;
}

module.exports = {
  modelsSelector,
  validateModelSelector,
  pathModelSelector,
  authModelSelector
};
