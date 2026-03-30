# Documento de Especificación de Diseño de Software (SDD)

## **EvalGrado+ — Asistente de Evaluación del Grado III+ de Dependencia Extrema**

**Versión:** 1.0  
**Fecha:** 29 de marzo de 2026  
**Autor:** Fundación 29 de Febrero  
**Estado:** Borrador para revisión  
**Clasificación:** Documento interno — uso restringido

---

## 1. Introducción y contexto

### 1.1 Propósito del documento

Este documento define las especificaciones funcionales, técnicas, de contenido y de cumplimiento normativo de **EvalGrado+**, una aplicación web diseñada para ayudar a familias y pacientes con enfermedades de alta complejidad y curso irreversible a entender si podrían solicitar el reconocimiento del **Grado III+ de dependencia extrema**, creado por el Real Decreto-ley 11/2025 en desarrollo de la Ley 3/2024 (conocida como "Ley ELA").

### 1.2 Problema que resuelve

La Ley ELA (Ley 3/2024, de 30 de octubre) y su desarrollo reglamentario (RDL 11/2025 y RD 969/2025) crearon un nuevo grado de dependencia extrema — el **Grado III+** — que da acceso a prestaciones de hasta 9.859 euros mensuales para atención domiciliaria 24 horas. Sin embargo, el marco normativo presenta varios desafíos para las familias:

- Los criterios de elegibilidad no se basan en un listado cerrado de enfermedades, sino en criterios clínicos y funcionales acumulativos que requieren interpretación médica especializada.
- El proceso exige un informe médico detallado que acredite el cumplimiento de al menos dos de los tres criterios operativos, lo que resulta complejo tanto para las familias como para los profesionales sanitarios que no están familiarizados con la norma.
- La variabilidad entre comunidades autónomas en la implementación genera confusión adicional.
- Los plazos legales son estrictos (3 meses para resolución) pero la enfermedad puede progresar rápidamente.

### 1.3 Solución propuesta

EvalGrado+ es una aplicación web que:

1. **Informa** al usuario en lenguaje accesible sobre qué es el Grado III+, quién puede solicitarlo y cómo funciona el proceso.
2. **Permite subir informes médicos** (PDF, imágenes) para su análisis automatizado mediante inteligencia artificial.
3. **Evalúa automáticamente** si el paciente podría cumplir los criterios para solicitar la revisión del grado, emitiendo una recomendación de probabilidad: **ALTA — DUDOSA — BAJA**.
4. **Genera un borrador de texto clínico** que el médico responsable puede usar como base para su informe, adaptado a los requisitos del cuestionario de verificación del Anexo II del RD 969/2025.
5. **No almacena ningún dato** del paciente: todo el procesamiento se realiza en sesión y se destruye al cerrar.

### 1.4 Marco normativo de referencia

| Norma | Contenido relevante |
|-------|-------------------|
| Ley 3/2024, de 30 de octubre | Ley ELA — Marco general, ámbito de aplicación, criterios del artículo 2 |
| RDL 11/2025, de 21 de octubre | Creación del Grado III+ de dependencia extrema, modificación de la Ley 39/2006 |
| RD 969/2025, de 28 de octubre | Criterios generales y operativos, Anexo I (listado indicativo), Anexo II (cuestionario de verificación), Anexo III (modelo de solicitud) |
| RD 174/2011, de 11 de febrero | Baremo de Valoración de la Dependencia (BVD) |
| Ley 39/2006, de 14 de diciembre | Ley de Dependencia — Sistema SAAD |
| RGPD (Reglamento UE 2016/679) | Protección de datos personales — datos de salud como categoría especial |
| LOPDGDD (LO 3/2018) | Adaptación española del RGPD |

---

## 2. Arquitectura general

### 2.1 Principios de diseño

- **Privacidad por diseño y por defecto** (Privacy by Design, art. 25 RGPD): ningún dato se almacena en servidor. Todo el procesamiento se realiza en sesión efímera.
- **Accesibilidad universal** (WCAG 2.1 AA): la aplicación debe ser usable por personas con discapacidad.
- **Procesamiento dentro de la UE**: todos los servidores de IA y procesamiento de documentos estarán ubicados en centros de datos dentro del Espacio Económico Europeo.
- **Lenguaje claro**: toda la interfaz y contenido informativo utilizará lenguaje llano, evitando jerga jurídica o médica innecesaria.

### 2.2 Diagrama de flujo de alto nivel

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  PÁGINA DE      │────▶│  INFORMACIÓN     │────▶│  CUESTIONARIO    │
│  BIENVENIDA     │     │  SOBRE GRADO III+│     │  INICIAL         │
│  + Aceptación   │     │  (Sección        │     │  (Preguntas      │
│    de términos  │     │   educativa)     │     │   orientativas)  │
└─────────────────┘     └──────────────────┘     └──────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  TEXTO PARA     │◀────│  RESULTADO DE    │◀────│  SUBIDA DE       │
│  EL MÉDICO      │     │  EVALUACIÓN      │     │  INFORMES        │
│  (Borrador      │     │  (Alta/Dudosa/   │     │  MÉDICOS         │
│   generado)     │     │   Baja)          │     │  + Análisis IA   │
└─────────────────┘     └──────────────────┘     └──────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │  RECURSOS Y      │
                        │  SIGUIENTES      │
                        │  PASOS           │
                        └──────────────────┘
```

### 2.3 Stack tecnológico

| Componente | Tecnología | Justificación |
|-----------|-----------|---------------|
| Frontend | React + TypeScript | SPA con procesamiento en cliente |
| Estilado | Tailwind CSS | Diseño responsivo, accesible |
| Backend de sesión | Node.js / Edge Functions | Procesamiento efímero sin persistencia |
| IA / LLM | API Claude (Anthropic) vía servidores UE | Análisis de documentos y generación de texto |
| OCR | Tesseract.js (cliente) o servicio UE | Extracción de texto de imágenes de informes |
| Hosting | Servidores en la UE (AWS eu-west-1 / eu-central-1 o equivalente) | Cumplimiento territorial RGPD |
| CDN | Cloudflare (nodos UE) | Rendimiento y seguridad |
| Cifrado | TLS 1.3 en tránsito, cifrado AES-256 en procesamiento temporal | Protección de datos sensibles |

### 2.4 Arquitectura de datos — Principio de "cero almacenamiento"

```
NAVEGADOR DEL USUARIO
├── Archivos subidos → buffer temporal en memoria del navegador
├── Texto extraído → variable en sesión JS
├── Resultado de evaluación → renderizado en pantalla
└── Texto para el médico → descargable como PDF/DOCX
         │
         ▼ (API call cifrada TLS 1.3)
SERVIDOR DE PROCESAMIENTO (UE)
├── Recibe texto extraído (nunca el archivo original si es posible)
├── Procesa mediante LLM en servidores UE
├── Devuelve resultado estructurado
├── Elimina todo dato de la sesión al completar la respuesta
└── No hay base de datos, no hay logs con datos de paciente
```

---

## 3. Especificación funcional detallada

### 3.1 Pantalla 1 — Bienvenida y aceptación de términos

**Propósito:** Informar al usuario del propósito de la herramienta y obtener consentimiento informado antes de cualquier procesamiento.

**Elementos de la interfaz:**

- Logotipo de la organización
- Título: "EvalGrado+ — ¿Puedes solicitar el Grado III+ de dependencia extrema?"
- Subtítulo: "Esta herramienta te ayuda a entender si tu situación o la de tu familiar podría cumplir los requisitos para solicitar el nuevo Grado III+ de dependencia. Es gratuita, confidencial y no guarda ningún dato."
- Sección de "Antes de empezar" con avisos esenciales (ver Sección 6.1)
- Casilla de aceptación obligatoria de términos y condiciones
- Enlace al texto completo de términos y condiciones
- Enlace a la política de privacidad
- Botón "Empezar" (deshabilitado hasta aceptar términos)

### 3.2 Pantalla 2 — Información educativa sobre el Grado III+

**Propósito:** Explicar de forma comprensible el marco legal y los criterios.

**Contenido estructurado en secciones expandibles:**

**Sección A — "¿Qué es el Grado III+ de dependencia extrema?"**

> El Grado III+ es un nuevo nivel de protección social creado en 2025 para personas que tienen enfermedades muy graves, que no tienen cura, y que necesitan ayuda constante — en muchos casos, las 24 horas del día — para actividades tan básicas como respirar, comer o moverse.
>
> Este grado va más allá del Grado III (gran dependencia) que ya existía. Fue creado inicialmente para personas con ELA (Esclerosis Lateral Amiotrófica), pero también se aplica a otras enfermedades igualmente graves e irreversibles.
>
> Si te reconocen el Grado III+, tienes derecho a una prestación económica de entre 4.930 y 9.859 euros al mes, destinada exclusivamente a pagar ayuda profesional a domicilio y asistencia personal.

**Sección B — "¿Quién puede solicitarlo?"**

> No hay una lista cerrada de enfermedades. Lo que importa es que tu situación cumpla una serie de criterios clínicos y funcionales. Para poder solicitarlo necesitas:
>
> 1. **Tener ya reconocido el Grado III** de gran dependencia (75 a 100 puntos en el Baremo de Valoración de la Dependencia).
>
> 2. **Si tienes ELA en fase avanzada:** se te aplica directamente si tienes dependencia completa para las actividades básicas de la vida diaria y necesitas asistencia por problemas respiratorios o dificultades para tragar (disfagia).
>
> 3. **Si tienes otra enfermedad de alta complejidad y curso irreversible:** tu enfermedad debe cumplir los cuatro criterios generales del artículo 2 de la Ley 3/2024:
>    - Condición irreversible con reducción significativa de la supervivencia.
>    - Sin respuesta significativa al tratamiento disponible, o sin alternativas terapéuticas que mejoren el estado funcional o el pronóstico.
>    - Necesidad de cuidados sociales y sanitarios complejos, centrados en el ámbito domiciliario, con alto impacto para el entorno cercano.
>    - Progresión rápida que justifique acelerar los procedimientos administrativos.
>
> Además, debe cumplirse al menos **dos de los tres criterios operativos** del RD 969/2025:
>    - Deterioro funcional objetivo en menos de 6 meses, con pérdida de autonomía en dos o más actividades básicas de la vida diaria.
>    - Complicaciones graves recurrentes, con dos o más ingresos urgentes no planificados en los últimos 12 meses.
>    - Necesidad de soporte vital o funcional permanente (ventilación mecánica, nutrición artificial, etc.).

**Sección C — "¿Qué enfermedades suelen cumplir estos criterios?"**

> El Real Decreto 969/2025 incluye un listado orientativo (no cerrado) de enfermedades que, por su naturaleza, tienen alta probabilidad de cumplir los criterios. Este listado incluye, entre otras:
>
> - Enfermedades de la motoneurona distintas de la ELA (atrofia muscular progresiva, esclerosis lateral primaria)
> - Encefalopatías espongiformes transmisibles (como la enfermedad de Creutzfeldt-Jakob)
> - Síndrome de cautiverio por infarto cerebral de la protuberancia
> - Formas graves de atrofia muscular espinal infantil sin respuesta a tratamiento
> - Otras enfermedades neurodegenerativas en fase avanzada
>
> **Importante:** Que tu enfermedad no esté en esta lista no significa que no puedas solicitarlo. Si cumples los criterios, puedes solicitar la evaluación independientemente del diagnóstico específico.

**Sección D — "¿Cómo es el proceso de solicitud?"**

> 1. Reúnes los informes médicos actualizados que acrediten tu situación clínica.
> 2. Tu médico especialista cumplimenta el cuestionario de verificación oficial (Anexo II del RD 969/2025) y emite un informe clínico detallado.
> 3. Presentas la solicitud (modelo del Anexo III) en los servicios sociales de tu comunidad autónoma o a través de la sede electrónica.
> 4. La administración tiene un plazo máximo de 3 meses para resolver.
> 5. Si se estima tu solicitud, se elabora tu Programa Individual de Atención (PIA) con las prestaciones correspondientes.

**Sección E — "¿Qué hace esta herramienta por ti?"**

> Esta herramienta:
> - Te ayuda a entender si tu situación podría encajar en los criterios del Grado III+.
> - Analiza tus informes médicos para identificar elementos que respalden (o no) la solicitud.
> - Te da una orientación (alta, dudosa o baja probabilidad de éxito).
> - Genera un borrador de texto clínico que tu médico puede usar como punto de partida para su informe.
>
> Esta herramienta **NO**:
> - No sustituye la valoración de un médico especialista.
> - No tiene validez legal ni administrativa.
> - No guarda ningún dato tuyo: cuando cierras la página, todo desaparece.
> - No garantiza el resultado de tu solicitud.

### 3.3 Pantalla 3 — Cuestionario inicial orientativo

**Propósito:** Recoger información estructurada básica antes de analizar documentos, para orientar el análisis de IA.

**Preguntas del cuestionario:**

| # | Pregunta | Tipo de respuesta | Obligatoria |
|---|---------|-------------------|-------------|
| 1 | ¿Tiene ya reconocido el Grado III de gran dependencia? | Sí / No / En tramitación / No lo sé | Sí |
| 2 | ¿Cuál es el diagnóstico principal? | Texto libre + selector de categorías frecuentes | Sí |
| 3 | ¿Se trata de ELA (Esclerosis Lateral Amiotrófica)? | Sí / No | Sí |
| 4 | ¿Necesita ayuda para actividades básicas como comer, vestirse, asearse o desplazarse? | Siempre / Casi siempre / A veces / Raramente | Sí |
| 5 | ¿Utiliza soporte respiratorio (ventilación mecánica, CPAP, BiPAP u otro)? | Sí, permanente / Sí, parcial / No | Sí |
| 6 | ¿Tiene dificultades para tragar (disfagia) o utiliza nutrición artificial (sonda, PEG)? | Sí / No | Sí |
| 7 | ¿Ha habido un empeoramiento notable en los últimos 6 meses? | Sí, significativo / Sí, leve / No / No lo sé | Sí |
| 8 | ¿Ha tenido dos o más ingresos hospitalarios urgentes (no planificados) en el último año? | Sí / No / No lo sé | Sí |
| 9 | ¿Existe un tratamiento que esté frenando la enfermedad de forma eficaz? | Sí / Parcialmente / No / No lo sé | Sí |
| 10 | ¿Quién rellena este cuestionario? | El propio paciente / Un familiar / Un cuidador / Un profesional sanitario | Sí |

**Lógica condicional:**

- Si responde "No" a la pregunta 1 y no "En tramitación": mostrar aviso de que el Grado III es requisito previo, con información sobre cómo solicitarlo. Permitir continuar igualmente para orientación.
- Si responde "Sí" a la pregunta 3: activar flujo específico de ELA (criterios más directos).
- Si responde "No" a la pregunta 3: activar flujo de "otras enfermedades" (criterios operativos completos).

### 3.4 Pantalla 4 — Subida y análisis de informes médicos

**Propósito:** Permitir al usuario subir informes médicos para análisis automatizado por IA.

**Elementos de la interfaz:**

- Zona de arrastrar y soltar ("drag and drop") para archivos
- Botón alternativo "Seleccionar archivos"
- Formatos aceptados: PDF, JPG, PNG, HEIC
- Tamaño máximo por archivo: 20 MB
- Número máximo de archivos: 10
- Indicador de progreso durante la extracción de texto
- Aviso visible: "Tus documentos se procesan en memoria y no se guardan en ningún servidor. Cuando cierres esta página, todo se elimina."

**Procesamiento técnico:**

1. El archivo se carga en el buffer de memoria del navegador (no se sube a servidor).
2. Se extrae el texto mediante OCR en cliente (Tesseract.js) para imágenes, o extracción de texto para PDF.
3. El texto extraído (sin el archivo original) se envía cifrado al servidor de procesamiento UE.
4. El LLM analiza el texto buscando evidencia de cumplimiento o no cumplimiento de cada criterio.
5. El servidor devuelve un análisis estructurado y elimina la sesión.
6. El resultado se muestra al usuario.

**Prompt de análisis para el LLM (resumen de la lógica):**

El sistema instruirá al modelo de IA para:

- Identificar diagnósticos mencionados en los informes.
- Buscar evidencia de irreversibilidad del proceso.
- Buscar evidencia de ausencia de tratamiento curativo o eficaz.
- Identificar menciones a soporte vital o funcional (ventilación, nutrición artificial, etc.).
- Identificar menciones a deterioro funcional reciente o progresión rápida.
- Identificar ingresos hospitalarios urgentes.
- Identificar limitaciones en actividades básicas de la vida diaria.
- Cruzar la información de los documentos con las respuestas del cuestionario.
- No inventar ni inferir información que no esté explícitamente en los documentos.
- Señalar qué criterios están respaldados por evidencia documental, cuáles no, y cuáles son ambiguos.

### 3.5 Pantalla 5 — Resultado de la evaluación

**Propósito:** Mostrar la recomendación de viabilidad y el análisis detallado.

**Formato del resultado:**

**Indicador visual principal:**

- 🟢 **PROBABILIDAD ALTA** — "Según la información proporcionada, tu situación parece cumplir los criterios principales para solicitar el Grado III+."
- 🟡 **PROBABILIDAD DUDOSA** — "Tu situación podría cumplir algunos criterios, pero hay elementos que necesitan más información o que podrían ser insuficientes."
- 🔴 **PROBABILIDAD BAJA** — "Con la información disponible, parece que actualmente no se cumplen los criterios necesarios. Esto puede cambiar si tu situación evoluciona."

**Desglose por criterios:**

Para cada criterio relevante (generales y operativos), se mostrará:

```
┌──────────────────────────────────────────────────────┐
│ CRITERIO: Condición irreversible                     │
│ ESTADO: ✅ Evidencia encontrada                      │
│ DETALLE: "El informe del Dr. [X] del [fecha]         │
│ indica diagnóstico de [enfermedad] descrita como      │
│ 'irreversible' / 'sin posibilidad de curación'."     │
│ FUENTE: Informe [nombre del archivo], página [N]     │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ CRITERIO: Deterioro funcional en < 6 meses           │
│ ESTADO: ⚠️ Evidencia parcial                         │
│ DETALLE: "Se menciona empeoramiento de la movilidad  │
│ pero no se especifica el plazo temporal."             │
│ RECOMENDACIÓN: "Sería conveniente que el informe      │
│ médico actualizado especifique la velocidad de        │
│ progresión con fechas concretas."                     │
└──────────────────────────────────────────────────────┘
```

**Nota al pie obligatoria:**

> ⚠️ **Aviso importante:** Esta evaluación es orientativa y no tiene ningún valor legal ni administrativo. La decisión final corresponde exclusivamente al órgano competente de tu comunidad autónoma, basándose en el informe de un profesional médico especialista. Te recomendamos hablar con tu médico para validar este análisis.

### 3.6 Pantalla 6 — Texto para el médico

**Propósito:** Generar un borrador de texto clínico estructurado que el médico pueda copiar, editar y pegar en su informe oficial.

**Estructura del borrador generado:**

El texto se generará siguiendo la estructura del cuestionario de verificación del Anexo II del RD 969/2025, e incluirá:

1. **Encabezado:**
   ```
   INFORME MÉDICO PARA SOLICITUD DE RECONOCIMIENTO DEL GRADO III+
   DE DEPENDENCIA EXTREMA
   (Conforme al Real Decreto 969/2025, de 28 de octubre)
   
   Fecha: [fecha actual]
   [Espacio para datos del profesional médico]
   [Espacio para datos del paciente]
   ```

2. **Sección de diagnóstico:**
   ```
   DIAGNÓSTICO PRINCIPAL: [extraído de los informes]
   CIE-10/CIE-11: [si está disponible en los informes]
   Fecha del diagnóstico: [si está disponible]
   ```

3. **Criterios generales (art. 2.2 Ley 3/2024):**

   Para cada uno de los cuatro criterios, un párrafo redactado en lenguaje clínico basado en la información de los informes:

   - Irreversibilidad y reducción significativa de la supervivencia
   - Ausencia de respuesta significativa al tratamiento
   - Necesidad de cuidados complejos centrados en el domicilio
   - Progresión rápida que justifica agilización administrativa

4. **Criterios operativos (art. 2.1 RD 969/2025):**

   Para cada criterio operativo, evidencia clínica concreta:

   - Deterioro funcional objetivo en < 6 meses (con especificación de actividades afectadas)
   - Complicaciones graves recurrentes (con fechas de ingresos si están disponibles)
   - Necesidad de soporte vital/funcional permanente (con tipo de soporte y horas/día)

5. **Conclusión:**
   ```
   A la vista de los criterios evaluados, el/la paciente presenta una situación
   compatible con [los criterios de alta complejidad y curso irreversible / 
   el diagnóstico de ELA en fase avanzada], cumpliendo [X] de los [Y] criterios
   operativos establecidos en el Real Decreto 969/2025.
   
   Se recomienda [la solicitud del Grado III+ / la valoración más detallada de...].
   
   [Espacio para firma del profesional médico]
   ```

**Funcionalidades de la pantalla:**

- Botón "Copiar al portapapeles"
- Botón "Descargar como PDF"
- Botón "Descargar como DOCX"
- Edición en línea del texto antes de copiar/descargar
- Aviso: "Este texto es un borrador. El médico debe revisarlo, completarlo y firmarlo bajo su responsabilidad profesional."

### 3.7 Pantalla 7 — Recursos y siguientes pasos

**Propósito:** Orientar al usuario sobre los pasos a seguir tras la evaluación.

**Contenido:**

- Resumen de pasos a seguir (personalizado según el resultado).
- Enlaces a los formularios oficiales de solicitud por comunidad autónoma.
- Información de contacto de asociaciones de pacientes (ConELA, ADELA, Federación Española de Enfermedades Raras — FEDER, etc.).
- Enlace al texto completo del RD 969/2025 en el BOE.
- Enlace al modelo de solicitud oficial (Anexo III).
- Recordatorio de plazos legales.

---

## 4. Gestión de privacidad y RGPD

### 4.1 Principios aplicados

| Principio RGPD | Implementación |
|----------------|----------------|
| Licitud, lealtad, transparencia (art. 5.1.a) | Consentimiento explícito antes de cualquier procesamiento. Información clara. |
| Limitación de la finalidad (art. 5.1.b) | Datos usados exclusivamente para la evaluación orientativa. |
| Minimización de datos (art. 5.1.c) | Solo se procesa el texto extraído de los documentos, no metadatos. |
| Exactitud (art. 5.1.d) | La herramienta advierte que su análisis no es definitivo. |
| Limitación del plazo de conservación (art. 5.1.e) | Cero almacenamiento: los datos se eliminan al finalizar la sesión. |
| Integridad y confidencialidad (art. 5.1.f) | Cifrado TLS 1.3 en tránsito, procesamiento efímero en servidores UE. |
| Responsabilidad proactiva (art. 5.2) | DPIA realizada, medidas documentadas, cumplimiento verificable. |

### 4.2 Base jurídica del tratamiento

El tratamiento de datos de salud (categoría especial, art. 9 RGPD) se ampara en:

- **Consentimiento explícito del interesado** (art. 9.2.a RGPD): el usuario acepta activamente los términos antes de subir cualquier documento.
- **Interés vital del interesado** (art. 9.2.c RGPD) como base complementaria en caso de que el consentimiento no sea libre en el sentido estricto del RGPD.

### 4.3 Medidas técnicas y organizativas

- **No persistencia**: no se utiliza base de datos. No existen logs que contengan datos de paciente.
- **Procesamiento en la UE**: todos los servidores de IA y procesamiento están ubicados físicamente en el EEE. El proveedor de IA utilizado (Anthropic / Claude API) se configura para rutar las solicitudes exclusivamente a través de servidores europeos.
- **Cifrado en tránsito**: TLS 1.3 obligatorio para todas las comunicaciones.
- **Aislamiento de sesiones**: cada sesión de procesamiento es independiente y se destruye completamente al concluir.
- **Sin cookies de rastreo**: solo se utilizan cookies técnicas estrictamente necesarias para el funcionamiento de la aplicación.
- **Sin analytics con datos personales**: si se implementa analítica de uso, será agregada y anonimizada (número de visitas, tasa de uso de cada sección, etc.), sin vinculación a datos de paciente.

### 4.4 Evaluación de Impacto (DPIA)

Dado que se procesan datos de salud a potencialmente gran escala, se realizará una Evaluación de Impacto en la Protección de Datos (DPIA) conforme al artículo 35 RGPD antes del lanzamiento. El documento DPIA abordará:

- Descripción del tratamiento y su necesidad.
- Evaluación de riesgos para los derechos y libertades de los interesados.
- Medidas previstas para mitigar dichos riesgos.
- Consulta previa a la AEPD si el riesgo residual es alto.

### 4.5 Derechos del usuario

Los usuarios pueden ejercer sus derechos RGPD. Sin embargo, dado que no se almacena ningún dato personal, la mayoría de estos derechos tienen una aplicación limitada:

| Derecho | Aplicabilidad |
|---------|---------------|
| Acceso (art. 15) | No aplicable: no se conservan datos tras la sesión. |
| Rectificación (art. 16) | No aplicable: no hay datos almacenados que rectificar. |
| Supresión (art. 17) | Cumplido por diseño: todo se elimina al cerrar sesión. |
| Limitación (art. 18) | El usuario puede cerrar la sesión en cualquier momento. |
| Portabilidad (art. 20) | El usuario puede descargar el resultado generado. |
| Oposición (art. 21) | El usuario puede no usar la herramienta o cerrar sesión. |

Canal de contacto para ejercicio de derechos: **privacidad@[dominio].org**

---

## 5. Integración de IA — Especificaciones

### 5.1 Modelo de IA utilizado

- **Modelo:** Claude (Anthropic) — versión Sonnet o superior
- **Endpoint:** API de Anthropic configurada para procesamiento en la UE
- **Uso:** Análisis de texto médico y generación de texto clínico

### 5.2 Prompt del sistema (resumen)

```
Eres un asistente experto en el marco normativo español del Grado III+ 
de dependencia extrema (Ley 3/2024, RDL 11/2025, RD 969/2025).

Tu tarea es analizar informes médicos proporcionados por el usuario y 
evaluar el grado de cumplimiento de los criterios legales para solicitar 
el Grado III+.

REGLAS:
1. Solo utiliza información explícitamente presente en los documentos 
   proporcionados y en las respuestas del cuestionario.
2. NUNCA inventes, infieras ni supongas información clínica que no esté 
   en los documentos.
3. Si un criterio no puede evaluarse con la información disponible, 
   indícalo claramente como "Información insuficiente".
4. Sé conservador en tus evaluaciones: ante la duda, indica 
   "Probabilidad dudosa" en lugar de "Alta".
5. Tu análisis NO tiene valor legal ni sustituye al criterio médico.
6. Utiliza lenguaje comprensible para personas sin formación médica 
   en la evaluación, y lenguaje clínico profesional en el borrador 
   para el médico.
7. No incluyas datos identificativos del paciente en tus respuestas 
   más allá de lo estrictamente necesario para el contexto clínico.
```

### 5.3 Estructura de la llamada a la API

**Entrada:**

```json
{
  "system": "[Prompt del sistema completo]",
  "messages": [
    {
      "role": "user",
      "content": "CUESTIONARIO:\n[Respuestas del cuestionario]\n\nINFORMES MÉDICOS (texto extraído):\n[Texto concatenado de los informes]\n\nPor favor, analiza esta información y proporciona:\n1. Evaluación de cada criterio (cumplido/parcial/no cumplido/sin info)\n2. Recomendación global (ALTA/DUDOSA/BAJA)\n3. Borrador de texto para el informe médico"
    }
  ]
}
```

**Salida esperada (estructurada):**

```json
{
  "evaluacion_global": "ALTA | DUDOSA | BAJA",
  "resumen_paciente": "Descripción breve de la situación clínica identificada.",
  "criterios_generales": [
    {
      "nombre": "Condición irreversible",
      "estado": "CUMPLIDO | PARCIAL | NO_CUMPLIDO | SIN_INFORMACION",
      "evidencia": "Texto que respalda la evaluación.",
      "recomendacion": "Sugerencia si falta información."
    }
  ],
  "criterios_operativos": [
    {
      "nombre": "Deterioro funcional en < 6 meses",
      "estado": "CUMPLIDO | PARCIAL | NO_CUMPLIDO | SIN_INFORMACION",
      "evidencia": "...",
      "recomendacion": "..."
    }
  ],
  "borrador_medico": "Texto completo del borrador para el informe médico.",
  "siguiente_paso": "Recomendaciones personalizadas de próximos pasos."
}
```

### 5.4 Limitaciones reconocidas del análisis por IA

- La IA analiza texto, no imágenes clínicas (radiografías, resonancias, etc.).
- El OCR puede introducir errores en la extracción de texto de documentos escaneados.
- La IA no puede verificar la autenticidad de los documentos.
- El análisis es tan bueno como la información que contienen los documentos subidos.
- La IA puede no captar matices clínicos que un especialista sí detectaría.

---

## 6. Contenido completo de la web app — Textos legales y de interfaz

### 6.1 Aviso principal (Pantalla de bienvenida)

> **Antes de empezar, es importante que sepas:**
>
> **Esta herramienta es orientativa.** No sustituye el criterio de un médico especialista ni tiene valor legal o administrativo. Su propósito es ayudarte a entender mejor tu situación y facilitar el trabajo a tu equipo médico.
>
> **No guardamos nada.** Ningún documento que subas, ninguna respuesta que des y ningún resultado que obtengas se almacena en ningún servidor. Cuando cierras esta página, todo desaparece. No podemos recuperar tu información aunque quisiéramos.
>
> **Tus datos se procesan en Europa.** El análisis de tus documentos se realiza mediante inteligencia artificial cuyos servidores están ubicados en la Unión Europea, cumpliendo con el Reglamento General de Protección de Datos (RGPD).
>
> **Esto no es un diagnóstico.** La evaluación que proporciona esta herramienta se basa en la información que tú le proporcionas. No podemos verificar la exactitud de esa información. La decisión final sobre tu solicitud corresponde a los profesionales sanitarios y a la administración competente de tu comunidad autónoma.
>
> Si tienes dudas sobre tu situación, te recomendamos contactar con tu equipo médico, con los servicios sociales de tu municipio o con una asociación de pacientes.

### 6.2 Términos y condiciones de uso

> ## TÉRMINOS Y CONDICIONES DE USO DE EVALGRADO+
>
> **Última actualización:** [fecha de lanzamiento]
>
> ### 1. Identificación del responsable
>
> EvalGrado+ es un servicio desarrollado y operado por **[Nombre de la entidad]**, con domicilio en [dirección], NIF [número], inscrita en [registro correspondiente] (en adelante, "el Responsable").
>
> Correo electrónico de contacto: [email]
> Delegado de Protección de Datos: [email DPD]
>
> ### 2. Objeto del servicio
>
> EvalGrado+ es una herramienta web gratuita de carácter informativo y orientativo que ayuda a personas con enfermedades de alta complejidad y curso irreversible, y a sus familias, a evaluar de forma preliminar si su situación podría cumplir los requisitos para solicitar el Grado III+ de dependencia extrema conforme a la legislación española vigente (Ley 3/2024, RDL 11/2025, RD 969/2025).
>
> ### 3. Naturaleza orientativa — exclusión de responsabilidad médica y jurídica
>
> 3.1. EvalGrado+ **no es un producto sanitario**, no está certificado como dispositivo médico conforme al Reglamento (UE) 2017/745 (MDR), y no proporciona diagnósticos, pronósticos ni recomendaciones terapéuticas.
>
> 3.2. Los resultados de EvalGrado+ **no tienen valor legal ni administrativo**. No constituyen un informe médico, ni una valoración oficial de dependencia, ni pueden utilizarse como documento acreditativo ante ninguna administración pública.
>
> 3.3. EvalGrado+ utiliza inteligencia artificial para analizar la información que el usuario proporciona. Como toda herramienta de IA, puede cometer errores, interpretar incorrectamente la información o no detectar elementos relevantes. El Responsable no garantiza la exactitud, completitud ni idoneidad de los resultados.
>
> 3.4. La responsabilidad de validar, completar y firmar cualquier informe médico recae exclusivamente en el profesional sanitario correspondiente. El borrador de texto que genera EvalGrado+ es una sugerencia de redacción que el médico debe revisar íntegramente.
>
> 3.5. El usuario reconoce que la decisión de solicitar o no el Grado III+ es personal y debe tomarse en consulta con profesionales sanitarios y, en su caso, jurídicos.
>
> ### 4. Uso aceptable
>
> 4.1. El usuario se compromete a utilizar EvalGrado+ exclusivamente para los fines previstos: la orientación personal sobre la viabilidad de una solicitud del Grado III+.
>
> 4.2. Queda prohibido:
> - Utilizar la herramienta con fines comerciales o de lucro.
> - Subir documentos que no correspondan a la persona interesada o a un familiar/persona bajo su cuidado, salvo autorización legal.
> - Subir documentos que contengan datos de terceros no implicados en la evaluación.
> - Intentar extraer, copiar o replicar el modelo de análisis o el prompt de la herramienta.
> - Utilizar la herramienta de forma automatizada (bots, scraping, etc.).
>
> 4.3. El usuario declara que tiene derecho legítimo a acceder a los datos de salud que proporciona (propios, de un menor bajo su tutela, o de una persona sobre la que tiene representación legal).
>
> ### 5. Protección de datos personales
>
> 5.1. **No almacenamiento de datos:** EvalGrado+ no almacena ningún dato personal, dato de salud, documento subido, respuesta al cuestionario ni resultado generado. Todo el procesamiento se realiza en sesión efímera y los datos se eliminan automáticamente al finalizar la interacción.
>
> 5.2. **Datos de salud como categoría especial:** Los datos contenidos en los informes médicos constituyen datos de salud, considerados como categoría especial de datos personales conforme al artículo 9 del RGPD. El tratamiento de estos datos se realiza sobre la base del consentimiento explícito del interesado (art. 9.2.a RGPD), que se recaba antes de que el usuario suba cualquier documento.
>
> 5.3. **Procesamiento en la UE:** Todos los servidores utilizados para el análisis por IA están ubicados en centros de datos dentro del Espacio Económico Europeo. No se realizan transferencias internacionales de datos fuera del EEE.
>
> 5.4. **Subencargados del tratamiento:** El análisis por IA se realiza mediante la API de [proveedor de IA], que actúa como encargado del tratamiento conforme al artículo 28 RGPD. Existe un acuerdo de tratamiento de datos (DPA) vigente con dicho proveedor que garantiza:
> - Que los datos no se utilizan para entrenar modelos de IA.
> - Que los datos no se retienen más allá del tiempo necesario para generar la respuesta.
> - Que el procesamiento se realiza en servidores de la UE.
>
> 5.5. **Medidas de seguridad:** Cifrado TLS 1.3 en todas las comunicaciones. Procesamiento en memoria sin escritura en disco. Sesiones aisladas sin persistencia.
>
> 5.6. **Derechos del usuario:** El usuario puede ejercer sus derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición dirigiéndose a [email]. Dado que no se almacenan datos, el derecho de supresión se cumple por diseño. El usuario tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).
>
> 5.7. **Cookies:** EvalGrado+ utiliza exclusivamente cookies técnicas necesarias para el funcionamiento de la aplicación. No se utilizan cookies de publicidad, analítica de terceros ni perfilado.
>
> ### 6. Propiedad intelectual
>
> 6.1. EvalGrado+ y sus contenidos (textos informativos, diseño, código fuente, logotipos) son propiedad del Responsable o se utilizan con las licencias correspondientes.
>
> 6.2. Los resultados y borradores generados por la herramienta para cada usuario pertenecen a dicho usuario y puede utilizarlos libremente para los fines previstos.
>
> 6.3. Los documentos que el usuario sube a la herramienta siguen siendo propiedad del usuario en todo momento.
>
> ### 7. Limitación de responsabilidad
>
> 7.1. El Responsable no se hace responsable de las decisiones que el usuario tome basándose en los resultados de EvalGrado+.
>
> 7.2. El Responsable no se hace responsable de errores en el análisis derivados de la calidad de los documentos proporcionados, de errores de OCR, de la ambigüedad del contenido clínico o de las limitaciones inherentes a la inteligencia artificial.
>
> 7.3. El Responsable no garantiza la disponibilidad ininterrumpida del servicio.
>
> 7.4. En ningún caso la responsabilidad del Responsable excederá el importe pagado por el usuario por el uso del servicio, que es cero euros al ser un servicio gratuito.
>
> ### 8. Modificaciones
>
> El Responsable se reserva el derecho de modificar estos términos. Las modificaciones entrarán en vigor desde su publicación en la web. Se recomienda revisar los términos periódicamente.
>
> ### 9. Legislación aplicable y jurisdicción
>
> Estos términos se rigen por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales de [ciudad], con renuncia a cualquier otro fuero que pudiera corresponderles.
>
> ### 10. Contacto
>
> Para cualquier consulta sobre estos términos, la herramienta o la protección de tus datos:
>
> - **Correo general:** [email]
> - **Delegado de Protección de Datos:** [email DPD]
> - **Dirección postal:** [dirección]

### 6.3 Política de privacidad

> ## POLÍTICA DE PRIVACIDAD DE EVALGRADO+
>
> **Última actualización:** [fecha de lanzamiento]
>
> ### ¿Quién es el responsable del tratamiento?
>
> **[Nombre de la entidad]**
> Domicilio: [dirección]
> NIF: [número]
> Email: [email]
> Delegado de Protección de Datos (DPD): [email DPD]
>
> ### ¿Qué datos tratamos?
>
> EvalGrado+ puede tratar, de forma efímera y sin almacenamiento, los siguientes datos:
>
> - **Datos del cuestionario:** Respuestas a preguntas sobre la situación clínica del paciente (diagnóstico, grado de dependencia, necesidades de asistencia).
> - **Datos extraídos de informes médicos:** Texto contenido en los documentos clínicos que el usuario sube voluntariamente.
>
> **Estos datos incluyen datos de salud**, que constituyen una categoría especial de datos personales según el artículo 9 del RGPD.
>
> ### ¿Cómo tratamos tus datos?
>
> 1. Los documentos se cargan en la memoria del navegador del usuario.
> 2. Se extrae el texto de los documentos.
> 3. El texto extraído se envía, cifrado, a nuestro servidor de procesamiento ubicado en la UE.
> 4. Un modelo de inteligencia artificial analiza el texto y genera un resultado.
> 5. El resultado se devuelve al navegador del usuario.
> 6. **Todos los datos se eliminan inmediatamente tras generar la respuesta.** No se escribe nada en disco, no se almacena en base de datos, y no se conservan logs que contengan datos del paciente.
>
> ### ¿Con qué base jurídica?
>
> - **Consentimiento explícito** (art. 6.1.a y 9.2.a RGPD): recabado antes de cualquier procesamiento.
>
> ### ¿Se transfieren datos fuera de la UE?
>
> **No.** Todos los servidores de procesamiento están ubicados en el Espacio Económico Europeo. No se realizan transferencias internacionales.
>
> ### ¿Cuánto tiempo conservamos tus datos?
>
> **Cero tiempo.** No se almacena ningún dato tras finalizar el procesamiento de cada sesión. No podemos recuperar tu información una vez cerrada la sesión.
>
> ### ¿Con quién compartimos tus datos?
>
> El texto extraído de los documentos es procesado por **[proveedor de IA]**, que actúa como encargado del tratamiento bajo un Acuerdo de Tratamiento de Datos (DPA) conforme al art. 28 RGPD. Este proveedor:
> - No utiliza tus datos para entrenar sus modelos.
> - No retiene tus datos más allá del tiempo necesario para generar la respuesta.
> - Procesa tus datos en servidores de la UE.
>
> No compartimos datos con ningún otro tercero.
>
> ### ¿Qué derechos tienes?
>
> Puedes ejercer tus derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición contactando con [email DPD]. Sin embargo, dado que no almacenamos datos, en la práctica la mayoría de estos derechos se satisfacen por diseño (no hay datos que acceder, rectificar ni suprimir).
>
> Si consideras que tus derechos no han sido atendidos adecuadamente, puedes presentar una reclamación ante la **Agencia Española de Protección de Datos** (www.aepd.es).
>
> ### Cookies
>
> Solo utilizamos cookies técnicas estrictamente necesarias para el funcionamiento del sitio. No utilizamos cookies de publicidad, analítica de terceros ni perfilado.
>
> | Cookie | Tipo | Finalidad | Duración |
> |--------|------|-----------|----------|
> | session_id | Técnica | Identificar la sesión activa | Duración de la sesión |
> | terms_accepted | Técnica | Recordar la aceptación de términos durante la sesión | Duración de la sesión |

### 6.4 Política de cookies

> ## POLÍTICA DE COOKIES
>
> EvalGrado+ utiliza exclusivamente **cookies técnicas** necesarias para el funcionamiento del servicio. No utilizamos cookies de publicidad, de redes sociales, de analítica de terceros ni de perfilado.
>
> Al ser cookies estrictamente necesarias, no requieren consentimiento previo conforme al artículo 22.2 de la Ley 34/2002 (LSSI-CE), si bien informamos de su existencia en cumplimiento del deber de transparencia.
>
> | Cookie | Finalidad | Duración |
> |--------|-----------|----------|
> | session_id | Mantener la sesión activa durante el uso de la herramienta | Se elimina al cerrar la página |
> | terms_accepted | Registrar que el usuario ha aceptado los términos | Se elimina al cerrar la página |

### 6.5 Textos de avisos en la interfaz

**Aviso al subir documentos:**
> 🔒 Tus documentos se procesan en la memoria de tu navegador y en servidores de la UE. No se guardan en ningún lugar. Cuando cierres esta página, todo se elimina de forma automática e irreversible.

**Aviso en el resultado de la evaluación:**
> ⚠️ Este resultado es orientativo. No tiene valor legal ni sustituye el criterio de un profesional médico. Consulta con tu equipo sanitario antes de tomar cualquier decisión.

**Aviso en el borrador para el médico:**
> 📋 Este texto es un borrador generado por inteligencia artificial. El médico debe revisarlo, verificarlo, completarlo y firmarlo bajo su exclusiva responsabilidad profesional. La herramienta no se hace responsable del contenido final del informe.

**Aviso si no tiene Grado III reconocido:**
> ℹ️ Para solicitar el Grado III+, es necesario tener previamente reconocido el Grado III de gran dependencia (75-100 puntos en el BVD). Si aún no lo tienes, te recomendamos solicitarlo primero a través de los servicios sociales de tu comunidad autónoma. No obstante, puedes continuar con esta evaluación para orientarte.

**Aviso de cierre de sesión:**
> Al cerrar esta página se eliminarán todos los datos de tu sesión, incluyendo los documentos subidos, las respuestas del cuestionario y los resultados generados. Si deseas conservar el resultado o el borrador para el médico, descárgalos antes de cerrar. ¿Deseas continuar?

### 6.6 Footer de la aplicación

> EvalGrado+ es un proyecto de [Nombre de la entidad]. Esta herramienta es gratuita, no almacena datos y tiene carácter exclusivamente orientativo.
>
> [Términos y condiciones] · [Política de privacidad] · [Política de cookies] · [Contacto]
>
> © [Año] [Nombre de la entidad]. Todos los derechos reservados.

---

## 7. Requisitos de accesibilidad

La aplicación cumplirá las Pautas de Accesibilidad para el Contenido Web (WCAG 2.1) en nivel AA, incluyendo:

- Contraste mínimo de 4.5:1 en texto y elementos funcionales.
- Navegación completa por teclado.
- Compatibilidad con lectores de pantalla (ARIA labels).
- Texto alternativo en todos los elementos visuales.
- Tamaño de fuente ajustable sin pérdida de funcionalidad.
- Lenguaje claro y lectura fácil en todos los contenidos informativos.
- Compatibilidad con sistemas de lectura fácil para personas con discapacidad intelectual.

---

## 8. Requisitos no funcionales

| Requisito | Especificación |
|-----------|---------------|
| Tiempo de carga inicial | < 3 segundos en conexión 4G |
| Tiempo de procesamiento IA | < 30 segundos para el análisis completo |
| Compatibilidad | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+, iOS Safari, Chrome Android |
| Responsive | Diseño adaptado a móvil, tablet y escritorio |
| Disponibilidad | 99.5% (SLA del proveedor de hosting) |
| Idiomas | Español (versión inicial). Previsto: catalán, euskera, gallego, valenciano |
| Capacidad concurrente | Mínimo 100 usuarios simultáneos |

---

## 9. Plan de pruebas

### 9.1 Pruebas funcionales

- Verificar el flujo completo desde bienvenida hasta descarga del borrador.
- Verificar la lógica condicional del cuestionario.
- Verificar la subida y extracción de texto de PDFs e imágenes.
- Verificar la coherencia de las evaluaciones de IA con casos de prueba diseñados por expertos clínicos y jurídicos.

### 9.2 Pruebas de privacidad

- Verificar que ningún dato persiste tras cerrar sesión (inspección de almacenamiento local, cookies, logs de servidor).
- Verificar que los logs del servidor no contienen datos de paciente.
- Verificar que las llamadas a la API de IA no retienen datos.
- Test de penetración para verificar que no es posible acceder a datos de sesiones de otros usuarios.

### 9.3 Pruebas de accesibilidad

- Auditoría WCAG 2.1 AA con herramientas automatizadas (Lighthouse, axe).
- Pruebas manuales con lectores de pantalla (NVDA, VoiceOver).
- Pruebas de navegación por teclado.

### 9.4 Pruebas de calidad del análisis

- Set de 20 casos de prueba con informes médicos ficticios que cubran:
  - 5 casos claramente elegibles (resultado esperado: ALTA)
  - 5 casos claramente no elegibles (resultado esperado: BAJA)
  - 10 casos ambiguos o parciales (resultado esperado: DUDOSA)
- Validación por un comité de al menos 2 médicos especialistas y 1 jurista.

---

## 10. Mantenimiento y evolución

### 10.1 Actualizaciones normativas

El marco legal del Grado III+ puede evolucionar (ampliación del listado de enfermedades, modificaciones en los criterios operativos, cambios autonómicos). Se establece un proceso de vigilancia normativa trimestral para actualizar los contenidos y la lógica de evaluación.

### 10.2 Roadmap previsto

| Fase | Funcionalidad | Plazo estimado |
|------|--------------|----------------|
| v1.0 | Información + cuestionario + subida de informes + evaluación + borrador | Lanzamiento |
| v1.1 | Formularios de solicitud enlazados por CCAA | +1 mes |
| v1.2 | Versiones en catalán, euskera, gallego y valenciano | +3 meses |
| v1.3 | Integración con lectura fácil para personas con discapacidad intelectual | +4 meses |
| v2.0 | Versión para profesionales sanitarios con acceso directo al cuestionario del Anexo II | +6 meses |

---

## 11. Glosario

| Término | Definición |
|---------|-----------|
| **ABVD** | Actividades Básicas de la Vida Diaria (comer, asearse, vestirse, desplazarse, etc.) |
| **BVD** | Baremo de Valoración de la Dependencia (RD 174/2011) |
| **CCAA** | Comunidades Autónomas |
| **DPA** | Data Processing Agreement / Acuerdo de Tratamiento de Datos |
| **DPIA** | Data Protection Impact Assessment / Evaluación de Impacto en Protección de Datos |
| **EEE** | Espacio Económico Europeo |
| **ELA** | Esclerosis Lateral Amiotrófica |
| **Grado III** | Gran dependencia (75-100 puntos BVD) |
| **Grado III+** | Dependencia extrema (requiere Grado III + criterios clínicos adicionales) |
| **LLM** | Large Language Model / Modelo de Lenguaje de Gran Tamaño |
| **OCR** | Optical Character Recognition / Reconocimiento Óptico de Caracteres |
| **PIA** | Programa Individual de Atención |
| **RGPD** | Reglamento General de Protección de Datos (UE 2016/679) |
| **SAAD** | Sistema para la Autonomía y Atención a la Dependencia |
| **TLS** | Transport Layer Security (protocolo de cifrado en tránsito) |

---

*Fin del documento de especificación.*

*Este documento debe ser revisado y aprobado por el equipo jurídico, el equipo técnico y al menos un asesor clínico antes de iniciar el desarrollo.*
