const knex = require('../config/pgConn');

module.exports.queryPop = async function (idParam) {
  try {
    const query = await knex.select('*').from('app_results_fl_2020').where({
      id: idParam
    });
    return query;
  } catch (err) {
    console.log(err.stack);
  };
};
