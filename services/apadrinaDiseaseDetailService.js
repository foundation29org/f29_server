'use strict'

const axios = require('axios')
const config = require('../config')
const rareDiseasesService = require('./rareDiseasesService')

const AZURE_OPENAI_API_KEY = config.OPENAI_API_KEY2
const OPENAI_API_BASE = config.OPENAI_API_BASE
const DEPLOYMENT = config.APADRINA_OPENAI_DEPLOYMENT
const API_VERSION = config.APADRINA_OPENAI_API_VERSION

const CACHE_TTL_MS = 1000 * 60 * 60 * 24
const PROMPT_CACHE_VERSION = 'v2'
const detailCache = new Map()

function orphanetUrl(orphaCode, locale) {
  const lng = locale === 'es' ? 'ES' : 'EN'
  return `https://www.orpha.net/consor/cgi-bin/OC_Exp.php?lng=${lng}&Expert=${orphaCode}`
}

function cacheKey(orphaCode, locale) {
  return `${PROMPT_CACHE_VERSION}:${locale}:${orphaCode}`
}

function getCached(orphaCode, locale) {
  const entry = detailCache.get(cacheKey(orphaCode, locale))
  if (!entry) return null
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    detailCache.delete(cacheKey(orphaCode, locale))
    return null
  }
  return entry.payload
}

function setCached(orphaCode, locale, payload) {
  detailCache.set(cacheKey(orphaCode, locale), {
    createdAt: Date.now(),
    payload
  })
}

async function callApadrinaOpenAI(messages) {
  const endpoint = `https://${OPENAI_API_BASE}.openai.azure.com/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`

  const response = await axios.post(
    endpoint,
    {
      messages,
      temperature: 0.4,
      top_p: 1,
      max_completion_tokens: 1800
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AZURE_OPENAI_API_KEY}`
      },
      timeout: 90000
    }
  )

  return response?.data?.choices?.[0]?.message?.content?.trim() || ''
}

function buildPromptContext(record, locale) {
  const ctx = rareDiseasesService.getDiseaseContext(record, locale)
  const synonyms = [...new Set([...(ctx.synonymsEn || []), ...(ctx.synonymsEs || [])])].slice(0, 12)

  return {
    orphaCode: ctx.orphaCode,
    nameEn: ctx.nameEn,
    nameEs: ctx.nameEs,
    localizedName: ctx.localizedName,
    prevalence: ctx.prevalence,
    prevalenceSource: ctx.prevalenceSource,
    synonyms
  }
}

function buildMessages(context, locale) {
  const language = locale === 'es' ? 'Spanish' : 'English'
  const isEs = locale === 'es'
  const synonymLine = context.synonyms.length
    ? `Synonyms (Orphadata): ${context.synonyms.join('; ')}`
    : 'Synonyms: none listed in Orphadata'

  const prevalenceLine = context.prevalence
    ? `Prevalence (Orphadata): ${context.prevalence}`
    : 'Prevalence (Orphadata): not available in product 9 for this ORPHAcode'

  const headings = isEs
    ? `## Qué es
## Síntomas y signos frecuentes
## Si tarda el diagnóstico
## Por qué apadrinar ayuda
## Aviso`
    : `## What it is
## Common symptoms and signs
## When diagnosis is delayed
## Why sponsoring helps
## Notice`

  return [
    {
      role: 'system',
      content: `You write sponsor-facing summaries for Fundación 29 "Apadrina una enfermedad". Audience: general public considering sponsoring a rare disease.

Write in ${language}.

SOURCE RULES (strict for numbers):
- ORPHA code, names, synonyms and prevalence MUST come only from the user message (Orphadata). Do not invent prevalence, patient counts, percentages, or country-specific statistics.
- If prevalence is missing, say so briefly in "Qué es" / "What it is".

CLINICAL ORIENTATION (allowed, carefully worded):
- You MAY use established medical knowledge about this disease (identified by ORPHA code and preferred names) to describe:
  - what the condition generally is, in plain language (2–4 sentences);
  - common symptoms or signs (3–5 bullet points with "- ");
  - typical difficulties families/patients face when diagnosis is delayed or missed (uncertainty, wrong treatments, loss of time, emotional burden, access to specialists — adapt to the disease).
- Use cautious wording: "suele", "puede", "a menudo", "en muchos casos" (or English equivalents). Do not present as personal medical advice.
- If the entity is very obscure and you are not confident, keep clinical sections shorter and acknowledge limited public information rather than inventing details.
- Do NOT list specific drugs, doses, or treatment protocols.

CAMPAIGN (brief):
- In "Por qué apadrinar ayuda" / "Why sponsoring helps": 2–3 sentences linking visibility + faster diagnostic orientation (e.g. DxGPT) for rare diseases like this. Avoid generic filler repeated verbatim across diseases.

STYLE:
- Empathetic, clear, non-alarmist. Not an encyclopedia — Orphanet is linked separately.
- Do NOT repeat the full synonym list or ORPHA metadata as a duplicate table; weave relevant synonyms naturally into "Qué es" if helpful.
- Mention prevalence once if available.

Output Markdown with exactly these headings:
${headings}

"Aviso" / "Notice": one short paragraph — AI summary for awareness, not medical advice; confirm details with a healthcare professional and Orphanet.`
    },
    {
      role: 'user',
      content: [
        `ORPHA:${context.orphaCode}`,
        `Preferred name (EN): ${context.nameEn || 'unknown'}`,
        `Preferred name (ES): ${context.nameEs || 'unknown'}`,
        `Display name (${language}): ${context.localizedName || context.nameEn || context.nameEs}`,
        synonymLine,
        prevalenceLine,
        context.prevalenceSource ? `Prevalence source note: ${context.prevalenceSource}` : '',
        '',
        'Write the sponsor summary now.'
      ].filter(Boolean).join('\n')
    }
  ]
}

async function generateDiseaseDetail(options = {}) {
  const locale = options.locale === 'es' ? 'es' : 'en'
  const orphaCode = rareDiseasesService.normalizeOrphaCode(options.code || options.orphaCode)
  if (!orphaCode) {
    return { error: 'invalid_code' }
  }

  const record = rareDiseasesService.findByOrphaCode(orphaCode)
  if (!record) {
    return { error: 'not_found' }
  }

  const item = rareDiseasesService.compactRecord(record, locale)
  if (!item) {
    return { error: 'not_found' }
  }

  const cached = getCached(orphaCode, locale)
  if (cached) {
    return {
      item,
      detail: { ...cached, cached: true },
      locale,
      source: 'Orphadata / Orphanet + Azure OpenAI'
    }
  }

  const context = buildPromptContext(record, locale)
  const markdown = await callApadrinaOpenAI(buildMessages(context, locale))

  if (!markdown) {
    return { error: 'generation_failed' }
  }

  const detail = {
    markdown,
    orphanetUrl: orphanetUrl(orphaCode, locale),
    model: DEPLOYMENT,
    cached: false
  }

  setCached(orphaCode, locale, detail)

  return {
    item,
    detail,
    locale,
    source: 'Orphadata / Orphanet + Azure OpenAI'
  }
}

module.exports = {
  generateDiseaseDetail
}
