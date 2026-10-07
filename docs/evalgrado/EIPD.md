# EvalGrado+ — Evaluación de Impacto en Protección de Datos (EIPD / PIA) simplificada

| | |
|---|---|
| Tratamiento | EvalGrado+: orientación sobre la solicitud del Grado III+ de dependencia extrema |
| Responsable | Fundación 29 de Febrero (Foundation 29) — *pendiente confirmar si hay corresponsabilidad con Plena inclusión* |
| Versión | 0.1 (borrador) — 07/10/2026 |
| Estado | Pendiente de revisión por DPO / responsable de protección de datos |

---

## 1. Por qué hace falta una EIPD

El art. 35 RGPD y la lista de la AEPD exigen EIPD cuando se cumplen dos o más criterios de riesgo. EvalGrado+ cumple tres:
1. **Categorías especiales de datos**: datos de salud (informes médicos, diagnósticos, situación funcional).
2. **Interesados vulnerables**: personas con gran dependencia, enfermedades graves o discapacidad, y sus familias.
3. **Uso de tecnologías innovadoras**: análisis automatizado con un modelo de inteligencia artificial.

## 2. Descripción del tratamiento

**Finalidad.** Ayudar a una persona (o a su familiar o cuidador) a entender si su situación podría cumplir los criterios del Grado III+ y generar un borrador de informe para que lo revise y firme su médico. Es una herramienta **orientativa**: no toma decisiones, no diagnostica y no tiene efectos administrativos.

**Interesados.** Pacientes con Grado III (o en trámite) y personas que rellenan por ellos (familiares, cuidadores, profesionales).

**Datos tratados.**
- Cuestionario de 10 preguntas: estado del Grado III, diagnóstico principal, dependencia en ABVD, soporte respiratorio y nutricional, evolución, ingresos y tratamiento.
- Documentos médicos subidos por el usuario (PDF, imagen o texto). Pueden incluir datos identificativos (nombre, NHC, DNI) que la herramienta no necesita.

**Base jurídica.** Consentimiento explícito (art. 6.1.a y 9.2.a RGPD), recogido con la casilla obligatoria de la pantalla de bienvenida.

**Decisiones automatizadas (art. 22 RGPD).** No aplica: el resultado no produce efectos jurídicos ni afecta significativamente al interesado. La decisión la toma la administración competente y el informe lo firma un médico.

## 3. Flujo de datos y conservación

```
Navegador del usuario
   │  (HTTPS, multipart: ficheros + cuestionario)
   ▼
Next.js (Azure Static Web Apps) — proxy /api/*  ··· no registra el contenido, solo lo reenvía
   │
   ▼
Backend Node/Express (Azure App Service) — /api/callevalgrado
   │  ficheros en memoria (express-fileupload sin ficheros temporales)
   ├──► Azure AI Document Intelligence (recurso iaclarodocumentai) — OCR de PDF/imagen
   │       el resultado se BORRA explícitamente tras leerlo (DELETE analyzeResults)
   └──► Azure OpenAI (recurso f29webopenai, despliegue Data Zone Standard UE)
           prompt = cuestionario + texto extraído; respuesta JSON
   │
   ▼
Navegador: el resultado se guarda solo en memoria (estado React). Al cerrar la página se pierde.
```

| Componente | ¿Qué guarda? | ¿Cuánto tiempo? | Verificado |
|---|---|---|---|
| Navegador | Estado de la sesión en memoria | Hasta cerrar o recargar la página | Sí: no usa `localStorage`, `sessionStorage` ni cookies propias en este flujo |
| Proxy Next.js | Nada (solo reenvía) | — | Sí: revisión de código |
| Backend | Buffers en memoria durante la petición | Mientras dura la petición (~10-40 s) | Sí: sin disco, sin BD; los logs de error no incluyen el contenido |
| Document Intelligence | Resultado del análisis | Se borra al terminar (por defecto serían 24 h) | Sí: prueba DELETE → 204 y GET posterior → 404 |
| Azure OpenAI | Prompts y respuestas para *abuse monitoring* | **Hasta 30 días** salvo exención aprobada | **Pendiente**: solicitar o confirmar *modified abuse monitoring* |
| Azure OpenAI | Uso para entrenamiento | Nunca (condiciones de Azure OpenAI) | Condiciones contractuales de Microsoft |

**Ubicación.** El modelo (`gpt-5.4-mini`) está desplegado en *Data Zone Standard (EU)* desde el 07/10/2026 (antes `gpt-4o` era *Global Standard*). Regiones confirmadas el 07/10/2026: Document Intelligence (`iaclarodocumentai`) en West Europe y Azure OpenAI (`f29webopenai`) en Alemania. **Pendiente** confirmar la región del backend (App Service) y del proxy (Static Web Apps).

**Encargado del tratamiento.** Microsoft Ireland Operations Ltd. (Azure), mediante el DPA de Microsoft Products and Services.

## 4. Necesidad y proporcionalidad

- El cuestionario se limita a lo necesario para los criterios del Grado III+.
- Los documentos son necesarios para basar la orientación en evidencia clínica y no solo en lo que declara el usuario.
- **Minimización**: los documentos suelen traer nombre, DNI o NHC, que no hacen falta. En el paso de subida se recomienda al usuario tachar esos datos antes de subirlos; la herramienta funciona igual sin ellos (probado con informes con iniciales ficticias).
- No hay conservación ni perfiles, ni reutilización para otra finalidad.

## 5. Riesgos y medidas

| # | Riesgo | Prob. | Impacto | Medidas aplicadas | Riesgo residual |
|---|---|---|---|---|---|
| R1 | Datos de salud procesados fuera de la UE | Baja | Alto | Modelo en Data Zone Standard EU, OpenAI en Alemania y Document Intelligence en West Europe; **pendiente** confirmar región de App Service y Static Web Apps | Bajo |
| R2 | Conservación de datos por el proveedor (OCR 24 h, abuse monitoring 30 días) | Media | Alto | Borrado explícito del OCR (verificado); exención de abuse monitoring **pendiente** | Medio hasta tener la exención |
| R3 | Fuga por logs o mensajes de error | Baja | Alto | Los logs no incluyen contenido; el error al cliente no expone detalles internos | Bajo |
| R4 | La IA se equivoca o inventa datos y el usuario toma decisiones con ello | Media | Medio | Avisos de IA en bienvenida, resultado, borrador e impreso; la evidencia debe citarse; prompt con "nunca inventes" y "el cuestionario no basta para CUMPLIDO"; revisión clínica con 14 casos sintéticos | Medio-bajo (depende de la revisión de David) |
| R5 | Manipulación del resultado con instrucciones ocultas en un documento (*prompt injection*) | Baja | Medio | Instrucción explícita de ignorar órdenes dentro de documentos; caso de prueba 13 superado en ambos modelos | Bajo |
| R6 | Falsa expectativa: el usuario entiende el resultado como una resolución | Media | Medio | Textos de "orientativo, sin validez legal" en todos los pasos | Bajo |
| R7 | Subida de documentos de terceros sin legitimación | Baja | Medio | Términos de uso lo prohíben; consentimiento explícito | Bajo |
| R8 | Claves de Azure en `server/config.js` | Baja | Alto | El fichero está en `.gitignore`, no se publica | Bajo |
| R9 | Abuso del endpoint (coste, uso automatizado) | Media | Bajo | API key añadida por el proxy (no protege frente a uso a través de la web). **Recomendado**: límite de peticiones o reCAPTCHA | Medio |
| R10 | Sesgo o lenguaje inadecuado hacia personas con discapacidad intelectual | Baja | Medio | Caso 09 (parálisis cerebral) incluido para revisar el lenguaje; colaboración con Plena inclusión | Bajo (por validar) |

## 6. Encaje normativo de la IA y de producto sanitario

- **AI Act (Reglamento UE 2024/1689).**
  - Art. 50 (transparencia, aplicable desde 02/08/2026): hay que informar de que se interactúa con un sistema de IA y de que el contenido está generado por IA. **Cumplido** con avisos en bienvenida, resultado, borrador médico y documento impreso.
  - No se considera **alto riesgo** (anexo III, punto 5.a): ese supuesto cubre los sistemas que usan las autoridades públicas para evaluar el derecho a prestaciones. EvalGrado+ lo usa el propio ciudadano, solo para orientarse, y no decide nada.
  - Alfabetización en IA (art. 4): el equipo que mantiene la herramienta debe conocer sus límites.
- **Producto sanitario (Reglamento UE 2017/745, MDR).** La finalidad declarada es orientación administrativa, no diagnóstico, pronóstico ni tratamiento, por lo que no se considera producto sanitario. Esto se mantiene **mientras** la herramienta no haga afirmaciones diagnósticas. Debe revisarse si cambian la finalidad o los textos.

## 7. Conclusión

El tratamiento es **aceptable** cuando se completen las medidas pendientes que bloquean la publicación:
1. Confirmar la región de App Service y Static Web Apps (R1). El modelo, OpenAI y Document Intelligence ya están en la UE.
2. Conseguir la exención de *abuse monitoring* o, si no, informar en la política de privacidad de la conservación de hasta 30 días (R2).
3. Que David valide los resultados de los casos sintéticos (R4).

Recomendado, aunque no bloqueante: limitar las peticiones (R9).

## 8. Aprobación

| Rol | Nombre | Fecha | Firma |
|---|---|---|---|
| Responsable técnico | | | |
| Revisión clínica | David | | |
| DPO / protección de datos | | | |
