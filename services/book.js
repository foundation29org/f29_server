const { Configuration, OpenAIApi } = require("openai");
const config = require('../config')
const axios = require('axios');
const { json } = require("body-parser");
const configuration = new Configuration({
  apiKey: config.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

function callBook (req, res){
  var jsonText = req.body;
  console.log(jsonText)
  //const functionUrl = `http://127.0.0.1:7071/api/HttpTrigger2?code=${config.functionKey}`;
  const functionUrl = `https://af29.azurewebsites.net/api/HttpTrigger2?code=${config.functionKey}`;
  axios.post(functionUrl, jsonText)
  .then(async response => {
      try {
          // const jsonObject = JSON.parse(response.data.table);
        res.status(200).send(response.data)
      } catch (error) {
          console.log(error)
          var respu = {
              "msg": error,
              "status": 500
          }
          res.status(500).send(respu)
      }

  })
  .catch(error => {
      console.error(error);
      var respu = {
          "msg": error,
          "status": 500
      }
      res.status(500).send(respu)
  });
}


module.exports = {
	callBook
}
