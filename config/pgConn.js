const knex = require('knex')({
  client: 'postgres',
  connection: {
    port: 5432,
    user: 'postgres',
    password: '14a5b13wXS!',
    database: 'postgis_32_sample'
  }
});

module.exports = knex
