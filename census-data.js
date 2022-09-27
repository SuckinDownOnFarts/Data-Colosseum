const nodeGeocoder = require('node-geocoder');
const knexPostgis = require('knex-postgis');
let options = { provider: 'openstreetmap' }; //Configure the Geocoding Provider
const geoCoder = nodeGeocoder(options);
const knex = require('knex')({
  client: 'postgres',
  connection: {
    port: 5432,
    user: 'postgres',
    password: '14a5b13wXS!',
    database: 'postgis_32_sample'
  }
});

const st = knexPostgis(knex); //Set up knexpostgis

module.exports.computeOverlappedVars = async function(geocodeResults) {
  try {
    let propertyAddressId = await geoCode(geocodeResults);
    const id = (propertyAddressId[0].id.toString());
    let overlappingGeoids = await makeOverlapTable(id);
    let queryResults = await selectCensusVars(overlappingGeoids);
    // console.log(queryResults);
  } catch (err) {
    console.log(err);
  }
};



//Takes user address, creates point from coordinates and inserts into property_addresses table in PostGIS
async function geoCode(address) {
  const coor = await geoCoder.geocode(address);
  const propertyLong = coor[0].longitude.toString();
  const propertyLat = coor[0].latitude.toString();
  const point = {
    type: 'Point',
    coordinates: [propertyLong, propertyLat],
    crs: {
      type: 'name',
      properties: {
        name: 'EPSG:4326'
      }
    }
  };
  const id = await knex.insert({
    address: address,
    coordinates: point,
  }).returning('id').into('property_addresses');
  return id;
};

//
async function makeOverlapTable(bufferId) {
  const geoids = [];

  const row = await knex.from('fl').innerJoin('property_addresses', 'fl.join_id', 'property_addresses.join_id').where('property_addresses.id', '=', bufferId)
    .andWhere(function() {
      this.where(st.intersects('fl.geom', 'property_addresses.buffer4'))
    });

  row.forEach((geoid) => {
    geoids.push(geoid.geoid)
  });
  //Insert Geoids
  const geoidTableId = await knex('geoids').insert({
    geoids: geoids,
    address_id: bufferId
  });

  return geoids;
};

//queries the census variable table for the overlapped geoids
async function selectCensusVars(query) {
  const table = await knex.select().from('to_pg_dp03').whereIn('geoid', query);
  return table;
};



async function computeOverlappedVars(geocodeInput) {
  try {
    let propertyAddressId = await geoCode(geocodeInput);
    const id = (propertyAddressId[0].id.toString());
    let overlappingGeoids = await makeOverlapTable(id);
    let queryResults = await selectCensusVars(overlappingGeoids);
  } catch (err) {
    console.log(err);
  }
};
