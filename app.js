const express = require('express');
const https = require('https');
const fs = require('fs');
const helmet = require('helmet');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const nodeGeocoder = require('node-geocoder');
const knexPostgis = require('knex-postgis')
const passport = require('passport')
const {
  Strategy
} = require('passport-google-oauth20')
const cookieSession = require('cookie-session');
const knex = require('knex')({
  client: 'postgres',
  connection: {
    port: 5432,
    user: 'postgres',
    password: '14a5b13wXS!',
    database: 'postgis_32_sample'
  }
});

require('dotenv').config();


const config = {
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  COOKIE_KEY_1: process.env.COOKIE_KEY_1,
  COOKIE_KEY_2: process.env.COOKIE_KEY_2,
};


const AUTH_OPTIONS = {
  callbackURL: '/auth/google/callback',
  clientID: config.CLIENT_ID,
  clientSecret: config.CLIENT_SECRET,
};


function verifyCallback(accessToken, refreshToken, profile, done) {
  console.log('Google profile', profile);
  done(null, profile);
}

passport.use(new Strategy(AUTH_OPTIONS, verifyCallback))


const app = express(); //SET UP express
app.use(helmet()); //SET UP helmet
app.use(cookieSession({
  name: 'session',
  maxAge: 24 * 60 * 60 * 1000,
  keys: [config.COOKIE_KEY_1, config.COOKIE_KEY_2]
})); //SET UP Cookie sessions
app.use(passport.initialize()); //SET UP passport strategy middleware
app.set('view engine', 'ejs'); //Configure EJS as the view engine
app.use(express.static('public')); //Static File Middleware for Express
app.use(bodyParser.urlencoded({
  extended: true
})); //Configure Body parser
let options = {
  provider: 'openstreetmap'
}; //Configure the Geocoding Provider
const geoCoder = nodeGeocoder(options);
const st = knexPostgis(knex); //Set up knexpostgis





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


app.get('/auth/google', passport.authenticate('google', {
  scope: ['email'],
}));

app.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/failure',
  successRedirect: '/',
  session: false,
}), (req, res) => {
  console.log('Google called us back!');
});

app.get('/auth/logout', (req, res) => {});

app.get('/secret', checkLoggedIn, (req, res) => {
  return res.send('Your secret is gay...')
});

app.get('/failure', (req, res) => {
  return res.send('Failed to login!')
})






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
    address_id: bufferId
  })

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

//Check to see if user is logged in
function checkLoggedIn(req, res, next) {
  const isLoggedIn = true;
  if (!isLoggedIn) {
    return res.status(401).json({
      error: 'You must log in!',
    });
  }
  next();
}

const PORT = process.env.PORT || 3000;

https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
}, app).listen(PORT, (err) => {
  if (err) console.log("error in Setup")
  console.log("Connected to Server!");
});
