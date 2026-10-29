# Sintetiza la locución de cada escena con System.Speech (Windows) y guarda, por escena,
# un WAV y las marcas de tiempo de cada palabra (posición en el texto -> segundo de audio).
# Lo invoca generar_video.py; no hace falta ejecutarlo a mano.
param(
  [Parameter(Mandatory = $true)][string]$Escenas,   # JSON: [{ "id": "s1", "texto": "..." }]
  [Parameter(Mandatory = $true)][string]$Salida,    # carpeta de salida
  [string]$Voz = 'Microsoft Laura',
  [int]$Velocidad = 0                                # -10..10
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$refs = @([System.Speech.Synthesis.SpeechSynthesizer].Assembly.Location)
if ($PSVersionTable.PSEdition -eq 'Core') {
  # En PowerShell 7, -ReferencedAssemblies sustituye las referencias por defecto.
  $refs += 'System.Runtime', 'System.Collections', 'System.Threading', 'System.ComponentModel.Primitives'
}

Add-Type -ReferencedAssemblies $refs -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Speech.AudioFormat;
using System.Speech.Synthesis;
using System.Threading;

public static class EvalGradoTts {
  public static string Speak(string text, string wavPath, string voice, int rate) {
    var marks = new List<string>();
    var done = new ManualResetEventSlim(false);
    using (var s = new SpeechSynthesizer()) {
      s.SelectVoice(voice);
      s.Rate = rate;
      // A 16 kHz (frecuencia nativa de las voces es-ES) AudioPosition coincide con el audio real;
      // a otras frecuencias SAPI lo escala mal.
      s.SetOutputToWaveFile(wavPath, new SpeechAudioFormatInfo(16000, AudioBitsPerSample.Sixteen, AudioChannel.Mono));
      s.SpeakProgress += (o, e) => {
        lock (marks) {
          marks.Add("[" + e.CharacterPosition + "," + e.AudioPosition.TotalSeconds.ToString("0.000", CultureInfo.InvariantCulture) + "]");
        }
      };
      s.SpeakCompleted += (o, e) => done.Set();
      s.SpeakAsync(text);
      done.Wait();
      s.SetOutputToNull();
    }
    lock (marks) { return "[" + string.Join(",", marks) + "]"; }
  }
}
'@

New-Item -ItemType Directory -Force $Salida | Out-Null
$lista = Get-Content -Raw -Encoding utf8 $Escenas | ConvertFrom-Json
$partes = foreach ($e in $lista) {
  $wav = Join-Path $Salida "$($e.id).wav"
  '"' + $e.id + '":' + [EvalGradoTts]::Speak($e.texto, $wav, $Voz, $Velocidad)
}
'{' + ($partes -join ',') + '}' | Set-Content -Encoding utf8 (Join-Path $Salida 'marcas.json')
