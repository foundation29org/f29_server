'use strict'

const crypto = require('crypto')
const AmbassadorSignup = require('../models/ambassadorSignup')

function hashEmail(email) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return ''
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

function normalizeType(value) {
  if (value === 'patient') return 'patient'
  if (value === 'healthcare') return 'healthcare'
  if (value === 'general') return 'general'
  return null
}

async function createSignup(payload = {}) {
  const name = String(payload.name || '').trim()
  const email = String(payload.email || '').trim()
  const emailHash = hashEmail(email)
  const type = normalizeType(payload.type)
  const message = String(payload.message || '').trim().slice(0, 2000)

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'invalid_email' }
  }
  if (!type) {
    return { error: 'invalid_type' }
  }

  const existing = await AmbassadorSignup.findOne({ emailHash })
  if (existing) {
    if (name) existing.name = name
    existing.type = type
    if (message) existing.message = message
    existing.locale = payload.locale === 'en' ? 'en' : 'es'
    existing.source = String(payload.source || 'apadrina').trim() || 'apadrina'
    await existing.save()
    return {
      signup: {
        id: String(existing._id),
        status: existing.status,
        updated: true,
      },
    }
  }

  const doc = await AmbassadorSignup.create({
    name,
    email,
    emailHash,
    type,
    message,
    locale: payload.locale === 'en' ? 'en' : 'es',
    source: String(payload.source || 'apadrina').trim() || 'apadrina',
    status: 'pending',
  })

  return {
    signup: {
      id: String(doc._id),
      status: doc.status,
      updated: false,
    },
  }
}

module.exports = {
  createSignup,
}
