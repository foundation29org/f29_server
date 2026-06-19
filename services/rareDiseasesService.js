'use strict'

const fs = require('fs')
const path = require('path')
const config = require('../config')

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 25

let cache = null

function getDataDir() {
  if (config.RARE_DISEASES_DATA_DIR) {
    return config.RARE_DISEASES_DATA_DIR
  }

  return path.resolve(__dirname, '..', 'data', 'apadrina')
}

function readJson(fileName) {
  const fullPath = path.join(getDataDir(), fileName)
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'))
}

function loadData() {
  if (cache) return cache

  const base = readJson('rareDiseases.base.json')
  const en = readJson('rareDiseases.en.json')
  const es = readJson('rareDiseases.es.json')

  cache = {
    base,
    byId: new Map(base.map((record) => [record.id, record])),
    texts: { en, es }
  }

  return cache
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function getText(id, locale) {
  const { texts } = loadData()
  const lang = locale === 'es' ? 'es' : 'en'
  return texts[lang][id] || texts.en[id] || null
}

function getAllText(id) {
  const { texts } = loadData()
  return [texts.en[id], texts.es[id]].filter(Boolean)
}

function normalizeOrphaCode(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.replace(/^orpha:/i, '').replace(/\D/g, '') || raw.replace(/^orpha:/i, '')
}

/** Orphadata uses literal "Unknown" inside prevalence strings — treat as no data. */
function normalizePrevalenceValue(value) {
  const text = String(value || '').trim()
  if (!text) return null
  if (/^unknown$/i.test(text)) return null
  if (/[:\u2014-]\s*unknown\s*$/i.test(text)) return null
  if (/\bunknown\b/i.test(text) && !/\d/.test(text)) return null
  return text
}

function prevalenceFromRecord(record) {
  return normalizePrevalenceValue(record.prevalence?.value)
}

function findByOrphaCode(code) {
  const orphaCode = normalizeOrphaCode(code)
  if (!orphaCode) return null
  const { base } = loadData()
  return base.find((record) => record.orphaCode === orphaCode) || null
}

function getDiseaseContext(record, locale) {
  const lang = locale === 'es' ? 'es' : 'en'
  const enText = getText(record.id, 'en')
  const esText = getText(record.id, 'es')
  const localized = getText(record.id, lang)

  return {
    orphaCode: record.orphaCode,
    nameEn: enText?.name || '',
    nameEs: esText?.name || '',
    localizedName: localized?.name || enText?.name || esText?.name || '',
    synonymsEn: enText?.synonyms || [],
    synonymsEs: esText?.synonyms || [],
    prevalence: prevalenceFromRecord(record),
    prevalenceSource: record.prevalence?.source || null
  }
}

function compactRecord(record, locale) {
  const enText = getText(record.id, 'en')
  const esText = getText(record.id, 'es')
  const localized = getText(record.id, locale)

  if (!localized || !enText) return null

  return {
    id: record.id,
    code: record.orphaCode,
    name: {
      en: enText.name,
      es: esText && esText.name ? esText.name : enText.name
    },
    prev: prevalenceFromRecord(record),
    source: record.prevalence && record.prevalence.source ? record.prevalence.source : 'Orphadata / Orphanet'
  }
}

function matches(record, query) {
  if (!query) return true

  const q = normalize(query)
  if (!q) return true

  if (normalize(record.orphaCode).includes(q) || normalize(record.id).includes(q)) {
    return true
  }

  return getAllText(record.id).some((text) => {
    const haystack = [
      text.name,
      ...(Array.isArray(text.synonyms) ? text.synonyms : [])
    ].map(normalize).join(' ')

    return haystack.includes(q)
  })
}

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function shuffleArray(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

function isObsoleteRecord(record) {
  return getAllText(record.id).some((text) => {
    const name = String(text?.name || '').trim().toUpperCase()
    return name.startsWith('OBSOLETE:') || name.startsWith('OBSOLETO:')
  })
}

/** Orphanet: not rare in Europe (e.g. Crohn, MS) — out of Apadrina catalog. */
function isNonRareInEuropeRecord(record) {
  return getAllText(record.id).some((text) => {
    const name = String(text?.name || '').trim().toUpperCase()
    return name.startsWith('NON RARE IN EUROPE:') || name.startsWith('NO ES ENFERMEDAD RARA EN EUROPA:')
  })
}

function publicPool(base) {
  return base.filter((record) => !isObsoleteRecord(record) && !isNonRareInEuropeRecord(record))
}

function featuredPool(base) {
  const usable = publicPool(base).filter((record) => record.status === 'verified' || record.status === 'partial')
  return usable.length > 0 ? usable : publicPool(base)
}

function searchDiseases(options = {}) {
  const { base } = loadData()
  const locale = options.locale === 'es' ? 'es' : 'en'
  const query = String(options.q || '').trim()
  const page = parsePositiveInt(options.page, 1)
  const limit = Math.min(parsePositiveInt(options.limit, DEFAULT_LIMIT), MAX_LIMIT)
  const featuredOnly = options.featured === true || options.featured === 'true'

  if (featuredOnly && !query) {
    const pool = featuredPool(base)
    const items = shuffleArray(pool)
      .slice(0, limit)
      .map((record) => compactRecord(record, locale))
      .filter(Boolean)

    return {
      items,
      total: pool.length,
      page: 1,
      limit,
      locale,
      query,
      featured: true,
      random: true,
      source: 'Orphadata / Orphanet'
    }
  }

  const filtered = publicPool(base).filter((record) => matches(record, query))
  const total = filtered.length
  const start = (page - 1) * limit
  const items = filtered
    .slice(start, start + limit)
    .map((record) => compactRecord(record, locale))
    .filter(Boolean)

  return {
    items,
    total,
    page,
    limit,
    locale,
    query,
    featured: featuredOnly && !query,
    source: 'Orphadata / Orphanet'
  }
}

function randomDisease(options = {}) {
  const { base } = loadData()
  const locale = options.locale === 'es' ? 'es' : 'en'
  const pool = featuredPool(base)

  for (let attempts = 0; attempts < 24; attempts += 1) {
    const record = pool[Math.floor(Math.random() * pool.length)]
    if (isObsoleteRecord(record)) continue
    const item = compactRecord(record, locale)
    if (item) {
      return { item, locale, source: 'Orphadata / Orphanet' }
    }
  }

  return { item: null, locale, source: 'Orphadata / Orphanet' }
}

module.exports = {
  searchDiseases,
  randomDisease,
  findByOrphaCode,
  normalizeOrphaCode,
  getDiseaseContext,
  compactRecord,
  isObsoleteRecord,
  publicPool
}
