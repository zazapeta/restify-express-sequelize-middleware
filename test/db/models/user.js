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
    name: "user"
  };
  return User;
};
