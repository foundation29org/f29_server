# EvalGrado+ — Guion del vídeo infográfico (1 minuto)

Vídeo corto, en estilo infográfico, que explica qué es EvalGrado+ y sus condiciones de uso. Dice lo mismo que la herramienta publicada y no añade nada que no esté en ella.

**Fuentes (solo estas):**

- La herramienta publicada: <https://foundation29.org/es/gradodependencia> (bienvenida, información, resultado, borrador, recursos y los bloques legales de la bienvenida).
- [`EIPD.md`](../EIPD.md), secciones 2, 3 y 6, como material de fondo. No se lee en el vídeo.

**El vídeo no dice:**

- [x] Que un profesional biomédico haya revisado la herramienta. Esa revisión está pendiente. **Atención:** la web publicada sí lo afirma en el bloque «Uso de inteligencia artificial» («la ha revisado un profesional biomédico antes de su publicación»). El vídeo no recoge esa frase. Conviene corregir la web.
- [x] Detalles internos: modelos, pruebas, fallos ni la evaluación de impacto.

`generar_video.py` comprueba las dos cosas antes de renderizar: que la locución de cada escena aparece literal en este guion y que ni la locución ni el texto en pantalla contienen esos términos.

## Escenas

La locución se muestra también como subtítulo. Duración total: 62,8 s.

### 1. Portada (0:00–0:06)

**Locución:** ¿Puedes solicitar el Grado III+ de dependencia extrema? EvalGrado+ te ayuda a entenderlo.

**En pantalla:** «EvalGrado+» · «¿Puedes solicitar el Grado III+ de dependencia extrema?» · Gratuita · Confidencial · Orientativa · logotipos de Foundation 29 «en colaboración con» Plena inclusión.

**Web (Bienvenida):** «¿Puedes solicitar el Grado III+ de dependencia extrema?» · «Esta herramienta te ayuda a entender si tu situación o la de tu familiar podría cumplir los requisitos para solicitar el nuevo Grado III+ de dependencia. Es gratuita, confidencial y orientativa.»

### 2. Qué es el Grado III+ (0:06–0:14)

**Locución:** El Grado III+ es un nuevo nivel de protección social para personas con enfermedades graves, irreversibles y con necesidad de apoyo continuo.

**En pantalla:** «¿Qué es el Grado III+?» · Enfermedades graves · Irreversibles · Necesidad de apoyo continuo (en muchos casos, 24 horas al día) · «Se requiere Grado III reconocido».

**Web (Información → ¿Qué es el Grado III+? y ¿Quién puede solicitarlo?):** «Es un nuevo nivel de protección social para personas con enfermedades graves, irreversibles y con necesidad de apoyo continuo, en muchos casos 24 horas al día.» · «Se requiere Grado III reconocido…»

### 3. Qué hace la herramienta (0:14–0:23)

**Locución:** La herramienta analiza tus respuestas y tus documentos médicos, te da una orientación ALTA, DUDOSA o BAJA y genera un borrador para tu médico.

**En pantalla:** Tus respuestas + Tus documentos médicos → Análisis con IA → Orientación ALTA / DUDOSA / BAJA (verde, ámbar y rojo, como en la web) → Borrador para el médico: «El médico debe revisarlo, verificarlo, completarlo y firmarlo.»

**Web (Información → ¿Qué hace esta herramienta?):** «Analiza tus documentos y respuestas para darte una orientación ALTA/DUDOSA/BAJA y genera un borrador para el profesional médico.» **(Borrador para el médico):** «El médico debe revisarlo, verificarlo, completarlo y firmarlo bajo su responsabilidad profesional.»

### 4. Gratuita y orientativa (0:23–0:31)

**Locución:** Es gratuita, de Foundation 29 en colaboración con Plena inclusión, y no sustituye la valoración médica ni la resolución administrativa.

**En pantalla:** «Gratuita y orientativa» · Gratuita · logotipos de Foundation 29 «en colaboración con» Plena inclusión · No sustituye: la valoración médica, la resolución administrativa.

**Web (pie de la herramienta):** «EvalGrado+ es una herramienta gratuita y orientativa de Foundation 29 en colaboración con Plena inclusión. Utiliza inteligencia artificial y no sustituye valoración médica ni resolución administrativa.»

### 5. Inteligencia artificial (0:31–0:39)

**Locución:** El análisis lo realiza una inteligencia artificial y puede equivocarse. Revisa siempre la evidencia citada y consúltalo con un profesional sanitario.

**En pantalla:** «Contenido generado por inteligencia artificial.» · Puede equivocarse · Revisa siempre la evidencia citada · Consúltalo con un profesional sanitario.

**Web (Bienvenida):** «El análisis lo realiza un sistema de inteligencia artificial y puede equivocarse.» · «Contenido generado por inteligencia artificial. […] Puede contener errores u omisiones: revisa siempre la evidencia citada y consúltalo con un profesional sanitario antes de tomar cualquier decisión.»

### 6. Foundation 29 no guarda tus datos (0:39–0:48)

**Locución:** Foundation 29 no guarda tus documentos, respuestas ni resultados: se procesan en memoria, en servidores de la Unión Europea.

**En pantalla:** «Foundation 29 no guarda tus datos» · Documentos ✕ · Respuestas ✕ · Resultados ✕ · Se procesan en memoria · Se eliminan al terminar el análisis · Servidores de Microsoft Azure en la Unión Europea.

**Web (Bienvenida):** «Foundation 29 no guarda documentos, respuestas ni resultados: se procesan en memoria y se eliminan al terminar el análisis.» · «Los datos se procesan en servidores de Microsoft Azure ubicados en la Unión Europea, conforme al RGPD.» **(Política de privacidad):** «Conservación por Foundation 29: no guardamos tus datos.»

### 7. Conservación por Microsoft (0:48–0:56)

**Locución:** Microsoft puede conservar las peticiones hasta 30 días para detectar abusos, en la Unión Europea. No se usan para entrenar modelos.

**En pantalla:** contador «hasta 30 días» · «Conservación por Microsoft» · «Puede conservar las peticiones hasta 30 días para detectar abusos.» · Se almacenan en la Unión Europea · No se usan para entrenar modelos.

**Web (Bienvenida):** «Microsoft Azure, que aloja la IA en la UE, puede conservar las peticiones hasta 30 días para detectar abusos. No se usan para entrenar modelos.» **(Política de privacidad):** «Conservación por Microsoft: […] Se almacenan en la Unión Europea […]. No se usan para entrenar modelos.»

### 8. Cierre (0:56–1:03)

**Locución:** Recuerda: esto no es un diagnóstico clínico ni una resolución oficial.

**En pantalla:** «Esto no es un diagnóstico clínico ni una resolución oficial.» · «La decisión final corresponde a la administración competente.» · foundation29.org/es/gradodependencia.

**Web (Bienvenida):** «Esto no es un diagnóstico clínico ni una resolución oficial.» **(Resultado orientativo):** «La decisión final corresponde a la administración competente.»

## Pronunciación

La voz recibe el mismo texto con estos cambios, solo para que lo lea bien: «Grado III+» → «grado tres más», «EvalGrado+» → «Evalgrado más», «Foundation 29» → «Faundéishon veintinueve», «30» → «treinta». Están en `ESCENAS` de `generar_video.py`.

## Cómo generarlo

Requiere Windows (voz es-ES de System.Speech; por defecto «Microsoft Laura») y conexión para cargar los logotipos desde foundation29.org.

```powershell
pip install playwright imageio-ffmpeg
python -m playwright install chromium
python docs/evalgrado/video/generar_video.py               # vídeo completo
python docs/evalgrado/video/generar_video.py --fotogramas  # un fotograma por escena, para revisar
```

Salida en `docs/evalgrado/video/out/` (no se sube al repositorio): `evalgrado.mp4` (1920×1080, 30 fps, subtítulos incrustados), `evalgrado.srt`, `narracion.wav` y `fotogramas/`.

Para cambiar una frase, edítala en este guion y en `ESCENAS` (`generar_video.py`); si el texto en pantalla cambia, edita `infografia.html`.
