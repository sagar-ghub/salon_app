const config = require("../../config");
const knexdb = require("knex")({
  client: "mysql",
  connection: {
    host: config.db_host,
    port: config.db_port,
    user: config.db_user,
    password: config.db_password,
    database: config.db_database,
  },
});

module.exports = knexdb;
