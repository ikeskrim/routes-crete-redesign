# ---------------------------------------------------------------------------
# Cinematic grade pipeline.
#
# One repeatable step applied to EVERY photograph, sourced or original, so the
# whole library reads as one shoot. Not per-image hand-tweaks.
#
#   powershell -File qa/grade.ps1 -Grade A            # regrade everything
#   powershell -File qa/grade.ps1 -Grade B -Only sourced
#
# Grade A "nocturne"    — editorial cinema: cool crushed shadows, desaturated,
#                          contrast-forward, vignetted.
# Grade B "sunbleached" — quiet luxury: lifted matte blacks, warm highlights,
#                          low contrast, dusty.
#
# Output: public/images/graded/<grade>/<relative path>, max 2400px long edge.
# ---------------------------------------------------------------------------
param(
  [ValidateSet('A', 'B')] [string]$Grade = 'A',
  [string]$Only = '',
  [int]$MaxEdge = 2400,
  [int]$Quality = 82
)

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

$proj = (Get-Item "C:\Users\mcapt\Downloads\*\routes-crete").FullName
$srcRoot = Join-Path $proj 'public\images'
$outRoot = Join-Path $proj ("public\images\graded\" + $Grade.ToLower())

# --- grade definitions -----------------------------------------------------
# lift      : black point raised (matte)
# gain      : per-channel multiplier
# gamma     : per-channel gamma
# sat       : 0..1 saturation retained
# vignette  : 0..1 strength
$P = if ($Grade -eq 'A') {
  @{ lift = @(0.010, 0.016, 0.030); gain = @(0.98, 1.00, 1.06); gamma = @(1.06, 1.04, 0.98); sat = 0.72; vignette = 0.34; contrast = 1.14 }
} else {
  @{ lift = @(0.055, 0.048, 0.038); gain = @(1.06, 1.01, 0.94); gamma = @(0.96, 0.99, 1.05); sat = 0.66; vignette = 0.12; contrast = 0.94 }
}

# Build a 256-entry LUT per channel — the grade is a pure tone mapping, so it
# only has to be computed once per run rather than per pixel.
function Build-Lut([double]$lift, [double]$gain, [double]$gamma, [double]$contrast) {
  $lut = New-Object 'byte[]' 256
  for ($i = 0; $i -lt 256; $i++) {
    $v = $i / 255.0
    $v = [math]::Pow($v, $gamma)          # gamma
    $v = ($v - 0.5) * $contrast + 0.5     # contrast around mid
    $v = $v * $gain                       # channel gain
    $v = $lift + $v * (1.0 - $lift)       # lift the black point
    if ($v -lt 0) { $v = 0 } elseif ($v -gt 1) { $v = 1 }
    $lut[$i] = [byte][math]::Round($v * 255)
  }
  return $lut
}

$lutR = Build-Lut $P.lift[0] $P.gain[0] $P.gamma[0] $P.contrast
$lutG = Build-Lut $P.lift[1] $P.gain[1] $P.gamma[1] $P.contrast
$lutB = Build-Lut $P.lift[2] $P.gain[2] $P.gamma[2] $P.contrast

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality)

$files = Get-ChildItem $srcRoot -Recurse -File |
  Where-Object { $_.Extension -match '^\.(jpg|jpeg|png)$' -and $_.FullName -notlike "*\graded\*" }
if ($Only) { $files = $files | Where-Object { $_.FullName -like "*$Only*" } }

$n = 0
foreach ($f in $files) {
  $rel = $f.FullName.Substring($srcRoot.Length + 1)
  $dest = Join-Path $outRoot ([System.IO.Path]::ChangeExtension($rel, '.jpg'))
  $destDir = Split-Path $dest -Parent
  if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force $destDir | Out-Null }

  $img = [System.Drawing.Image]::FromFile($f.FullName)
  try {
    $scale = [math]::Min(1.0, $MaxEdge / [math]::Max($img.Width, $img.Height))
    $w = [int][math]::Round($img.Width * $scale)
    $h = [int][math]::Round($img.Height * $scale)

    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $w, $h)
    $g.Dispose()

    # Per-pixel pass: LUT, desaturate toward luma, radial vignette.
    $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
    $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, $bmp.PixelFormat)
    $stride = $data.Stride
    $bytes = New-Object 'byte[]' ($stride * $h)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)

    $cx = $w / 2.0; $cy = $h / 2.0
    $maxD = [math]::Sqrt($cx * $cx + $cy * $cy)
    $sat = $P.sat; $vig = $P.vignette

    for ($y = 0; $y -lt $h; $y++) {
      $row = $y * $stride
      $dy = ($y - $cy) / $maxD
      for ($x = 0; $x -lt $w; $x++) {
        $i = $row + $x * 3
        $b = $lutB[$bytes[$i]]
        $gg = $lutG[$bytes[$i + 1]]
        $r = $lutR[$bytes[$i + 2]]

        # desaturate toward Rec.709 luma
        $l = 0.2126 * $r + 0.7152 * $gg + 0.0722 * $b
        $r = $l + ($r - $l) * $sat
        $gg = $l + ($gg - $l) * $sat
        $b = $l + ($b - $l) * $sat

        if ($vig -gt 0) {
          $dx = ($x - $cx) / $maxD
          $d = [math]::Sqrt($dx * $dx + $dy * $dy)
          $v = 1.0 - $vig * ($d * $d)
          $r *= $v; $gg *= $v; $b *= $v
        }

        $bytes[$i] = [byte][math]::Min(255, [math]::Max(0, [math]::Round($b)))
        $bytes[$i + 1] = [byte][math]::Min(255, [math]::Max(0, [math]::Round($gg)))
        $bytes[$i + 2] = [byte][math]::Min(255, [math]::Max(0, [math]::Round($r)))
      }
    }

    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
    $bmp.UnlockBits($data)
    $bmp.Save($dest, $codec, $ep)
    $bmp.Dispose()
    $n++
  } finally { $img.Dispose() }
}

"grade $Grade -> $outRoot"
"images graded: $n"
