const Joi = require("@hapi/joi");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      username: DataTypes.STRING,
      password: DataTypes.STRING,
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      email: DataTypes.STRING
    },
    {}
  );
  User.associate = (/* models */) => {
    // associations can be defined here
  };
  User.restify = {
    /** Make custom auth/role here */
    auth: {
      readAll: req => true
    },
    /** Make custom validation here */
    validate: {
      create: {
        username: Joi.string()
          .min(1)
          .max(140)
          .required(),
        firstName: Joi.string()
          .min(1)
          .max(140)
          .required(),
        lastName: Joi.string()
          .min(1)
          .max(140)
          .required(),
        password: Joi.string()
          .min(1)
          .max(140)
          .required(),
        email: Joi.string()
          .email()
          .required()
      },
      update: {
        username: Joi.string()
          .min(1)
          .max(140),
        firstName: Joi.string()
          .min(1)
          .max(140),
        lastName: Joi.string()
          .min(1)
          .max(140),
        password: Joi.string()
          .min(1)
          .max(140),
        email: Joi.string().email()
      }
    },
    auth: {
      readAll: () => true
    },
    /** Make custom query here */
    query: {
      /* a query should return something - otherwise, a 404 not found will be send */
      update: async (req, value) => {
        return User.create(value);
      }
    }
  };
  return User;
};
