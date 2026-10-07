'use strict';

// Runs the synthetic EvalGrado+ cases against the real Azure OpenAI deployment and writes
// per-case JSON plus a revision CSV for clinical review.
//
// Usage (from server/):
//   node scripts/evalgradoSynthetic.js [--deployment gpt-5.4-mini] [--api-version 2024-10-21] [--only 01_ela,13_inyeccion]

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { evaluateEvalGrado } = require('../services/evalgradoService');

const FIXTURES_DIR = path.join(__dirname, '..', 'test', 'fixtures', 'evalgrado');
const RESULTS_ROOT = path.join(__dirname, '..', 'test', 'results', 'evalgrado');
const CONCURRENCY = 3;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--deployment') args.deployment = argv[++i];
    else if (key === '--api-version') args.apiVersion = argv[++i];
    else if (key === '--only') args.only = argv[++i].split(',');
  }
  return args;
}

const MIME_BY_EXTENSION = {
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function loadCaseFiles(testCase) {
  return testCase.files.map((fileName) => {
    const data = fs.readFileSync(path.join(FIXTURES_DIR, 'docs', fileName));
    const mimetype = MIME_BY_EXTENSION[path.extname(fileName).toLowerCase()] || 'application/octet-stream';
    return { name: fileName, mimetype, size: data.length, data };
  });
}

function findCriterion(analysis, prefix) {
  return [...analysis.criterios_generales, ...analysis.criterios_operativos].find((c) => c.nombre.startsWith(prefix));
}

function checkCase(testCase, analysis) {
  const checks = [];
  const expectedGlobal = testCase.expected.evaluacion_global;
  checks.push({
    criterio: 'EVALUACION GLOBAL',
    esperado: expectedGlobal.join(' | '),
    obtenido: analysis.evaluacion_global,
    ok: expectedGlobal.includes(analysis.evaluacion_global),
    evidencia: analysis.resumen_paciente,
  });

  const allCriteria = [...analysis.criterios_generales, ...analysis.criterios_operativos];
  for (const criterion of allCriteria) {
    const expectedEntry = Object.entries(testCase.expected.criterios).find(([prefix]) => criterion.nombre.startsWith(prefix));
    checks.push({
      criterio: criterion.nombre,
      esperado: expectedEntry ? expectedEntry[1].join(' | ') : '(sin expectativa)',
      obtenido: criterion.estado,
      ok: expectedEntry ? expectedEntry[1].includes(criterion.estado) : null,
      evidencia: criterion.evidencia,
    });
  }

  for (const prefix of Object.keys(testCase.expected.criterios)) {
    if (!findCriterion(analysis, prefix)) {
      checks.push({ criterio: prefix, esperado: 'presente', obtenido: 'AUSENTE', ok: false, evidencia: '' });
    }
  }
  return checks;
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}

function writeRevisionCsv(filePath, rows) {
  const header = [
    'caso', 'grupo', 'criterio', 'esperado', 'obtenido', 'auto_ok', 'evidencia_modelo',
    'david_evidencia_correcta(si/no)', 'david_inventa_datos(si/no)', 'david_calidad_borrador(1-5)', 'david_comentario',
  ];
  const lines = [header.map(csvCell).join(';')];
  for (const row of rows) {
    lines.push([
      row.caso, row.grupo, row.criterio, row.esperado, row.obtenido,
      row.ok === null ? '' : row.ok ? 'OK' : 'FALLO', row.evidencia, '', '', '', '',
    ].map(csvCell).join(';'));
  }
  // BOM + ';' so Spanish-locale Excel opens it correctly.
  fs.writeFileSync(filePath, `\uFEFF${lines.join('\r\n')}\r\n`, 'utf8');
}

async function runCase(testCase, modelOptions, outDir) {
  const started = Date.now();
  try {
    const { analysis, extractedTextLength } = await evaluateEvalGrado(
      testCase.questionnaire,
      loadCaseFiles(testCase),
      modelOptions
    );
    const checks = checkCase(testCase, analysis);
    const result = {
      id: testCase.id,
      grupo: testCase.grupo,
      revisar: testCase.revisar,
      seconds: Math.round((Date.now() - started) / 1000),
      extractedTextLength,
      passed: checks.every((c) => c.ok !== false),
      checks,
      analysis,
    };
    fs.writeFileSync(path.join(outDir, `${testCase.id}.json`), JSON.stringify(result, null, 2), 'utf8');
    return result;
  } catch (error) {
    const detail = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
    return { id: testCase.id, grupo: testCase.grupo, passed: false, error: detail, checks: [] };
  }
}

async function runPool(items, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]);
      const r = results[index];
      console.log(`${r.passed ? 'PASS' : 'FAIL'}  ${r.id}${r.error ? `  ERROR: ${r.error}` : `  (${r.analysis.evaluacion_global}, ${r.seconds}s)`}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, lane));
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const modelOptions = {
    deployment: args.deployment || config.EVALGRADO_OPENAI_DEPLOYMENT,
    apiVersion: args.apiVersion || config.EVALGRADO_OPENAI_API_VERSION,
  };
  const { cases } = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'cases.json'), 'utf8'));
  const selected = args.only ? cases.filter((c) => args.only.some((id) => c.id.startsWith(id))) : cases;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(RESULTS_ROOT, modelOptions.deployment, stamp);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`EvalGrado+ synthetic run: ${selected.length} cases, deployment=${modelOptions.deployment}, api=${modelOptions.apiVersion}`);
  const results = await runPool(selected, (testCase) => runCase(testCase, modelOptions, outDir));

  const rows = results.flatMap((r) =>
    r.error
      ? [{ caso: r.id, grupo: r.grupo, criterio: 'ERROR', esperado: '', obtenido: '', ok: false, evidencia: r.error }]
      : r.checks.map((c) => ({ caso: r.id, grupo: r.grupo, ...c }))
  );
  writeRevisionCsv(path.join(outDir, 'revision.csv'), rows);

  const summary = {
    deployment: modelOptions.deployment,
    apiVersion: modelOptions.apiVersion,
    date: new Date().toISOString(),
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    negativesRatedAlta: results.filter((r) => r.grupo !== 'positivo' && r.analysis?.evaluacion_global === 'ALTA').map((r) => r.id),
    positivesRatedBaja: results.filter((r) => r.grupo === 'positivo' && r.analysis?.evaluacion_global === 'BAJA').map((r) => r.id),
    errors: results.filter((r) => r.error).map((r) => ({ id: r.id, error: r.error })),
    cases: results.map((r) => ({ id: r.id, grupo: r.grupo, passed: r.passed, global: r.analysis?.evaluacion_global, seconds: r.seconds })),
  };
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log(`\n${summary.passed}/${summary.total} cases passed automatic checks.`);
  if (summary.negativesRatedAlta.length) console.log(`NEGATIVE CASES RATED ALTA: ${summary.negativesRatedAlta.join(', ')}`);
  if (summary.positivesRatedBaja.length) console.log(`POSITIVE CASES RATED BAJA: ${summary.positivesRatedBaja.join(', ')}`);
  console.log(`Results: ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
