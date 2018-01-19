// models/account.js

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var accountSchema = new Schema({

	kakaoId: String,            // kakaoId of the account.
	coin: Number,               // Total amount of coin this account has.
	uploadedQuests: [String],   // Array of ids of each quest uploaded by this account.
	acceptedQuests: [String],   // Array of ids of each quest accepted by this account.
	completedQuests: [String],  // Array of ids of each quest completed by this account.
	level: Number,              // Current level of this account.
	experience: Number          // Experience of this account.

});

module.exports = mongoose.model('account', accountSchema);