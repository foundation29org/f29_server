'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema
const { conndbaccounts } = require('../db_connect')

const CountryStatSchema = new Schema({
  code: { type: String, required: true },
  nameEn: { type: String, default: '' },
  nameEs: { type: String, default: '' },
  count: { type: Number, default: 0 },
}, { _id: false })

const ApadrinaPublicStatsSchema = new Schema({
  key: { type: String, default: 'global', unique: true },
  accumulatedConsultations: { type: Number, default: 0 },
  accumulatedSource: { type: String, default: 'ga4_pending' },
  accumulatedUpdatedAt: { type: Date, default: null },
  todayConsultations: { type: Number, default: 0 },
  todayDateUtc: { type: String, default: '' },
  goalToday: { type: Number, default: 1500 },
  countries: { type: [CountryStatSchema], default: [] },
  countriesSource: { type: String, default: 'ga4_pending' },
  countriesUpdatedAt: { type: Date, default: null },
}, {
  timestamps: true,
})

module.exports = conndbaccounts.model('ApadrinaPublicStats', ApadrinaPublicStatsSchema)
