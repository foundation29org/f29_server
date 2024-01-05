const { Configuration, OpenAIApi } = require("openai");
const config = require('../config')
const configuration = new Configuration({
  apiKey: config.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

function callOpenAi (req, res){
  //comprobar créditos del usuario
  
  var jsonText = req.body.value;
  var isComplex = req.body.isComplexSearch;
  (async () => {
    try {
      let gptResponse;
      console.log("Is complex: " + isComplex)
      if (isComplex) {
        gptResponse = await openai.createChatCompletion({
          model: "gpt-4",
          messages: [{role: "user", content:jsonText}],
          temperature: 0,
          max_tokens: 1000,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        });
      } else {
        gptResponse = await openai.createChatCompletion({
          model: "gpt-4",
          messages: [{role: "user", content:jsonText}],
          //prompt: jsonText,
          temperature: 0,
          max_tokens: 400,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        });
      }
      res.status(200).send(gptResponse.data)
    }catch(e){
      if (e.response) {
        console.log(e.response.status);
        console.log(e.response.data);
      } else {
        console.log(e.message);
      }
      console.error("[ERROR]: " + e)

      res.status(500).send(e)
    }
    
  })();
}


module.exports = {
	callOpenAi
}
