#!/usr/bin/env python3
"""Genera el vídeo infográfico de EvalGrado+ (≈1 minuto) a partir del guion de GUION.md.

Requisitos:
  pip install playwright imageio-ffmpeg numpy scipy piper-tts onnx
  python -m playwright install chromium
  Conexión a internet: la primera vez descarga la voz de Piper; en cada render carga la
  fuente Nunito y los logotipos desde foundation29.org.

Uso:
  python docs/evalgrado/video/generar_video.py                # vídeo completo
  python docs/evalgrado/video/generar_video.py --fotogramas   # solo un fotograma por escena

Salida en docs/evalgrado/video/out/ (ignorada por git): evalgrado.mp4, evalgrado.srt,
narracion.wav, mezcla.wav y fotogramas/.
"""
import argparse
import base64
import json
import math
import re
import shutil
import subprocess
import sys
import time
import wave
from array import array
from pathlib import Path

AQUI = Path(__file__).resolve().parent
OUT = AQUI / "out"
VOZ_PIPER = "es_ES-sharvard-medium"

# Locución por escena (id de la <section> en infografia.html), dividida en subtítulos.
# Cada subtítulo es (texto en pantalla, texto para la voz). El segundo solo cambia la
# pronunciación ("III+", "EvalGrado+", cifras); dice lo mismo.
# La locución en pantalla de cada escena debe aparecer literal en GUION.md.
ESCENAS = [
    ("s1", [
        ("¿Puedes solicitar el Grado III+ de dependencia extrema?",
         "¿Puedes solicitar el grado tres plus de dependencia extrema?"),
        ("EvalGrado+ te ayuda a entenderlo.",
         "Evalgrado plus te ayuda a entenderlo."),
    ]),
    ("s2", [
        ("El Grado III+ es un nuevo nivel de protección social",
         "El grado tres plus es un nuevo nivel de protección social"),
        ("para personas con enfermedades graves, irreversibles y con necesidad de apoyo continuo.",
         "para personas con enfermedades graves, irreversibles y con necesidad de apoyo continuo."),
    ]),
    ("s3", [
        ("La herramienta analiza tus respuestas y tus documentos médicos,",
         "La herramienta analiza tus respuestas y tus documentos médicos,"),
        ("te da una orientación ALTA, DUDOSA o BAJA y genera un borrador para tu médico.",
         "te da una orientación alta, dudosa o baja, y genera un borrador para tu médico."),
    ]),
    ("s4", [
        ("Es gratuita, de Fundación 29 en colaboración con Plena inclusión,",
         "Es gratuita, de Fundación veintinueve en colaboración con Plena inclusión,"),
        ("y no sustituye la valoración médica ni la resolución administrativa.",
         "y no sustituye la valoración médica ni la resolución administrativa."),
    ]),
    ("s5", [
        ("El análisis lo realiza una inteligencia artificial y puede cometer errores.",
         "El análisis lo realiza una inteligencia artificial y puede cometer errores."),
        ("Revisa siempre la evidencia citada y consúltalo con un profesional sanitario.",
         "Revisa siempre la evidencia citada y consúltalo con un profesional sanitario."),
    ]),
    ("s6", [
        ("Fundación 29 no guarda tus documentos, respuestas ni resultados:",
         "Fundación veintinueve no guarda tus documentos, respuestas ni resultados:"),
        ("se procesan en memoria, en servidores de la Unión Europea.",
         "se procesan en memoria, en servidores de la Unión Europea."),
    ]),
    ("s7", [
        ("Recuerda: esto no es un diagnóstico clínico ni una resolución oficial.",
         "Recuerda: esto no es un diagnóstico clínico ni una resolución oficial."),
    ]),
]

# Lo que el vídeo no puede decir: la revisión biomédica está pendiente y los detalles internos
# (modelos, pruebas, fallos, evaluación de impacto) no son para el público. Además, por
# decisión del equipo: no se nombra a Microsoft, la fundación se llama «Fundación 29» y
# de la IA se dice que «puede cometer errores».
PROHIBIDO = [
    r"revisad[oa]", r"biom[eé]dic", r"\bgpt", r"modelo de lenguaje", r"\bdavid\b",
    r"\bpruebas?\b", r"probad[oa]", r"\bbugs?\b", r"evaluaci[oó]n de impacto", r"\beipd\b",
    r"ficticio", r"sint[eé]tic", r"microsoft", r"azure", r"foundation 29", r"equivoc",
]

ENTRADA = 0.8   # s de imagen antes de la primera frase
ADELANTO = 0.4  # cada escena aparece este tiempo antes de su locución
PAUSA = 0.35    # silencio entre escenas
PAUSA_FRASE = 0.22  # silencio entre frases de una misma escena (Piper)
COLA = 3.0      # cierre tras la última frase
# Tiempo extra al final de una escena para leer un texto que aparece con la última palabra.
RETENCION = {"s3": 1.8}
PUNTUACION = set(",.;:?!¿¡\"«»()…—-")


def comprobar_textos(texto_html):
    guion = (AQUI / "GUION.md").read_text(encoding="utf-8")
    errores = []
    for id_, subs in ESCENAS:
        locucion = " ".join(p for p, _ in subs)
        if locucion not in guion:
            errores.append(f"{id_}: la locución no aparece literal en GUION.md:\n    {locucion}")
    todo = " ".join(f"{p} {v}" for _, subs in ESCENAS for p, v in subs) + " " + texto_html
    for patron in PROHIBIDO:
        m = re.search(patron, todo, re.IGNORECASE)
        if m:
            errores.append(f"texto prohibido en el vídeo: «{m.group(0)}» (patrón {patron})")
    if errores:
        sys.exit("Revisión de textos fallida:\n  " + "\n  ".join(errores))


def sintetizar_sapi(voz, velocidad):
    """Voz de System.Speech (Windows), con marcas de palabra de SAPI."""
    import numpy as np
    carpeta = OUT / "voz"
    entrada = OUT / "voz-entrada.json"
    datos = [{"id": id_, "texto": " ".join(v for _, v in subs)} for id_, subs in ESCENAS]
    entrada.write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")
    shell = shutil.which("pwsh") or shutil.which("powershell")
    if not shell:
        sys.exit("Hace falta PowerShell (Windows) para la voz de SAPI.")
    subprocess.run([shell, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
                    "-File", str(AQUI / "tts.ps1"), "-Escenas", str(entrada), "-Salida", str(carpeta),
                    "-Voz", voz, "-Velocidad", str(velocidad)], check=True)
    marcas = json.loads((carpeta / "marcas.json").read_text(encoding="utf-8-sig"))
    voces = {}
    for d in datos:
        with wave.open(str(carpeta / f"{d['id']}.wav"), "rb") as w:
            frecuencia = w.getframerate()
            muestras = array("h", w.readframes(w.getnframes()))
        # SAPI deja ~0,7 s de silencio al final de cada frase; se recorta dejando una cola corta.
        ultima_voz = next((i for i in range(len(muestras) - 1, -1, -1) if abs(muestras[i]) > 500), len(muestras))
        muestras = muestras[:min(len(muestras), ultima_voz + int(0.15 * frecuencia))]
        voces[d["id"]] = {
            "texto": d["texto"], "marcas": marcas[d["id"]],
            "duracion": len(muestras) / frecuencia, "frecuencia": frecuencia,
            "muestras": np.frombuffer(muestras.tobytes(), dtype="<i2").astype(np.float32) / 32768,
        }
        ultima = voces[d["id"]]["marcas"][-1][1]
        if ultima >= voces[d["id"]]["duracion"]:
            sys.exit(f"{d['id']}: marcas de tiempo fuera del audio ({ultima:.2f}s); revisa tts.ps1.")
    return voces


def sintetizar_piper(nombre, hablante, ritmo):
    """Voz neuronal local de Piper. Las marcas de palabra salen de la alineación de fonemas."""
    import numpy as np
    from piper import PiperVoice, SynthesisConfig

    carpeta = OUT / "voces"
    modelo = carpeta / f"{nombre}.onnx"
    if not modelo.exists():
        carpeta.mkdir(parents=True, exist_ok=True)
        subprocess.run([sys.executable, "-m", "piper.download_voices", "--download-dir", str(carpeta), nombre],
                       check=True)
    voz = PiperVoice.load(str(modelo), include_alignments=True)
    frecuencia = voz.config.sample_rate
    cfg = SynthesisConfig(speaker_id=hablante, length_scale=ritmo)
    voces = {}
    for id_, subs in ESCENAS:
        texto = " ".join(v for _, v in subs)
        palabras = [m.start() for m in re.finditer(r"\S+", texto)]
        trozos, inicios, desplazamiento = [], [], 0
        for k, trozo in enumerate(voz.synthesize(texto, syn_config=cfg, include_alignments=True)):
            if not trozo.phoneme_alignments:
                sys.exit("La voz no devuelve la alineación de fonemas: instala el paquete onnx.")
            if k:
                trozos.append(np.zeros(int(PAUSA_FRASE * frecuencia), dtype=np.float32))
                desplazamiento += len(trozos[-1])
            pos, nueva = 0, True
            for al in trozo.phoneme_alignments:
                if al.phoneme == " ":
                    nueva = True
                elif nueva and al.phoneme not in "^$_" and al.phoneme not in PUNTUACION:
                    inicios.append(desplazamiento + pos)
                    nueva = False
                pos += int(al.num_samples)
            trozos.append(trozo.audio_float_array.astype(np.float32))
            desplazamiento += len(trozos[-1])
        muestras = np.concatenate(trozos)
        voz_activa = np.nonzero(np.abs(muestras) > 0.02)[0]
        muestras = muestras[:min(len(muestras), voz_activa[-1] + int(0.12 * frecuencia))]
        if len(inicios) != len(palabras):
            print(f"Aviso: {id_}: {len(inicios)} palabras en la voz y {len(palabras)} en el texto; "
                  "las marcas se reparten por longitud.")
            inicios = [int(p / len(texto) * len(muestras)) for p in palabras]
        voces[id_] = {
            "texto": texto, "marcas": [[p, round(s / frecuencia, 3)] for p, s in zip(palabras, inicios)],
            "duracion": len(muestras) / frecuencia, "frecuencia": frecuencia, "muestras": muestras,
        }
    return voces


def montar_linea_temporal(voces):
    escenas, subtitulos, t = [], [], 0.0
    for i, (id_, subs) in enumerate(ESCENAS):
        v = voces[id_]
        adelanto = ENTRADA if i == 0 else ADELANTO
        voz_inicio = t + adelanto
        fin = voz_inicio + v["duracion"] + (COLA if i == len(ESCENAS) - 1 else PAUSA) + RETENCION.get(id_, 0.0)
        escenas.append({
            "id": id_, "inicio": round(t, 3), "fin": round(fin, 3), "voz_inicio": round(voz_inicio, 3),
            "texto": v["texto"], "marcas": [[pos, round(seg + adelanto, 3)] for pos, seg in v["marcas"]],
        })
        # Cada subtítulo empieza cuando la voz llega a su primera palabra.
        inicios, pos = [], 0
        for _, hablado in subs:
            seg = next((s for p, s in v["marcas"] if p >= pos), v["marcas"][-1][1])
            inicios.append(voz_inicio + max(0.0, seg - 0.15))
            pos += len(hablado) + 1
        for k, (pantalla, _) in enumerate(subs):
            final = inicios[k + 1] if k + 1 < len(subs) else min(voz_inicio + v["duracion"] + 0.3, fin - 0.05)
            subtitulos.append({"inicio": round(inicios[k], 3), "fin": round(final, 3), "texto": pantalla})
        t = fin
    return {"escenas": escenas, "subtitulos": subtitulos, "total": round(t, 3)}


def escribir_wav(destino, x, frecuencia):
    import numpy as np
    x = np.clip(x, -1, 1)
    with wave.open(str(destino), "wb") as w:
        w.setnchannels(1 if x.ndim == 1 else x.shape[1])
        w.setsampwidth(2)
        w.setframerate(frecuencia)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def montar_narracion(voces, tl):
    """Pista de voz (mono, 48 kHz) con cada escena en su sitio."""
    import numpy as np
    import musica
    voz = np.zeros(int(math.ceil(tl["total"] * musica.SR)), dtype=np.float64)
    for e in tl["escenas"]:
        v = voces[e["id"]]
        datos = musica.remuestrear(v["muestras"].astype(np.float64), v["frecuencia"])
        datos *= 0.75 / (np.max(np.abs(datos)) + 1e-9)
        o = int(round(e["voz_inicio"] * musica.SR))
        datos = datos[:len(voz) - o]
        voz[o:o + len(datos)] += datos
    return voz


def medir_sonoridad(ffmpeg, wav):
    r = subprocess.run([ffmpeg, "-hide_banner", "-nostats", "-i", str(wav), "-af",
                        "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    datos = json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])
    return (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={datos['input_i']}:measured_TP={datos['input_tp']}"
            f":measured_LRA={datos['input_lra']}:measured_thresh={datos['input_thresh']}"
            f":offset={datos['target_offset']}:linear=true")


def escribir_srt(tl, destino):
    def ts(s):
        ms = int(round(s * 1000))
        return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"
    bloques = [f"{n}\n{ts(c['inicio'])} --> {ts(c['fin'])}\n{c['texto']}\n"
               for n, c in enumerate(tl["subtitulos"], 1)]
    destino.write_text("\n".join(bloques), encoding="utf-8")


def abrir_plantilla(p):
    nav = p.chromium.launch()
    pag = nav.new_page(viewport={"width": 1920, "height": 1080})
    pag.goto((AQUI / "infografia.html").as_uri())
    pag.wait_for_load_state("networkidle")
    pag.evaluate("document.fonts.ready.then(() => true)")
    rotas = pag.evaluate("[...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src)")
    if rotas:
        sys.exit("No se pudieron cargar los logotipos:\n  " + "\n  ".join(rotas))
    if not pag.evaluate("document.fonts.check('900 40px Nunito')"):
        print("Aviso: no se cargó la fuente Nunito; se usa la alternativa del sistema.")
    return nav, pag


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--voz", default=VOZ_PIPER,
                    help=f"voz de Piper (por defecto {VOZ_PIPER}) o de Windows («Microsoft Laura»)")
    ap.add_argument("--hablante", type=int, default=1, help="Piper: hablante de la voz (sharvard: 0 hombre, 1 mujer)")
    ap.add_argument("--ritmo", type=float, default=0.9, help="Piper: duración relativa (>1 más lento)")
    ap.add_argument("--velocidad", type=int, default=2, help="Windows: velocidad de la voz, de -10 a 10")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--crf", type=int, default=16, help="calidad x264 (menor = mejor)")
    ap.add_argument("--sin-musica", action="store_true", help="solo voz y efectos")
    ap.add_argument("--fotogramas", action="store_true", help="solo exporta fotogramas de revisión")
    ap.add_argument("--por-escena", type=int, default=1, help="fotogramas de revisión por escena")
    args = ap.parse_args()

    import numpy as np
    from playwright.sync_api import sync_playwright
    import imageio_ffmpeg
    import musica

    OUT.mkdir(exist_ok=True)
    if args.voz.lower().startswith("microsoft"):
        voces = sintetizar_sapi(args.voz, args.velocidad)
    else:
        voces = sintetizar_piper(args.voz, args.hablante, args.ritmo)
    tl = montar_linea_temporal(voces)
    voz = montar_narracion(voces, tl)
    escribir_wav(OUT / "narracion.wav", voz, musica.SR)
    escribir_srt(tl, OUT / "evalgrado.srt")

    with sync_playwright() as p:
        nav, pag = abrir_plantilla(p)
        comprobar_textos(pag.evaluate("document.getElementById('stage').textContent"))
        info = pag.evaluate("tl => setup(tl)", tl)

        print("Escena  inicio   fin    locución")
        for e in tl["escenas"]:
            print(f"{e['id']:<6} {e['inicio']:6.2f} {e['fin']:6.2f}  {e['texto'][:60]}")
        print(f"Duración total: {tl['total']:.2f} s")

        carpeta = OUT / "fotogramas"
        shutil.rmtree(carpeta, ignore_errors=True)
        carpeta.mkdir()
        for e, anims in zip(tl["escenas"], info["escenas"]):
            listo = min(e["inicio"] + max(anims["anims"] + [0]) + 0.9, e["fin"] - 0.35)
            if e is tl["escenas"][-1]:
                listo = e["fin"] - 0.6
            n = args.por_escena
            instantes = [listo] if n == 1 else [e["inicio"] + (listo - e["inicio"]) * (k + 1) / n for k in range(n)]
            for k, t in enumerate(instantes):
                pag.evaluate("t => render(t)", t)
                pag.screenshot(path=str(carpeta / f"{e['id']}{'' if n == 1 else f'-{k + 1}'}.png"))
        if args.fotogramas:
            nav.close()
            print(f"Fotogramas en {carpeta}")
            return

        print("Componiendo la música y los efectos…")
        musica_ = np.zeros((len(voz), 2)) if args.sin_musica else musica.componer(tl["escenas"], tl["total"])
        efectos = musica.efectos(info["sfx"], tl["total"])
        escribir_wav(OUT / "mezcla.wav", musica.mezclar(voz, musica_, efectos), musica.SR)
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        sonoridad = medir_sonoridad(ffmpeg, OUT / "mezcla.wav")

        mp4 = OUT / "evalgrado.mp4"
        cmd = [ffmpeg, "-y", "-loglevel", "error",
               "-f", "image2pipe", "-framerate", str(args.fps), "-c:v", "png", "-i", "-",
               "-i", str(OUT / "mezcla.wav"),
               "-map", "0:v", "-map", "1:a",
               "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
               "-c:v", "libx264", "-preset", "slow", "-tune", "animation", "-crf", str(args.crf),
               "-x264-params", "aq-mode=3", "-g", str(args.fps * 2),
               "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
               "-af", f"{sonoridad},aresample=48000", "-c:a", "aac", "-b:a", "192k", "-ac", "2",
               "-metadata", "title=EvalGrado+ · Qué es y condiciones de uso",
               "-metadata:s:a:0", "language=spa", "-movflags", "+faststart",
               "-t", f"{tl['total']:.3f}", str(mp4)]
        ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        cdp = pag.context.new_cdp_session(pag)
        total = int(math.ceil(tl["total"] * args.fps))
        inicio = time.time()
        for n in range(total):
            pag.evaluate("t => render(t)", n / args.fps)
            png = cdp.send("Page.captureScreenshot", {"format": "png", "optimizeForSpeed": True})["data"]
            ff.stdin.write(base64.b64decode(png))
            if n % (args.fps * 10) == 0:
                print(f"  fotograma {n}/{total} ({time.time() - inicio:.0f} s)")
        ff.stdin.close()
        if ff.wait() != 0:
            sys.exit("ffmpeg falló al codificar el vídeo.")
        nav.close()
    print(f"Vídeo: {mp4}\nSubtítulos: {OUT / 'evalgrado.srt'}")


if __name__ == "__main__":
    main()


