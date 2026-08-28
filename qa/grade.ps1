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
# Grade C "vivid"       — a postcard shot at golden hour: brighter midtones,
#                          blacks that sit down instead of floating, deeper
#                          contrast, and saturation that goes UP rather than
#                          down — with the lift aimed at the turquoise of the
#                          water and the gold of low light. The client's brief
#                          was "brighter and more vivid", and B was actively
#                          desaturating (sat 0.66) and lifting blacks to matte.
#
# Output: public/images/graded/<grade>/<relative path>, max 2400px long edge.
# ---------------------------------------------------------------------------
param(
  [ValidateSet('A', 'B', 'C')] [string]$Grade = 'A',
  [string]$Only = '',
  [int]$MaxEdge = 2400,
  [int]$Quality = 82
)

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

# The tone/saturation/vignette pass is identical maths to the original
# PowerShell implementation, moved into a compiled loop. A per-pixel loop in
# PowerShell cost 43s for a single 2400px frame — ~14 minutes to regrade the
# corpus, which made iterating on a grade impractical. ColorMatrix was the
# obvious alternative but is purely linear: it cannot express the per-channel
# gamma or the contrast-around-mid pivot the approved look depends on. Keeping
# the maths and compiling the loop reproduces the approved grade exactly rather
# than approximately.
if (-not ("RoutesCrete.Grader" -as [type])) {
  Add-Type -TypeDefinition @'
namespace RoutesCrete {
  public static class Grader {
    public static void Apply(
      byte[] buf, int stride, int width, int height,
      byte[] lutR, byte[] lutG, byte[] lutB,
      double sat, double vignette,
      double vibrance, double cyanBoost, double goldBoost, double greenTemper)
    {
      double cx = width / 2.0, cy = height / 2.0;
      double maxD = System.Math.Sqrt(cx * cx + cy * cy);

      // With vibrance and both boosts at 0 the factor below collapses to
      // exactly `sat`, so grades A and B reproduce byte-for-byte. Only C asks
      // for the extra terms.
      bool shaped = vibrance > 0.0 || cyanBoost > 0.0 || goldBoost > 0.0 ||
                    greenTemper > 0.0;

      for (int y = 0; y < height; y++) {
        int row = y * stride;
        double dy = (y - cy) / maxD;
        for (int x = 0; x < width; x++) {
          int i = row + x * 3;

          double b = lutB[buf[i]];
          double g = lutG[buf[i + 1]];
          double r = lutR[buf[i + 2]];

          double l = 0.2126 * r + 0.7152 * g + 0.0722 * b;

          double factor = sat;
          if (shaped) {
            double mx = r > g ? (r > b ? r : b) : (g > b ? g : b);
            double mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
            double chroma = mx - mn;
            double s = mx > 0.25 ? chroma / mx : 0.0;

            // Hue gain. Turquoise water and golden light are the two things
            // the client asked to see more of, so they get a direct
            // multiplier rather than riding on vibrance alone — an already
            // saturated aqua has little headroom left in the vibrance term.
            double hueGain = 1.0;
            if (chroma > 0.25 && (cyanBoost > 0.0 || goldBoost > 0.0 || greenTemper > 0.0)) {
              double h;
              if (mx == r)      h = 60.0 * ((g - b) / chroma);
              else if (mx == g) h = 60.0 * (((b - r) / chroma) + 2.0);
              else              h = 60.0 * (((r - g) / chroma) + 4.0);
              if (h < 0.0) h += 360.0;

              double dCyan = System.Math.Abs(h - 190.0);
              if (dCyan > 180.0) dCyan = 360.0 - dCyan;
              if (dCyan < 45.0) hueGain += cyanBoost * (1.0 - dCyan / 45.0);

              // Centred at 48 rather than the ~25 where skin sits, and
              // narrow, so faces are not swept up in the golden-hour lift.
              double dGold = System.Math.Abs(h - 48.0);
              if (dGold > 180.0) dGold = 360.0 - dGold;
              if (dGold < 30.0) hueGain += goldBoost * (1.0 - dGold / 30.0);

              // Foliage pulls the other way. Vibrance lifts grass hardest of
              // anything in frame — it is broad, mid-chroma and fills the
              // hero — and the first tuning pass came back electric. This
              // takes the greens back down to natural while the water and the
              // light keep everything they gained.
              double dGreen = System.Math.Abs(h - 105.0);
              if (dGreen > 180.0) dGreen = 360.0 - dGreen;
              if (dGreen < 48.0) hueGain -= greenTemper * (1.0 - dGreen / 48.0);
            }

            // Vibrance proper: the less saturated a pixel already is, the more
            // it gains. Stone, skin and foliage sit low-chroma and stay
            // natural; this is what keeps "vivid" from becoming "HDR".
            factor = sat * (1.0 + vibrance * (1.0 - s)) * hueGain;
          }

          r = l + (r - l) * factor;
          g = l + (g - l) * factor;
          b = l + (b - l) * factor;

          if (vignette > 0.0) {
            double dx = (x - cx) / maxD;
            double d = System.Math.Sqrt(dx * dx + dy * dy);
            double v = 1.0 - vignette * (d * d);
            r *= v; g *= v; b *= v;
          }

          int ib = (int)System.Math.Round(b);
          int ig = (int)System.Math.Round(g);
          int ir = (int)System.Math.Round(r);
          buf[i]     = (byte)(ib < 0 ? 0 : (ib > 255 ? 255 : ib));
          buf[i + 1] = (byte)(ig < 0 ? 0 : (ig > 255 ? 255 : ig));
          buf[i + 2] = (byte)(ir < 0 ? 0 : (ir > 255 ? 255 : ir));
        }
      }
    }
  }
}
'@
}

$proj = (Get-Item "C:\Users\mcapt\Downloads\*\routes-crete").FullName
$srcRoot = Join-Path $proj 'public\images'
$outRoot = Join-Path $proj ("public\images\graded\" + $Grade.ToLower())

# Web-sourced masters live OUTSIDE public/ so the deploy does not ship 78 MB of
# originals nobody requests — the site only ever serves the graded tree. They
# are still in the repo (provenance for the licence ledger), just not routable.
# Their relative paths carry through unchanged: assets-src\sourced\x.jpg still
# grades to public\images\graded\<g>\sourced\x.jpg.
$extRoot = Join-Path $proj 'assets-src'

# --- grade definitions -----------------------------------------------------
# lift      : black point raised (matte)
# gain      : per-channel multiplier
# gamma     : per-channel gamma (< 1 brightens the midtones)
# sat       : saturation multiplier — below 1 desaturates, above 1 enriches
# vibrance  : extra saturation, weighted toward pixels that have little
# cyanBoost : extra saturation for hues near 190 (water)
# goldBoost : extra saturation for hues near 48 (low sun on stone, sky)
# greenTemper: saturation taken BACK off hues near 105, so foliage stays natural
# vignette  : 0..1 strength
$P = if ($Grade -eq 'A') {
  @{ lift = @(0.010, 0.016, 0.030); gain = @(0.98, 1.00, 1.06); gamma = @(1.06, 1.04, 0.98); sat = 0.72; vignette = 0.34; contrast = 1.14; vibrance = 0.0; cyanBoost = 0.0; goldBoost = 0.0; greenTemper = 0.0 }
} elseif ($Grade -eq 'B') {
  @{ lift = @(0.055, 0.048, 0.038); gain = @(1.06, 1.01, 0.94); gamma = @(0.96, 0.99, 1.05); sat = 0.66; vignette = 0.12; contrast = 0.94; vibrance = 0.0; cyanBoost = 0.0; goldBoost = 0.0; greenTemper = 0.0 }
} else {
  # C "vivid". Read against B, every number moves the way the brief asked:
  #   lift    0.055 -> 0.014   blacks sit down; the matte veil comes off
  #   contrast 0.94 -> 1.10    deepened
  #   gamma   0.96  -> 0.93    midtones brighter, warm channels leading
  #   gain(B) 0.94  -> 0.995   B was crushing blue for warmth, which is
  #                            precisely what flattened the turquoise
  #   sat     0.66  -> 1.02    it was desaturating; now it enriches
  #   vignette 0.12 -> 0.08    luminous, not shaded at the corners
  @{ lift = @(0.014, 0.012, 0.016); gain = @(1.03, 1.005, 0.995); gamma = @(0.93, 0.95, 0.97); sat = 1.02; vignette = 0.08; contrast = 1.10; vibrance = 0.30; cyanBoost = 0.22; goldBoost = 0.10; greenTemper = 0.15 }
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

# Never graded, at the pipeline level so a future regrade cannot sweep them in
# by accident: a desaturated, vignetted QR code can stop scanning, and the
# wordmark is a brand asset rather than photography. Mirrors NEVER_GRADE in
# src/lib/content.ts — both lists must agree.
# Paths are relative to public\images — no "images\" prefix.
$NeverGrade = @(
  'site\qr-code.png',
  'brand\logo.png'
)

# Each file is paired with the relative path it grades to, because the two
# roots produce that path differently. Carrying it alongside the file beats
# recomputing it later and guessing which root it came from.
$all = @()
foreach ($root in @($srcRoot, $extRoot)) {
  if (-not (Test-Path $root)) { continue }
  Get-ChildItem $root -Recurse -File |
    Where-Object { $_.Extension -match '^\.(jpg|jpeg|png)$' -and $_.FullName -notlike "*\graded\*" } |
    ForEach-Object {
      $all += [pscustomobject]@{
        File = $_
        Rel  = $_.FullName.Substring($root.Length + 1)
      }
    }
}

# Split rather than filter inside a pipeline: `+=` inside a Where-Object
# scriptblock mutates a copy, so the skip list would silently come back empty.
$files = @()
foreach ($item in $all) {
  if ($NeverGrade -contains $item.Rel) { "excluded from grading: $($item.Rel)"; continue }
  $files += $item
}

if ($Only) { $files = $files | Where-Object { $_.File.FullName -like "*$Only*" } }

$n = 0
foreach ($item in $files) {
  $f = $item.File
  $rel = $item.Rel
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

    [RoutesCrete.Grader]::Apply($bytes, $stride, $w, $h, $lutR, $lutG, $lutB, [double]$P.sat, [double]$P.vignette, [double]$P.vibrance, [double]$P.cyanBoost, [double]$P.goldBoost, [double]$P.greenTemper)

    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
    $bmp.UnlockBits($data)
    $bmp.Save($dest, $codec, $ep)
    $bmp.Dispose()
    $n++
  } finally { $img.Dispose() }
}

"grade $Grade -> $outRoot"
"images graded: $n"
