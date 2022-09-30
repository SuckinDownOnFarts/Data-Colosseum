const express = require('express');
const https = require('https');
const fs = require('fs');
const helmet = require('helmet');
const ejs = require('ejs');
const { performance } = require('perf_hooks');
const computeOverlappedVars = require('./census-data');
const bodyParser = require('body-parser');
const passport = require('passport')
const { Strategy } = require('passport-google-oauth20')
const cookieSession = require('cookie-session');
const { verify } = require('crypto');
const Chart = require('chart.js');


require('dotenv').config();

const config = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  COOKIE_KEY_A: process.env.COOKIE_KEY_A,
  COOKIE_KEY_B: process.env.COOKIE_KEY_B,
};

const GOOGLE_AUTH_OPTIONS = {
  callbackURL: '/auth/google/callback',
  clientID: config.GOOGLE_CLIENT_ID,
  clientSecret: config.GOOGLE_CLIENT_SECRET,
};

passport.use(new Strategy(GOOGLE_AUTH_OPTIONS, verifyGoogleCallback));

passport.serializeUser((user, done) => {
  done(null, user.id);
}); //Save the session to the cookie

passport.deserializeUser((id, done) => {
  done(null, id);
}); //Read the session from the cookie

const app = express();
app.use(helmet());
app.use(cookieSession({
  name: 'session',
  maxAge: 24 * 60 * 60 * 1000,
  keys: [config.COOKIE_KEY_A, config.COOKIE_KEY_B],
}));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));


app.get('/', (req, res) => {
  res.render('login');
});

app.get('/app', (req, res) => {
  res.render('home');
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard')
})


app.post('/app', (req, res) => {
  //Save the user input(address)
  const propAddress = req.body.property;

  computeOverlappedVars.computeOverlappedVars(propAddress).then(function (result){
    // console.log(result);
    res.render('results', {data: result});
  }); //works


});




app.get('/auth/google', passport.authenticate('google', {
  scope: ['email'],
}));

app.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/failure',
  successRedirect: '/',
  session: true,
}), (req, res) => {
  console.log('Google called us back!');
});

app.get('/auth/logout', (req, res) => {
  req.logout(); //Removes req.user and clears any logged in session
  res.redirect('/');
});

app.get('/secret', checkLoggedIn, (req, res) => {
  return res.send('Your secret is gay...');
});

app.get('/failure', (req, res) => {
  return res.send('Failed to login!');
})

const PORT = process.env.PORT || 3000;

https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
}, app).listen(PORT, (err) => {
  if (err) console.log("error in Setup")
  console.log("Connected to Server!");
});


//functions


//Check to see if user is logged in
function checkLoggedIn(req, res, next) {
  // console.log('Current user is:', req.user);
  const isLoggedIn = req.isAuthenticated() && req.user;
  if (!isLoggedIn) {
    return res.status(401).json({
      error: 'You must log in!',
    });
  }
  next();
}

function verifyGoogleCallback(accessToken, refreshToken, profile, done) {
  console.log('Google profile', profile);
  done(null, profile);
};
