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
      readOne: {}
    },
    auth: {
      create: true,
      readOne: true /* handle custom auth here -- where to include roles based auth */,
      readAll: true,
      update: true,
      delete: true
    }
  };
  return User;
};
