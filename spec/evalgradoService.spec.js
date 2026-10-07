'use strict';

const { _internal } = require('../services/evalgradoService');

const {
  trimText,
  safeParseModelJson,
  normalizeEvaluationShape,
  normalizeEvaluationWithQuestionnaire,
  buildNoDocumentsResponse,
  GENERAL_CANONICAL,
  OPERATIVE_CANONICAL,
} = _internal;

function criterion(nombre, estado) {
  return { nombre, estado, evidencia: 'ev', recomendacion: 'rec' };
}

function modelOutput(overrides = {}) {
  return {
    evaluacion_global: 'ALTA',
    resumen_paciente: 'resumen',
    criterios_generales: GENERAL_CANONICAL.map((c) => criterion(c.nombre, 'CUMPLIDO')),
    criterios_operativos: OPERATIVE_CANONICAL.map((c) => criterion(c.nombre, 'NO_CUMPLIDO')),
    borrador_medico: 'borrador',
    siguiente_paso: 'paso',
    ...overrides,
  };
}

function findByPrefix(list, prefix) {
  return list.find((item) => item.nombre.startsWith(prefix));
}

describe('evalgradoService', () => {
  describe('safeParseModelJson', () => {
    it('parses plain JSON', () => {
      expect(safeParseModelJson('{"a":1}')).toEqual({ a: 1 });
    });

    it('extracts JSON wrapped in markdown fences or prose', () => {
      expect(safeParseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
      expect(safeParseModelJson('Aqui tienes: {"a":2} fin')).toEqual({ a: 2 });
    });

    it('returns null for invalid or empty content', () => {
      expect(safeParseModelJson('')).toBeNull();
      expect(safeParseModelJson('no json')).toBeNull();
      expect(safeParseModelJson('{roto')).toBeNull();
    });
  });

  describe('trimText', () => {
    it('removes NUL characters and trims', () => {
      expect(trimText('  hola\u0000 ')).toBe('hola');
    });

    it('caps very long texts', () => {
      expect(trimText('x'.repeat(200000)).length).toBe(120000);
    });
  });

  describe('normalizeEvaluationShape', () => {
    it('returns a DUDOSA fallback for non-object input', () => {
      const result = normalizeEvaluationShape(null);
      expect(result.evaluacion_global).toBe('DUDOSA');
      expect(result.criterios_generales).toEqual([]);
    });

    it('always returns the canonical criteria, in order', () => {
      const result = normalizeEvaluationShape(modelOutput({ criterios_generales: [], criterios_operativos: [] }));
      expect(result.criterios_generales.map((c) => c.nombre)).toEqual(GENERAL_CANONICAL.map((c) => c.nombre));
      expect(result.criterios_operativos.map((c) => c.nombre)).toEqual(OPERATIVE_CANONICAL.map((c) => c.nombre));
      result.criterios_generales.forEach((c) => expect(c.estado).toBe('SIN_INFORMACION'));
    });

    it('maps renamed criteria to canonical names via matchers', () => {
      const result = normalizeEvaluationShape(
        modelOutput({ criterios_generales: [criterion('Tiene Grado III', 'CUMPLIDO')] })
      );
      const grado = findByPrefix(result.criterios_generales, 'Grado III reconocido');
      expect(grado.estado).toBe('CUMPLIDO');
      expect(grado.nombre).toBe('Grado III reconocido (requisito previo)');
    });

    it('still applies questionnaire rules when the model renamed a criterion', () => {
      const raw = modelOutput({
        criterios_operativos: [criterion('Ingresos urgentes y complicaciones', 'NO_CUMPLIDO')],
      });
      const result = normalizeEvaluationWithQuestionnaire(raw, { ingresosUrgentes12m: 'Sí' });
      expect(findByPrefix(result.criterios_operativos, 'Complicaciones graves').estado).toBe('PARCIAL');
    });

    it('rejects unknown states and global values', () => {
      const result = normalizeEvaluationShape(
        modelOutput({
          evaluacion_global: 'SEGURO',
          criterios_generales: [criterion('Grado III reconocido (requisito previo)', 'QUIZAS')],
        })
      );
      expect(result.evaluacion_global).toBe('DUDOSA');
      expect(findByPrefix(result.criterios_generales, 'Grado III').estado).toBe('SIN_INFORMACION');
    });
  });

  describe('questionnaire consistency rules', () => {
    it('forces Grado III NO_CUMPLIDO and lowers ALTA to DUDOSA when gradoIII = No', () => {
      const result = normalizeEvaluationWithQuestionnaire(modelOutput(), { gradoIII: 'No' });
      expect(findByPrefix(result.criterios_generales, 'Grado III').estado).toBe('NO_CUMPLIDO');
      expect(result.evaluacion_global).toBe('DUDOSA');
    });

    it('marks Grado III CUMPLIDO when the form answer is "Sí" (accented, as sent by the UI)', () => {
      const raw = modelOutput({
        criterios_generales: [criterion('Grado III reconocido (requisito previo)', 'SIN_INFORMACION')],
      });
      const result = normalizeEvaluationWithQuestionnaire(raw, { gradoIII: 'Sí' });
      expect(findByPrefix(result.criterios_generales, 'Grado III').estado).toBe('CUMPLIDO');
    });

    it('also accepts "Si" without accent', () => {
      const raw = modelOutput({
        criterios_generales: [criterion('Grado III reconocido (requisito previo)', 'SIN_INFORMACION')],
      });
      const result = normalizeEvaluationWithQuestionnaire(raw, { gradoIII: 'Si' });
      expect(findByPrefix(result.criterios_generales, 'Grado III').estado).toBe('CUMPLIDO');
    });

    it('does not touch Grado III for "En tramitación" or "No lo sé"', () => {
      ['En tramitación', 'No lo sé'].forEach((answer) => {
        const raw = modelOutput({
          criterios_generales: [criterion('Grado III reconocido (requisito previo)', 'SIN_INFORMACION')],
        });
        const result = normalizeEvaluationWithQuestionnaire(raw, { gradoIII: answer });
        expect(findByPrefix(result.criterios_generales, 'Grado III').estado).toBe('SIN_INFORMACION');
      });
    });

    it('upgrades "sin respuesta a tratamiento" from NO_CUMPLIDO to PARCIAL when tratamientoEficaz = No', () => {
      const raw = modelOutput({
        criterios_generales: [
          criterion('Sin respuesta significativa a tratamiento o sin alternativa eficaz', 'NO_CUMPLIDO'),
        ],
      });
      const result = normalizeEvaluationWithQuestionnaire(raw, { tratamientoEficaz: 'No' });
      expect(findByPrefix(result.criterios_generales, 'Sin respuesta').estado).toBe('PARCIAL');
    });

    it('keeps "sin respuesta a tratamiento" NO_CUMPLIDO when tratamientoEficaz = Sí', () => {
      const raw = modelOutput({
        criterios_generales: [
          criterion('Sin respuesta significativa a tratamiento o sin alternativa eficaz', 'NO_CUMPLIDO'),
        ],
      });
      const result = normalizeEvaluationWithQuestionnaire(raw, { tratamientoEficaz: 'Sí' });
      expect(findByPrefix(result.criterios_generales, 'Sin respuesta').estado).toBe('NO_CUMPLIDO');
    });

    it('upgrades ingresos urgentes to PARCIAL when ingresosUrgentes12m = Sí', () => {
      const result = normalizeEvaluationWithQuestionnaire(modelOutput(), { ingresosUrgentes12m: 'Sí' });
      expect(findByPrefix(result.criterios_operativos, 'Complicaciones graves').estado).toBe('PARCIAL');
    });

    it('upgrades soporte vital to PARCIAL for "Sí, permanente" respiratory support', () => {
      const result = normalizeEvaluationWithQuestionnaire(modelOutput(), { soporteRespiratorio: 'Sí, permanente' });
      expect(findByPrefix(result.criterios_operativos, 'Necesidad de soporte').estado).toBe('PARCIAL');
    });

    it('upgrades soporte vital to PARCIAL when disfagiaONutricion = Sí', () => {
      const result = normalizeEvaluationWithQuestionnaire(modelOutput(), { disfagiaONutricion: 'Sí' });
      expect(findByPrefix(result.criterios_operativos, 'Necesidad de soporte').estado).toBe('PARCIAL');
    });

    it('upgrades deterioro funcional to PARCIAL with recent worsening and high ABVD dependency', () => {
      const result = normalizeEvaluationWithQuestionnaire(modelOutput(), {
        empeoramiento6m: 'Sí, significativo',
        ayudaAbvd: 'Casi siempre',
      });
      expect(findByPrefix(result.criterios_operativos, 'Deterioro funcional').estado).toBe('PARCIAL');
    });

    it('does not upgrade deterioro funcional with low ABVD dependency', () => {
      const result = normalizeEvaluationWithQuestionnaire(modelOutput(), {
        empeoramiento6m: 'Sí, significativo',
        ayudaAbvd: 'A veces',
      });
      expect(findByPrefix(result.criterios_operativos, 'Deterioro funcional').estado).toBe('NO_CUMPLIDO');
    });

    it('keeps the model evidence when upgrading to PARCIAL so document contradictions stay visible', () => {
      const raw = modelOutput({
        criterios_operativos: [
          {
            nombre: 'Necesidad de soporte vital o funcional permanente',
            estado: 'NO_CUMPLIDO',
            evidencia: 'Informe: respiratorio normal, sin disfagia.',
            recomendacion: 'rec',
          },
        ],
      });
      const result = normalizeEvaluationWithQuestionnaire(raw, { soporteRespiratorio: 'Sí, permanente' });
      const support = findByPrefix(result.criterios_operativos, 'Necesidad de soporte');
      expect(support.estado).toBe('PARCIAL');
      expect(support.evidencia).toContain('Informe: respiratorio normal, sin disfagia.');
    });

    it('never downgrades a CUMPLIDO criterion', () => {
      const raw = modelOutput({
        criterios_operativos: OPERATIVE_CANONICAL.map((c) => criterion(c.nombre, 'CUMPLIDO')),
      });
      const result = normalizeEvaluationWithQuestionnaire(raw, {
        ingresosUrgentes12m: 'Sí',
        soporteRespiratorio: 'Sí, permanente',
      });
      result.criterios_operativos.forEach((c) => expect(c.estado).toBe('CUMPLIDO'));
    });
  });

  describe('buildNoDocumentsResponse', () => {
    it('returns DUDOSA with zero extracted text and still applies questionnaire rules', () => {
      const { analysis, extractedTextLength } = buildNoDocumentsResponse({ gradoIII: 'No' });
      expect(extractedTextLength).toBe(0);
      expect(analysis.evaluacion_global).toBe('DUDOSA');
      expect(findByPrefix(analysis.criterios_generales, 'Grado III').estado).toBe('NO_CUMPLIDO');
    });
  });
});
