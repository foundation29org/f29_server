// file that contains the routes of the api
'use strict'

const express = require('express')
const supportCtrl = require('../controllers/all/support')
const openAIserviceCtrl = require('../services/openai')
const bookCtrl = require('../services/book')
const iaClaroServiceCtrl = require('../controllers/iaclaro')
const evalGradoCtrl = require('../controllers/evalgrado')
const apadrinaCtrl = require('../controllers/apadrina')
const sponsorshipsCtrl = require('../controllers/sponsorships')
const liveStatsCtrl = require('../controllers/liveStats')
const cors = require('cors');

const api = express.Router()
const config= require('../config')
const myApiKey = config.Server_Key;
const whitelist = config.allowedOrigins;

  // Middleware personalizado para CORS
  function corsWithOptions(req, res, next) {
    const corsOptions = {
      origin: function (origin, callback) {
        // No origin = server-to-server (e.g. Next.js proxy on GET) — same rule as app.js setCrossDomain
        if (!origin || whitelist.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
    };

    cors(corsOptions)(req, res, next);
  }

  const checkApiKey = (req, res, next) => {
    // Permitir explícitamente solicitudes de tipo OPTIONS para el "preflight" de CORS
    if (req.method === 'OPTIONS') {
      return next();
    } else {
      const apiKey = req.get('x-api-key');
      if (apiKey && apiKey === myApiKey) {
        return next();
      } else {
        return res.status(401).json({ error: 'API Key no válida o ausente' });
      }
    }
  };

//services OPENAI
api.post('/callopenai', corsWithOptions, checkApiKey, openAIserviceCtrl.callOpenAi)
api.post('/callbook', corsWithOptions, checkApiKey, bookCtrl.callBook)
api.post('/callguia', corsWithOptions, checkApiKey, bookCtrl.callguia)
api.post('/calliaClaro', corsWithOptions, checkApiKey, iaClaroServiceCtrl.calliaClaro)
api.post('/callevalgrado', corsWithOptions, checkApiKey, evalGradoCtrl.callEvalGrado)

//Support
api.post('/homesupport/', corsWithOptions, checkApiKey, supportCtrl.sendMsgLogoutSupport)

// Apadrina campaign
api.get('/apadrina/diseases', corsWithOptions, checkApiKey, apadrinaCtrl.getDiseases)
api.get('/apadrina/diseases/random', corsWithOptions, checkApiKey, apadrinaCtrl.getRandomDisease)
api.get('/apadrina/diseases/:code/detail', corsWithOptions, checkApiKey, apadrinaCtrl.getDiseaseDetail)

// Apadrina sponsorships (Fase 2)
api.post('/sponsorships', corsWithOptions, checkApiKey, sponsorshipsCtrl.createSponsorship)
api.get('/sponsorships/stats', corsWithOptions, checkApiKey, sponsorshipsCtrl.getStats)
api.post('/sponsorships/webhook/donorbox', corsWithOptions, sponsorshipsCtrl.donorboxWebhook)

// Apadrina live activity (DxGPT push + public read via Next proxy)
api.post('/live-events', corsWithOptions, checkApiKey, liveStatsCtrl.createLiveEvent)
api.get('/live/recent', corsWithOptions, checkApiKey, liveStatsCtrl.getRecent)
api.get('/live/stats', corsWithOptions, checkApiKey, liveStatsCtrl.getStats)
api.post('/live/stats/import', corsWithOptions, checkApiKey, liveStatsCtrl.importStats)

module.exports = api
