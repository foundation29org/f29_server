'use strict'

const crypto = require('crypto')
const Sponsorship = require('../models/sponsorship')
const config = require('../config')

function hashEmail(email) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return ''
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

function normalizePeriod(value) {
  if (value === 'monthly') return 'monthly'
  if (value === 'annual') return 'annual'
  return 'once'
}

function parseAmount(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 1) return null
  return Math.round(amount)
}

async function createSponsorship(payload = {}) {
  const diseaseCode = String(payload.diseaseCode || '').trim()
  const donorEmail = String(payload.donorEmail || '').trim()
  const amount = parseAmount(payload.amount)
  const period = normalizePeriod(payload.period)

  if (!diseaseCode || !/^\d+$/.test(diseaseCode)) {
    return { error: 'invalid_disease_code' }
  }
  if (!donorEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail)) {
    return { error: 'invalid_email' }
  }
  if (!amount) {
    return { error: 'invalid_amount' }
  }

  const doc = await Sponsorship.create({
    diseaseCode,
    diseaseId: String(payload.diseaseId || `orpha:${diseaseCode}`),
    diseaseName: String(payload.diseaseName || '').trim(),
    amount,
    period,
    donorName: String(payload.donorName || '').trim(),
    donorEmailHash: hashEmail(donorEmail),
    locale: payload.locale === 'en' ? 'en' : 'es',
    status: 'pending',
    donorboxCampaign: config.DONORBOX_APADRINA_SLUG || '',
  })

  return {
    sponsorship: {
      id: String(doc._id),
      diseaseCode: doc.diseaseCode,
      amount: doc.amount,
      period: doc.period,
      status: doc.status,
    },
  }
}

async function getStats() {
  const [totals, byDisease] = await Promise.all([
    Sponsorship.aggregate([
      { $match: { status: 'confirmed' } },
      {
        $group: {
          _id: null,
          sponsors: { $sum: 1 },
          raised: { $sum: '$amount' },
        },
      },
    ]),
    Sponsorship.aggregate([
      { $match: { status: 'confirmed' } },
      {
        $group: {
          _id: '$diseaseCode',
          sponsors: { $sum: 1 },
          raised: { $sum: '$amount' },
        },
      },
      { $sort: { sponsors: -1 } },
    ]),
  ])

  const summary = totals[0] || { sponsors: 0, raised: 0 }
  const byCode = {}

  for (const row of byDisease) {
    byCode[row._id] = {
      sponsors: row.sponsors,
      raised: row.raised,
    }
  }

  return {
    totalSponsors: summary.sponsors,
    totalRaised: summary.raised,
    byDisease: byCode,
    source: 'f29_sponsorships',
  }
}

async function confirmFromWebhook(payload = {}) {
  const sponsorshipId = String(payload.sponsorshipId || payload.metadata?.sponsorshipId || '').trim()
  const donorboxDonationId = String(payload.donorboxDonationId || payload.donation_id || payload.id || '').trim()

  if (!sponsorshipId) {
    return { error: 'missing_sponsorship_id' }
  }

  const doc = await Sponsorship.findById(sponsorshipId)
  if (!doc) {
    return { error: 'not_found' }
  }

  if (doc.status === 'confirmed') {
    return { sponsorship: { id: String(doc._id), status: doc.status }, alreadyConfirmed: true }
  }

  doc.status = 'confirmed'
  doc.confirmedAt = new Date()
  if (donorboxDonationId) {
    doc.donorboxDonationId = donorboxDonationId
  }
  await doc.save()

  return {
    sponsorship: {
      id: String(doc._id),
      status: doc.status,
    },
  }
}

module.exports = {
  createSponsorship,
  getStats,
  confirmFromWebhook,
  hashEmail,
}
