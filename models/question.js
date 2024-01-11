// Support schema
'use strict'

const mongoose = require ('mongoose');
const Schema = mongoose.Schema

const { conndbaccounts } = require('../db_connect')

const QuestionSchema = Schema({
	myuuid: String,
	question: String,
	response: Object,
	isComplexSearch: Boolean,
	date: {type: Date, default: Date.now}
})

module.exports = conndbaccounts.model('Question',QuestionSchema)
// we need to export the model so that it is accessible in the rest of the app
