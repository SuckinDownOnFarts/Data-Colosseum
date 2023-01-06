const knex = require('../config/pgConn');

module.exports.query = async function (idParam) {
  try {
    const query = await knex.select('*').from('property_addresses').where({
      id: idParam
    });
    return query;
  } catch (err) {
    console.log(err.stack);
  };
};
