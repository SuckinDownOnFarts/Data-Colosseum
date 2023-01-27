const nodeGeocoder = require('node-geocoder');
const knexPostgis = require('knex-postgis');
let options = { provider: 'openstreetmap' };
const geoCoder = nodeGeocoder(options);
const knex = require('../config/pgConn');
const st = knexPostgis(knex);

module.exports.calculateData = async function (reqAddress) {
  try {
    const result = await geocode(reqAddress);
    const id = (result[0].id.toString());
    const overlapRes = await getOverlap(id);
    const censusData = await getCensusData(overlapRes);
    let calculatedData = await aggregateData(censusData[0], censusData[1], censusData[2], id);
    return id;
  } catch (err) {
    console.log(err);
  };
};


async function geocode(address) {
  const result = await geoCoder.geocode(address);
  const longitude = result[0].longitude.toString();
  const latitude = result[0].latitude.toString();
  const point = {
    type: 'Point',
    coordinates: [longitude, latitude],
    crs: {
      type: 'name',
      properties: {
        name: 'EPSG:4326'
      }
    }
  };
  const queryResult = await knex.insert({
    address: address,
    coordinates: point,
    prop_type: "Medical Building",
    sale_type: "Sale",
    price: "1700000",
    image_ref: 'medical.jpg'
  }).returning('id').into('property_addresses');

  return queryResult;
};


async function get3MileOverlap(queryId) {
  const threeMile = await knex.select(knex.raw('a."geoid", Sum(ST_Area(ST_INTERSECTION(a.geom, b.three_mile)) / ST_Area(a.geom) * 100)'))
    .from(knex.raw('public."fl_cen_tracts" a, public."property_addresses" b'))
    .where(knex.raw('b.id = ? and ST_Overlaps(b.three_mile, a.geom) group by a."geoid", b.three_mile', queryId))

  return threeMile;
};

async function get5MileOverlap(queryId) {
  const fiveMile = await knex.select(knex.raw('a."geoid", Sum(ST_Area(ST_INTERSECTION(a.geom, b.five_mile)) / ST_Area(a.geom) * 100)'))
    .from(knex.raw('public."fl_cen_tracts" a, public."property_addresses" b'))
    .where(knex.raw('b.id = ? and ST_Overlaps(b.five_mile, a.geom) group by a."geoid", b.five_mile', queryId))

  return fiveMile;
};

async function get10MileOverlap(queryId) {
  const tenMile = await knex.select(knex.raw('a."geoid", Sum(ST_Area(ST_INTERSECTION(a.geom, b.ten_mile)) / ST_Area(a.geom) * 100)'))
    .from(knex.raw('public."fl_cen_tracts" a, public."property_addresses" b'))
    .where(knex.raw('b.id = ? and ST_Overlaps(b.ten_mile, a.geom) group by a."geoid", b.ten_mile', queryId))

  return tenMile;
};


async function getCensusData(overlapResults) {
  let geoidArray = [];
  let overlapArray = [];




  overlapResults.forEach((row) => {
    geoidArray.push(row.geoid);
    overlapArray.push(row.sum);
  });

  const queryVars = await knex.select('*').from('acsdata_fl_2020').whereIn('geoid', geoidArray);

  const varValues = queryVars.map(Object.values); //array of census data results
  const varKeys = Object.keys(queryVars[0]);
  varKeys.shift();

  return [varValues, varKeys, overlapArray ]
};

async function aggregateData(values, headers, percents, id) {
  let arr = []
  let arr2 = []

  var percentVarCounter = 0;

  values.forEach((tract, index) => {
    if (index==0) {
      for (var i = 1; i < tract.length; i++) {
        arr.push(Math.round(tract[i] * (percents[percentVarCounter] / 100)))
      };
      percentVarCounter++
    } else {
      for (var i = 1; i < tract.length; i++) {
        arr2.push(Math.round(tract[i] * (percents[percentVarCounter] / 100)))
      };
      percentVarCounter++;
      var sum = arr.map(function (num, idx) {
        return num + arr2[idx]
      });
      arr = sum;
      arr2.length = 0;
    }; //END OF ELSE STATEMENT
  });
  r = {}

  headers.push('id')
  id = parseInt(id)
  arr.push(id)

  for (let i = 0; i < arr.length; i++) {
  r[headers[i]] = arr[i];
  }

  // console.log(typeof r[0]);
  //Insert into pg table for dashboard component data here
  //TODO: convert array 'r' to js object
  //TODO: use knex to insert into table

  // console.log('done');

  // console.log(r);
  return r;
};

async function insertResults(result3, result5, result10) {
  // const props = Object.getOwnPropertyNames(result3);
  // let combinedObject = { ...result3 };
  // for (let i = 0; i < props.length; i++) {
  //   combinedObject[props[i]] = [combinedObject[props[i]], result5[props[i]], result10[props[i]]];
  // };

  // console.log(Object.keys(result10).length);

  const threeMile = await knex.insert(result3).into('three_m_app_results_2020');
  const fiveMile = await knex.insert(result5).into('five_m_app_results_2020');
  const tenMile = await knex.insert(result10).into('ten_m_app_results_2020');

  console.log('done');
}


async function calculateData(reqAddress) {
  try {
    const result = await geocode(reqAddress);
    const id = (result[0].id.toString());

    const overlap3Res = await get3MileOverlap(id);
    const overlap5Res = await get5MileOverlap(id);
    const overlap10Res = await get10MileOverlap(id);

    let censusData3 = await getCensusData(overlap3Res);
    let censusData5 = await getCensusData(overlap5Res);
    let censusData10 = await getCensusData(overlap10Res);

    const calculatedData3 = await aggregateData(censusData3[0], censusData3[1], censusData3[2], id);
    const calculatedData5 = await aggregateData(censusData5[0], censusData5[1], censusData5[2], id);
    const calculatedData10 = await aggregateData(censusData10[0], censusData10[1], censusData10[2], id);

    const fin = await insertResults(calculatedData3, calculatedData5, calculatedData10);
    return id
  } catch (err) {
    console.log(err);
  };
};


calculateData('6300 W Bay Pkwy Panama City, FL 32409')




// const nodeGeocoder = require('node-geocoder');
// const knexPostgis = require('knex-postgis');
// let options = { provider: 'openstreetmap' };
// const geoCoder = nodeGeocoder(options);
// const knex = require('../config/pgConn');
// const st = knexPostgis(knex);
//
// module.exports.calculateData = async function (reqAddress) {
//   try {
//     const result = await geocode(reqAddress);
//     const id = (result[0].id.toString());
//     const overlapRes = await getOverlap(id);
//     const censusData = await getCensusData(overlapRes);
//     let calculatedData = await aggregateData(censusData[0], censusData[1], censusData[2], id);
//     return id;
//   } catch (err) {
//     console.log(err);
//   };
// };
//
//
// async function geocode(address) {
//   const result = await geoCoder.geocode(address);
//   const longitude = result[0].longitude.toString();
//   const latitude = result[0].latitude.toString();
//   const point = {
//     type: 'Point',
//     coordinates: [longitude, latitude],
//     crs: {
//       type: 'name',
//       properties: {
//         name: 'EPSG:4326'
//       }
//     }
//   };
//   const queryResult = await knex.insert({
//     address: address,
//     coordinates: point,
//     prop_type: "Medical Building",
//     sale_type: "Sale",
//     price: "1700000",
//     image_ref: 'medical.jpg'
//   }).returning('id').into('property_addresses');
//
//   return queryResult;
// };
//
//
// async function getOverlap(queryId) {
//   const query = await knex.select(knex.raw('a."geoid", Sum(ST_Area(ST_INTERSECTION(a.geom, b.buffer4)) / ST_Area(b.buffer4) * 100)'))
//     .from(knex.raw('public."fl_cen_tracts" a, public."property_addresses" b'))
//     .where(knex.raw('b.id = ? and ST_Overlaps(b.buffer4, a.geom)  group by a."geoid", b.buffer4', queryId))
//
//   return query;
// };
//
//
// async function getCensusData(overlapResults) {
//   let geoidArray = [];
//   let overlapArray = [];
//
//   overlapResults.forEach((row) => {
//     geoidArray.push(row.geoid);
//     overlapArray.push(row.sum);
//   });
//
//   const queryVars = await knex.select('*').from('acsdata_fl_2020').whereIn('geoid', geoidArray);
//
//   const varValues = queryVars.map(Object.values); //array of census data results
//   const varKeys = Object.keys(queryVars[0]);
//   varKeys.shift();
//
//   return [varValues, varKeys, overlapArray ]
// };
//
//
// async function aggregateData(values, headers, percents, id) {
//   let arr = []
//   let arr2 = []
//
//   var percentVarCounter = 0;
//
//   values.forEach((tract, index) => {
//     if (index==0) {
//       for (var i = 1; i < tract.length; i++) {
//         arr.push(Math.round(tract[i] * (percents[percentVarCounter] / 100)))
//       };
//       percentVarCounter++
//     } else {
//       for (var i = 1; i < tract.length; i++) {
//         arr2.push(Math.round(tract[i] * (percents[percentVarCounter] / 100)))
//       };
//       percentVarCounter++;
//       var sum = arr.map(function (num, idx) {
//         return num + arr2[idx]
//       });
//       arr = sum;
//       arr2.length = 0;
//     }; //END OF ELSE STATEMENT
//   });
//   r = {}
//
//   id = parseInt(id)
//   headers.push('id')
//   arr.push(id)
//
//
//
//   for (let i = 0; i < arr.length; i++) {
//   r[headers[i]] = arr[i];
//   }
//
//   // console.log(r);
//   //Insert into pg table for dashboard component data here
//   //TODO: convert array 'r' to js object
//   //TODO: use knex to insert into table
//
//   const query = await knex.insert(r).into('app_results_fl_2020')
//   console.log('done');
//
//   // console.log(typeof r);
//   // return r;
// };
//
// async function calculateData(reqAddress) {
//   try {
//     const result = await geocode(reqAddress);
//     const id = (result[0].id.toString());
//     const overlapRes = await getOverlap(id);
//     const censusData = await getCensusData(overlapRes);
//     let calculatedData = await aggregateData(censusData[0], censusData[1], censusData[2], id);
//     return id
//
//   } catch (err) {
//     console.log(err);
//   };
// };
//
//
// calculateData('6300 W Bay Pkwy Panama City, FL 32409')
