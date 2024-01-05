/*
* EXPRESS CONFIGURATION FILE
*/
'use strict'

const express = require('express')
const compression = require('compression');
const bodyParser = require('body-parser');
const app = express()
app.use(compression());
const api = require ('./routes')
const path = require('path')
const config= require('./config')
const allowedOrigins = config.allowedOrigins;
//CORS middleware

function setCrossDomain(req, res, next) {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || req.method === 'GET' || req.method === 'HEAD')  {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'HEAD,GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Access-Control-Allow-Origin, Accept, Accept-Language, Origin, User-Agent, x-api-key');
    next();
  }else{
    res.status(401).json({ error: 'Origin not allowed' });
  }
}

app.use(bodyParser.urlencoded({limit: '50mb', extended: false}))
app.use(bodyParser.json({limit: '50mb'}))
app.use(setCrossDomain);

// use the forward slash with the module api api folder created routes
app.use('/api',api)

app.use('/apidoc',express.static('apidoc', {'index': ['index.html']}))

app.use('/.well-known',express.static('.well-known'))

//ruta angular, poner carpeta dist publica
app.use(express.static(path.join(__dirname, 'dist')));
// Send all other requests to the Angular app
app.get('*', function (req, res, next) {
    res.sendFile('dist/index.html', { root: __dirname });
 });
module.exports = app
