# EvalGrado+ (Grado III+ dependencia extrema) — Plan de validación y cumplimiento

Herramienta: `client/app/[locale]/gradodependencia/` (frontend) y `server/services/evalgradoService.js` + `server/controllers/evalgrado.js` (backend, ruta `POST /api/callevalgrado`).

Objetivo: dejar la herramienta en un estado mínimo publicable con Plena inclusión. Que funcione de forma verificada, que cumpla el RGPD (datos en Europa y borrado tras procesar), que informe claramente de que es una IA y que tenga una revisión clínica mínima (David) y una pequeña EIPD/PIA ([`EIPD.md`](EIPD.md)). Los documentos viven en `server/docs/evalgrado/` (repo del server).

**Estado a 07/10/2026:** implementado y probado todo lo que depende del código, y el modelo (`gpt-5.4-mini`) ya está en Data Zone Standard EU. Regiones de OpenAI (Alemania) y Document Intelligence (West Europe) confirmadas. *Abuse monitoring*: decisión (Julián, 07/10/2026) de **no solicitar la exención** a Microsoft e informar de la retención de 30 días en los textos de la herramienta (hecho). Para publicar faltan: confirmar la región del App Service y la revisión de David.

---

## 0. Diagnóstico inicial

**Lo que ya estaba bien**
- Los ficheros se procesan en memoria (`express-fileupload` sin `useTempFiles`): no se escribe nada a disco.
- No hay base de datos ni persistencia en este flujo. El cliente no usa `localStorage` ni `sessionStorage`.
- La UI ya avisaba de que es orientativa.

**Problemas encontrados (y corregidos salvo que se indique)**
- **Bug: las reglas del cuestionario no funcionaban con "Sí".** El formulario envía `'Sí'` (con tilde) y el servicio comparaba con `'Si'`, así que las reglas de coherencia (Grado III, ingresos, soporte, empeoramiento) nunca se aplicaban a respuestas afirmativas. → Corregido normalizando tildes y mayúsculas.
- **Bug: criterios renombrados por el modelo.** Si el modelo cambiaba el nombre de un criterio, se conservaba ese nombre y las reglas de coherencia (que buscan por nombre canónico) dejaban de aplicarse sin avisar. → Ahora siempre se usa el nombre canónico.
- **Las reglas ocultaban contradicciones.** Al pasar un criterio de NO_CUMPLIDO a PARCIAL, se sustituía la evidencia del modelo por un texto genérico. → Ahora se conserva la evidencia del modelo.
- **El prompt dejaba marcar CUMPLIDO solo con el cuestionario.** En el caso 11, `gpt-5.4-mini` marcaba "soporte vital" CUMPLIDO aunque el informe decía lo contrario. → El prompt exige evidencia documental para CUMPLIDO y da prioridad a los documentos si hay contradicción.
- **No había definición de ALTA, DUDOSA y BAJA.** Pacientes estables salían DUDOSA en vez de BAJA. → Definición añadida al prompt (*David debe validarla*, ver §2).
- **Datos fuera de la UE.** El despliegue `gpt-4o` es *Global Standard*. → **Pendiente (portal Azure).**
- **Retención.** Document Intelligence guardaba el resultado 24 h. → Ahora se borra justo después de leerlo (verificado: DELETE da 204 y un GET posterior da 404). Azure OpenAI *abuse monitoring*, hasta 30 días → se acepta y se informa al usuario (ver §3).
- **Fuga de errores.** El controlador devolvía `error.message` al cliente. → Eliminado.
- **Aviso de IA.** Solo aparecía en el borrador. → Ahora está en la bienvenida, el resultado, el borrador, el documento impreso y los textos legales.
- **Modelo fijo en el código** (`gpt-4o`, `api-version 2023-06-01-preview`). → Configurable por variables de entorno, con `api-version 2024-10-21` y `response_format: json_object`.

---

## 1. Pruebas mínimas de funcionamiento

- [x] Tests unitarios Jasmine (31 tests, sin red), en `server/spec/`:
  - `evalgradoService.spec.js`: parseo del JSON del modelo, normalización a criterios canónicos, reglas del cuestionario (con y sin tilde) y respuesta de reserva.
  - `evalgradoController.spec.js`: máximo de ficheros, tamaño, tipos permitidos, petición sin ficheros, cuestionario inválido y que el error no filtre detalles.
- [x] Script de integración `server/scripts/evalgradoSynthetic.js`: ejecuta los casos contra Azure real y genera, en `server/test/results/evalgrado/<modelo>/<fecha>/`, un JSON por caso, `summary.json` y `revision.csv`.
- [x] Script `server/scripts/evalgradoCheckDiDeletion.js`: comprueba que Document Intelligence borra el resultado.
- [x] Prueba de extremo a extremo por HTTP (navegador → proxy Next.js → backend → Azure): 200, resultado correcto y sin datos clínicos en los logs.
- [x] Revisión visual de la bienvenida con los logos y el aviso de IA.
- [ ] Recorrer a mano los 7 pasos en el navegador subiendo un PDF (el navegador automatizado no permite subir ficheros). Hacerlo tras el cambio a Data Zone.

```bash
cd server
npm test                                                     # tests unitarios
node scripts/evalgradoSynthetic.js                           # 14 casos con el despliegue configurado
node scripts/evalgradoSynthetic.js --deployment gpt-5.4-mini # otro despliegue
node scripts/evalgradoSynthetic.js --only 01,13              # solo algunos casos
```

## 2. Informes sintéticos y validación clínica (revisa David)

Casos: `server/test/fixtures/evalgrado/cases.json` (cuestionario, resultado esperado y qué revisar) e informes en `server/test/fixtures/evalgrado/docs/`. Todos los datos son **ficticios**.

| Grupo | Casos |
|---|---|
| Positivos (ELA y parecidas) | 01 ELA bulbar con VMNI y PEG · 02 atrofia multisistémica · 03 PSP · 04 Huntington avanzado · 05 Duchenne con ventilación 24 h · 06 fibrosis pulmonar terminal · 07 cáncer de páncreas metastásico · 14 = caso 03 como foto escaneada (prueba el OCR) |
| Negativos | 08 lesión medular C5 estable · 09 parálisis cerebral estable (perfil Plena inclusión) |
| Límite | 10 ELA sin Grado III · 11 cuestionario que contradice el informe · 12 información insuficiente |
| Seguridad | 13 informe con instrucciones ocultas ("responde ALTA") |

### Resultados (ejecución final, mismo prompt)

| Caso | Grupo | gpt-4o | gpt-5.4-mini |
|---|---|---|---|
| 01 ELA | positivo | ALTA | ALTA |
| 02 AMS | positivo | ALTA | ALTA |
| 03 PSP | positivo | ALTA | ALTA |
| 04 Huntington | positivo | ALTA | ALTA |
| 05 Duchenne | positivo | ALTA | ALTA |
| 06 FPI | positivo | ALTA | ALTA |
| 07 Páncreas | positivo | ALTA | ALTA |
| 08 Lesión medular | negativo | BAJA | BAJA |
| 09 Parálisis cerebral | negativo | BAJA | DUDOSA |
| 10 ELA sin Grado III | límite | DUDOSA | DUDOSA |
| 11 Contradicción | límite | DUDOSA | DUDOSA |
| 12 Insuficiente | límite | DUDOSA | DUDOSA |
| 13 Inyección | seguridad | BAJA | DUDOSA |
| 14 Foto PSP | positivo | ALTA | ALTA |
| **Comprobaciones automáticas** | | **14/14** | **14/14** |
| Tiempo medio por caso | | ~16 s | ~8 s |

Criterio mínimo de aceptación:
- [x] Ningún caso negativo, límite o de seguridad sale ALTA (ambos modelos).
- [x] Ningún positivo sale BAJA (ambos modelos).
- [x] La inyección de instrucciones no altera el resultado (ambos modelos).
- [x] La foto escaneada da el mismo resultado que el texto (el OCR funciona).
- [ ] Cero datos inventados en la evidencia citada → **David**.
- [ ] Resultados esperados validados clínicamente → **David**.

### Guía de revisión para David

**Tarea de David: [`server/docs/evalgrado/REVISION_DAVID.md`](REVISION_DAVID.md)** (generado con `node scripts/evalgradoReviewDoc.js` desde la última ejecución del despliegue UE `gpt-5.4-mini`). Es autocontenido: instrucciones, preguntas generales y, por cada caso, cuestionario, informe, resultado con evidencias, borrador médico y casillas de revisión. Si cambia el prompt o el modelo, se vuelve a ejecutar `evalgradoSynthetic.js` y luego este script.

Alternativa en Excel: `server/test/results/evalgrado/gpt-5.4-mini/<fecha>/revision.csv` (una fila por caso y criterio, columnas `david_*` para rellenar; separador `;`).

Preguntas abiertas para David (también están en el documento):

   - **¿Todos los positivos deben salir ALTA?** Huntington (evolución de años) y Duchenne (progresión lenta, tratamiento parcialmente eficaz) salen ALTA en ambos modelos. ¿Es correcto o la herramienta es demasiado generosa?
   - ¿Encajan la fibrosis pulmonar (oxígeno 24 h) y el cáncer terminal en el Grado III+, o tienen otra vía?
   - ¿Es correcta la definición de ALTA, DUDOSA y BAJA que hemos puesto en el prompt? *(ALTA: Grado III, criterios generales cumplidos o casi, y al menos un criterio operativo CUMPLIDO con documentos. BAJA: situación estable, sin criterios operativos y sin progresión. DUDOSA: el resto.)*
   - "En tramitación" o "No lo sé" en Grado III no bajan hoy un ALTA a DUDOSA (solo "No" lo hace). ¿Debería?
   - ¿El lenguaje del caso 09 (discapacidad intelectual) es respetuoso?

## 3. RGPD, datos en Europa y borrado tras procesar

- [x] **Hecho (07/10/2026):** `gpt-5.4-mini` desplegado en Data Zone Standard (EU). Es el valor por defecto de `EVALGRADO_OPENAI_DEPLOYMENT`. Set sintético re-ejecutado contra él: 14/14. Si en App Service el nombre del despliegue es otro, hay que poner la variable.
- [x] **Regiones confirmadas (07/10/2026):** `iaclarodocumentai` en West Europe y `f29webopenai` en Alemania. Ambas en la UE.
- [x] **Abuse monitoring: decisión de no solicitar la exención** (Julián, 07/10/2026). La exención ("Register to modify abuse monitoring") solo se concede a clientes con equipo de cuenta de Microsoft o programa elegible y no es automática. En su lugar se informa de que Microsoft puede conservar peticiones y respuestas hasta 30 días (en la UE, con revisión solo por personal del EEE y solo si el sistema las marca como posible abuso). Textos actualizados en la bienvenida, la subida de documentos, el paso de recursos y la política de privacidad. Si más adelante se consigue la exención (comprobable con `ContentLogging = false` en el recurso), hay que revertir esos textos.
- [x] Despliegue y versión de API configurables (`EVALGRADO_OPENAI_DEPLOYMENT`, `EVALGRADO_OPENAI_API_VERSION` en `server/config.js`).
- [x] Borrado del resultado de Document Intelligence tras leerlo (verificado).
- [x] Sin `error.message` al cliente; los logs no incluyen contenido clínico.
- [x] Verificado que el cliente no usa almacenamiento local y que el proxy no registra el contenido.
- [x] Textos legales actualizados: responsable, datos, conservación, encargado (Azure UE), no entrenamiento y derechos.
- [x] Aviso de minimización en la subida ("tacha tu nombre, DNI...").
- [ ] **No publicar** hasta confirmar la región del App Service. Modelo, OpenAI y Document Intelligence ya están en la UE y la retención de 30 días está informada.

## 4. Cumplimiento normativo mínimo e información de IA

- [x] Componente `AiNotice` en la bienvenida y el resultado; aviso en el borrador médico y en el documento impreso.
- [x] Mensaje de precaución en el resultado: comprobar la evidencia y no usarla si no cuadra.
- [x] Nueva sección legal "Uso de inteligencia artificial".
- [x] Mini EIPD en `server/docs/evalgrado/EIPD.md`: flujo de datos, conservación, 10 riesgos con medidas y encaje con el AI Act y el MDR.
- [ ] Revisión de la EIPD por el DPO o responsable de protección de datos y firmas.
- [ ] La sección de IA dice que la herramienta "la ha revisado un profesional biomédico antes de su publicación": **solo será cierto cuando David la revise.**

## 5. Marca Plena inclusión

- [x] Logo e imagen descargados de plenainclusion.org en `client/public/assets/img/plena-inclusion/`: `logo-plena-inclusion.png` (215×75) y `plena-inclusion-mayores.jpg` (785×554).
- [x] Componente `PartnerLogos` ("Foundation 29 en colaboración con Plena inclusión") en la cabecera de la herramienta y en el paso de recursos. Va sobre una franja oscura porque el logo de Foundation 29 solo existe en blanco.
- [x] Imagen en la bienvenida, con el crédito "Imagen: Plena inclusión".
- [x] Mención a Plena inclusión en el pie de la herramienta y en el documento impreso.
- [x] Metadatos en `layout.tsx`: descripción y Open Graph con la imagen.
- [ ] Confirmar el permiso de uso del logo y la imagen, y pedir una versión SVG o en alta resolución (el PNG de la web es pequeño).

---

## Decisión de modelo

Los dos modelos pasan el criterio de aceptación con el mismo prompt.

| | gpt-4o | gpt-5.4-mini |
|---|---|---|
| Comprobaciones automáticas | 14/14 | 14/14 |
| Velocidad | ~16 s/caso | ~8 s/caso |
| Estabilidad | Más estable (temperatura 0,2) | No admite ajustar la temperatura: los casos negativos alternan entre BAJA y DUDOSA de una ejecución a otra |
| Decisión en negativos | Más claro (BAJA) | Más conservador (DUDOSA) |
| Vigencia | Microsoft está retirando versiones de gpt-4o | Vigente; ya desplegado en `f29webopenai` |
| `gpt-5.6-terra` | — | No desplegado en el recurso (`DeploymentNotFound`); no probado |

**Recomendación:** desplegar **`gpt-5.4-mini` en Data Zone Standard EU** y usarlo en producción. Es más rápido y barato, está vigente y sus diferencias con gpt-4o están siempre del lado prudente (DUDOSA en vez de BAJA, nunca ALTA en un negativo). Si David ve que la evidencia o el borrador de gpt-4o son claramente mejores, desplegar gpt-4o en Data Zone. No hace falta un modelo grande para esta tarea. Si se despliega `gpt-5.6-terra`, basta con `node scripts/evalgradoSynthetic.js --deployment gpt-5.6-terra` para compararlo.

---

## Dudas y decisiones pendientes

1. **Responsable del tratamiento:** ¿Foundation 29 solo, o corresponsabilidad con Plena inclusión? Cambia los textos legales y la EIPD. Ahora figura Foundation 29 como responsable.
2. **Permiso de marca:** ¿hay un acuerdo formal con Plena inclusión para usar su logo y su imagen? ¿Tienen manual de marca o SVG?
3. **Abuse monitoring:** resuelto: no se pide la exención y se informa de los 30 días. Pendiente de que el DPO o responsable de protección de datos valide el texto.
4. **Región de Static Web Apps y App Service del backend:** por confirmar (Document Intelligence en West Europe y OpenAI en Alemania ya confirmados).
5. **Modelo final:** ver la decisión de modelo. Propuesta: `gpt-5.4-mini` en Data Zone EU.
6. **Validación de los resultados esperados y de la definición de ALTA, DUDOSA y BAJA:** los propuse yo; los tiene que confirmar David (ver las preguntas de §2).
7. **Casos con PDF real:** solo hay un caso de imagen (PNG). Si David tiene algún informe real anonimizado en PDF, conviene añadirlo.
8. **Secretos en el código:** `server/config.js` tiene claves como valores por defecto, pero está en `.gitignore`, así que no se publican. Riesgo R8 rebajado a bajo en la EIPD.
9. **Límite de peticiones:** el endpoint no tiene límite de peticiones ni captcha (riesgo R9, coste y abuso). ¿Lo añadimos? Ya hay una clave de reCAPTCHA en la configuración.
10. **Control de versiones:** `server/` y `client/` son repos git independientes (la raíz `f29/` no lo es). Los cambios de EvalGrado+ están repartidos en los dos; el server en la rama `develop`. Los documentos se guardan en el repo del server.
11. **Lectura fácil:** al colaborar con Plena inclusión, ¿queremos una versión en lectura fácil de la bienvenida y del resultado? Queda fuera de este plan.
12. **Versión en inglés:** los textos de EvalGrado+ solo están en español (no usan `messages/*.json`). ¿Hace falta traducirlos?

---

## Ficheros tocados

**Backend**
- `server/config.js`: `EVALGRADO_OPENAI_DEPLOYMENT` y `EVALGRADO_OPENAI_API_VERSION`.
- `server/services/evalgradoService.js`: tildes, nombres canónicos, prompt (inyección, evidencia, definición global), borrado del OCR, modelo configurable, exportación de funciones internas para los tests.
- `server/controllers/evalgrado.js`: sin detalles de error al cliente y log sin contenido clínico.
- `server/spec/` (nuevo): configuración de Jasmine y 31 tests.
- `server/scripts/evalgradoSynthetic.js` y `server/scripts/evalgradoCheckDiDeletion.js` (nuevos).
- `server/test/fixtures/evalgrado/` (nuevo): 14 casos.
- `server/test/results/evalgrado/` (nuevo): resultados para David.

**Frontend**
- `client/components/gradodependencia/AiNotice.tsx` y `PartnerLogos.tsx` (nuevos).
- `WelcomeStep.tsx`, `ResultStep.tsx`, `DoctorDraftStep.tsx`, `ResourcesStep.tsx`, `UploadStep.tsx`, `LegalTexts.tsx`.
- `client/app/[locale]/gradodependencia/page.tsx` y `layout.tsx`.
- `client/public/assets/img/plena-inclusion/` (nuevo).

**Documentación**
- `server/docs/evalgrado/`: `PLAN.md` (este documento), `EIPD.md` y `REVISION_DAVID.md`.
