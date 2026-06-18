'use strict'

const sponsorshipService = require('../services/sponsorshipService')
const config = require('../config')

function createSponsorship(req, res) {
  sponsorshipService.createSponsorship(req.body)
    .then((result) => {
      if (result.error === 'invalid_disease_code') {
        return res.status(400).json({ error: result.error })
      }
      if (result.error === 'invalid_email') {
        return res.status(400).json({ error: result.error })
      }
      if (result.error === 'invalid_amount') {
        return res.status(400).json({ error: result.error })
      }
      return res.status(201).json(result)
    })
    .catch((error) => {
      console.error('Error creating sponsorship:', error.message)
      res.status(500).json({ error: 'sponsorship_create_failed' })
    })
}

function getStats(req, res) {
  sponsorshipService.getStats()
    .then((stats) => res.json(stats))
    .catch((error) => {
      console.error('Error loading sponsorship stats:', error.message)
      res.status(500).json({ error: 'sponsorship_stats_unavailable' })
    })
}

function donorboxWebhook(req, res) {
  const secret = config.DONORBOX_WEBHOOK_SECRET
  if (secret) {
    const provided = req.get('x-donorbox-secret') || req.query.secret
    if (provided !== secret) {
      return res.status(401).json({ error: 'invalid_webhook_secret' })
    }
  }

  sponsorshipService.confirmFromWebhook(req.body)
    .then((result) => {
      if (result.error === 'missing_sponsorship_id') {
        return res.status(400).json({ error: result.error })
      }
      if (result.error === 'not_found') {
        return res.status(404).json({ error: result.error })
      }
      return res.json(result)
    })
    .catch((error) => {
      console.error('Donorbox webhook error:', error.message)
      res.status(500).json({ error: 'webhook_failed' })
    })
}

module.exports = {
  createSponsorship,
  getStats,
  donorboxWebhook,
}
