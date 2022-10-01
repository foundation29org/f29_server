define({ "api": [
  {
    "type": "post",
    "url": "https://storias.org/api/api/signin",
    "title": "Get the token (and the userId)",
    "name": "signIn",
    "version": "1.0.0",
    "group": "Access_token",
    "description": "<p>This method gets the token and the language for the user. This token includes the encrypt id of the user, token expiration date, role, and the group to which it belongs. The token are encoded using <a href=\"https://en.wikipedia.org/wiki/JSON_Web_Token\" target=\"_blank\">jwt</a></p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "var passwordsha512 = sha512(\"fjie76?vDh\");\nvar formValue = { email: \"aa@aa.com\", password: passwordsha512 };\n this.http.post('https://storias.org/api/signin',formValue)\n  .subscribe( (res : any) => {\n    if(res.message == \"You have successfully logged in\"){\n      console.log(res.lang);\n      console.log(res.token);\n    }else{\n      this.isloggedIn = false;\n    }\n }, (err) => {\n   this.isloggedIn = false;\n }",
        "type": "js"
      }
    ],
    "parameter": {
      "fields": {
        "body": [
          {
            "group": "body",
            "type": "String",
            "optional": false,
            "field": "email",
            "description": "<p>User email</p>"
          },
          {
            "group": "body",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>User password using hash <a href=\"https://es.wikipedia.org/wiki/SHA-2\" target=\"_blank\">sha512</a></p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n  \"email\": \"example@ex.com\",\n  \"password\": \"f74f2603939a53656948480ce71f1ce46457b6654fd22c61c1f2ccd3e2c96d1cd02d162b560c4beaf1ae45f4574571dc5cbc1ce040701c0b5c38457988aa00fe97f\"\n}",
          "type": "json"
        }
      ]
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>If all goes well, the system should return 'You have successfully logged in'</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "token",
            "description": "<p>You will need this <strong>token</strong> in the header of almost all requests to the API. Whenever the user wants to access a protected route or resource, the user agent should send the JWT, in the Authorization header using the Bearer schema.</p> <p>The data contained in the token are: encrypted <strong>userId</strong>, expiration token, group, and role. To decode them, you you must use some jwt decoder <a href=\"https://en.wikipedia.org/wiki/JSON_Web_Token\" target=\"_blank\">jwt</a>. There are multiple options to do it, for example for javascript: <a href=\"https://github.com/hokaccha/node-jwt-simple\" target=\"_blank\">Option 1</a> <a href=\"https://github.com/auth0/jwt-decode\" target=\"_blank\">Option 2</a> When you decode, you will see that it has several values, these are:</p> <p> <ul>  <li>sub: the encrypted userId. This value will also be used in many API queries. It is recommended to store only the token, and each time the userId is required, decode the token.</li>  <li>exp: The expiration time claim identifies the expiration time on or after which the JWT must not be accepted for processing.</li>  <li>group: Group to which the user belongs, if it does not have a group, it will be 'None'. </li>  <li>role: Role of the user. Normally it will be 'User'.</li> </ul> </p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "lang",
            "description": "<p>Lang of the User.</p>"
          }
        ],
        "Success 202": [
          {
            "group": "Success 202",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Information about the request. The credentials are incorrect or something has gone wrong. One of the following answers will be obtained:</p> <ul> <li>Not found</li> <li>Login failed</li> <li>Account is temporarily locked</li> <li>Account is unactivated</li> </ul>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n \"message\": \"You have successfully logged in\",\n \"token\": \"eyJ0eXAiOiJKV1QiLCJhbGciPgDIUzI1NiJ9.eyJzdWIiOiI1M2ZlYWQ3YjY1YjM0ZTQ0MGE4YzRhNmUyMzVhNDFjNjEyOThiMWZjYTZjMjXkZTUxMTA9OGVkN2NlODMxYWY3IiwiaWF0IjoxNTIwMzUzMDMwLCJlcHAiOjE1NTE4ODkwMzAsInJvbGUiOiJVc2VyIiwiZ3JvdDEiOiJEdWNoZW5uZSBQYXJlbnQgUHJfrmVjdCBOZXRoZXJsYW5kcyJ9.MloW8eeJ857FY7-vwxJaMDajFmmVStGDcnfHfGJx05k\",\n \"lang\": \"en\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "controllers/all/user.js",
    "groupTitle": "Access_token"
  },
  {
    "type": "post",
    "url": "https://storias.org/api/api/newPass",
    "title": "New password",
    "name": "newPass",
    "version": "1.0.0",
    "group": "Account",
    "description": "<p>This method allows you to change the password of an account. It is another way to change the password, but in this case, you need to provide the current and the new password, and it does not require validation through the mail account. In this case, it requires authentication in the header.</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "var passwordsha512 = sha512(\"fjie76?vDh\");\nvar newpasswordsha512 = sha512(\"jisd?87Tg\");\nvar formValue = { email: example@ex.com, actualpassword: passwordsha512, newpassword: newpasswordsha512 };\n this.http.post('https://storias.org/api/newPass',formValue)\n  .subscribe( (res : any) => {\n    if(res.message == \"password changed\"){\n      console.log(\"Password changed successfully\");\n    }else if(res.message == 'Login failed'){\n      console.log('The current password is incorrect');\n    }else if(res.message == 'Account is temporarily locked'){\n      console.log('Account is temporarily locked');\n    }else if(res.message == 'Account is unactivated'){\n      ...\n    }\n }, (err) => {\n   ...\n }",
        "type": "js"
      }
    ],
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "authorization",
            "description": "<p>Users unique access-key. For this, go to  <a href=\"#api-Access_token-signIn\">Get token</a></p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Header-Example:",
          "content": "{\n  \"authorization\": \"Bearer eyJ0eXAiOiJKV1QiLCJhbGciPgDIUzI1NiJ9.eyJzdWIiOiI1M2ZlYWQ3YjY1YjM0ZTQ0MGE4YzRhNmUyMzVhNDFjNjEyOThiMWZjYTZjMjXkZTUxMTA9OGVkN2NlODMxYWY3IiwiaWF0IjoxNTIwMzUzMDMwLCJlcHAiOjE1NTE4ODkwMzAsInJvbGUiOiJVc2VyIiwiZ3JvdDEiOiJEdWNoZW5uZSBQYXJlbnQgUHJfrmVjdCBOZXRoZXJsYW5kcyJ9.MloW8eeJ857FY7-vwxJaMDajFmmVStGDcnfHfGJx05k\"\n}",
          "type": "json"
        }
      ]
    },
    "parameter": {
      "fields": {
        "body": [
          {
            "group": "body",
            "type": "String",
            "optional": false,
            "field": "email",
            "description": "<p>User email. In the link to request a change of password sent to the email, there is an email parameter. The value of this parameter will be the one to be assigned to email.</p>"
          },
          {
            "group": "body",
            "type": "String",
            "optional": false,
            "field": "actualpassword",
            "description": "<p>Actual password using hash <a href=\"https://es.wikipedia.org/wiki/SHA-2\" target=\"_blank\">sha512</a></p>"
          },
          {
            "group": "body",
            "type": "String",
            "optional": false,
            "field": "newpassword",
            "description": "<p>New password using hash <a href=\"https://es.wikipedia.org/wiki/SHA-2\" target=\"_blank\">sha512</a></p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n  \"email\": \"example@ex.com\",\n  \"actualpassword\": \"f74f2603939a53656948480ce71f1ce46457b6654fd22c61c1f2ccd3e2c96d1cd02d162b560c4beaf1ae45f4574571dc5cbc1ce040701c0b5c38457988aa00fe97f\",\n  \"newpassword\": \"k847y603939a53656948480ce71f1ce46457b4745fd22c61c1f2ccd3e2c96d1cd02d162b560c4beaf1ae45f4574571dc5cbc1ce040701c0b5c38457988aa00fe45t\"\n}",
          "type": "json"
        }
      ]
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Information about the request. If everything went correctly, return 'password changed'</p>"
          }
        ],
        "Success 202": [
          {
            "group": "Success 202",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Information about the request. The credentials are incorrect or something has gone wrong. One of the following answers will be obtained:</p> <ul> <li>Not found</li> <li>Login failed (if the current password is incorrect)</li> <li>Account is temporarily locked</li> <li>Account is unactivated</li> </ul>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n \"message\": \"password changed\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "controllers/all/user.js",
    "groupTitle": "Account"
  },
  {
    "type": "post",
    "url": "https://storias.org/api/api/recoverpass",
    "title": "Request password change",
    "name": "recoverPass",
    "version": "1.0.0",
    "group": "Account",
    "description": "<p>This method allows you to send a request to change the password. At the end of this call, you need to check the email account to call <a href=\"#api-Account-updatePass\">update password</a>.</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "var formValue = { email: \"example@ex.com\"};\nthis.http.post('https://storias.org/api/recoverpass',formValue)\n .subscribe( (res : any) => {\n   if(res.message == \"Email sent\"){\n     console.log(\"Account recovery email sent. Check the email to change the password\");\n   }\n}, (err) => {\n  if(err.error.message == 'Fail sending email'){\n     //contact with storias\n   }else if(err.error.message == 'user not exists'){\n    ...\n   }else if(err.error.message == 'account not activated'){\n    ...\n   }\n}",
        "type": "js"
      }
    ],
    "parameter": {
      "fields": {
        "body": [
          {
            "group": "body",
            "type": "String",
            "optional": false,
            "field": "email",
            "description": "<p>User email</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n  \"email\": \"example@ex.com\"\n}",
          "type": "json"
        }
      ]
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Information about the request. If everything went correctly, return 'Email sent'</p>"
          }
        ],
        "Eror 500": [
          {
            "group": "Eror 500",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Information about the request. The credentials are incorrect or something has gone wrong. One of the following answers will be obtained:</p> <ul> <li>Fail sending email</li> <li>user not exists</li> <li>account not activated</li> </ul>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n \"message\": \"Email sent\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "controllers/all/user.js",
    "groupTitle": "Account"
  },
  {
    "type": "post",
    "url": "https://storias.org/api/api/signUp",
    "title": "New account",
    "name": "signUp",
    "version": "1.0.0",
    "group": "Account",
    "description": "<p>This method allows you to create a user account in Storias</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "var passwordsha512 = sha512(\"fjie76?vDh\");\nvar formValue = { email: \"example@ex.com\", userName: \"Peter\", password: passwordsha512, lang: \"en\", group: \"None\"};\n this.http.post('https://storias.org/api/signup',formValue)\n  .subscribe( (res : any) => {\n    if(res.message == \"Account created\"){\n      console.log(\"Check the email to activate the account\");\n    }else if(res.message == 'Fail sending email'){\n      //contact with storias\n    }else if(res.message == 'user exists'){\n     ...\n    }\n }, (err) => {\n   ...\n }",
        "type": "js"
      }
    ],
    "parameter": {
      "fields": {
        "body": [
          {
            "group": "body",
            "type": "String",
            "optional": false,
            "field": "email",
            "description": "<p>User email</p>"
          },
          {
            "group": "body",
            "type": "String",
            "optional": false,
            "field": "userName",
            "description": "<p>User name</p>"
          },
          {
            "group": "body",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>User password using hash <a href=\"https://es.wikipedia.org/wiki/SHA-2\" target=\"_blank\">sha512</a></p>"
          },
          {
            "group": "body",
            "type": "String",
            "optional": false,
            "field": "lang",
            "description": "<p>Lang of the User. For this, go to  <a href=\"#api-Languages-getLangs\">Get the available languages</a>. We currently have 5 languages, but we will include more. The current languages are:</p> <ul> <li>English: en</li> <li>Spanish: es</li> <li>German: de</li> <li>Dutch: nl</li> <li>Portuguese: pt</li> </ul>"
          },
          {
            "group": "body",
            "type": "String",
            "optional": true,
            "field": "group",
            "description": "<p>Group to which the user belongs, if it does not have a group or do not know the group to which belongs, it will be 'None'. If the group is not set, it will be set to 'None' by default.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n  \"email\": \"example@ex.com\",\n  \"userName\": \"Peter\",\n  \"password\": \"f74f2603939a53656948480ce71f1ce46457b6654fd22c61c1f2ccd3e2c96d1cd02d162b560c4beaf1ae45f4574571dc5cbc1ce040701c0b5c38457988aa00fe97f\",\n  \"group\": \"None\",\n  \"lang\": \"en\"\n}",
          "type": "json"
        }
      ]
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Information about the request. One of the following answers will be obtained:</p> <ul> <li>Account created (The user should check the email to activate the account)</li> <li>Fail sending email</li> <li>user exists</li> </ul>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n \"message\": \"Account created\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "controllers/all/user.js",
    "groupTitle": "Account"
  },
  {
    "type": "post",
    "url": "https://storias.org/api/api/updatepass",
    "title": "Update password",
    "name": "updatePass",
    "version": "1.0.0",
    "group": "Account",
    "description": "<p>This method allows you to change the password of an account. Before changing the password, you previously had to make a <a href=\"#api-Account-recoverPass\">request for password change</a>.</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "var passwordsha512 = sha512(\"fjie76?vDh\");\nvar param = this.router.parseUrl(this.router.url).queryParams;\nvar formValue = { email: param.email, password: passwordsha512, randomCodeRecoverPass: param.key };\n this.http.post('https://storias.org/api/updatepass',formValue)\n  .subscribe( (res : any) => {\n    if(res.message == \"password changed\"){\n      console.log(\"Password changed successfully\");\n    }\n }, (err) => {\n   if(err.error.message == 'invalid link'){\n      ...\n    }else if(err.error.message == 'link expired'){\n      console.log('The link has expired after more than 15 minutes since you requested it. Re-request a password change.');\n    }else if(err.error.message == 'Error saving the pass'){\n      ...\n    }\n }",
        "type": "js"
      }
    ],
    "parameter": {
      "fields": {
        "body": [
          {
            "group": "body",
            "type": "String",
            "optional": false,
            "field": "email",
            "description": "<p>User email. In the link to request a change of password sent to the email, there is an email parameter. The value of this parameter will be the one to be assigned to email.</p>"
          },
          {
            "group": "body",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>User password using hash <a href=\"https://es.wikipedia.org/wiki/SHA-2\" target=\"_blank\">sha512</a></p>"
          },
          {
            "group": "body",
            "type": "String",
            "optional": false,
            "field": "randomCodeRecoverPass",
            "description": "<p>In the password change request link sent to the email, there is a key parameter. The value of this parameter will be the one that must be assigned to randomCodeRecoverPass.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n  \"email\": \"example@ex.com\",\n  \"password\": \"f74f2603939a53656948480ce71f1ce46457b6654fd22c61c1f2ccd3e2c96d1cd02d162b560c4beaf1ae45f4574571dc5cbc1ce040701c0b5c38457988aa00fe97f\",\n  \"randomCodeRecoverPass\": \"0.xkwta99hoy\"\n}",
          "type": "json"
        }
      ]
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Information about the request. If everything went correctly, return 'password changed'</p>"
          }
        ],
        "Eror 500": [
          {
            "group": "Eror 500",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>Information about the request. The credentials are incorrect or something has gone wrong. One of the following answers will be obtained:</p> <ul> <li>invalid link</li> <li>link expired (The link has expired after more than 15 minutes since you requested it. Re-request a password change.)</li> <li>Account is temporarily locked</li> <li>Error saving the pass</li> </ul>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n \"message\": \"password changed\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "controllers/all/user.js",
    "groupTitle": "Account"
  },
  {
    "type": "get",
    "url": "https://storias.org/api/langs/",
    "title": "Get languages",
    "name": "getLangs",
    "description": "<p>This method return the languages available in Storias. you get a list of languages, and for each one you have the name and the code. We currently have 5 languages, but we will include more. The current languages are:</p> <ul> <li>English: en</li> <li>Spanish: es</li> <li>German: de</li> <li>Dutch: nl</li> <li>Portuguese: pt</li> </ul>",
    "group": "Languages",
    "version": "1.0.0",
    "examples": [
      {
        "title": "Example usage:",
        "content": "this.http.get('https://storias.org/api/langs)\n .subscribe( (res : any) => {\n   console.log('languages: '+ res.listLangs);\n  }, (err) => {\n   ...\n  }",
        "type": "js"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n[\n  {\n    \"name\": \"English\",\n    \"code\": \"en\"\n  },\n  {\n    \"name\": \"Español,Castellano\",\n    \"code\": \"es\"\n  },\n  {\n    \"name\": \"Deutsch\",\n    \"code\": \"de\"\n  },\n  {\n    \"name\": \"Nederlands,Vlaams\",\n    \"code\": \"nl\"\n  },\n  {\n    \"name\": \"Português\",\n    \"code\": \"pt\"\n  }\n]",
          "type": "json"
        }
      ]
    },
    "filename": "controllers/all/lang.js",
    "groupTitle": "Languages"
  },
  {
    "type": "get",
    "url": "https://storias.org/api/users/:id",
    "title": "Get user",
    "name": "getUser",
    "version": "1.0.0",
    "group": "Users",
    "description": "<p>This methods read data of a User</p>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "this.http.get('https://storias.org/api/users/'+userId)\n .subscribe( (res : any) => {\n   console.log(res.userName);\n}, (err) => {\n  ...\n}",
        "type": "js"
      }
    ],
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "authorization",
            "description": "<p>Users unique access-key. For this, go to  <a href=\"#api-Access_token-signIn\">Get token</a></p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Header-Example:",
          "content": "{\n  \"authorization\": \"Bearer eyJ0eXAiOiJKV1QiLCJhbGciPgDIUzI1NiJ9.eyJzdWIiOiI1M2ZlYWQ3YjY1YjM0ZTQ0MGE4YzRhNmUyMzVhNDFjNjEyOThiMWZjYTZjMjXkZTUxMTA9OGVkN2NlODMxYWY3IiwiaWF0IjoxNTIwMzUzMDMwLCJlcHAiOjE1NTE4ODkwMzAsInJvbGUiOiJVc2VyIiwiZ3JvdDEiOiJEdWNoZW5uZSBQYXJlbnQgUHJfrmVjdCBOZXRoZXJsYW5kcyJ9.MloW8eeJ857FY7-vwxJaMDajFmmVStGDcnfHfGJx05k\"\n}",
          "type": "json"
        }
      ]
    },
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "userId",
            "description": "<p>User unique ID. More info here:  <a href=\"#api-Access_token-signIn\">Get token and userId</a></p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "email",
            "description": "<p>Email of the User.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "userName",
            "description": "<p>UserName of the User.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "lang",
            "description": "<p>lang of the User.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "group",
            "description": "<p>Group of the User.</p>"
          },
          {
            "group": "Success 200",
            "type": "Date",
            "optional": false,
            "field": "signupDate",
            "description": "<p>Signup date of the User.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\"user\":\n {\n  \"email\": \"John@example.com\",\n  \"userName\": \"Doe\",\n  \"lang\": \"en\",\n  \"group\": \"nameGroup\",\n  \"signupDate\": \"2018-01-26T13:25:31.077Z\"\n }\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "UserNotFound",
            "description": "<p>The <code>id</code> of the User was not found.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 404 Not Found\n    {\n      \"error\": \"UserNotFound\"\n    }",
          "type": "json"
        }
      ]
    },
    "filename": "controllers/all/user.js",
    "groupTitle": "Users"
  },
  {
    "type": "put",
    "url": "https://storias.org/api/users/:id",
    "title": "Update user",
    "name": "updateUser",
    "version": "1.0.0",
    "description": "<p>This method allows to change the user's data</p>",
    "group": "Users",
    "examples": [
      {
        "title": "Example usage:",
        "content": "this.http.put('https://storias.org/api/users/'+userId, this.user)\n .subscribe( (res : any) => {\n   console.log('User update: '+ res.user);\n  }, (err) => {\n   ...\n  }",
        "type": "js"
      }
    ],
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "authorization",
            "description": "<p>Users unique access-key. For this, go to  <a href=\"#api-Access_token-signIn\">Get token</a></p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Header-Example:",
          "content": "{\n  \"authorization\": \"Bearer eyJ0eXAiOiJKV1QiLCJhbGciPgDIUzI1NiJ9.eyJzdWIiOiI1M2ZlYWQ3YjY1YjM0ZTQ0MGE4YzRhNmUyMzVhNDFjNjEyOThiMWZjYTZjMjXkZTUxMTA9OGVkN2NlODMxYWY3IiwiaWF0IjoxNTIwMzUzMDMwLCJlcHAiOjE1NTE4ODkwMzAsInJvbGUiOiJVc2VyIiwiZ3JvdDEiOiJEdWNoZW5uZSBQYXJlbnQgUHJfrmVjdCBOZXRoZXJsYW5kcyJ9.MloW8eeJ857FY7-vwxJaMDajFmmVStGDcnfHfGJx05k\"\n}",
          "type": "json"
        }
      ]
    },
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "userId",
            "description": "<p>User unique ID. More info here:  <a href=\"#api-Access_token-signIn\">Get token and userId</a></p>"
          }
        ],
        "body": [
          {
            "group": "body",
            "type": "String",
            "optional": true,
            "field": "userName",
            "description": "<p>UserName of the User.</p>"
          },
          {
            "group": "body",
            "type": "String",
            "optional": true,
            "field": "lang",
            "description": "<p>lang of the User.</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "email",
            "description": "<p>Email of the User.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "userName",
            "description": "<p>UserName of the User.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "lang",
            "description": "<p>lang of the User.</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "group",
            "description": "<p>Group of the User.</p>"
          },
          {
            "group": "Success 200",
            "type": "Date",
            "optional": false,
            "field": "signupDate",
            "description": "<p>Signup date of the User.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\"user\":\n {\n  \"email\": \"John@example.com\",\n  \"userName\": \"Doe\",\n  \"lang\": \"en\",\n  \"group\": \"nameGroup\",\n  \"signupDate\": \"2018-01-26T13:25:31.077Z\"\n }\n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "UserNotFound",
            "description": "<p>The <code>id</code> of the User was not found.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 404 Not Found\n    {\n      \"error\": \"UserNotFound\"\n    }",
          "type": "json"
        }
      ]
    },
    "filename": "controllers/all/user.js",
    "groupTitle": "Users"
  }
] });
