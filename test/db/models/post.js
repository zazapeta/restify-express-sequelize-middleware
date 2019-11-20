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
  Post.restify = {
    name: "post",
    validate: {},
    auth: {}
  };
  return Post;
};
