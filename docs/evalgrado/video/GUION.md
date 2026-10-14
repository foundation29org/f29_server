# EvalGrado+ — Guion del vídeo infográfico (1 minuto)

Vídeo corto, en estilo infográfico, que explica qué es EvalGrado+ y sus condiciones de uso. Dice lo mismo que la herramienta publicada y no añade nada que no esté en ella.

**Fuentes (solo estas):**

- La herramienta publicada: <https://foundation29.org/es/gradodependencia> (bienvenida, información, resultado, borrador, recursos y los bloques legales de la bienvenida).
- [`EIPD.md`](../EIPD.md), secciones 2, 3 y 6, como material de fondo. No se lee en el vídeo.

**El vídeo no dice:**

- [x] Que un profesional biomédico haya revisado la herramienta. Esa revisión está pendiente. **Atención:** la web publicada sí lo afirma en el bloque «Uso de inteligencia artificial» («la ha revisado un profesional biomédico antes de su publicación»). El vídeo no recoge esa frase. Conviene corregir la web.
- [x] Detalles internos: modelos, pruebas, fallos ni la evaluación de impacto.
- [x] Microsoft. Por decisión del equipo no se nombra a Microsoft ni a Azure, y se ha quitado la escena sobre la conservación de peticiones hasta 30 días (en la web la conserva Microsoft, no Fundación 29).

**Decisiones de redacción del equipo:** la fundación se nombra «Fundación 29» (como en la web en español) y de la IA se dice que «puede cometer errores».

`generar_video.py` comprueba estas cosas antes de renderizar: que la locución de cada escena aparece literal en este guion y que ni la locución ni el texto en pantalla contienen términos prohibidos (incluidos «Microsoft», «Azure», «Foundation 29» y «equivoc…»).

## Escenas

La locución se muestra también como subtítulo. Duración total: 58,5 s.

### 1. Portada (0:00–0:06)

**Locución:** ¿Puedes solicitar el Grado III+ de dependencia extrema? EvalGrado+ te ayuda a entenderlo.

**En pantalla:** «EvalGrado+» · «¿Puedes solicitar el Grado III+ de dependencia extrema?» · Gratuita · Confidencial · Orientativa.

**Web (Bienvenida):** «¿Puedes solicitar el Grado III+ de dependencia extrema?» · «Esta herramienta te ayuda a entender si tu situación o la de tu familiar podría cumplir los requisitos para solicitar el nuevo Grado III+ de dependencia. Es gratuita, confidencial y orientativa.»

### 2. Qué es el Grado III+ (0:06–0:15)

**Locución:** El Grado III+ es un nuevo nivel de protección social para personas con enfermedades graves, irreversibles y con necesidad de apoyo continuo.

**En pantalla:** «¿Qué es el Grado III+?» · escalera Grado I · Grado II · Grado III · III+ · «Un nuevo nivel de protección social para personas con:» · Enfermedades graves · Irreversibles · Necesidad de apoyo continuo (en muchos casos, 24 horas al día) · «Se requiere Grado III reconocido».

**Web (Información → ¿Qué es el Grado III+? y ¿Quién puede solicitarlo?):** «Es un nuevo nivel de protección social para personas con enfermedades graves, irreversibles y con necesidad de apoyo continuo, en muchos casos 24 horas al día.» · «Se requiere Grado III reconocido…»

### 3. Qué hace la herramienta (0:15–0:25)

**Locución:** La herramienta analiza tus respuestas y tus documentos médicos, te da una orientación ALTA, DUDOSA o BAJA y genera un borrador para tu médico.

**En pantalla:** Tus respuestas + Tus documentos médicos → Análisis con IA → Orientación ALTA / DUDOSA / BAJA (verde, ámbar y rojo, como en la web) → Borrador para el médico: «El médico debe revisarlo, verificarlo, completarlo y firmarlo.»

**Web (Información → ¿Qué hace esta herramienta?):** «Analiza tus documentos y respuestas para darte una orientación ALTA/DUDOSA/BAJA y genera un borrador para el profesional médico.» **(Borrador para el médico):** «El médico debe revisarlo, verificarlo, completarlo y firmarlo bajo su responsabilidad profesional.»

### 4. Gratuita y orientativa (0:25–0:33)

**Locución:** Es gratuita, de Fundación 29 en colaboración con Plena inclusión, y no sustituye la valoración médica ni la resolución administrativa.

**En pantalla:** «Gratuita y orientativa» · Gratuita · logotipos de Fundación 29 «en colaboración con» Plena inclusión · No sustituye: la valoración médica, la resolución administrativa.

**Web (pie de la herramienta):** «EvalGrado+ es una herramienta gratuita y orientativa de Foundation 29 en colaboración con Plena inclusión. Utiliza inteligencia artificial y no sustituye valoración médica ni resolución administrativa.»

### 5. Inteligencia artificial (0:33–0:43)

**Locución:** El análisis lo realiza una inteligencia artificial y puede cometer errores. Revisa siempre la evidencia citada y consúltalo con un profesional sanitario.

**En pantalla:** «Contenido generado por inteligencia artificial.» · Puede cometer errores · Revisa siempre la evidencia citada · Consúltalo con un profesional sanitario.

**Web (Bienvenida):** «El análisis lo realiza un sistema de inteligencia artificial y puede equivocarse.» · «Contenido generado por inteligencia artificial. […] Puede contener errores u omisiones: revisa siempre la evidencia citada y consúltalo con un profesional sanitario antes de tomar cualquier decisión.»

### 6. Fundación 29 no guarda tus datos (0:43–0:51)

**Locución:** Fundación 29 no guarda tus documentos, respuestas ni resultados: se procesan en memoria, en servidores de la Unión Europea.

**En pantalla:** «Fundación 29 no guarda tus datos» · Documentos ✕ · Respuestas ✕ · Resultados ✕ · Se procesan en memoria · Se eliminan al terminar el análisis · Servidores en la Unión Europea.

**Web (Bienvenida):** «Foundation 29 no guarda documentos, respuestas ni resultados: se procesan en memoria y se eliminan al terminar el análisis.» · «Los datos se procesan en servidores de Microsoft Azure ubicados en la Unión Europea, conforme al RGPD.» **(Política de privacidad):** «Conservación por Foundation 29: no guardamos tus datos.»

### 7. Cierre (0:51–0:59)

**Locución:** Recuerda: esto no es un diagnóstico clínico ni una resolución oficial.

**En pantalla:** «EvalGrado+» · «Esto no es un diagnóstico clínico ni una resolución oficial.» · «La decisión final corresponde a la administración competente.» · foundation29.org/gradodependencia · logotipos de Fundación 29 y Plena inclusión.

**Web (Bienvenida):** «Esto no es un diagnóstico clínico ni una resolución oficial.» **(Resultado orientativo):** «La decisión final corresponde a la administración competente.»

## Pronunciación

La voz recibe el mismo texto con estos cambios, solo para que lo lea bien: «Grado III+» → «grado tres plus», «EvalGrado+» → «Evalgrado plus», «Fundación 29» → «Fundación veintinueve». Están en `ESCENAS` de `generar_video.py`.

## Estilo, voz y música

- **Imagen:** ilustración vectorial plana con fondos degradados, estrellas, halos y grano suave (inspirada en el estilo de divulgación tipo Kurzgesagt, pero con dibujos propios). Cada elemento aparece sincronizado con la palabra que lo nombra. Todo está en `infografia.html` (SVG + un pequeño motor de animación en JavaScript) y se graba fotograma a fotograma con Chromium. Fuente Nunito (Google Fonts).
- **Voz:** Piper, voz neuronal local `es_ES-sharvard-medium`, hablante 1 (femenina). Voz entrenada con el corpus Sharvard, licencia CC BY 3.0: <https://datashare.ed.ac.uk/handle/10283/574>.
- **Música y efectos:** originales, generados por código en `musica.py` (sin muestras externas). La música baja de volumen mientras habla la voz. Mezcla final normalizada a −16 LUFS.

## Cómo generarlo

Requiere conexión a internet: la primera vez descarga la voz de Piper, y en cada render carga la fuente Nunito y los logotipos desde foundation29.org.

```powershell
pip install playwright imageio-ffmpeg numpy scipy piper-tts onnx
python -m playwright install chromium
python docs/evalgrado/video/generar_video.py                              # vídeo completo (unos 12 min)
python docs/evalgrado/video/generar_video.py --fotogramas --por-escena 3  # fotogramas de revisión
```

Opciones: `--ritmo` (duración relativa de la voz, por defecto 0,9), `--hablante`, `--voz` (otra voz de Piper o una de Windows, p. ej. «Microsoft Laura», con `tts.ps1`), `--sin-musica`, `--fps` (30) y `--crf` (16).

Salida en `docs/evalgrado/video/out/` (no se sube al repositorio): `evalgrado.mp4` (1920×1080, 30 fps, H.264 + AAC, subtítulos incrustados), `evalgrado.srt`, `narracion.wav` y `fotogramas/`.

Para cambiar una frase, edítala en este guion y en `ESCENAS` (`generar_video.py`); si el texto en pantalla cambia, edita `infografia.html`.
