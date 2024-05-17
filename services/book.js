const config = require('../config')
const axios = require('axios');
const Question = require('../models/question')
const { OpenAI } = require("openai");
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY // This is also the default, can be omitted
});


function callBook2(req, res) {
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
          if (err) {
            console.log(err)
          }
        })
        res.status(200).send(response.data)
      } catch (error) {
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
      var respu = {
        "msg": 'error',
        "status": 500
      }
      res.status(500).send(respu)
    });
}

async function callBook(req, res) {
  try {
    var jsonText = req.body;

    let prompt = 'This is the question from the user: ' + jsonText.question + ' The user has chosen a complex search of the book. You must be very careful with the answer. Explain the answer in detail but make sure that is easy to understand. Do NEVER return the question as part of the answer. Also ALWAYS and ONLY use HTML tags and HTML formating to make the answer more readable and visually appealing. Do NOT include figure tags or figures in the answer as you have no access to the figures. Answer formatted as HTML inside a div for Angular app:';
    let messages = [
      {
        role: 'user',
        content: prompt,
      },
    ];
    if (!jsonText.isComplexSearch) {
      prompt = 'This is the question from the user: ' + jsonText.question + ' The user has chosen a simple search of the book. You can answer with a short answer. But make sure that is easy to understand. Do NEVER return the question as part of the answer. Also ALWAYS and ONLY use HTML tags and HTML formating to make the answer more readable and visually appealing. Do NEVER include figure tags or figures in the answer as you have no access to the figures. Answer formatted as HTML inside a div for Angular app:';
    }
    const thread = await openai.beta.threads.create({
      messages: messages,
    });

    let threadId = thread.id;
    console.log('Created thread with Id: ' + threadId);

    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: config.ASSISTANT_ID_BOOK,
      additional_instructions: '',
    });

    console.log('Run finished with status: ' + run.status);

    if (run.status == 'completed') {
      const messages = await openai.beta.threads.messages.list(thread.id);
      let response = messages.getPaginatedItems()[0].content[0].text.value;
      console.log(response)
      res.status(200).send({ data: response })
      for (const message of messages.getPaginatedItems()) {
        console.log(message);
      }
    } else {
      throw new Error("The run did not complete successfully.");
    }
  } catch (error) {
    console.error('Error occurred:', error);
    var respu = {
      "msg": 'error',
      "status": 500
    }
    res.status(500).send(respu)
    
  }
}

function callguia2(req, res) {
  var jsonText = req.body;
  const functionUrl = `http://127.0.0.1:7071/api/guia?code=${config.functionKey}`;
  //const functionUrl = `https://af29.azurewebsites.net/api/guia?code=${config.functionKey}`;
  axios.post(functionUrl, jsonText)
    .then(async response => {
      try {
        // const jsonObject = JSON.parse(response.data.table);
        let question = new Question()
        question.question = jsonText.question
        question.isComplexSearch = jsonText.isComplexSearch
        question.response = response.data
        question.save((err, questionStored) => {
          if (err) {
            console.log(err)
          }
        })
        res.status(200).send(response.data)
      } catch (error) {
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
      var respu = {
        "msg": 'error',
        "status": 500
      }
      res.status(500).send(respu)
    });
}

async function callguia(req, res) {
  try {
    var jsonText = req.body;

    let prompt = 'This is the question from the user: ' + jsonText.question + ' The user has chosen a complex search of the book. You must be very careful with the answer. Explain the answer in detail but make sure that is easy to understand. Do NEVER return the question as part of the answer. Also ALWAYS and ONLY use HTML tags and HTML formating to make the answer more readable and visually appealing. Answer formatted as HTML inside a div for Angular app:';
    let messages = [
      {
        role: 'user',
        content: prompt,
      },
    ];
    if (!jsonText.isComplexSearch) {
      prompt = 'This is the question from the user: ' + jsonText.question + ' The user has chosen a simple search of the book. You can answer with a short answer. But make sure that is easy to understand. Do NEVER return the question as part of the answer. Also ALWAYS and ONLY use HTML tags and HTML formating to make the answer more readable and visually appealing. Answer formatted as HTML inside a div for Angular app:';
    }
    const thread = await openai.beta.threads.create({
      messages: messages,
    });

    let threadId = thread.id;
    console.log('Created thread with Id: ' + threadId);

    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: config.ASSISTANT_ID_GUIA,
      additional_instructions: '',
    });

    console.log('Run finished with status: ' + run.status);

    if (run.status == 'completed') {
      const messages = await openai.beta.threads.messages.list(thread.id);
      let response = messages.getPaginatedItems()[0].content[0].text.value;
      console.log(response)
      res.status(200).send({ data: response })
      for (const message of messages.getPaginatedItems()) {
        console.log(message);
      }
    } else {
      throw new Error("The run did not complete successfully.");
    }
  } catch (error) {
    console.error('Error occurred:', error);
    var respu = {
      "msg": 'error',
      "status": 500
    }
    res.status(500).send(respu)
  }
}


module.exports = {
  callBook,
  callguia
}
