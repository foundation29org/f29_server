const axios = require('axios')
const config = require('../config')

async function callOpenAi(req, res) {
  const jsonText = req.body.value
  const isComplex = req.body.isComplexSearch
  try {
    const url = `https://${config.OPENAI_API_BASE}.openai.azure.com/openai/deployments/${config.BOOKS_OPENAI_DEPLOYMENT}/chat/completions?api-version=${config.BOOKS_OPENAI_API_VERSION}`
    const response = await axios.post(url, {
      messages: [{ role: 'user', content: jsonText }],
      temperature: 0,
      max_completion_tokens: isComplex ? 1000 : 400
    }, {
      headers: { 'Content-Type': 'application/json', 'api-key': config.OPENAI_API_KEY2 },
      timeout: 90000
    })
    res.status(200).send(response.data)
  } catch (e) {
    console.error('[ERROR]: ', e.response?.data || e.message)
    res.status(500).send('error')
  }
}

module.exports = {
  callOpenAi
}
