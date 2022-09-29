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


  return [varValues, percentOverlap]
};


//queries the census variable table for the overlapped geoids
// async function selectCensusVars(values, percents) {
//   let arr = []
//
//   var percentVarCounter = 0;
//   values.forEach((tract) => {
//
//     for (var i = 2; i < tract.length; i++) {
//
//       arr.push(tract[i] * (percents[percentVarCounter] / 100))
//     };
//     percentVarCounter++
//
//   });
//   return arr;
// };

async function selectCensusVars(values, percents) {
  let arr = []
  let arr2 = []

  var percentVarCounter = 0;
  values.forEach((tract, index) => {
    if (index==0) {
      for (var i = 2; i < tract.length; i++) {
        arr.push(tract[i] * (percents[percentVarCounter] / 100))
      };
      percentVarCounter++
    } else {
      for (var i = 2; i < tract.length; i++) {
        arr2.push(tract[i] * (percents[percentVarCounter] / 100))
      };
      percentVarCounter++;

      var sum = arr.map(function (num, idx) {
        return num + arr2[idx]
      });
      arr = sum;
      delete sum;
    };

  });

  return arr;
};

async function computeOverlappedVars(geocodeInput) {
  try {
    let propertyAddressId = await geoCode(geocodeInput);
    const id = (propertyAddressId[0].id.toString());
    let overlappingGeoids = await makeOverlapTable(id);
    let percentsAndCensusVars = await keyValuePairs(overlappingGeoids);
    let result = await selectCensusVars(percentsAndCensusVars[0], percentsAndCensusVars[1])

    console.log(percentsAndCensusVars[1]);
    console.log(result);
  } catch (err) {
    console.log(err);
  }
};


computeOverlappedVars('6300 W Bay Pkwy, Panama City, FL 32409')









// makeOverlapTable(id).then((result) => {
//   // console.log(result);
//   let geoids = []
//   let percentOverlap = []
//   result.forEach((row) => {
//     geoids.push(row.geoid)
//     percentOverlap.push(row.sum)
//   })
//   var map = new Map()
//   for (var i = 0; i < geoids.length; i++){
//     map.set(geoids[i], percentOverlap[i]);
//   }
//   const obj = Object.fromEntries(map)
//   console.log(obj);
// }).catch(function (err) {
//   console.log(err);
// });
