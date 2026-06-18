'use strict'

const path = require('path')
const LiveEvent = require('../models/liveEvent')
const ApadrinaPublicStats = require('../models/apadrinaPublicStats')

/** ISO-3166 alpha-2 → centroid + names. Used only for live globe pings (not BQ import). */
const COUNTRY_GEO = require(path.join(__dirname, '../data/countryGeo.json'))

const FEED_EVENT_KEYS = [
  'event_dxgpt',
  'event_first_dx',
  'event_second_opinion',
  'event_specialist',
  'event_confirmed',
]

function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function normalizeCountryCode(code) {
  return String(code || '').trim().toUpperCase().slice(0, 2)
}

function lookupCountry(code) {
  return COUNTRY_GEO[normalizeCountryCode(code)] || null
}

function coordsForCountry(code) {
  const hit = lookupCountry(code)
  if (hit) {
    return {
      lat: hit.lat + (Math.random() - 0.5) * 4,
      lon: hit.lon + (Math.random() - 0.5) * 4,
    }
  }
  return {
    lat: (Math.random() - 0.5) * 120,
    lon: (Math.random() - 0.5) * 360,
  }
}

function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
}

function regionLabel(countryCode, countryName) {
  const code = normalizeCountryCode(countryCode)
  if (countryName) {
    return countryName.split(',')[0].trim().toUpperCase()
  }
  const geo = lookupCountry(code)
  if (geo?.en) return geo.en.toUpperCase()
  if (code) return code
  return 'GLOBAL'
}

async function getOrCreatePublicStats() {
  let doc = await ApadrinaPublicStats.findOne({ key: 'global' })
  if (!doc) {
    doc = await ApadrinaPublicStats.create({ key: 'global' })
  }
  return doc
}

async function incrementTodayCounter() {
  const today = utcDateKey()
  const doc = await getOrCreatePublicStats()
  if (doc.todayDateUtc !== today) {
    doc.todayDateUtc = today
    doc.todayConsultations = 0
  }
  doc.todayConsultations += 1
  await doc.save()
}

async function recordLiveEvent(payload = {}) {
  const countryCode = normalizeCountryCode(payload.countryCode)
  const { lat, lon } = coordsForCountry(countryCode)
  const geo = lookupCountry(countryCode)
  const countryName = String(payload.countryName || geo?.en || '').trim()

  const doc = await LiveEvent.create({
    eventType: 'diagnosis_finished',
    countryCode,
    countryName,
    timezone: String(payload.timezone || '').trim(),
    lat,
    lon,
    tenantId: String(payload.tenantId || '').trim(),
  })

  await incrementTodayCounter()

  return {
    event: {
      id: String(doc._id),
      ts: doc.createdAt.toISOString(),
    },
  }
}

async function getRecentEvents(limit = 30) {
  const rows = await LiveEvent.find({ eventType: 'diagnosis_finished' })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 50))
    .lean()

  return rows.map((row, index) => ({
    id: String(row._id),
    ts: row.createdAt,
    time: formatTime(row.createdAt),
    countryCode: row.countryCode || '',
    countryName: row.countryName || '',
    region: regionLabel(row.countryCode, row.countryName),
    lat: row.lat,
    lon: row.lon,
    textKey: FEED_EVENT_KEYS[index % FEED_EVENT_KEYS.length],
  }))
}

async function getPublicStats() {
  const [doc, todayFromEvents] = await Promise.all([
    getOrCreatePublicStats(),
    LiveEvent.countDocuments({
      eventType: 'diagnosis_finished',
      createdAt: { $gte: new Date(`${utcDateKey()}T00:00:00.000Z`) },
    }),
  ])

  const today = doc.todayDateUtc === utcDateKey()
    ? Math.max(doc.todayConsultations, todayFromEvents)
    : todayFromEvents

  let countries = Array.isArray(doc.countries) ? doc.countries : []
  if (countries.length === 0) {
    countries = await aggregateCountriesFromRecentEvents()
  }

  return {
    today,
    goalToday: doc.goalToday || 1500,
    accumulated: doc.accumulatedConsultations || 0,
    accumulatedSource: doc.accumulatedSource || 'ga4_pending',
    accumulatedUpdatedAt: doc.accumulatedUpdatedAt,
    countries,
    countriesSource: doc.countriesSource || (countries.length ? 'live_events_fallback' : 'ga4_pending'),
    countriesUpdatedAt: doc.countriesUpdatedAt,
    source: 'f29_live_stats',
  }
}

/** Fallback until BQ import runs — uses live events from last N days. */
async function aggregateCountriesFromRecentEvents(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const rows = await LiveEvent.aggregate([
    { $match: { eventType: 'diagnosis_finished', createdAt: { $gte: since }, countryCode: { $ne: '' } } },
    { $group: { _id: '$countryCode', count: { $sum: 1 }, countryName: { $last: '$countryName' } } },
    { $sort: { count: -1 } },
    { $limit: 12 },
  ])

  return rows.map((row) => {
    const code = normalizeCountryCode(row._id)
    const geo = lookupCountry(code)
    return {
      code,
      nameEn: row.countryName || geo?.en || code,
      nameEs: geo?.es || row.countryName || code,
      count: row.count,
    }
  })
}

async function importPublicStats(payload = {}) {
  const doc = await getOrCreatePublicStats()

  if (Number.isFinite(Number(payload.accumulatedConsultations))) {
    doc.accumulatedConsultations = Math.max(0, Math.round(Number(payload.accumulatedConsultations)))
    doc.accumulatedSource = String(payload.accumulatedSource || 'ga4')
    doc.accumulatedUpdatedAt = new Date()
  }

  if (Number.isFinite(Number(payload.goalToday))) {
    doc.goalToday = Math.max(1, Math.round(Number(payload.goalToday)))
  }

  if (Array.isArray(payload.countries)) {
    doc.countries = payload.countries
      .map((row) => ({
        code: normalizeCountryCode(row.code),
        nameEn: String(row.nameEn || row.name || '').trim(),
        nameEs: String(row.nameEs || row.name || '').trim(),
        count: Math.max(0, Math.round(Number(row.count) || 0)),
      }))
      .filter((row) => row.code && row.count > 0)
      .slice(0, 20)
    doc.countriesSource = String(payload.countriesSource || 'ga4')
    doc.countriesUpdatedAt = new Date()
  }

  await doc.save()
  return { ok: true }
}

module.exports = {
  recordLiveEvent,
  getRecentEvents,
  getPublicStats,
  importPublicStats,
}
