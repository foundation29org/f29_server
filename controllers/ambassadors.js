'use strict'

const ambassadorSignupService = require('../services/ambassadorSignupService')

function createSignup(req, res) {
  ambassadorSignupService.createSignup(req.body)
    .then((result) => {
      if (result.error === 'invalid_email') {
        return res.status(400).json({ error: result.error })
      }
      if (result.error === 'invalid_type') {
        return res.status(400).json({ error: result.error })
      }
      return res.status(201).json(result)
    })
    .catch((error) => {
      console.error('Error creating ambassador signup:', error.message)
      res.status(500).json({ error: 'ambassador_signup_failed' })
    })
}

module.exports = {
  createSignup,
}
