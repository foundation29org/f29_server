#!/usr/bin/env python3
"""Genera el vídeo infográfico de EvalGrado+ (≈1 minuto) a partir del guion de GUION.md.

Requisitos (Windows, por la voz de System.Speech):
  pip install playwright imageio-ffmpeg
  python -m playwright install chromium
  Una voz es-ES instalada (por defecto "Microsoft Laura") y conexión para cargar los logotipos
  desde foundation29.org.

Uso:
  python docs/evalgrado/video/generar_video.py                # vídeo completo
  python docs/evalgrado/video/generar_video.py --fotogramas   # solo un fotograma por escena

Salida en docs/evalgrado/video/out/ (ignorada por git): evalgrado.mp4, evalgrado.srt,
narracion.wav y fotogramas/.
"""
import argparse
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

# Locución por escena (id de la <section> en infografia.html), dividida en subtítulos.
# Cada subtítulo es (texto en pantalla, texto para la voz). El segundo solo cambia la
# pronunciación ("III+", "EvalGrado+", "Foundation 29", cifras); dice lo mismo.
# La locución en pantalla de cada escena debe aparecer literal en GUION.md.
ESCENAS = [
    ("s1", [
        ("¿Puedes solicitar el Grado III+ de dependencia extrema?",
         "¿Puedes solicitar el grado tres más de dependencia extrema?"),
        ("EvalGrado+ te ayuda a entenderlo.",
         "Evalgrado más te ayuda a entenderlo."),
    ]),
    ("s2", [
        ("El Grado III+ es un nuevo nivel de protección social",
         "El grado tres más es un nuevo nivel de protección social"),
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
        ("Es gratuita, de Foundation 29 en colaboración con Plena inclusión,",
         "Es gratuita, de Faundéishon veintinueve en colaboración con Plena inclusión,"),
        ("y no sustituye la valoración médica ni la resolución administrativa.",
         "y no sustituye la valoración médica ni la resolución administrativa."),
    ]),
    ("s5", [
        ("El análisis lo realiza una inteligencia artificial y puede equivocarse.",
         "El análisis lo realiza una inteligencia artificial y puede equivocarse."),
        ("Revisa siempre la evidencia citada y consúltalo con un profesional sanitario.",
         "Revisa siempre la evidencia citada y consúltalo con un profesional sanitario."),
    ]),
    ("s6", [
        ("Foundation 29 no guarda tus documentos, respuestas ni resultados:",
         "Faundéishon veintinueve no guarda tus documentos, respuestas ni resultados:"),
        ("se procesan en memoria, en servidores de la Unión Europea.",
         "se procesan en memoria, en servidores de la Unión Europea."),
    ]),
    ("s7", [
        ("Microsoft puede conservar las peticiones hasta 30 días para detectar abusos, en la Unión Europea.",
         "Microsoft puede conservar las peticiones hasta treinta días para detectar abusos, en la Unión Europea."),
        ("No se usan para entrenar modelos.",
         "No se usan para entrenar modelos."),
    ]),
    ("s8", [
        ("Recuerda: esto no es un diagnóstico clínico ni una resolución oficial.",
         "Recuerda: esto no es un diagnóstico clínico ni una resolución oficial."),
    ]),
]

# Lo que el vídeo no puede decir: la revisión biomédica está pendiente y los detalles internos
# (modelos, pruebas, fallos, evaluación de impacto) no son para el público.
PROHIBIDO = [
    r"revisad[oa]", r"biom[eé]dic", r"\bgpt", r"modelo de lenguaje", r"\bdavid\b",
    r"\bpruebas?\b", r"probad[oa]", r"\bbugs?\b", r"evaluaci[oó]n de impacto", r"\beipd\b",
    r"ficticio", r"sint[eé]tic",
]

ENTRADA = 0.8   # s de imagen antes de la primera frase
ADELANTO = 0.35  # cada escena aparece este tiempo antes de su locución
PAUSA = 0.45    # silencio entre escenas
COLA = 2.8      # cierre tras la última frase


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


def sintetizar(voz, velocidad):
    carpeta = OUT / "voz"
    entrada = OUT / "voz-entrada.json"
    datos = [{"id": id_, "texto": " ".join(v for _, v in subs)} for id_, subs in ESCENAS]
    entrada.write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")
    shell = shutil.which("pwsh") or shutil.which("powershell")
    if not shell:
        sys.exit("Hace falta PowerShell (Windows) para la voz.")
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
            "pcm": muestras.tobytes(),
        }
        ultima = voces[d["id"]]["marcas"][-1][1]
        if ultima >= voces[d["id"]]["duracion"]:
            sys.exit(f"{d['id']}: marcas de tiempo fuera del audio ({ultima:.2f}s); revisa tts.ps1.")
    return voces


def montar_linea_temporal(voces):
    escenas, subtitulos, t = [], [], 0.0
    for i, (id_, subs) in enumerate(ESCENAS):
        v = voces[id_]
        adelanto = ENTRADA if i == 0 else ADELANTO
        voz_inicio = t + adelanto
        fin = voz_inicio + v["duracion"] + (COLA if i == len(ESCENAS) - 1 else PAUSA)
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


def escribir_audio(voces, tl, destino):
    frecuencia = voces[ESCENAS[0][0]]["frecuencia"]
    pcm = bytearray(int(math.ceil(tl["total"] * frecuencia)) * 2)
    for e in tl["escenas"]:
        datos = voces[e["id"]]["pcm"]
        o = int(round(e["voz_inicio"] * frecuencia)) * 2
        pcm[o:o + len(datos)] = datos
    with wave.open(str(destino), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(frecuencia)
        w.writeframes(bytes(pcm))


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
    return nav, pag


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--voz", default="Microsoft Laura")
    ap.add_argument("--velocidad", type=int, default=2, help="velocidad de la voz, de -10 a 10")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--fotogramas", action="store_true", help="solo exporta un fotograma por escena")
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright
    import imageio_ffmpeg

    OUT.mkdir(exist_ok=True)
    voces = sintetizar(args.voz, args.velocidad)
    tl = montar_linea_temporal(voces)
    escribir_audio(voces, tl, OUT / "narracion.wav")
    escribir_srt(tl, OUT / "evalgrado.srt")

    with sync_playwright() as p:
        nav, pag = abrir_plantilla(p)
        comprobar_textos(pag.evaluate("document.getElementById('stage').textContent"))
        tiempos = pag.evaluate("tl => setup(tl)", tl)

        print("Escena  inicio   fin    locución")
        for e in tl["escenas"]:
            print(f"{e['id']:<6} {e['inicio']:6.2f} {e['fin']:6.2f}  {e['texto'][:60]}")
        print(f"Duración total: {tl['total']:.2f} s")

        carpeta = OUT / "fotogramas"
        carpeta.mkdir(exist_ok=True)
        for e, anims in zip(tl["escenas"], tiempos):
            t = min(e["inicio"] + max(anims["anims"] + [0]) + 0.7, e["fin"] - 0.4)
            if e is tl["escenas"][-1]:
                t = e["fin"] - 0.5
            pag.evaluate("t => render(t)", t)
            pag.screenshot(path=str(carpeta / f"{e['id']}.png"))
        if args.fotogramas:
            nav.close()
            print(f"Fotogramas en {carpeta}")
            return

        mp4 = OUT / "evalgrado.mp4"
        cmd = [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error",
               "-f", "image2pipe", "-framerate", str(args.fps), "-c:v", "png", "-i", "-",
               "-i", str(OUT / "narracion.wav"),
               "-map", "0:v", "-map", "1:a",
               "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
               "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000", "-c:a", "aac", "-b:a", "160k",
               "-metadata", "title=EvalGrado+ · Qué es y condiciones de uso",
               "-metadata:s:a:0", "language=spa", "-movflags", "+faststart",
               "-t", f"{tl['total']:.3f}", str(mp4)]
        ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        total = int(math.ceil(tl["total"] * args.fps))
        inicio = time.time()
        for n in range(total):
            pag.evaluate("t => render(t)", n / args.fps)
            ff.stdin.write(pag.screenshot(type="png"))
            if n % (args.fps * 10) == 0:
                print(f"  fotograma {n}/{total} ({time.time() - inicio:.0f} s)")
        ff.stdin.close()
        if ff.wait() != 0:
            sys.exit("ffmpeg falló al codificar el vídeo.")
        nav.close()
    print(f"Vídeo: {mp4}\nSubtítulos: {OUT / 'evalgrado.srt'}")


if __name__ == "__main__":
    main()
