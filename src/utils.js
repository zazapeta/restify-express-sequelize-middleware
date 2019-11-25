const Joi = require("@hapi/joi");

/**
 * TODO: test it
 * @param {Object} sequelize
 * @returns {Array<sequelize.Model>} list of models that have restify property
 */
function modelsSelector({ models }) {
  return Object.values(models).filter(model => model.restify);
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
  return restify.validate || {};
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
  return restify.auth || {};
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
function queryModelSelector({ restify }) {
  return restify.query || {};
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

function endModelSelector({ restify }) {
  return restify.end;
}

/**
 * TODO: test it
 * return the result of data validation given by the option.validate, or, if defined, by the model it self.
 * 'validation' method MUST return a {error, value} object.
 * @param {Function} validateHandler validate method given by the model
 * @param {Object} routeParams should be an object with {req, verb, path}. It will be passed to the auth method
 * @returns {Object} { error, value }.
 */
const applyValidateModel = async (validateHandler, req) => {
  if (validateHandler && typeof validateHandler === "object") {
    return Joi.object(validateHandler).validate(req.body);
  } else if (validateHandler && typeof validateHandler === "function") {
    // create validator should return a object { error, value }
    return await validateHandler(req);
  } else {
    return { error: null, value: req.body };
  }
};

module.exports = {
  modelsSelector,
  validateModelSelector,
  pathModelSelector,
  authModelSelector,
  queryModelSelector,
  endModelSelector,
  applyValidateModel
};
