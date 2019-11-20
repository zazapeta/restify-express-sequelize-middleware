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
 * 'auth' method MUST return a {isValid, credentials} object.
 * @param {Object} sequelizeModel
 * @param {Function} defaultAuth auth method given by the global conf
 * @param {Object} authParams should be an object with {req, verb, path}. It will be passed to the auth method
 * @returns {Object} { isValid, credentials } - default to { isValid: true, crendtials: {} }
 */
async function applyAuthModel(model, defaultAuth, authParams) {
  const { create: authCreate } = authModelSelector(model);
  let auth = defaultAuth;
  if (authCreate) {
    auth = typeof authCreate === "function" ? authCreate : auth;
    return await auth(authParams);
  }
  return { isValid: true, credentials: {} };
}

module.exports = {
  modelsSelector,
  validateModelSelector,
  pathModelSelector,
  authModelSelector,
  applyAuthModel
};
