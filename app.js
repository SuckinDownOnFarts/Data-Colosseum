const express = require('express');
const turf = require('turf');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const nodeGeocoder = require('node-geocoder');
const {
  Pool
} = require('pg');
const knex = require('knex')({
  client: 'postgres',
  connection: {
    port: 5432,
    user: 'postgres',
    password: '14a5b13wXS!',
    database: 'postgis_32_sample'
  }
});
const knexPostgis = require('knex-postgis')
const PORT = process.env.PORT || 3000;


//Set up knexpostgis
const st = knexPostgis(knex)
//SET UP express
const app = express();
//Configure EJS as the view engine
app.set('view engine', 'ejs');
//Static File Middleware for Express
app.use(express.static('public'))
//Configure Body parser
app.use(bodyParser.urlencoded({
  extended: true
}));
//Configure the Geocoding Provider
let options = {
  provider: 'openstreetmap'
};
let geoCoder = nodeGeocoder(options);






app.get('/', (req, res) => {
  res.render('home')
});


app.post('/', (req, res) => {
  //Save the user input(address)
  const propAddress = req.body.property;

  //Geocode input to coordinates, construct point geom from coordinates, and insert into pg property_addresses table
  geoCode(propAddress).then((result) => {
    const id = (result[0].id.toString())

    makeOverlapTable(id).then((result) => {

      selectCensusVars(result).then((result) => {
        console.log(result);
      }).catch((err) => {
        console.log(err);
      });

    }).catch((err) => {
      console.log(err);
    });

  }).catch((err) => {
    console.log(err);
  });
  res.redirect('/');
});



//functions





async function makeOverlapTable(bufferId) {
  const geoids = []

  const row = await knex.from('fl').innerJoin('property_addresses', 'fl.join_id', 'property_addresses.join_id').where('property_addresses.id', '=', bufferId)
    .andWhere(function() {
      this.where(st.intersects('fl.geom', 'property_addresses.buffer4'))
    })

    row.forEach((geoid) => {
      geoids.push(geoid.geoid)
    });
  //Insert Geoids
  const geoidTableId = await knex('geoids').insert({
    geoids: geoids,
    address_id: bufferId})

  // const subquery = knex.select('unnest geoids').from('geoids').where('geoids.id', '=', geoidTableId)


  return geoids
};



//Geocode Address to coordinates, construct point geom from coordinates, and insert into pg property_addresses table
async function geoCode(address) {
  const coor = await geoCoder.geocode(address)
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
  }
  const id = await knex.insert({
    address: address,
    coordinates: point,
  }).returning('id').into('property_addresses')
  return id
};

async function selectCensusVars(query) {
  const table = await knex.select().from('to_pg_dp03').whereIn('geoid', query)
  return table
}


app.listen(PORT, (err) => {
  if (err) console.log("error in Setup")
  console.log("Connected to Server!");
});
