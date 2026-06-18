'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema
const { conndbaccounts } = require('../db_connect')

const SponsorshipSchema = new Schema({
  diseaseCode: { type: String, required: true, index: true },
  diseaseId: { type: String, default: '' },
  diseaseName: { type: String, default: '' },
  amount: { type: Number, required: true, min: 1 },
  period: { type: String, enum: ['monthly', 'annual', 'once'], required: true },
  donorName: { type: String, default: '' },
  donorEmailHash: { type: String, required: true, index: true },
  locale: { type: String, default: 'es' },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending',
    index: true,
  },
  donorboxCampaign: { type: String, default: '' },
  donorboxDonationId: { type: String, default: '' },
  confirmedAt: { type: Date, default: null },
}, {
  timestamps: true,
})

SponsorshipSchema.index({ diseaseCode: 1, status: 1 })

module.exports = conndbaccounts.model('Sponsorship', SponsorshipSchema)
