/*
* EXPRESS CONFIGURATION FILE
*/
'use strict'

const express = require('express')
const compression = require('compression');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const sponsorshipsCtrl = require('./controllers/sponsorships')
const app = express()
app.use(compression());
const api = require ('./routes')
const path = require('path')
const fs = require('fs')
const config= require('./config')
const allowedOrigins = config.allowedOrigins;
//CORS middleware

function setCrossDomain(req, res, next) {
  const origin = req.headers.origin;
  // No origin = server-to-server call (e.g. Next.js SSR proxy) — allow if x-api-key is present
  if (!origin) {
    return next();
  }
  if (allowedOrigins.includes(origin) || req.method === 'GET' || req.method === 'HEAD') {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'HEAD,GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Access-Control-Allow-Origin, Accept, Accept-Language, Origin, User-Agent, x-api-key');
    next();
  } else {
    res.status(401).json({ error: 'Origin not allowed' });
  }
}

// Stripe webhooks require the raw body for signature verification.
app.post(
  '/api/sponsorships/webhook/stripe',
  bodyParser.raw({ type: 'application/json', limit: '1mb' }),
  sponsorshipsCtrl.stripeWebhook,
)

app.use(bodyParser.urlencoded({limit: '10mb', extended: false}))
app.use(bodyParser.json({limit: '10mb'}))
app.use(fileUpload());
app.use(setCrossDomain);

// use the forward slash with the module api api folder created routes
app.use('/api',api)

app.use('/.well-known',express.static('.well-known'))

//ruta angular, poner carpeta dist publica
const angularBrowserDist = path.join(__dirname, 'dist', 'browser')
const angularLegacyDist = path.join(__dirname, 'dist')
const spaRoot = fs.existsSync(path.join(angularBrowserDist, 'index.html'))
  ? angularBrowserDist
  : angularLegacyDist

app.use(express.static(spaRoot));
// Send all other requests to the Angular app
app.get('*', function (req, res, next) {
    res.sendFile(path.join(spaRoot, 'index.html'));
 });
module.exports = app
