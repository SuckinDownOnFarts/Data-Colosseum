const knex = require('../config/pgConn');

module.exports.getPropertyData = async function () {
  try {
    const query = await knex.select('id', 'address', 'prop_type', 'sale_type', 'price', 'image_ref').from('property_addresses');
    return query;
  } catch (err) {
    console.log(err.stack);
  };
};

async function getPropertyData() {
  try {
    const query = await knex.select('id', 'address', 'prop_type', 'sale_type',' image_ref').from('property_addresses');
    return query;
  } catch (err) {
    console.log(err.stack);
  };
};

// const test = getPropertyData().then((result) => {
//   console.log(result);
// })
