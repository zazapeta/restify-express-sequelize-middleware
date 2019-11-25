const Joi = require("@hapi/joi");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      username: DataTypes.STRING,
      password: DataTypes.STRING,
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      email: DataTypes.STRING,
      role: {
        allowNull: false,
        type: DataTypes.STRING,
        defaultValue: "admin"
      }
    },
    {}
  );
  User.associate = models => {
    User.hasMany(models.Post);
    // associations can be defined here
  };
  User.restify = {
    /** Make custom auth/role here */
    // auth: {
    //   readAll: req => ({ user: true, isValid: true, role: "admin" })
    // },
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
    /** Make custom query here */
    query: {
      /* a query should return something - otherwise, a 404 not found will be send */
      readAll: {
        admin: (req, value) => User.findAll(),
        manager: req => [req.app.restify.auth.user]
      },
      readOne: {
        admin: req => User.findByPk(req.params.id),
        manager: req => req.app.restify.auth.user
      }
    }
  };
  return User;
};
