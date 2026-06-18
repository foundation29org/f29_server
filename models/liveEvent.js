'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema
const { conndbaccounts } = require('../db_connect')

const LiveEventSchema = new Schema({
  eventType: { type: String, default: 'diagnosis_finished', index: true },
  countryCode: { type: String, default: '', index: true },
  countryName: { type: String, default: '' },
  timezone: { type: String, default: '' },
  lat: { type: Number, default: null },
  lon: { type: Number, default: null },
  tenantId: { type: String, default: '' },
}, {
  timestamps: true,
})

LiveEventSchema.index({ createdAt: -1 })
LiveEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 48 })

module.exports = conndbaccounts.model('LiveEvent', LiveEventSchema)
