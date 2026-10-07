'use strict';

// Checks that a Document Intelligence analyze result is gone after EvalGrado+ deletes it.
// Usage (from server/): node scripts/evalgradoCheckDiDeletion.js <image-or-pdf>

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../config');

async function main() {
  const filePath = process.argv[2];
  if (!filePath) throw new Error('Usage: node scripts/evalgradoCheckDiDeletion.js <file>');
  const contentType = path.extname(filePath).toLowerCase() === '.pdf' ? 'application/pdf' : 'image/png';
  const headers = { 'Ocp-Apim-Subscription-Key': config.FORM_RECOGNIZER_KEY };
  const url =
    `${config.FORM_RECOGNIZER_ENDPOINT}/documentintelligence/documentModels/prebuilt-layout:analyze` +
    '?_overload=analyzeDocument&api-version=2024-11-30&outputContentFormat=markdown';

  const analyzeRes = await axios.post(url, fs.readFileSync(filePath), { headers: { ...headers, 'Content-Type': contentType } });
  const operationLocation = analyzeRes.headers['operation-location'];

  let status = 'running';
  for (let i = 0; i < 60 && status !== 'succeeded' && status !== 'failed'; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    status = (await axios.get(operationLocation, { headers })).data.status;
  }
  console.log(`analysis status: ${status}`);

  const del = await axios.delete(operationLocation, { headers });
  console.log(`DELETE status: ${del.status}`);

  try {
    const after = await axios.get(operationLocation, { headers });
    console.log(`GET after delete: ${after.status} (result still available!)`);
    process.exit(1);
  } catch (error) {
    console.log(`GET after delete: ${error?.response?.status} (result no longer available)`);
  }
}

main().catch((error) => {
  console.error(error?.response?.data || error.message);
  process.exit(1);
});
