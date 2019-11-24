const Joi = require("@hapi/joi");

module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define(
    "Post",
    {
      title: DataTypes.STRING,
      message: DataTypes.STRING
    },
    {}
  );
  Post.associate = models => {
    // associations can be defined here
    Post.belongsTo(models.User);
  };
  // define it to use it
  Post.restify = {
    validate: {
      create: {
        title: Joi.string()
          .min(1)
          .max(140)
          .required(),
        message: Joi.string()
          .min(1)
          .max(255)
          .required()
      },
      update: {
        title: Joi.string()
          .min(1)
          .max(140),
        message: Joi.string()
          .min(1)
          .max(255)
      }
    },
    query: {
      create: async (req, value) =>
        Post.create({ ...value, UserId: req.app.restify.auth.user.id })
    }
  };
  return Post;
};
