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

const PENDING_MATCH_MS = () =>
  Math.max(1, Number(config.STRIPE_SPONSORSHIP_MATCH_HOURS) || 72) * 60 * 60 * 1000

function extractDonorEmailFromCharge(charge = {}) {
  const metadata = charge.metadata || {}
  const fromMeta = String(metadata.donorbox_email || metadata.donor_email || '').trim().toLowerCase()
  if (fromMeta) return fromMeta
  return String(charge.billing_details?.email || '').trim().toLowerCase()
}

function isApadrinaDonorboxCharge(charge = {}) {
  const description = String(charge.description || '').toLowerCase()
  if (description.includes('apadrina')) return true
  const slug = String(config.DONORBOX_APADRINA_SLUG || '').toLowerCase().replace(/-/g, ' ')
  return Boolean(slug && description.includes(slug))
}

function chargePaidAmountEur(charge = {}) {
  const cents = Number(charge.amount)
  if (!Number.isFinite(cents) || cents <= 0) return null
  return Math.round(cents / 100)
}

function pickPendingSponsorship(pendingList, paidAmountEur) {
  if (pendingList.length === 1) return pendingList[0]
  if (paidAmountEur != null) {
    const byAmount = pendingList.filter((doc) => doc.amount === paidAmountEur)
    if (byAmount.length === 1) return byAmount[0]
    if (byAmount.length > 1) return byAmount[0]
  }
  return pendingList[0]
}

async function confirmFromStripeCharge(charge = {}) {
  const chargeId = String(charge.id || '').trim()
  if (!chargeId) {
    return { error: 'missing_charge_id' }
  }

  if (charge.paid !== true && charge.status !== 'succeeded') {
    return { ignored: true, reason: 'not_paid' }
  }

  if (!isApadrinaDonorboxCharge(charge)) {
    return { ignored: true, reason: 'not_apadrina' }
  }

  const existing = await Sponsorship.findOne({
    donorboxDonationId: chargeId,
    status: 'confirmed',
  })
  if (existing) {
    return {
      sponsorship: { id: String(existing._id), status: existing.status },
      alreadyConfirmed: true,
    }
  }

  const donorEmail = extractDonorEmailFromCharge(charge)
  if (!donorEmail) {
    return { ignored: true, reason: 'missing_email' }
  }

  const since = new Date(Date.now() - PENDING_MATCH_MS())
  const pendingList = await Sponsorship.find({
    status: 'pending',
    donorEmailHash: hashEmail(donorEmail),
    createdAt: { $gte: since },
  })
  pendingList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (pendingList.length === 0) {
    return { ignored: true, reason: 'no_pending' }
  }

  const paidAmountEur = chargePaidAmountEur(charge)
  const doc = pickPendingSponsorship(pendingList, paidAmountEur)

  if (doc.status === 'confirmed') {
    return {
      sponsorship: { id: String(doc._id), status: doc.status },
      alreadyConfirmed: true,
    }
  }

  doc.status = 'confirmed'
  doc.confirmedAt = new Date()
  doc.donorboxDonationId = chargeId
  if (paidAmountEur != null) {
    doc.amount = paidAmountEur
  }
  await doc.save()

  return {
    sponsorship: {
      id: String(doc._id),
      status: doc.status,
    },
    source: 'stripe_charge',
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
  confirmFromStripeCharge,
  hashEmail,
}
