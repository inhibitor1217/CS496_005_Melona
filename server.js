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

var enableRealTimeConnection = false;

// kakao open room urls
var chatRoomUrls = ['https://open.kakao.com/o/gyzlD3F',
					'https://open.kakao.com/o/gXFoD3F',
					'https://open.kakao.com/o/gXHqD3F',
					'https://open.kakao.com/o/gF5sD3F',
					'https://open.kakao.com/o/smGvD3F',
					'https://open.kakao.com/o/sS7wD3F',
					'https://open.kakao.com/o/gFlzD3F',
					'https://open.kakao.com/o/gJrAD3F',
					'https://open.kakao.com/o/gnqCD3F',
					'https://open.kakao.com/o/glBDD3F' ];
var chatRoomCount = 0;

// post new quest
app.post('/api/quest', function(req, res) {

	var startPoint = "undefined";
	var destination = "undefined";
	var coinReward = 0;
	var expReward = 0;
	var tag = [];
	var text = "";

	if(req.body.startPoint != undefined) {
		startPoint = req.body.startPoint;
	}
	if(req.body.destination != undefined) {
		destination = req.body.destination;
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

		if(err) {
			res.json({result: 0}) // failed : db error
			return;
		}
		if(accounts == null) {
			res.json({result: 2}); // failed: invalid account id
			return;
		}
		if(accounts.kakaoId != "admin" && accounts.coin < coinReward) {
			res.json({result: 3}); // failed: not enough coin
			return;
		}

		var quest = new Quest();
		quest.startPoint  = startPoint;
		quest.destination = destination;
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
				if(accounts.kakaoId != "admin") accounts.coin -= coinReward;
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
//
// - required fields : Quest._id
//                     Account.kakaoId
//
// - assert : Quest with Quest._id exists
//            Quest.state is "In Queue"
//            Quest.from is not Account.kakaoId
//            Account with field Account.kakaoId exists
//
// - update : Quest.state (Matched = 2)
//            Quest.to
//            Account.acceptedQuests
app.put('/api/accept', function(req, res) {

	if(req.body.questId == undefined) {
		res.json({ error: "field \'questId\' is not defined" });
		return;
	}
	if(req.body.accountId == undefined) {
		res.json({ error: "field \'accountId\' is not defined" });
		return;
	}


	Quest.findOne( { _id: req.body.questId }, function(err, quests) {

		if(err) {
			res.json( { result : 0 } ); // failed : db error
			return;
		}
		if(quests == undefined) {
			res.json( { result : 2 } ); // failed : no such quest
			return;
		}
		if(quests.state != 1) {
			res.json( { result : 3 } ); // failed : quest is already matched or completed
			return;
		}

		Account.findOne( { kakaoId: req.body.accountId }, function(err, accounts) {

			if(err) {
				res.json( { result : 0 } ); // failed : db error
				return;
			}
			if(accounts == undefined) {
				res.json( { result : 4 } ); // failed : no such account
				return;
			}
			if(quests.from == accounts.kakaoId) {
				res.json( { result : 5 } ); // failed : uploader should not accept quest
				return;
			}

			quests.state = 2;
			quests.to = accounts.kakaoId;

			quests.save(function(err) {
				if(err) {
					res.json( { result : 0 } ); // failed : db error
					return;
				}
				accounts.acceptedQuests.push(quests.id);
				accounts.save(function(err) {
					if(err) {
						res.json( { result : 0 } ); // failed : db error
						return;
					}

					if(enableRealTimeConnection) {
						var data = { questId: quests.id, roomURL: chatRoomUrls[chatRoomCount] };
						chatRoomCount++;
						if(socket_ids[quests.from] != undefined) {
							io.sockets(socket_ids[quests.from]).emit('questAccepted', data);
						}
						res.json({result: 1}); // success
					} else {
						res.json( { result : 1 } ); // success
					}
				});
			})

		} );

	} );

});

// give up quest
//
// - required fields : Quest._id
//                     Account.kakaoId
//
// - assert : Quest with Quest._id exists
//            Quest.state is "Matched"
//            Account with Account.kakaoId exists
//            Account.kakaoId == Quest.to
//
// - update : Quest.state (Matched = 1)
//            Quest.to
//            Account.acceptedQuests
//            Account.coin
//            Account.exp
const giveupPenaltyCoin = 0;
const giveupPenaltyExp = 0;
app.put('/api/giveup', function(req, res) {
	if(req.body.questId == undefined) {
		res.json({error: "field \'questId\' is undefined"});
		return;
	}
	if(req.body.accountId == undefined) {
		res.json({error: "field \'accountId\' is undefined"});
		return;
	}
	Quest.findOne({_id: req.body.questId}, function(err, quests) {
		if(err) {
			res.json({"result": 0}); // failed : db error
			return;
		}
		if(quests == undefined) {
			res.json({"result": 2}); // failed : no such quest
			return;
		}
		if(quests.state != 2) {
			res.json({"result": 3}); // failed : quest is not in "Matched" state
			return;
		}
		Account.findOne({kakaoId: req.body.accountId}, function(err, accounts) {
			if(err) {
				res.json({"result": 0}); // failed : db error
				return;
			}
			if(accounts == undefined) {
				res.json({"result": 4}); // failed : no such account
				return;
			}
			if(quests.to != accounts.kakaoId) {
				res.json({"result": 5}); // failed : wrong account
				return;
			}

			quests.state = 1;
			quests.to = "";

			quests.save(function(err) {
				if(err) {
					res.json({"result": 0}); // failed : db error
					return;
				}
				accounts.acceptedQuests = remove(accounts.acceptedQuests, quests.id);
				accounts.coin = Math.max(0, accounts.coin - giveupPenaltyCoin);
				accounts.coin = Math.max(0, accounts.experience - giveupPenaltyExp);
				accounts.save(function(err) {
					if(err) {
						res.json({"result": 0}); // failed : db error
						return;
					}
					if(enableRealTimeConnection) {
						var data = quests.id;
						if(socket_ids[quests.from] != undefined) {
							io.sockets(socket_ids[quests.from]).emit('questGaveUp', data);
						}
						res.json({"result": 1});
					} else {
						res.json({"result": 1});
					}
				});
			});
		});
	});
});

// withdraw quest
//
// - required fields : Quest._id
//                     Account.kakaoId
//
// - assert : Quest with Quest._id exists
//            Quest.state is "In Queue" or "Matched"
//            Account with Account.kakaoId exists
//            Account is the uploader
//
// - delete Quest
// - update : Account.uploadedQuests
//            Account.coin
app.put('/api/withdraw', function(req, res) {
	if(req.body.questId == undefined) {
		res.json({error: "field \'questId\' is undefined"});
		return;
	}
	if(req.body.accountId == undefined) {
		res.json({error: "field \'accountId\' is undefined"});
		return;
	}
	Quest.findOne({_id: req.body.questId}, function(err, quests) {
		if(err) {
			res.json({"result": 0}); // failed : db error
			return;
		}
		if(quests == undefined) {
			res.json({"result": 2}); // failed : no such quest
			return;
		}
		if(quests.state != 1 && quests.state != 2) {
			res.json({"result": 3}); // failed : quest is already completed
			return;
		}
		Account.findOne({kakaoId: req.body.accountId}, function(err, accounts) {
			if(err) {
				res.json({"result": 0}); // failed : db error
				return;
			}
			if(accounts == undefined) {
				res.json({"result": 4}); // failed : no such account
				return;
			}
			if(quests.from != accounts.kakaoId) {
				res.json({"result": 5}); // failed : wrong account
				return;
			}
			accounts.uploadedQuests = remove(accounts.uploadedQuests, quests.id);
			accounts.coin += quests.coinReward;
			accounts.save(function(err) {
				if(err) {
					res.json({"result": 0}); // failed : db error
					return;
				}
				Quest.remove({ _id: quests.id }, function(err, output) {
					if(err) {
						res.json({"result": 0}); // failed : db error
						return;
					}
					if(quests.to != "") {
						Account.findOne({kakaoId: quests.to}, function(err, recAcc) {
							if(err) return res.json({"result": 0});
							recAcc.acceptedQuests = remove(recAcc.acceptedQuests, quests.id);
							recAcc.save(function(err) {
								if(err) return res.json({"result": 0});
								if(enableRealTimeConnection) {
									var data = quests.id;
									if(quests.to != "") {
										if(socket_ids[quests.to] != undefined) {
											io.sockets(socket_ids[quests.to]).emit('questWithdrawn', data);
										}
									}
									res.json({"result": 1});
								} else {
									res.json({"result": 1});
								}
							});
						});
					}
					else {
						if(enableRealTimeConnection) {
							var data = quests.id;
							if(quests.to != "") {
								if(socket_ids[quests.to] != undefined) {
									io.sockets(socket_ids[quests.to]).emit('questWithdrawn', data);
								}
							}
							res.json({"result": 1});
						} else {
							res.json({"result": 1});
						}
					}
				});
			});
		});
	});
});

// complete quest
// 
// - required fields : Quest._id
//                     Account.kakaoId
//
// - assert : Quest with Quest._id exists
//            Quest.state is "Matched"
//            Account with Account.kakaoId exists
//            Account is the uploader
//
// - update : Quest.state (Completed = 3)
//            Account.uploadedQuests
//            Account.completedQuests
app.put('/api/complete', function(req, res) {
	if(req.body.questId == undefined) {
		res.json({error: "field \'questId\' is undefined"});
		return;
	}
	if(req.body.accountId == undefined) {
		res.json({error: "field \'accountId\' is undefined"});
		return;
	}
	Quest.findOne({_id: req.body.questId}, function(err, quests) {
		if(err) {
			res.json({"result": 0}); // failed : db error
			return;
		}
		if(quests == undefined) {
			res.json({"result": 2}); // failed : no such quest
			return;
		}
		if(quests.state != 2) {
			res.json({"result": 3}); // failed : quest is not "Matched"
			return;
		}
		Account.findOne({kakaoId: req.body.accountId}, function(err, accounts) {
			if(err) {
				res.json({"result": 0}); // failed : db error
				return;
			}
			if(accounts == undefined) {
				res.json({"result": 4}); // failed : no such account
				return;
			}
			if(quests.from != accounts.kakaoId) {
				res.json({"result": 5}); // failed : wrong account
				return;
			}
			quests.state = 3;
			quests.save(function(err) {
				if(err) {
					res.json({"result": 0}); // failed : db error
					return;
				}
				accounts.uploadedQuests = remove(accounts.uploadedQuests, quests.id);
				accounts.completedQuests.push(quests.id);
				accounts.save(function(err) {
					if(err) {
						res.json({"result": 0}); // failed : db error
						return;
					}
					if(enableRealTimeConnection) {
						if(socket_ids[quests.to] != undefined) {
							io.sockets(socket_ids[quests.to]).emit('questCompleted', data);
						}
						res.json({"result": 1});
					} else {
						res.json({"result": 1});
					}
				});
			});
		});
	});
});

// receive reward
//
// - required fields : Quest._id
//                     Account.kakaoId
//
// - assert : Quest with Quest._id exists
//            Quest.state is "Completed"
//            Account with Account.kakaoId exists
//            Account is the receiver
//
// - update Quest : state (Reward = 4)
// - update Account : acceptedQuests
//                  : completedQuests
//                  : coin
//                  : experience
//                  : level
const maxExp = 100;
app.put('/api/reward', function(req, res) {
	if(req.body.questId == undefined) {
		res.json({error: "field \'questId\' is undefined"});
		return;
	}
	if(req.body.accountId == undefined) {
		res.json({error: "field \'accountId\' is undefined"});
		return;
	}
	Quest.findOne({_id: req.body.questId}, function(err, quests) {
		if(err) {
			res.json({"result": 0}); // failed : db error
			return;
		}
		if(quests == undefined) {
			res.json({"result": 2}); // failed : no such quest
			return;
		}
		if(quests.state != 3) {
			res.json({"result": 3}); // failed : quest is not "Completed"
			return;
		}
		Account.findOne({kakaoId: req.body.accountId}, function(err, accounts) {
			if(err) {
				res.json({"result": 0}); // failed : db error
				return;
			}
			if(accounts == undefined) {
				res.json({"result": 4}); // failed : no such account
				return;
			}
			if(quests.to != accounts.kakaoId) {
				res.json({"result": 5}); // failed : wrong account
				return;
			}
			quests.state = 4;
			quests.save(function(err) {
				if(err) {
					res.json({"result": 0}); // failed : db error
					return;
				}
				accounts.acceptedQuests = remove(accounts.acceptedQuests, quests.id);
				accounts.completedQuests.push(quests.id);
				accounts.coin += quests.coinReward;
				accounts.experience += quests.expReward;
				if(accounts.experience >= maxExp) {
					accounts.level++;
					accounts.experience -= maxExp;
				}
				accounts.save(function(err) {
					if(err) {
						res.json({"result": 0}); // failed : db error
						return;
					}
					res.json({"result": 1}) // success
				});
			});
		});
	});
});

// retrieve all quests
app.get('/api/quest', function(req, res) {

	req.params = params(req);
	if(req.params.coinReward) req.params.coinReward *= 1;
	if(req.params.expReward) req.params.expReward *= 1;
	if(req.params.state) req.params.state *= 1;

	if(req.params.sortBy) {
		var sortBy = req.params.sortBy;
		delete req.params.sortBy;
		if(req.params.tag) {
			var tag = req.params.tag;
			delete req.params.tag;
			Quest.find( { $and: [ req.params, { $where: "this.tag.includes(\"" + tag + "\")" } ] } ).sort(sortBy).exec( function(err, quests) {
				if(err) return res.json({error: 'database failure'});
				res.json(quests);
			});
		} else Quest.find( req.params ).sort(sortBy).exec( function(err, quests) {
			if(err) return res.json({error: 'database failure'});
			res.json(quests);
		});
	}
	else {
		if(req.params.tag) {
			var tag = req.params.tag;
			delete req.params.tag;
			Quest.find( { $and: [ req.params, { $where: "this.tag.includes(\"" + tag + "\")" } ] }, function(err, quests) {
				if(err) return res.json({error: 'database failure'});
				res.json(quests);
			} );
		}
		else Quest.find( req.params, function(err, quests) {
			if(err) return res.json({error: 'database failure'});
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

		account.msgQueue = [[]];

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
	Account.find( { }, { "_id": false, "msgQueue": false }, function(err, accounts) {
		if(err) return res.status(500).json({error: 'database failure'});
		res.json(accounts);
	});
});

// retrieve all accounts (server api)
app.get('/api/__server__/account', function(req, res) {
	Account.find( { }, { }, function(err, accounts) {
		if(err) return res.status(500).json({error: 'database failure'});
		res.json(accounts);
	});
});

// retrieve account by kakaoId
app.get('/api/account/kakaoId/:id', function(req, res) {
	Account.findOne( { kakaoId: req.params.id }, { "_id": false, "msgQueue": false }, function(err, accounts) {
		if(err) return res.status(500).json({error: 'database failure'});
		if(accounts == null) return res.status(404).json({error: 'no such account'});
		res.json(accounts);
	});
});

// retrieve account by kakaoId (server api)
app.get('/api/__server__/account/kakaoId/:id', function(req, res) {
	Account.findOne( { kakaoId: req.params.id }, { }, function(err, accounts) {
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

// delete account by kakaoId
app.delete('/api/account/kakaoId/:id', function(req, res) {
	Account.remove({ kakaoId: req.params.id }, function(err, output) {
		if(err) return res.status(500).json({error: 'database failure'});
		res.status(204).end();
	});
});

var server = app.listen(port, function() {
	console.log("Express server has started on port " + port);
});

// -------------------------------------------------------------------- //

var io = require('socket.io').listen(server);

var socket_ids = [];

io.sockets.on('connection', function(socket) {
	console.log('client connected.');
	socket.emit('confirmConnection', {msg: 'Connected to Server'});
	socket.on('verifyKakaoId', function(data) {
		socket.set('kakaoId', data.kakaoId, function() {
			var id = data.kakaoId;
			socket_ids[id] = socket.id;
			console.log('user: ' + id + ' connected to server.');

			socket.on('disconnect', function(data) {
				delete socket_ids[id];
				console.log('user: ' + id + ' disconnected from server.');
			});
		});
	});
});

// -------------------------------------------------------------------- //

// helper functions
function remove(array, element) {
	return array.filter(e => e !== element);
}

var params = function(req){
  var q=req.url.split('?'),result={};
  if(q.length>=2){
      q[1].split('&').forEach((item)=>{
           try {
             result[item.split('=')[0]]=decodeURIComponent(item.split('=')[1]);
           } catch (e) {
             result[item.split('=')[0]]='';
           }
      })
  }
  return result;
}