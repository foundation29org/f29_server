'use strict';

const axios = require('axios');
const config = require('../config');

const OPENAI_API_KEY = config.OPENAI_API_KEY2;
const OPENAI_API_VERSION = config.OPENAI_API_VERSION;
const OPENAI_API_BASE = config.OPENAI_API_BASE;
const FORM_RECOGNIZER_KEY = config.FORM_RECOGNIZER_KEY;
const FORM_RECOGNIZER_ENDPOINT = config.FORM_RECOGNIZER_ENDPOINT;

const MAX_TEXT_CHARS = 120000;

function normalizeFiles(filesLike) {
  if (!filesLike) return [];
  if (Array.isArray(filesLike)) return filesLike;
  return [filesLike];
}

function trimText(text) {
  if (!text) return '';
  const normalized = String(text).replace(/\u0000/g, '').trim();
  return normalized.length > MAX_TEXT_CHARS ? normalized.slice(0, MAX_TEXT_CHARS) : normalized;
}

async function extractWithDocumentIntelligence(buffer, contentType) {
  const modelId = 'prebuilt-layout';
  const apiVersion = '2023-10-31-preview';
  const analyzeUrl =
    `${FORM_RECOGNIZER_ENDPOINT}/documentintelligence/documentModels/${modelId}:analyze` +
    `?_overload=analyzeDocument&api-version=${apiVersion}&outputContentFormat=markdown`;

  const headers = {
    'Ocp-Apim-Subscription-Key': FORM_RECOGNIZER_KEY,
    'Content-Type': contentType || 'application/octet-stream',
  };

  const analyzeRes = await axios.post(analyzeUrl, buffer, {
    headers,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  const operationLocation = analyzeRes.headers['operation-location'];
  if (!operationLocation) {
    throw new Error('Document Intelligence did not return operation-location');
  }

  let result;
  let retries = 0;
  do {
    result = await axios.get(operationLocation, { headers: { 'Ocp-Apim-Subscription-Key': FORM_RECOGNIZER_KEY } });
    if (result.data.status === 'succeeded') break;
    if (result.data.status === 'failed') throw new Error('Document Intelligence analysis failed');
    retries += 1;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } while (retries < 90);

  if (!result?.data?.analyzeResult?.content) {
    return '';
  }

  return trimText(result.data.analyzeResult.content);
}

async function extractTextFromFile(file) {
  if (!file?.data || !file.mimetype) return '';
  if (file.mimetype === 'text/plain') {
    return trimText(file.data.toString('utf8'));
  }
  return extractWithDocumentIntelligence(file.data, file.mimetype);
}

function buildEvaluationPrompt(questionnaire, concatenatedText) {
  return `Eres un asistente experto en normativa espanola del Grado III+ de dependencia extrema.

Analiza la informacion y responde SOLO JSON valido con esta estructura exacta:
{
  "evaluacion_global": "ALTA|DUDOSA|BAJA",
  "resumen_paciente": "string",
  "criterios_generales": [{"nombre":"string","estado":"CUMPLIDO|PARCIAL|NO_CUMPLIDO|SIN_INFORMACION","evidencia":"string","recomendacion":"string"}],
  "criterios_operativos": [{"nombre":"string","estado":"CUMPLIDO|PARCIAL|NO_CUMPLIDO|SIN_INFORMACION","evidencia":"string","recomendacion":"string"}],
  "borrador_medico": "string",
  "siguiente_paso": "string"
}

REGLAS:
- Usa solo informacion explicita del cuestionario y documentos.
- Si falta evidencia, marca SIN_INFORMACION.
- En duda, prioriza DUDOSA.
- Nunca inventes datos.
- Escribe en espanol claro para paciente y borrador clinico profesional.

CUESTIONARIO:
${JSON.stringify(questionnaire, null, 2)}

DOCUMENTOS (texto extraido):
${concatenatedText}`;
}

function safeParseModelJson(content) {
  if (!content) return null;
  const cleaned = content.trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const sliced = cleaned.slice(start, end + 1);
      try {
        return JSON.parse(sliced);
      } catch (_err) {
        return null;
      }
    }
    return null;
  }
}

async function callAzureOpenAI(messages) {
  const endpoint = `https://${OPENAI_API_BASE}.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=${OPENAI_API_VERSION}`;
  const response = await axios.post(
    endpoint,
    {
      messages,
      model: 'gpt-4o',
      temperature: 0.2,
      top_p: 1,
      max_tokens: 2500,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      timeout: 120000,
    }
  );

  return response?.data?.choices?.[0]?.message?.content || '';
}

function buildFallbackResponse() {
  return {
    evaluacion_global: 'DUDOSA',
    resumen_paciente:
      'No se pudo estructurar automaticamente el analisis con la informacion disponible. Revisa el contenido y consulta con tu equipo medico.',
    criterios_generales: [],
    criterios_operativos: [],
    borrador_medico:
      'Borrador no disponible por falta de informacion estructurada suficiente. Se recomienda aportar informes medicos mas detallados y actualizados.',
    siguiente_paso:
      'Reune informes mas recientes con fechas, progresion funcional y necesidades de soporte vital para una nueva evaluacion orientativa.',
  };
}

function normalizeEvaluationShape(raw) {
  const fallback = buildFallbackResponse();
  if (!raw || typeof raw !== 'object') return fallback;
  return {
    evaluacion_global: ['ALTA', 'DUDOSA', 'BAJA'].includes(raw.evaluacion_global) ? raw.evaluacion_global : 'DUDOSA',
    resumen_paciente: String(raw.resumen_paciente || fallback.resumen_paciente),
    criterios_generales: Array.isArray(raw.criterios_generales) ? raw.criterios_generales : [],
    criterios_operativos: Array.isArray(raw.criterios_operativos) ? raw.criterios_operativos : [],
    borrador_medico: String(raw.borrador_medico || fallback.borrador_medico),
    siguiente_paso: String(raw.siguiente_paso || fallback.siguiente_paso),
  };
}

async function evaluateEvalGrado(questionnaire, filesLike) {
  const files = normalizeFiles(filesLike);
  const extractedTexts = [];

  for (const file of files) {
    const text = await extractTextFromFile(file);
    if (text) {
      extractedTexts.push(`=== Archivo: ${file.name || 'sin_nombre'} ===\n${text}`);
    }
  }

  const combined = trimText(extractedTexts.join('\n\n'));
  if (!combined || combined.length < 30) {
    return {
      analysis: buildFallbackResponse(),
      extractedTextLength: combined.length || 0,
    };
  }

  const userPrompt = buildEvaluationPrompt(questionnaire || {}, combined);
  const content = await callAzureOpenAI([
    {
      role: 'system',
      content: 'Responde siempre con JSON valido sin texto adicional.',
    },
    {
      role: 'user',
      content: userPrompt,
    },
  ]);

  const parsed = safeParseModelJson(content);
  return {
    analysis: normalizeEvaluationShape(parsed),
    extractedTextLength: combined.length,
  };
}

module.exports = {
  evaluateEvalGrado,
  normalizeFiles,
};
