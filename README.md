# CS496_005_Melona

Melona Server

Port Address: 143.248.132.156:8080

Available APIs:
  - POST : /api/quest
     - Adds new quest on database. Check models/quest.js for details.
        - CAUTION: "startPoint", "destination", "title", "from" fields are always required.
     - returns { "result": 1 } for success.
     - returns { "result": 0 } for database failure.
     - returns { "result": 2 } if there is no such account of kakaoId "from".
     - returns { "result": 3 } if account of kakaoId "from" has not enough coin.
                           
  - GET  : /api/quest
     - Retrieves all quests on database.
        - OPTION: Use "sortBy" field to retrieve sorted data
        - OPTION: Use fields to filter data
        - e.g. { "sortBy": "title" } will sort quests using its title
        - e.g. { "startPoint": [start], "sortBy": "title" } will retrieve quests whose "startPoint" field is [start], and the result will be sorted by title
        
  - PUT  : /api/accept
     - Accepts a quest in the queue.
     - Mandatory fields:
        - "questId" : _id of the quest to accept.
        - "accountId" : kakaoId of the account accepting the quest.
        - e.g. { "questId": "1a2b3c4d5e6f7a8b9c", "accountId": "72392763" }
     - returns { "result": 1 } for success.
     - returns { "result": 0 } for database failure.
     - returns { "result": 2 } if there is no such quest of _id "questId".
     - returns { "result": 3 } if the quest is already matched or completed.
     - returns { "result": 4 } if there is no such account of kakaoId "accountId".
     - returns { "result": 5 } if the account accepting the quest is the uploader of the quest.
     
  - PUT  : /api/giveup
     - Give up a quest accepted previously.
     - Still working on
  
  - PUT  : /api/withdraw
     - Withdraw a quest posted previously.
     - Still working on
     
  - PUT  : /api/complete
     - Confirm a posted quest to be completed.
     - This API is used on uploader's account.
     - Still working on
     
  - PUT  : /api/reward
     - Receive reward of a completed quest.
     - This API is used on receiver's account.
     - Still working on
 
  - POST : /api/account                
     - Adds new account on database. Check models/account.js for details.
        - CAUTION : data other than "kakaoId" is automatically initialized in server.
        - CAUTION : "kakaoId" field is always required.
     - returns { "result": 1 } for success
     - returns { "result": 0 } for failure
     - returns { "result": 2 } if an account with given kakaoId already exists.
  
  - GET  : /api/account 
     - Retrieves all accounts on database.
  
  - GET  : /api/account/kakaoId/[id]
     - Retrieves an account which kakaoId is [id].
     - returns 404 (NOT FOUND) error with { "error": "no such account" } if the account with given kakaoId does not exist.
