'use strict'

const mongoose = require('mongoose')
const Schema = mongoose.Schema
const { conndbaccounts } = require('../db_connect')

const AmbassadorSignupSchema = new Schema({
  name: { type: String, default: '' },
  email: { type: String, required: true },
  emailHash: { type: String, required: true, index: true, unique: true },
  type: {
    type: String,
    enum: ['patient', 'healthcare', 'general'],
    required: true,
  },
  message: { type: String, default: '' },
  locale: { type: String, default: 'es' },
  source: { type: String, default: 'apadrina' },
  status: {
    type: String,
    enum: ['pending', 'invited', 'active', 'declined'],
    default: 'pending',
    index: true,
  },
}, {
  timestamps: true,
})

module.exports = conndbaccounts.model('AmbassadorSignup', AmbassadorSignupSchema)
