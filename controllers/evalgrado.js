'use strict';

const { evaluateEvalGrado, normalizeFiles } = require('../services/evalgradoService');

const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'text/plain',
]);

function parseQuestionnaire(rawValue) {
  if (!rawValue) return {};
  if (typeof rawValue === 'object') return rawValue;
  try {
    return JSON.parse(rawValue);
  } catch (_error) {
    return {};
  }
}

function validateFiles(files) {
  if (!files.length) return 'No se han recibido archivos para analizar.';
  if (files.length > MAX_FILES) return `Maximo de ${MAX_FILES} archivos por analisis.`;
  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return `Formato no soportado: ${file.mimetype}.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `El archivo ${file.name} supera 20 MB.`;
    }
  }
  return null;
}

async function callEvalGrado(req, res) {
  try {
    const fileInput = req?.files?.files || req?.files?.file;
    const files = normalizeFiles(fileInput);
    const fileError = validateFiles(files);
    if (fileError) {
      return res.status(400).json({ success: false, error: fileError });
    }

    const questionnaire = parseQuestionnaire(req?.body?.questionnaire);
    const { analysis, extractedTextLength } = await evaluateEvalGrado(questionnaire, files);

    return res.status(200).json({
      success: true,
      extractedTextLength,
      evaluation: analysis,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error interno procesando la evaluacion EvalGrado+.',
      details: error?.message || 'unknown_error',
    });
  }
}

module.exports = {
  callEvalGrado,
};
