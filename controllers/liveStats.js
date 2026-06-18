'use strict'

const liveStatsService = require('../services/liveStatsService')

function createLiveEvent(req, res) {
  liveStatsService.recordLiveEvent(req.body)
    .then((result) => res.status(201).json(result))
    .catch((error) => {
      console.error('Error recording live event:', error.message)
      res.status(500).json({ error: 'live_event_failed' })
    })
}

function getRecent(req, res) {
  const limit = parseInt(req.query.limit, 10) || 30
  liveStatsService.getRecentEvents(limit)
    .then((events) => res.json({ events, source: 'f29_live_events' }))
    .catch((error) => {
      console.error('Error loading recent live events:', error.message)
      res.status(500).json({ error: 'live_recent_unavailable' })
    })
}

function getStats(req, res) {
  liveStatsService.getPublicStats()
    .then((stats) => res.json(stats))
    .catch((error) => {
      console.error('Error loading live stats:', error.message)
      res.status(500).json({ error: 'live_stats_unavailable' })
    })
}

function importStats(req, res) {
  liveStatsService.importPublicStats(req.body)
    .then((result) => res.json(result))
    .catch((error) => {
      console.error('Error importing live stats:', error.message)
      res.status(500).json({ error: 'live_stats_import_failed' })
    })
}

module.exports = {
  createLiveEvent,
  getRecent,
  getStats,
  importStats,
}
