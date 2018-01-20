// models/quest.js

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var questSchema = new Schema({

	startPoint: String,   // Start Position of the Quest.
	destination: String,  // Final Destination of the Quest.
	coinReward: Number,   // Reward (in coins) of the Quest.
	expReward: Number,    // Reward (in experience) of the Quest.
	tag: [String],        // Array of tags user uploaded to the Quest.
	title: String,        // Title Text user uploaded to the Quest.
	text: String,         // Additional Text (title, body, etc) user uploaded to the Quest.
	state: Number,        // State of this Quest.
	                      //   0: None
	                      //   1: In Queue
	                      //   2: Matched
	                      //   3: Completed
	                      //   4: Rewarded
	from: String,         // kakaoId of the account of the uploader.
	to: String            // kakaoId of the account who accepted this Quest.

});

module.exports = mongoose.model('quest', questSchema);