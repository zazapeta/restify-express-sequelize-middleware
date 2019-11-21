const Joi = require("@hapi/joi");

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

/**
 * TODO: test it
 * return the result of auth given by the option.auth, or, if defined, by the model it self.
 * 'auth' method MUST return a boolean.
 * @param {Object} sequelizeModel
 * @param {Function} defaultAuth auth method given by the global conf
 * @param {Function} authHandler auth method given by the model
 * @param {Object} req express req
 * @returns {Boolean} true if auth is success. false otherwise. Default to true.
 */
const applyAuthModel = defaultAuth => async (authHandler, req) => {
  let auth = defaultAuth;
  if (authHandler) {
    auth = typeof authHandler === "function" ? authHandler : auth;
    return await auth(req);
  }
  return true;
};

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
    return await validateHandler(req.body);
  } else {
    throw new Error(
      "model.validate.create must be either a Joi scheme or a function that return an object {error, value}"
    );
  }
};

module.exports = {
  modelsSelector,
  validateModelSelector,
  pathModelSelector,
  authModelSelector,
  applyAuthModel,
  applyValidateModel
};
