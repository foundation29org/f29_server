"""Música y efectos de sonido originales para el vídeo de EvalGrado+.

Todo se sintetiza por código (sin samples ni pistas de terceros): una pieza ambiental y
esperanzadora en re mayor que sigue las escenas, efectos suaves para las transiciones y las
apariciones, y la mezcla final con la voz (la música baja mientras se habla).
"""
import numpy as np
from scipy import ndimage, signal

SR = 48000
BPM = 88
NEGRA = 60 / BPM
COMPAS = 4 * NEGRA

# (bajo, pad, arpegio) en MIDI. Dmaj9 · Bm9 · Gmaj9 · Asus4(9), y cierre en re mayor.
PROGRESION = [
    (38, [57, 61, 64, 66], [69, 73, 76, 78]),
    (35, [54, 57, 61, 62], [66, 69, 73, 74]),
    (31, [54, 57, 59, 62], [66, 69, 71, 74]),
    (33, [52, 57, 59, 62], [64, 69, 71, 76]),
]
FINAL = (38, [50, 57, 62, 64, 66, 69], [74, 78, 81, 86])
PATRON_ARPEGIO = [0, 1, 2, 3, 2, 1, 3, 2]

# Nivel de cada capa por escena: pad, arpegio, bajo, percusión, campanas.
NIVELES = {
    "s1": (1.0, 0.0, 0.35, 0.0, 1.0),
    "s2": (1.0, 0.75, 0.7, 0.0, 0.5),
    "s3": (0.85, 1.0, 1.0, 0.8, 0.35),
    "s4": (0.85, 1.0, 1.0, 1.0, 0.35),
    "s5": (1.0, 0.55, 0.8, 0.0, 0.25),
    "s6": (1.0, 0.8, 0.85, 0.55, 0.25),
    "s7": (1.0, 0.85, 0.9, 0.6, 0.3),
    "s8": (1.0, 0.35, 0.6, 0.0, 1.0),
}


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def _t(dur):
    return np.arange(int(dur * SR)) / SR


def _env(n, ataque, caida):
    e = np.ones(n)
    a, r = min(n, int(ataque * SR)), min(n, int(caida * SR))
    if a:
        e[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if r:
        e[n - r:] *= np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    return e


def _sumar(dest, x, inicio, pan=None):
    """Suma x (mono o estéreo) en dest a partir del segundo `inicio`."""
    i = int(round(inicio * SR))
    if i >= len(dest):
        return
    if i < 0:
        x, i = x[-i:], 0
    x = x[:len(dest) - i]
    if x.ndim == 1:
        p = 0.0 if pan is None else pan
        x = np.stack([x * np.cos((p + 1) * np.pi / 4), x * np.sin((p + 1) * np.pi / 4)], axis=1) * np.sqrt(2)
    dest[i:i + len(x)] += x


# ---------------------------------------------------------------- instrumentos

def pad(f, dur, rng):
    """Sintetizador cálido: tres sierras desafinadas con filtro que se abre poco a poco."""
    t = _t(dur)
    n = len(t)
    brillo = 2.2 + 1.6 * np.sin(np.pi * np.clip(t / dur, 0, 1))  # el filtro se abre y se cierra
    out = np.zeros((n, 2))
    for cents, pan in ((-8, 0.15), (0, 0.5), (8, 0.85)):
        fd = f * 2 ** (cents / 1200)
        v = np.zeros(n)
        for k in range(1, int(min(12, 7000 / fd)) + 1):
            v += np.exp(-(k - 1) / brillo) / k * np.sin(2 * np.pi * fd * k * t + rng.uniform(0, 2 * np.pi))
        out[:, 0] += v * np.sqrt(1 - pan)
        out[:, 1] += v * np.sqrt(pan)
    return out * _env(n, 1.0, 1.6)[:, None]


def pulsacion(f, dur=1.4):
    """Nota punteada tipo marimba suave."""
    t = _t(dur)
    v = sum(a * np.exp(-t * (2.8 + 3.2 * k)) * np.sin(2 * np.pi * f * k * t)
            for k, a in ((1, 1.0), (2, 0.42), (3, 0.2), (4, 0.08)))
    v += 0.12 * np.exp(-t * 30) * np.sin(2 * np.pi * f * 4.07 * t)
    return v * np.minimum(1, t / 0.004)


def campana(f, dur=4.0, brillo=2.0):
    t = _t(dur)
    indice = brillo * np.exp(-t * 1.6)
    v = np.sin(2 * np.pi * f * t + indice * np.sin(2 * np.pi * f * 3.5 * t))
    v += 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 2.5)
    return v * np.exp(-t * 1.0) * np.minimum(1, t / 0.003)


def bajo(f, dur):
    t = _t(dur)
    v = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    return v * _env(len(t), 0.04, 0.5)


def bombo():
    t = _t(0.5)
    fr = 46 + 75 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 7.5) * np.minimum(1, t / 0.002)


def maraca(rng, dur=0.09, corte=5500):
    t = _t(dur)
    b, a = signal.butter(2, corte / (SR / 2), "high")
    return signal.lfilter(b, a, rng.standard_normal(len(t))) * np.exp(-t * 55)


def aro(rng):
    t = _t(0.18)
    b, a = signal.butter(2, [900 / (SR / 2), 3200 / (SR / 2)], "band")
    ruido = signal.lfilter(b, a, rng.standard_normal(len(t))) * np.exp(-t * 32)
    return ruido + 0.4 * np.sin(2 * np.pi * 420 * t) * np.exp(-t * 40)


def reverberacion(rng, dur=3.2, rt60=2.6):
    t = _t(dur)
    caida = np.exp(-6.91 * t / rt60)
    b, a = signal.butter(1, 4500 / (SR / 2))
    ir = np.stack([signal.lfilter(b, a, rng.standard_normal(len(t))) * caida for _ in range(2)], axis=1)
    ir = np.concatenate([np.zeros((int(0.025 * SR), 2)), ir])
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def _reverb(x, ir, mezcla):
    mojado = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], axis=1)
    return x + mezcla * mojado


# ---------------------------------------------------------------- composición

def _curva(escenas, total, capa):
    """Nivel de una capa a lo largo del tiempo, con transiciones suaves de ~1,5 s."""
    fc = 100
    n = int(total * fc) + 1
    c = np.zeros(n)
    for e in escenas:
        a, b = int(e["inicio"] * fc), int(e["fin"] * fc)
        c[a:b + 1] = NIVELES.get(e["id"], (1, 1, 1, 1, 1))[capa]
    c[int(escenas[-1]["fin"] * fc):] = NIVELES.get(escenas[-1]["id"], (1,) * 5)[capa]
    ventana = np.hanning(int(1.5 * fc))
    c = np.convolve(np.pad(c, len(ventana), mode="edge"), ventana / ventana.sum(), mode="same")[len(ventana):-len(ventana)]
    return np.interp(np.arange(int(total * SR)) / SR, np.arange(n) / fc, c[:n])


def componer(escenas, total, semilla=29, solo_capas=False):
    rng = np.random.default_rng(semilla)
    n = int(total * SR)
    capas = [np.zeros((n, 2)) for _ in range(5)]
    capa_pad, capa_arp, capa_bajo, capa_perc, capa_camp = capas

    compases = max(2, int((total - 4.5) / COMPAS))
    desfase = (3 - (compases - 1)) % len(PROGRESION)  # el último compás es el acorde de la (V → I)
    for c in range(compases):
        t0 = c * COMPAS
        b, notas_pad, notas_arp = PROGRESION[(c + desfase) % len(PROGRESION)]
        for m in notas_pad:
            _sumar(capa_pad, pad(hz(m), COMPAS + 1.6, rng), t0)
        _sumar(capa_bajo, bajo(hz(b), COMPAS - 0.05), t0)
        _sumar(capa_bajo, bajo(hz(b + 12), NEGRA * 1.5) * 0.25, t0 + 2.5 * NEGRA)
        for k in range(8):
            nota = notas_arp[PATRON_ARPEGIO[k]]
            _sumar(capa_arp, pulsacion(hz(nota)) * (1.0 if k % 2 == 0 else 0.7), t0 + k * NEGRA / 2,
                   pan=0.35 * np.sin(k * np.pi / 4 + c))
        for k in range(4):
            if k in (0, 2):
                _sumar(capa_perc, bombo(), t0 + k * NEGRA)
            if k in (1, 3):
                _sumar(capa_perc, aro(rng) * 0.35, t0 + k * NEGRA, pan=0.15)
        for k in range(16):
            _sumar(capa_perc, maraca(rng) * (0.22 if k % 2 else 0.12), t0 + k * NEGRA / 4, pan=-0.3)
        if c % 2 == 0:
            _sumar(capa_camp, campana(hz(notas_arp[3] + 12), 4.0) * 0.5, t0 + NEGRA * 0.02, pan=0.4)

    # Acorde final que resuelve y se apaga.
    t0 = compases * COMPAS
    b, notas_pad, notas_arp = FINAL
    resto = total - t0
    for m in notas_pad:
        _sumar(capa_pad, pad(hz(m), resto + 0.5, rng) * 0.85, t0)
    _sumar(capa_bajo, bajo(hz(b), resto), t0)
    for k, m in enumerate(notas_arp):
        _sumar(capa_camp, campana(hz(m), 5.0, 1.6) * 0.45, t0 + k * NEGRA / 2, pan=-0.4 + 0.27 * k)
        _sumar(capa_arp, pulsacion(hz(m)) * 0.7, t0 + k * NEGRA / 2)
    # Campanas de entrada.
    for k, m in enumerate((74, 81, 78)):
        _sumar(capa_camp, campana(hz(m + 12), 4.0, 1.4) * 0.35, 0.25 + k * NEGRA * 0.75, pan=0.5 - 0.5 * k)

    pesos = (0.106, 0.45, 0.18, 0.44, 0.56)
    if solo_capas:
        return capas
    mezcla = np.zeros((n, 2))
    for i, capa in enumerate(capas):
        mezcla += capa * pesos[i] * _curva(escenas, total, i)[:, None]
    mezcla = _reverb(mezcla, reverberacion(rng), 0.35)
    # Entrada, salida y nivel fijo (−21 dBFS RMS) antes de mezclar con la voz.
    mezcla *= _env(n, 1.2, 3.0)[:, None]
    return mezcla * 10 ** (-21 / 20) / np.sqrt(np.mean(mezcla ** 2))


# ---------------------------------------------------------------- efectos

def _filtro_barrido(x, cortes, q=0.9):
    """Filtro de estado variable con frecuencia de corte variable (paso banda)."""
    y = np.zeros_like(x)
    bajo_ = banda = 0.0
    for i in range(len(x)):
        f = 2 * np.sin(np.pi * min(cortes[i], SR / 6) / SR)
        alto = x[i] - bajo_ - q * banda
        banda += f * alto
        bajo_ += f * banda
        y[i] = banda
    return y


def silbido(rng, dur=0.75, f0=250, f1=2600):
    t = _t(dur)
    forma = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.6
    cortes = f0 + (f1 - f0) * np.sin(np.pi * t / dur * 0.5) ** 2
    v = _filtro_barrido(rng.standard_normal(len(t)), cortes) * forma
    v /= np.max(np.abs(v)) + 1e-9
    pan = np.linspace(-0.6, 0.6, len(t))
    return np.stack([v * np.cos((pan + 1) * np.pi / 4), v * np.sin((pan + 1) * np.pi / 4)], axis=1) * np.sqrt(2)


def burbuja(f=520):
    t = _t(0.18)
    fr = f * (1 + 0.7 * (1 - np.exp(-t * 45)))
    v = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 26) * np.minimum(1, t / 0.003)
    return v + 0.25 * np.sin(4 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 40)


def golpe(rng):
    t = _t(0.3)
    fr = 85 + 110 * np.exp(-t * 35)
    b, a = signal.butter(2, 1200 / (SR / 2))
    return (np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 14)
            + 0.3 * signal.lfilter(b, a, rng.standard_normal(len(t))) * np.exp(-t * 40))


def subida(rng, dur=1.5):
    t = _t(dur)
    fr = 330 * 2 ** (2 * t / dur)
    v = np.sin(2 * np.pi * np.cumsum(fr) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t))
    v += 0.4 * _filtro_barrido(rng.standard_normal(len(t)), 400 + 3000 * t / dur)
    return v * (t / dur) ** 1.5 * _env(len(t), 0.01, 0.08)


def alerta():
    t = _t(0.16)
    out = []
    for f in (hz(81), hz(77)):
        v = sum(np.sin(2 * np.pi * f * k * t) / k for k in (1, 3, 5)) * _env(len(t), 0.005, 0.08)
        out.append(v)
    return np.concatenate(out)


NOTAS_DING = [86, 88, 90, 93, 95, 98]  # re pentatónico agudo


def efectos(eventos, total, semilla=7):
    """eventos: [{"t": s, "tipo": "pop|ding|whoosh|swish|thud|rise|alert", "pan": -1..1, "nota": i}]."""
    rng = np.random.default_rng(semilla)
    out = np.zeros((int(total * SR), 2))
    for ev in eventos:
        t, tipo, pan = ev["t"], ev["tipo"], float(ev.get("pan", 0))
        nota = int(ev.get("nota", 0))
        if tipo == "whoosh":
            _sumar(out, silbido(rng) * 0.32, t - 0.45)
        elif tipo == "swish":
            _sumar(out, silbido(rng, 0.4, 900, 4200) * 0.16, t - 0.15)
        elif tipo == "pop":
            _sumar(out, burbuja(hz(74 + 2 * (nota % 5))) * 0.22, t, pan)
        elif tipo == "ding":
            f = hz(NOTAS_DING[nota % len(NOTAS_DING)])
            _sumar(out, (campana(f, 2.0, 1.2) * 0.5 + pulsacion(f, 2.0) * 0.5) * 0.22, t, pan)
        elif tipo == "thud":
            _sumar(out, golpe(rng) * 0.3, t, pan)
        elif tipo == "rise":
            _sumar(out, subida(rng, float(ev.get("dur", 1.4))) * 0.12, t, pan)
        elif tipo == "alert":
            _sumar(out, alerta() * 0.13, t, pan)
    return _reverb(out, reverberacion(rng, 1.6, 1.1), 0.25)


# ---------------------------------------------------------------- mezcla

def remuestrear(x, sr):
    from math import gcd
    g = gcd(SR, sr)
    return signal.resample_poly(x, SR // g, sr // g)


def envolvente_voz(voz):
    """0..1 cuando hay voz, con un poco de anticipación y mantenimiento para que la música no bombee."""
    salto = int(0.01 * SR)
    marcos = len(voz) // salto + 1
    rms = np.sqrt(np.add.reduceat(np.pad(voz, (0, marcos * salto - len(voz))) ** 2, np.arange(0, marcos * salto, salto)) / salto)
    activo = np.clip((rms - 0.01) / 0.04, 0, 1)
    activo = ndimage.maximum_filter1d(activo, size=36, origin=-6)
    activo = ndimage.gaussian_filter1d(activo, 9)
    return np.interp(np.arange(len(voz)), np.arange(marcos) * salto, activo)


def mezclar(voz, musica, sfx, atenuacion_db=9.0):
    n = max(len(voz), len(musica), len(sfx))
    voz = np.pad(voz, (0, n - len(voz)))
    musica = np.pad(musica, ((0, n - len(musica)), (0, 0)))
    sfx = np.pad(sfx, ((0, n - len(sfx)), (0, 0)))
    ganancia = 10 ** (-atenuacion_db * envolvente_voz(voz) / 20)
    mezcla = musica * ganancia[:, None] + sfx + voz[:, None]
    pico = np.max(np.abs(mezcla))
    return mezcla / pico * 0.89 if pico > 0.89 else mezcla
