'use strict';

// Builds a self-contained Markdown review document for the clinical reviewer from the latest
// synthetic run of a deployment.
// Usage (from server/): node scripts/evalgradoReviewDoc.js [--deployment gpt-5.4-mini] [--out ../docs/evalgrado/REVISION_DAVID.md]  (relative to scripts/)

const fs = require('fs');
const path = require('path');
const config = require('../config');

const FIXTURES_DIR = path.join(__dirname, '..', 'test', 'fixtures', 'evalgrado');
const RESULTS_ROOT = path.join(__dirname, '..', 'test', 'results', 'evalgrado');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function cell(text) {
  return String(text || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function latestRunDir(deployment) {
  const base = path.join(RESULTS_ROOT, deployment);
  const runs = fs.readdirSync(base).filter((d) => fs.existsSync(path.join(base, d, 'summary.json'))).sort();
  if (!runs.length) throw new Error(`No runs found for ${deployment}`);
  return { dir: path.join(base, runs[runs.length - 1]), name: runs[runs.length - 1] };
}

function main() {
  const deployment = arg('--deployment', config.EVALGRADO_OPENAI_DEPLOYMENT);
  const out = path.resolve(__dirname, arg('--out', '../docs/evalgrado/REVISION_DAVID.md'));
  const { cases } = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'cases.json'), 'utf8'));
  const run = latestRunDir(deployment);

  const lines = [];
  lines.push('# EvalGrado+ — Revisión clínica de casos sintéticos', '');
  lines.push(`Modelo: \`${deployment}\` (Data Zone Standard EU) · Ejecución: \`${run.name}\``, '');
  lines.push('## Qué hay que hacer', '');
  lines.push(
    'Todos los informes son **ficticios**. Para cada caso se muestra lo que recibe la herramienta (cuestionario + informe) y lo que devuelve. Se pide:',
    '',
    '1. **Resultado global**: ¿es clínicamente razonable (ALTA / DUDOSA / BAJA)?',
    '2. **Evidencia**: ¿cada evidencia citada está realmente en el informe? ¿Hay algún dato inventado? (el fallo más grave)',
    '3. **Borrador médico**: puntúa 1-5 (¿lo firmarías tras revisarlo?).',
    '4. **Tono**: ¿lenguaje adecuado y respetuoso?',
    '',
    'Marca las casillas y escribe comentarios directamente en este documento (o en la columna `david_*` de `revision.csv`).',
    ''
  );
  lines.push('### Definición de la evaluación global que usa el prompt (validar)', '');
  lines.push(
    '- **ALTA**: Grado III reconocido, criterios generales cumplidos o casi todos, y al menos un criterio operativo CUMPLIDO con evidencia en los documentos.',
    '- **BAJA**: los documentos describen situación estable o sin criterios operativos, y sin progresión documentada.',
    '- **DUDOSA**: el resto (información insuficiente o contradictoria, Grado III no reconocido).',
    ''
  );
  lines.push('### Preguntas generales', '');
  lines.push(
    '- [ ] ¿Todos los positivos deben salir ALTA? Huntington (evolución de años) y Duchenne (progresión lenta, tratamiento parcialmente eficaz) salen ALTA.',
    '- [ ] ¿Encajan fibrosis pulmonar (oxígeno 24 h) y cáncer terminal en el Grado III+, o tienen otra vía?',
    '- [ ] ¿Es correcta la definición de ALTA / DUDOSA / BAJA anterior?',
    '- [ ] "En tramitación" o "No lo sé" en Grado III no bajan hoy un ALTA a DUDOSA (solo "No"). ¿Debería?',
    '- [ ] ¿Faltan patologías parecidas a ELA que convenga probar?',
    ''
  );

  lines.push('## Resumen', '', '| Caso | Grupo | Esperado | Obtenido | Auto |', '|---|---|---|---|---|');
  const results = {};
  for (const c of cases) {
    const file = path.join(run.dir, `${c.id}.json`);
    if (!fs.existsSync(file)) continue;
    results[c.id] = JSON.parse(fs.readFileSync(file, 'utf8'));
    const r = results[c.id];
    lines.push(`| ${c.id} | ${c.grupo} | ${c.expected.evaluacion_global.join(' / ')} | **${r.analysis.evaluacion_global}** | ${r.passed ? 'OK' : 'FALLO'} |`);
  }
  lines.push('');

  for (const c of cases) {
    const r = results[c.id];
    if (!r) continue;
    lines.push('---', '', `## Caso ${c.id}`, '', `**Grupo:** ${c.grupo}  `, `**Descripción:** ${c.descripcion}  `, `**Qué mirar:** ${c.revisar}`, '');
    lines.push('### Cuestionario', '', '| Pregunta | Respuesta |', '|---|---|');
    for (const [k, v] of Object.entries(c.questionnaire)) lines.push(`| ${k} | ${cell(v)} |`);
    lines.push('');

    lines.push('### Informe (entrada)', '');
    for (const f of c.files) {
      if (f.endsWith('.txt')) {
        lines.push('```text', fs.readFileSync(path.join(FIXTURES_DIR, 'docs', f), 'utf8').trim(), '```', '');
      } else {
        lines.push(`Imagen escaneada: \`server/test/fixtures/evalgrado/docs/${f}\` (mismo contenido que el caso 03).`, '');
      }
    }

    lines.push(`### Resultado de la herramienta: **${r.analysis.evaluacion_global}**`, '', `> ${cell(r.analysis.resumen_paciente)}`, '');
    lines.push('| Criterio | Esperado | Obtenido | Evidencia citada |', '|---|---|---|---|');
    for (const chk of r.checks.filter((x) => x.criterio !== 'EVALUACION GLOBAL')) {
      const mark = chk.ok === false ? ' ⚠' : '';
      lines.push(`| ${cell(chk.criterio)} | ${cell(chk.esperado)} | ${cell(chk.obtenido)}${mark} | ${cell(chk.evidencia)} |`);
    }
    lines.push('', `**Siguiente paso sugerido:** ${cell(r.analysis.siguiente_paso)}`, '');
    lines.push('<details><summary>Borrador médico generado</summary>', '', r.analysis.borrador_medico, '', '</details>', '');

    lines.push(
      '### Revisión',
      '',
      '- [ ] Resultado global razonable',
      '- [ ] Evidencias correctas, sin datos inventados',
      '- [ ] Tono adecuado',
      '- Calidad del borrador (1-5): ',
      '- Comentarios: ',
      ''
    );
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, lines.join('\n'), 'utf8');
  console.log(`Written ${out} (${Object.keys(results).length} cases, run ${run.name})`);
}

main();
