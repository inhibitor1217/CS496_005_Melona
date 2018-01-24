// models/report.js

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var reportSchema = new Schema({

	title: String,
	text: String,
	contactInfo: String

});

module.exports = mongoose.model('report', reportSchema);