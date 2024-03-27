const config = require('../config')
const axios = require('axios');
const Question = require('../models/question')
const insights = require('../services/insights')

function callBook (req, res){
  var jsonText = req.body;
  //const functionUrl = `http://127.0.0.1:7071/api/HttpTrigger2?code=${config.functionKey}`;
  const functionUrl = `https://af29.azurewebsites.net/api/HttpTrigger2?code=${config.functionKey}`;
  axios.post(functionUrl, jsonText)
  .then(async response => {
      try {
          // const jsonObject = JSON.parse(response.data.table);
          let question = new Question()
          question.question = jsonText.question
          question.isComplexSearch = jsonText.isComplexSearch
          question.response = response.data
          question.save((err, questionStored) => {
            if(err){
              console.log(err)
              }
            })
        res.status(200).send(response.data)
      } catch (error) {
        insights.error(error);
          console.log(error)
          var respu = {
              "msg": 'error',
              "status": 500
          }
          res.status(500).send(respu)
      }

  })
  .catch(error => {
      console.error(error);
      insights.error(error);
      var respu = {
          "msg": 'error',
          "status": 500
      }
      res.status(500).send(respu)
  });
}


module.exports = {
	callBook
}
