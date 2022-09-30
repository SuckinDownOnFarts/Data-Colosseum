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

module.exports.computeOverlappedVars = async function (geocodeInput) {
  try {
    let propertyAddressId = await geoCode(geocodeInput);
    const id = (propertyAddressId[0].id.toString());
    let overlappingGeoids = await makeOverlapTable(id);
    let percentsAndCensusVars = await keyValuePairs(overlappingGeoids);
    let result = selectCensusVars(percentsAndCensusVars[0], percentsAndCensusVars[1]);
    return result;
  } catch (err) {
    console.log(err);
  };
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

  const query = await knex.select(knex.raw('a."geoid", Sum(ST_Area(ST_INTERSECTION(a.geom, b.buffer4)) / ST_Area(b.buffer4) * 100)'))
    .from(knex.raw('public."fl" a, public."property_addresses" b'))
    .where(knex.raw('b.id = ? and ST_Overlaps(b.buffer4, a.geom)  group by a."geoid", b.buffer4', bufferId))

  return query;
};


async function keyValuePairs(overlapQuery) {
  let geoids = [];
  let percentOverlap = []; //array of percentages
  overlapQuery.forEach((row) => {
    geoids.push(row.geoid);
    percentOverlap.push(row.sum);
  })
  var map = new Map();
  for (var i = 0; i < geoids.length; i++) {
    map.set(geoids[i], percentOverlap[i]);
  };
  const obj = Object.fromEntries(map);

  const query = await knex.select().from('census_vars').whereIn('geoid', Object.keys(obj));
  const varValues = query.map(Object.values); //array of census data results
  // const censusKeys = query.map(Object.keys)
  //
  // const censusKeysNoId = censusKeys[0].slice(2)
  // console.log(percentOverlap);
  // console.log(varValues);
  return [varValues, percentOverlap]
};




async function selectCensusVars(values, percents) {
  let arr = []
  let arr2 = []


  var percentVarCounter = 0;

  values.forEach((tract, index) => {

    if (index==0) {

      for (var i = 1; i < tract.length; i++) {
        arr.push(tract[i] * (percents[percentVarCounter] / 100))
      };

      percentVarCounter++

    } else {

      for (var i = 1; i < tract.length; i++) {
        arr2.push(tract[i] * (percents[percentVarCounter] / 100))
      };

      percentVarCounter++;

      var sum = arr.map(function (num, idx) {
        return num + arr2[idx]
      });

      arr = sum;
      arr2.length = 0;
    }; //END OF ELSE STATEMENT

  });
  return arr;
};

async function computeOverlappedVars(geocodeInput) {
  try {
    let propertyAddressId = await geoCode(geocodeInput);
    const id = (propertyAddressId[0].id.toString());
    let overlappingGeoids = await makeOverlapTable(id);
    let percentsAndCensusVars = await keyValuePairs(overlappingGeoids);
    let result = await selectCensusVars(percentsAndCensusVars[0], percentsAndCensusVars[1]);

  } catch (err) {
    console.log(err);
  };
};


// computeOverlappedVars('610 Eglin Pkwy NE, Fort Walton Beach, FL 32547')
