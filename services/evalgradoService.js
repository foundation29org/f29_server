'use strict';

const axios = require('axios');
const config = require('../config');

const OPENAI_API_KEY = config.OPENAI_API_KEY2;
const OPENAI_API_VERSION = config.OPENAI_API_VERSION;
const OPENAI_API_BASE = config.OPENAI_API_BASE;
const FORM_RECOGNIZER_KEY = config.FORM_RECOGNIZER_KEY;
const FORM_RECOGNIZER_ENDPOINT = config.FORM_RECOGNIZER_ENDPOINT;

const MAX_TEXT_CHARS = 120000;
const VALID_STATES = new Set(['CUMPLIDO', 'PARCIAL', 'NO_CUMPLIDO', 'SIN_INFORMACION']);

const GENERAL_CANONICAL = [
  {
    nombre: 'Grado III reconocido (requisito previo)',
    matchers: [/grado\s*iii/i, /requisito\s*previo/i],
  },
  {
    nombre: 'Condicion irreversible con reduccion significativa de supervivencia',
    matchers: [/irrevers/i, /superviv/i],
  },
  {
    nombre: 'Sin respuesta significativa a tratamiento o sin alternativa eficaz',
    matchers: [/tratamiento/i, /alternativa/i, /respuesta/i],
  },
  {
    nombre: 'Necesidad de cuidados sociales y sanitarios complejos en domicilio',
    matchers: [/cuidados/i, /domic/i, /complej/i],
  },
  {
    nombre: 'Progresion rapida que justifica agilizacion administrativa',
    matchers: [/progres/i, /agiliz/i, /rapida/i],
  },
];

const OPERATIVE_CANONICAL = [
  {
    nombre: 'Deterioro funcional objetivo en menos de 6 meses con perdida de autonomia en dos o mas ABVD',
    matchers: [/deterior/i, /abvd/i, /6\s*mes/i, /autonom/i],
  },
  {
    nombre: 'Complicaciones graves recurrentes con dos o mas ingresos urgentes no planificados en 12 meses',
    matchers: [/ingres/i, /urgen/i, /12\s*mes/i, /complic/i],
  },
  {
    nombre: 'Necesidad de soporte vital o funcional permanente (ventilacion mecanica, nutricion artificial u otro soporte continuo)',
    matchers: [/soporte/i, /ventila/i, /nutric/i, /disfag/i],
  },
];

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
- NO cambies los nombres de criterios: usa exactamente los criterios canonicos listados.
- Requisito previo: "Grado III reconocido (requisito previo)".
- Para "Sin respuesta significativa a tratamiento o sin alternativa eficaz":
  - Si cuestionario indica tratamiento eficaz = "No", NUNCA pongas NO_CUMPLIDO por ese motivo.
  - Si cuestionario indica tratamiento eficaz = "Si", puede ser NO_CUMPLIDO.
- Para "Complicaciones graves recurrentes..." si cuestionario indica ingresos urgentes = "Si", no debe quedar NO_CUMPLIDO sin evidencia en contra.
- Para "Necesidad de soporte vital..." si cuestionario indica soporte respiratorio "Si..." o disfagia/nutricion "Si", no debe quedar NO_CUMPLIDO sin evidencia en contra.

CRITERIOS GENERALES CANONICOS:
1) Grado III reconocido (requisito previo)
2) Condicion irreversible con reduccion significativa de supervivencia
3) Sin respuesta significativa a tratamiento o sin alternativa eficaz
4) Necesidad de cuidados sociales y sanitarios complejos en domicilio
5) Progresion rapida que justifica agilizacion administrativa

CRITERIOS OPERATIVOS CANONICOS:
1) Deterioro funcional objetivo en menos de 6 meses con perdida de autonomia en dos o mas ABVD
2) Complicaciones graves recurrentes con dos o mas ingresos urgentes no planificados en 12 meses
3) Necesidad de soporte vital o funcional permanente (ventilacion mecanica, nutricion artificial u otro soporte continuo)

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

  const normalizedGeneral = normalizeCriteriaList(raw.criterios_generales, GENERAL_CANONICAL);
  const normalizedOperative = normalizeCriteriaList(raw.criterios_operativos, OPERATIVE_CANONICAL);
  const normalized = {
    evaluacion_global: ['ALTA', 'DUDOSA', 'BAJA'].includes(raw.evaluacion_global) ? raw.evaluacion_global : 'DUDOSA',
    resumen_paciente: String(raw.resumen_paciente || fallback.resumen_paciente),
    criterios_generales: normalizedGeneral,
    criterios_operativos: normalizedOperative,
    borrador_medico: String(raw.borrador_medico || fallback.borrador_medico),
    siguiente_paso: String(raw.siguiente_paso || fallback.siguiente_paso),
  };

  return normalized;
}

function sanitizeCriterion(item, fallbackName) {
  return {
    nombre: String(item?.nombre || fallbackName),
    estado: VALID_STATES.has(item?.estado) ? item.estado : 'SIN_INFORMACION',
    evidencia: String(item?.evidencia || 'Informacion insuficiente en documentos y cuestionario.'),
    recomendacion: String(item?.recomendacion || 'Aportar mas evidencia clinica actualizada.'),
  };
}

function normalizeCriteriaList(rawList, canonical) {
  const input = Array.isArray(rawList) ? rawList : [];
  return canonical.map((canon) => {
    const found = input.find((item) => {
      const name = String(item?.nombre || '');
      return canon.matchers.some((matcher) => matcher.test(name));
    });
    return sanitizeCriterion(found, canon.nombre);
  });
}

function setCriterionState(criteria, nameStart, nextState, evidence, recommendation) {
  const index = criteria.findIndex((item) => item.nombre.startsWith(nameStart));
  if (index === -1) return;
  criteria[index] = {
    ...criteria[index],
    estado: nextState,
    evidencia: evidence,
    recomendacion: recommendation || criteria[index].recomendacion,
  };
}

function applyQuestionnaireConsistencyRules(analysis, questionnaire) {
  const q = questionnaire || {};
  const general = analysis.criterios_generales || [];
  const operative = analysis.criterios_operativos || [];

  if (q.gradoIII === 'No') {
    setCriterionState(
      general,
      'Grado III reconocido',
      'NO_CUMPLIDO',
      "El cuestionario indica que no tiene reconocido el Grado III de gran dependencia.",
      'El Grado III es requisito previo para solicitar Grado III+.'
    );
    if (analysis.evaluacion_global === 'ALTA') {
      analysis.evaluacion_global = 'DUDOSA';
    }
  } else if (q.gradoIII === 'Si') {
    setCriterionState(
      general,
      'Grado III reconocido',
      'CUMPLIDO',
      "El cuestionario indica que si tiene reconocido el Grado III de gran dependencia.",
      'Mantener documentacion acreditativa del reconocimiento de Grado III.'
    );
  }

  if (q.tratamientoEficaz === 'No') {
    const idx = general.findIndex((item) => item.nombre.startsWith('Sin respuesta significativa'));
    if (idx !== -1 && general[idx].estado === 'NO_CUMPLIDO') {
      general[idx].estado = 'PARCIAL';
      general[idx].evidencia =
        "El cuestionario indica que no existe tratamiento eficaz; se requiere refuerzo documental clinico para confirmar el criterio completo.";
    }
  }

  if (q.ingresosUrgentes12m === 'Si') {
    const idx = operative.findIndex((item) => item.nombre.startsWith('Complicaciones graves recurrentes'));
    if (idx !== -1 && operative[idx].estado === 'NO_CUMPLIDO') {
      operative[idx].estado = 'PARCIAL';
      operative[idx].evidencia =
        'El cuestionario reporta dos o mas ingresos urgentes en 12 meses; falta detalle documental para confirmar todos los requisitos.';
    }
  }

  const hasSupport = (q.soporteRespiratorio || '').startsWith('Si') || q.disfagiaONutricion === 'Si';
  if (hasSupport) {
    const idx = operative.findIndex((item) => item.nombre.startsWith('Necesidad de soporte vital o funcional'));
    if (idx !== -1 && operative[idx].estado === 'NO_CUMPLIDO') {
      operative[idx].estado = 'PARCIAL';
      operative[idx].evidencia =
        'El cuestionario indica soporte respiratorio y/o disfagia/nutricion artificial; se requiere evidencia documental adicional para confirmar permanencia.';
    }
  }

  const hasRecentWorsening = (q.empeoramiento6m || '').startsWith('Si');
  const severeABVD = q.ayudaAbvd === 'Siempre' || q.ayudaAbvd === 'Casi siempre';
  if (hasRecentWorsening && severeABVD) {
    const idx = operative.findIndex((item) => item.nombre.startsWith('Deterioro funcional objetivo en menos de 6 meses'));
    if (idx !== -1 && operative[idx].estado === 'NO_CUMPLIDO') {
      operative[idx].estado = 'PARCIAL';
      operative[idx].evidencia =
        'El cuestionario refiere empeoramiento reciente y dependencia alta en ABVD; faltan datos objetivos con fechas para criterio completo.';
    }
  }

  analysis.criterios_generales = general;
  analysis.criterios_operativos = operative;
  return analysis;
}

function normalizeEvaluationWithQuestionnaire(raw, questionnaire) {
  const base = normalizeEvaluationShape(raw);
  return applyQuestionnaireConsistencyRules(base, questionnaire);
}

function buildNoDocumentsResponse(questionnaire) {
  const base = buildFallbackResponse();
  base.resumen_paciente =
    'No se pudo extraer texto suficiente de los documentos. Revisa formato/calidad y vuelve a intentarlo.';
  const normalized = normalizeEvaluationWithQuestionnaire(base, questionnaire);
  return {
    analysis: normalized,
    extractedTextLength: 0,
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
    return buildNoDocumentsResponse(questionnaire);
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
    analysis: normalizeEvaluationWithQuestionnaire(parsed, questionnaire),
    extractedTextLength: combined.length,
  };
}

module.exports = {
  evaluateEvalGrado,
  normalizeFiles,
};
