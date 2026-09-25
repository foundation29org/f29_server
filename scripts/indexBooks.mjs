// Builds the Azure AI Search index used by /api/callbook and /api/callguia.
// Usage (admin key is only needed here, the server uses a query key):
//   $env:AZURE_SEARCH_ADMIN_KEY = az search admin-key show -g nav29 --service-name nav29cogsearch --query primaryKey -o tsv
//   node scripts/indexBooks.mjs "<path to guia.pdf>" "<path to libro.pdf>"
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extractText, getDocumentProxy } from 'unpdf'

const require = createRequire(import.meta.url)
const config = require('../config')

const SEARCH = config.AZURE_SEARCH
const ADMIN_KEY = process.env.AZURE_SEARCH_ADMIN_KEY
const EMBEDDING_DIMENSIONS = 3072
const CHUNK_SIZE = 1800
const CHUNK_OVERLAP = 300
const SEARCH_API_VERSION = '2024-07-01'

const [guiaPath, libroPath] = process.argv.slice(2)
if (!ADMIN_KEY || !guiaPath || !libroPath) {
  console.error('Missing AZURE_SEARCH_ADMIN_KEY or PDF paths. See header of this file.')
  process.exit(1)
}

const BOOKS = [
  { book: 'guia', title: 'Guía de Signos y Síntomas de Sospecha de Enfermedades Raras', path: guiaPath },
  { book: 'libro', title: '¿Por qué mi hijo tiene una enfermedad rara?', path: libroPath }
]

async function searchRequest(method, urlPath, body) {
  const res = await fetch(`${SEARCH.ENDPOINT}${urlPath}${urlPath.includes('?') ? '&' : '?'}api-version=${SEARCH_API_VERSION}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'api-key': ADMIN_KEY },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok && res.status !== 404) throw new Error(`${method} ${urlPath}: ${res.status} ${await res.text()}`)
  return res.status === 204 || res.status === 404 ? null : res.json()
}

async function recreateIndex() {
  await searchRequest('DELETE', `/indexes/${SEARCH.INDEX_BOOKS}`)
  await searchRequest('PUT', `/indexes/${SEARCH.INDEX_BOOKS}`, {
    name: SEARCH.INDEX_BOOKS,
    fields: [
      { name: 'id', type: 'Edm.String', key: true, filterable: true },
      { name: 'book', type: 'Edm.String', filterable: true, facetable: true },
      { name: 'title', type: 'Edm.String', searchable: false, retrievable: true },
      { name: 'page', type: 'Edm.Int32', filterable: true, sortable: true },
      { name: 'content', type: 'Edm.String', searchable: true, analyzer: 'es.microsoft' },
      {
        name: 'contentVector',
        type: 'Collection(Edm.Single)',
        searchable: true,
        retrievable: false,
        dimensions: EMBEDDING_DIMENSIONS,
        vectorSearchProfile: 'default-profile'
      }
    ],
    vectorSearch: {
      algorithms: [{ name: 'default-hnsw', kind: 'hnsw', hnswParameters: { metric: 'cosine' } }],
      profiles: [{ name: 'default-profile', algorithm: 'default-hnsw' }]
    }
  })
}

function cleanText(text) {
  return text.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim()
}

function chunkPages(pages) {
  const chunks = []
  let current = ''
  let currentPage = 1

  for (let i = 0; i < pages.length; i++) {
    const pageText = cleanText(pages[i])
    if (!pageText) continue
    if (!current) currentPage = i + 1

    for (const line of pageText.split('\n')) {
      if (current.length + line.length > CHUNK_SIZE && current.length > CHUNK_OVERLAP) {
        chunks.push({ page: currentPage, content: current.trim() })
        current = current.slice(-CHUNK_OVERLAP)
        currentPage = i + 1
      }
      current += line + '\n'
    }
  }
  if (current.trim()) chunks.push({ page: currentPage, content: current.trim() })
  return chunks
}

async function embed(inputs) {
  const url = `https://${config.OPENAI_API_BASE}.openai.azure.com/openai/deployments/${config.AZURE_OPENAI_EMBEDDING_DEPLOYMENT}/embeddings?api-version=${config.BOOKS_OPENAI_API_VERSION}`
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': config.OPENAI_API_KEY2 },
      body: JSON.stringify({ input: inputs })
    })
    if (res.ok) return (await res.json()).data.map(d => d.embedding)
    if (res.status !== 429 || attempt >= 5) throw new Error(`Embeddings: ${res.status} ${await res.text()}`)
    await new Promise(r => setTimeout(r, attempt * 5000))
  }
}

async function indexBook({ book, title, path }) {
  const pdf = await getDocumentProxy(new Uint8Array(await readFile(path)))
  const { text } = await extractText(pdf, { mergePages: false })
  const chunks = chunkPages(text)
  console.log(`${book}: ${text.length} pages -> ${chunks.length} chunks`)

  const BATCH = 16
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH)
    const vectors = await embed(batch.map(c => c.content))
    await searchRequest('POST', `/indexes/${SEARCH.INDEX_BOOKS}/docs/index`, {
      value: batch.map((c, j) => ({
        '@search.action': 'mergeOrUpload',
        id: `${book}-${String(i + j).padStart(4, '0')}`,
        book,
        title,
        page: c.page,
        content: c.content,
        contentVector: vectors[j]
      }))
    })
    process.stdout.write(`  ${Math.min(i + BATCH, chunks.length)}/${chunks.length}\r`)
  }
  console.log()
}

await recreateIndex()
for (const b of BOOKS) await indexBook(b)
console.log('Done')
