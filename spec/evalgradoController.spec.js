'use strict';

const evalgradoService = require('../services/evalgradoService');
const { callEvalGrado } = require('../controllers/evalgrado');

function mockRes() {
  const res = {};
  res.status = jasmine.createSpy('status').and.callFake((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jasmine.createSpy('json').and.callFake((body) => {
    res.body = body;
    return res;
  });
  return res;
}

function file(overrides = {}) {
  return { name: 'informe.pdf', mimetype: 'application/pdf', size: 1024, data: Buffer.from('x'), ...overrides };
}

describe('evalgrado controller', () => {
  beforeEach(() => {
    spyOn(console, 'error');
  });

  it('rejects requests without files', async () => {
    const res = mockRes();
    await callEvalGrado({ files: null, body: {} }, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBeFalse();
  });

  it('rejects more than 10 files', async () => {
    const res = mockRes();
    const files = Array.from({ length: 11 }, () => file());
    await callEvalGrado({ files: { files }, body: {} }, res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects unsupported mime types', async () => {
    const res = mockRes();
    await callEvalGrado({ files: { files: file({ mimetype: 'application/zip' }) }, body: {} }, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('application/zip');
  });

  it('rejects files over 20 MB', async () => {
    const res = mockRes();
    await callEvalGrado({ files: { files: file({ size: 21 * 1024 * 1024 }) }, body: {} }, res);
    expect(res.statusCode).toBe(400);
  });

  it('passes the parsed questionnaire to the service and returns the evaluation', async () => {
    const analysis = { evaluacion_global: 'ALTA' };
    spyOn(evalgradoService, 'evaluateEvalGrado').and.resolveTo({ analysis, extractedTextLength: 500 });
    const res = mockRes();
    await callEvalGrado(
      { files: { files: file() }, body: { questionnaire: JSON.stringify({ gradoIII: 'Sí' }) } },
      res
    );
    expect(evalgradoService.evaluateEvalGrado).toHaveBeenCalledWith({ gradoIII: 'Sí' }, jasmine.any(Array));
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, extractedTextLength: 500, evaluation: analysis });
  });

  it('tolerates an invalid questionnaire payload', async () => {
    spyOn(evalgradoService, 'evaluateEvalGrado').and.resolveTo({ analysis: {}, extractedTextLength: 0 });
    const res = mockRes();
    await callEvalGrado({ files: { files: file() }, body: { questionnaire: '{roto' } }, res);
    expect(evalgradoService.evaluateEvalGrado).toHaveBeenCalledWith({}, jasmine.any(Array));
  });

  it('does not leak internal error details to the client', async () => {
    spyOn(evalgradoService, 'evaluateEvalGrado').and.rejectWith(new Error('secret upstream detail'));
    const res = mockRes();
    await callEvalGrado({ files: { files: file() }, body: {} }, res);
    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secret upstream detail');
  });
});
