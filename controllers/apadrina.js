'use strict'

const rareDiseasesService = require('../services/rareDiseasesService')
const apadrinaDiseaseDetailService = require('../services/apadrinaDiseaseDetailService')

function getDiseases(req, res) {
  try {
    const result = rareDiseasesService.searchDiseases({
      locale: req.query.locale,
      q: req.query.q,
      page: req.query.page,
      limit: req.query.limit,
      featured: req.query.featured
    })

    res.json(result)
  } catch (error) {
    console.error('Error searching rare diseases:', error.message)
    res.status(500).json({
      error: 'rare_diseases_unavailable',
      message: 'Rare disease dataset is not available'
    })
  }
}

function getRandomDisease(req, res) {
  try {
    const result = rareDiseasesService.randomDisease({
      locale: req.query.locale
    })

    if (!result.item) {
      return res.status(404).json({ error: 'no_disease_found' })
    }

    res.json(result)
  } catch (error) {
    console.error('Error picking random rare disease:', error.message)
    res.status(500).json({
      error: 'rare_diseases_unavailable',
      message: 'Rare disease dataset is not available'
    })
  }
}

async function getDiseaseDetail(req, res) {
  try {
    const result = await apadrinaDiseaseDetailService.generateDiseaseDetail({
      code: req.params.code,
      locale: req.query.locale
    })

    if (result.error === 'invalid_code') {
      return res.status(400).json({ error: 'invalid_code' })
    }
    if (result.error === 'not_found') {
      return res.status(404).json({ error: 'disease_not_found' })
    }
    if (result.error === 'generation_failed') {
      return res.status(502).json({ error: 'detail_generation_failed' })
    }

    res.json(result)
  } catch (error) {
    console.error('Error generating disease detail:', error.response?.data || error.message)
    res.status(502).json({
      error: 'detail_generation_failed',
      message: error.message
    })
  }
}

module.exports = {
  getDiseases,
  getRandomDisease,
  getDiseaseDetail
}
