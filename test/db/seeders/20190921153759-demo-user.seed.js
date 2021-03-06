const { hashPassword } = require("../../../src/auth");
module.exports = {
  up: async (queryInterface /* , Sequelize */) =>
    queryInterface.bulkInsert(
      "Users",
      [
        {
          firstName: "John",
          lastName: "Doe",
          email: "johndoe@demo.com",
          username: "johndoe",
          password: await hashPassword("unlock"),
          createdAt: new Date(),
          updatedAt: new Date(),
          role: "manager"
        },
        {
          firstName: "Elon",
          lastName: "musk",
          email: "elonmusk@demo.com",
          username: "elonmusk",
          password: await hashPassword("spacex"),
          createdAt: new Date(),
          updatedAt: new Date(),
          role: "admin"
        },
        {
          firstName: "Jeff",
          lastName: "Bezos",
          email: "jeffbezos@demo.com",
          username: "jeffbezos",
          password: await hashPassword("amazon"),
          createdAt: new Date(),
          updatedAt: new Date(),
          role: "admin"
        }
      ],
      {}
    ),

  down: (queryInterface /* , Sequelize */) =>
    queryInterface.bulkDelete("Users", null, {})
};
