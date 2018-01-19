# CS496_005_Melona

Melona Server

Port Address: 143.248.132.156:8080

Available APIs:
  - POST : /api/quest
     - Adds new quest on database. Check models/quest.js for details.
     - returns { "result": 1 } for success
     - returns { "result": 0 } for failure
                           
  - GET  : /api/quest
     - Retrieves all quests on database.
  
  - POST : /api/account                
     - Adds new account on database. Check models/account.js for details.
     - returns { "result": 1 } for success
     - returns { "result": 0 } for failure
  
  - GET  : /api/account 
     - Retrieves all accounts on database.
  
  - GET  : /api/account/kakaoId/[id]
	 - Retrieves an account which kakaoId is [id].
     - returns 404 (NOT FOUND) error with { "error": "no such account" } if the account with given kakaoId does not exist.
