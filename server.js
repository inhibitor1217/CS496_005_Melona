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
	quest.startPoint  = req.body.startPoint;
	quest.destination = req.body.destination;
	quest.coinReward  = req.body.coinReward;
	quest.coinExp     = req.body.coinExp;
	quest.tag         = req.body.tag;
	quest.title       = req.body.title;
	quest.text        = req.body.text;
	quest.state       = req.body.state;
	quest.from        = req.body.from;
	quest.to          = req.body.to;

	quest.save(function(err) {
		if(err) {
			console.error(err);
			res.json({result: 0}); // save failed
			return;
		} else {
			res.json({result: 1})  // save succeeded
		}
	});
});

// retrieve all quests
app.get('/api/quest', function(req, res) {
	Quest.find(function(err, quests) {
		if(err) return res.status(500).send({error: 'database failure'});
		res.json(quests);
	});
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
			res.json({result: 0}); // save failed
			return;
		} else {
			res.json({result: 1})  // save succeeded
		}
	});
});

// retrieve all accounts
app.get('/api/account', function(req, res) {
	Account.find(function(err, accounts) {
		if(err) return res.status(500).json({error: 'database failure'});
		res.json(accounts);
	});
});

// retrieve account by kakaoId
app.get('/api/account/kakaoId/:id', function(req, res) {
	Account.findOne({kakaoId: req.params.id}, function(err, accounts) {
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
