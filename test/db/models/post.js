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
  Post.restify = {};
  return Post;
};
