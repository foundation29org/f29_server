const axios = require('axios')
const config = require('../config')

const AZURE_OPENAI_BASE_URL = `https://${config.OPENAI_API_BASE}.openai.azure.com/openai/deployments`
const SEARCH = config.AZURE_SEARCH
const TOP_CHUNKS = 8

const BOOK_TITLES = {
  libro: '¿Por qué mi hijo tiene una enfermedad rara?',
  guia: 'Guía de Signos y Síntomas de Sospecha de Enfermedades Raras (Junta de Extremadura)'
}

async function embedQuestion(question) {
  const url = `${AZURE_OPENAI_BASE_URL}/${config.AZURE_OPENAI_EMBEDDING_DEPLOYMENT}/embeddings?api-version=${config.BOOKS_OPENAI_API_VERSION}`
  const response = await axios.post(url, { input: question }, {
    headers: { 'Content-Type': 'application/json', 'api-key': config.OPENAI_API_KEY2 },
    timeout: 30000
  })
  return response.data.data[0].embedding
}

async function searchBook(book, question) {
  const vector = await embedQuestion(question)
  const url = `${SEARCH.ENDPOINT}/indexes/${SEARCH.INDEX_BOOKS}/docs/search?api-version=2024-07-01`
  const response = await axios.post(url, {
    search: question,
    filter: `book eq '${book}'`,
    top: TOP_CHUNKS,
    select: 'content,page',
    vectorQueries: [{ kind: 'vector', vector, fields: 'contentVector', k: TOP_CHUNKS }]
  }, {
    headers: { 'Content-Type': 'application/json', 'api-key': SEARCH.KEY },
    timeout: 30000
  })
  return response.data.value
}

function buildMessages(book, question, chunks, lang, isComplexSearch) {
  const language = lang === 'es' ? 'Spanish' : 'English'
  const noAnswer = lang === 'es' ? 'No sé' : "I don't know"
  const detail = isComplexSearch
    ? 'The user has chosen a complex search. Explain the answer in detail but make sure it is easy to understand.'
    : 'The user has chosen a simple search. You can give a short answer, but make sure it is easy to understand.'
  const context = chunks.map(c => `[Page ${c.page}]\n${c.content}`).join('\n\n---\n\n')

  return [
    {
      role: 'system',
      content: `You answer questions about the book "${BOOK_TITLES[book]}" using ONLY the excerpts provided. ` +
        `If the excerpts do not contain the answer, reply exactly "${noAnswer}" and nothing else. ` +
        `${detail} Do NEVER repeat the question in the answer. ` +
        `ALWAYS and ONLY use HTML tags and HTML formatting to make the answer readable and visually appealing, inside a single <div> for an Angular app (no markdown, no code fences). ` +
        `When useful, mention the page numbers you relied on. Answer in ${language}.`
    },
    {
      role: 'user',
      content: `Book excerpts:\n\n${context}\n\nQuestion from the user: ${question}`
    }
  ]
}

async function askBook(book, req, res) {
  try {
    const { question, lang, isComplexSearch } = req.body
    if (typeof question !== 'string' || !question.trim()) {
      return res.status(400).send({ msg: 'question is required', status: 400 })
    }

    const chunks = await searchBook(book, question)
    const url = `${AZURE_OPENAI_BASE_URL}/${config.BOOKS_OPENAI_DEPLOYMENT}/chat/completions?api-version=${config.BOOKS_OPENAI_API_VERSION}`
    const response = await axios.post(url, {
      messages: buildMessages(book, question, chunks, lang, isComplexSearch),
      temperature: 0.2,
      max_completion_tokens: isComplexSearch ? 2500 : 1200
    }, {
      headers: { 'Content-Type': 'application/json', 'api-key': config.OPENAI_API_KEY2 },
      timeout: 90000
    })

    const answer = response.data?.choices?.[0]?.message?.content?.trim() || ''
    res.status(200).send({ data: answer })
  } catch (error) {
    console.error(`Error occurred in ${book}:`, error.response?.data || error.message)
    res.status(500).send({ msg: 'error', status: 500 })
  }
}

function callBook(req, res) {
  return askBook('libro', req, res)
}

function callguia(req, res) {
  return askBook('guia', req, res)
}

module.exports = {
  callBook,
  callguia
}
