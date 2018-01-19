# CS496_005_Melona

Melona Server

Port Address: 143.248.132.156:8080

Available APIs:
  - POST : /api/quest
     - Adds new quest on database. Check models/quest.js for details.
        - CAUTION: "startPoint", "destination", "title", "from", "to" fields are always required.
     - returns { "result": 1 } for success
     - returns { "result": 0 } for database failure
                           
  - GET  : /api/quest
     - Retrieves all quests on database.
        - OPTION: Use "sortBy" field to retrieve sorted data
        - OPTION: Use fields to filter data
        
        - e.g. { "sortBy": "title" } will sort quests using its title
        - e.g. { "startPoint": [start], "sortBy": "title" } will retrieve quests whose "startPoint" field is [start], and the result will be sorted by title
 
  - POST : /api/account                
     - Adds new account on database. Check models/account.js for details.
        - CAUTION : data other than "kakaoId" is automatically initialized in server.
        - CAUTION : "kakaoId" field is always required.
     - returns { "result": 1 } for success
     - returns { "result": 0 } for failure
  
  - GET  : /api/account 
     - Retrieves all accounts on database.
  
  - GET  : /api/account/kakaoId/[id]
     - Retrieves an account which kakaoId is [id].
     - returns 404 (NOT FOUND) error with { "error": "no such account" } if the account with given kakaoId does not exist.
