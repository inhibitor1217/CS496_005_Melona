// server.js

// load packages
var express    = require('express');
var app        = express();
var bodyParser = require('body-parser');
var mongoose   = require('mongoose');

// configure mongoose
var db = mongoose.connection;
db.on('error', console.error);
db.once('open', function() {
	console.log("Connected to mongod server");
})
mongoose.connect('mongodb://localhost/database');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;

var Quest   = require('./models/quest');
var Account = require('./models/account');

// post new quest
app.post('/api/quest', function(req, res) {
	var quest = new Quest();

	var coinReward = 0;
	var expReward = 0;
	var tag = [];
	var text = "";

	if(req.body.startPoint == undefined) {
		res.json({error: "field \'startPoint\' is not defined"});
		return;
	}
	if(req.body.destination == undefined) {
		res.json({error: "field \'destination\' is not defined"});
		return;
	}
	if(req.body.coinReward != undefined) {
		coinReward = req.body.coinReward;
	}
	if(req.body.expReward != undefined) {
		expReward = req.body.expReward;
	}
	if(req.body.tag != undefined) {
		tag = req.body.tag;
	}
	if(req.body.title == undefined) {
		res.json({error: "field \'title\' is not defined"});
		return;
	}
	if(req.body.text != undefined) {
		text = req.body.text;
	}
	if(req.body.from == undefined) {
		res.json({error: "field \'from\' is not defined"});
		return;
	}

	Account.findOne( { kakaoId: req.body.from }, function(err, accounts) {

		if(err) return res.status(500).json({error: 'database failure'});
		if(accounts == null) {
			res.json({result: 2}); // failed: invalid account id
			return;
		}

		quest.startPoint  = req.body.startPoint;
		quest.destination = req.body.destination;
		quest.coinReward  = coinReward;
		quest.expReward   = expReward;
		quest.tag         = tag;
		quest.title       = req.body.title;
		quest.text        = text;
		quest.state       = 1;
		quest.from        = req.body.from;
		quest.to          = "";

		quest.save(function(err, q) {
			if(err) {
				console.error(err);
				res.json({result: 0}); // failed: db error
				return;
			} else {
				accounts.uploadedQuests.push(q.id);
				accounts.save(function(err) {
					if(err) {
						console.error(err);
						res.json({result: 0}); // failed: db error
						return;
					}
					res.json({result: 1}); // success
				});
			}
		});

	} );

});


// accept quest
// - update Quest : state (Matched = 2)
//                : to
// - update Account : uploadedQuests

// give up quest
// - update Quest : state (Matched = 1)
//                : to
// - update Account : acceptedQuests
//                ( : coin, exp )

// withdraw quest
// - delete Quest
// - update Account : uploadedQuests

// complete quest
// - update Quest : state (Completed = 3)
// - update Account : uploadedQuests
//                  : coin
// - update Account : acceptedQuests
//                  : completedQuests
//                  : coin
//                  : experience
//                  : level

// retrieve all quests
app.get('/api/quest', function(req, res) {

	var sortBy = req.body.sortBy;
	delete req.body["sortBy"];

	if(sortBy == undefined) {
		Quest.find( req.body, { "_id": false }, function(err, quests) {
			if(err) return res.status(500).send({error: 'database failure'});
			res.json(quests);
		});
	} else {
		Quest.find( req.body, { "_id": false } ).sort(sortBy).exec(function(err, quests) {
			if(err) return res.status(500).send({error: 'database failure'});
			res.json(quests);
		});
	}

});

// delete all quests
app.delete('/api/questDel', function(req, res) {
	Quest.remove(function(err, output) {
		if(err) return res.status(500).json({error: 'database failure'});
		res.status(204).end();
	});
});

// delete quest by id
app.delete('/api/questDel/:id', function(req, res) {
	Quest.remove({ _id: req.params.id }, function(err, output) {
		if(err) return res.status(500).json({error: 'database failure'});
		res.status(204).end();
	});
});

// post new account
app.post('/api/account', function(req, res) {

	if(req.body.kakaoId == undefined) {
		res.json({result: "field \'kakaoId\' is not defined"});
		return;
	}

	Account.find( { kakaoId: req.body.kakaoId }, function(err, accounts) {

		if(err) return res.status(500).json({error: 'database failure'});
		if(accounts.length > 0) {
			res.json({result: 2}); // failed : duplicate kakaoId
			return;
		}

		var account = new Account();

		account.kakaoId         = req.body.kakaoId;
		account.coin            = 0;
		account.uploadedQuests  = [];
		account.acceptedQuests  = [];
		account.completedQuests = [];
		account.level           = 0;
		account.experience      = 0;

		account.save(function(err) {
			if(err) {
				console.error(err);
				res.json({result: 0}); // failed : database error
				return;
			} else {
				res.json({result: 1})  // succeeded
			}
		});

	});

});

// retrieve all accounts
app.get('/api/account', function(req, res) {
	Account.find( { }, { "_id": false }, function(err, accounts) {
		if(err) return res.status(500).json({error: 'database failure'});
		res.json(accounts);
	});
});

// retrieve account by kakaoId
app.get('/api/account/kakaoId/:id', function(req, res) {
	Account.findOne( { kakaoId: req.params.id }, { "_id": false }, function(err, accounts) {
		if(err) return res.status(500).json({error: 'database failure'});
		if(accounts == null) return res.status(404).json({error: 'no such account'});
		res.json(accounts);
	});
});

// delete all accounts
app.delete('/api/accountDel', function(req, res) {
	Account.remove(function(err, output) {
		if(err) return res.status(500).json({error: 'database failure'});
		res.status(204).end();
	});
});

// delete account by id
app.delete('/api/accountDel/:id', function(req, res) {
	Account.remove({ _id: req.params.id }, function(err, output) {
		if(err) return res.status(500).json({error: 'database failure'});
		res.status(204).end();
	});
});

var server = app.listen(port, function() {
	console.log("Express server has started on port " + port);
});
