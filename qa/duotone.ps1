# ---------------------------------------------------------------------------
# Terracotta duotone (C+ SPEC E.3, decision D11). One frame, last on the page.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File qa/duotone.ps1 -Grade D -File south-coast-storm-cloud.jpg
#
# Reads the GRADED derivative, never the master, so the duotone inherits grade
# D's highlight shoulder and vignette:
#   public/images/graded/<g>/<dir>/<file>  ->  public/images/graded/<g>/duotone/<dir>/<file>
#
# Per pixel:
#   1. linearise sRGB (IEC 61966-2-1 transfer curve);
#   2. Rec. 709 luminance Y (the Y row of the sRGB/Rec. 709 D65 matrix);
#   3. CIE L* from Y (white Yn = 1);
#   4. remap source L* linearly from its nominal range [0, 100] onto the L*
#      range between the ramp's darkest and lightest stops (night .. bone).
#      The nominal range, not this frame's own min/max: no auto-levels, so one
#      stray pixel cannot set the contrast of the whole plate;
#   5. interpolate in CIE Lab through night #221d19 -> terracotta #b4532e ->
#      bone #ece3d2. Each stop sits at its own L*, so the output L* IS the
#      remapped L*: tonal order is strictly monotone and the cloud keeps its
#      modelling. Only a* and b* are interpolated along the ramp;
#   6. Lab -> XYZ (D65) -> linear sRGB, clamp, encode.
# Then resize to a max edge of 1400 px (560 CSS px x 2 plus slack), JPEG
# quality 82, and strip EVERY metadata segment: all APPn (APP0 JFIF, APP1
# EXIF/XMP, APP2 ICC, APP13 IPTC, APP14 Adobe ...) and COM. What remains is
# SOI, DQT, SOF, DHT, (DRI), SOS, the entropy-coded scan and EOI. Without JFIF
# or Adobe markers a 3-component JPEG decodes as YCbCr when its component ids
# are 1, 2, 3 (the libjpeg rule browsers follow), so that is asserted.
#
# qa/grade.ps1 is deliberately NOT touched or dot-sourced: the grade-C
# byte-identity proof depends on that file staying as it is.
#
# Paint cost on the site is zero: a plain JPEG, no CSS filter or blend.
# ---------------------------------------------------------------------------
param(
  [ValidateSet('A', 'B', 'C', 'D')] [string]$Grade = 'D',
  [Parameter(Mandatory = $true)] [string]$File,
  [int]$MaxEdge = 1400,
  [int]$Quality = 82
)

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

# Compiled loop, as in qa/grade.ps1: a per-pixel loop in PowerShell costs tens
# of seconds per frame. Separate class name, so both scripts can share a
# session without a type clash.
if (-not ("RoutesCrete.Duotone" -as [type])) {
  Add-Type -TypeDefinition @'
using System;
namespace RoutesCrete {
  public static class Duotone {
    // sRGB / Rec. 709 primaries, D65 white. The Y row is Rec. 709 luminance.
    const double RX = 0.4124564, GX = 0.3575761, BX = 0.1804375;
    const double RY = 0.2126729, GY = 0.7151522, BY = 0.0721750;
    const double RZ = 0.0193339, GZ = 0.1191920, BZ = 0.9503041;
    const double Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
    const double D = 6.0 / 29.0;

    public static double Linear(double c) {
      return c <= 0.04045 ? c / 12.92 : Math.Pow((c + 0.055) / 1.055, 2.4);
    }
    static double Encode(double v) {
      return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.Pow(v, 1.0 / 2.4) - 0.055;
    }
    static double F(double t) {
      return t > D * D * D ? Math.Pow(t, 1.0 / 3.0) : t / (3.0 * D * D) + 4.0 / 29.0;
    }
    static double FInv(double t) {
      return t > D ? t * t * t : 3.0 * D * D * (t - 4.0 / 29.0);
    }

    public static double[] Lab(int r8, int g8, int b8) {
      double r = Linear(r8 / 255.0), g = Linear(g8 / 255.0), b = Linear(b8 / 255.0);
      double x = RX * r + GX * g + BX * b;
      double y = RY * r + GY * g + BY * b;
      double z = RZ * r + GZ * g + BZ * b;
      double fx = F(x / Xn), fy = F(y / Yn), fz = F(z / Zn);
      return new double[] { 116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz) };
    }

    // Lab -> 8-bit sRGB written as B, G, R at buf[i]. Returns true when a
    // channel had to be clamped (the colour sat outside the sRGB gamut).
    public static bool ToBgr(double L, double a, double bb, byte[] buf, int i) {
      double fy = (L + 16.0) / 116.0, fx = fy + a / 500.0, fz = fy - bb / 200.0;
      double X = Xn * FInv(fx), Y = Yn * FInv(fy), Z = Zn * FInv(fz);
      double r =  3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
      double g = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z;
      double b =  0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;
      const double eps = 1e-6;
      bool clipped = r < -eps || r > 1 + eps || g < -eps || g > 1 + eps || b < -eps || b > 1 + eps;
      r = r < 0 ? 0 : (r > 1 ? 1 : r);
      g = g < 0 ? 0 : (g > 1 ? 1 : g);
      b = b < 0 ? 0 : (b > 1 ? 1 : b);
      buf[i]     = (byte)Math.Round(Encode(b) * 255.0);
      buf[i + 1] = (byte)Math.Round(Encode(g) * 255.0);
      buf[i + 2] = (byte)Math.Round(Encode(r) * 255.0);
      return clipped;
    }

    // s0, s1, s2: the three stops as { L*, a*, b* }, L* strictly increasing.
    // Returns { pixels, clamped pixels, round(min source L* x 100), round(max source L* x 100) }.
    public static long[] Apply(byte[] buf, int stride, int width, int height,
                               double[] s0, double[] s1, double[] s2) {
      double[] lin = new double[256];
      for (int k = 0; k < 256; k++) lin[k] = Linear(k / 255.0);
      double lo = s0[0], mid = s1[0], hi = s2[0];
      long clamped = 0;
      double minL = 100.0, maxL = 0.0;

      for (int y = 0; y < height; y++) {
        int row = y * stride;
        for (int x = 0; x < width; x++) {
          int i = row + x * 3;
          double Y = RY * lin[buf[i + 2]] + GY * lin[buf[i + 1]] + BY * lin[buf[i]];
          double L = 116.0 * F(Y) - 16.0;
          if (L < 0.0) L = 0.0; else if (L > 100.0) L = 100.0;
          if (L < minL) minL = L;
          if (L > maxL) maxL = L;

          double Lr = lo + (L / 100.0) * (hi - lo);
          double a, b;
          if (Lr <= mid) {
            double t = (Lr - lo) / (mid - lo);
            a = s0[1] + (s1[1] - s0[1]) * t;
            b = s0[2] + (s1[2] - s0[2]) * t;
          } else {
            double t = (Lr - mid) / (hi - mid);
            a = s1[1] + (s2[1] - s1[1]) * t;
            b = s1[2] + (s2[2] - s1[2]) * t;
          }
          if (ToBgr(Lr, a, b, buf, i)) clamped++;
        }
      }
      return new long[] { (long)width * height, clamped,
                          (long)Math.Round(minL * 100.0), (long)Math.Round(maxL * 100.0) };
    }
  }
}
'@
}

$proj = Split-Path $PSScriptRoot -Parent
$gradeRoot = Join-Path $proj ("public\images\graded\" + $Grade.ToLower())
$duoRoot = Join-Path $gradeRoot 'duotone'

# --- eligibility (SPEC E.3) -------------------------------------------------
# Ledger surface "mood"; not an Unsplash frame; never the cover, an itinerary
# surface or an operator photograph (operator photographs have no ledger
# record, so requiring one excludes them); never pexels-4160256. A Pixabay
# frame is held, never shipped, so it cannot be duotoned either.
$ledger = Get-Content (Join-Path $proj 'content\photo-credits.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$rec = @($ledger.photographs | Where-Object { $_.file -eq $File })
if ($rec.Count -ne 1) { throw "not eligible: $File has $($rec.Count) ledger records (needs exactly one)" }
$rec = $rec[0]
if ($rec.surface -ne 'mood') { throw "not eligible: $File has surface '$($rec.surface)', duotone needs 'mood'" }
if ($rec.licence -eq 'Unsplash License') { throw "not eligible: $File is an Unsplash frame" }
if ($rec.licence -eq 'Pixabay Content License') { throw "not eligible: $File is a held Pixabay frame" }
if ($File -like 'pexels-4160256.*') { throw "not eligible: pexels-4160256 is excluded by name" }
$site = Get-Content (Join-Path $proj 'content\site.json') -Raw -Encoding UTF8 | ConvertFrom-Json
# The live cover, and the C+ cover the S9 content edit points it at (SPEC E.1).
$covers = @([System.IO.Path]::GetFileName([string]$site.hero.backgroundImage), 'libyan-sea-coast-dusk.jpg')
if ($covers -contains $File) { throw "not eligible: $File is a cover plate" }

# --- locate the graded derivative --------------------------------------------
$found = @(Get-ChildItem $gradeRoot -Recurse -File -Filter $File |
  Where-Object { $_.Name -eq $File -and -not $_.FullName.StartsWith($duoRoot + '\', [StringComparison]::OrdinalIgnoreCase) })
if ($found.Count -ne 1) { throw "expected exactly one grade-$Grade derivative named $File under $gradeRoot, found $($found.Count)" }
$src = $found[0].FullName
$rel = $src.Substring($gradeRoot.Length + 1)
$dest = Join-Path $duoRoot $rel
$destDir = Split-Path $dest -Parent
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force $destDir | Out-Null }

# --- the ramp ------------------------------------------------------------------
$stopHex = @('#221d19', '#b4532e', '#ece3d2')   # night, terracotta, bone
$stops = foreach ($hex in $stopHex) {
  $r = [Convert]::ToInt32($hex.Substring(1, 2), 16)
  $g = [Convert]::ToInt32($hex.Substring(3, 2), 16)
  $b = [Convert]::ToInt32($hex.Substring(5, 2), 16)
  $lab = [RoutesCrete.Duotone]::Lab($r, $g, $b)
  # Self-test: each stop must survive Lab -> sRGB with identical bytes.
  $probe = New-Object 'byte[]' 3
  [void][RoutesCrete.Duotone]::ToBgr($lab[0], $lab[1], $lab[2], $probe, 0)
  if ($probe[2] -ne $r -or $probe[1] -ne $g -or $probe[0] -ne $b) { throw "Lab round trip failed for $hex" }
  , $lab
}
if (-not ($stops[0][0] -lt $stops[1][0] -and $stops[1][0] -lt $stops[2][0])) {
  throw 'ramp stops are not in strictly increasing L* order'
}

# --- JPEG segment handling ---------------------------------------------------
function Get-JpegHeader([byte[]]$b) {
  if ($b.Length -lt 4 -or $b[0] -ne 0xFF -or $b[1] -ne 0xD8) { throw 'not a JPEG (no SOI)' }
  $segs = New-Object System.Collections.ArrayList
  $i = 2
  while ($true) {
    if ($i + 3 -ge $b.Length) { throw 'truncated JPEG header' }
    if ($b[$i] -ne 0xFF) { throw ("marker expected at offset {0}" -f $i) }
    $m = [int]$b[$i + 1]
    if ($m -eq 0xFF) { $i++; continue }                    # fill byte
    $len = ([int]$b[$i + 2] -shl 8) -bor [int]$b[$i + 3]
    [void]$segs.Add([pscustomobject]@{ Marker = $m; Offset = $i; Total = 2 + $len })
    $i += 2 + $len
    if ($m -eq 0xDA) { break }                             # SOS: scan data follows
  }
  return , $segs
}
function Get-MarkerName([int]$m) {
  if ($m -ge 0xE0 -and $m -le 0xEF) { return "APP$($m - 0xE0)" }
  switch ($m) { 0xFE { 'COM' } 0xDB { 'DQT' } 0xC4 { 'DHT' } 0xC0 { 'SOF0' } 0xC1 { 'SOF1' } 0xC2 { 'SOF2' } 0xDD { 'DRI' } 0xDA { 'SOS' } default { '0x{0:X2}' -f $m } }
}
function Remove-JpegMetadata([byte[]]$b) {
  $segs = Get-JpegHeader $b
  $out = New-Object System.IO.MemoryStream
  $out.WriteByte(0xFF); $out.WriteByte(0xD8)
  foreach ($s in $segs) {
    $isMeta = ($s.Marker -ge 0xE0 -and $s.Marker -le 0xEF) -or $s.Marker -eq 0xFE
    if (-not $isMeta) { $out.Write($b, $s.Offset, $s.Total) }
  }
  $last = $segs[$segs.Count - 1]
  $scan = $last.Offset + $last.Total
  $out.Write($b, $scan, $b.Length - $scan)                 # entropy-coded data .. EOI
  return , $out.ToArray()
}

# --- read, map, resize, encode ---------------------------------------------
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$fmt = [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
$in = New-Object System.Drawing.Bitmap($src)
try {
  $w = $in.Width; $h = $in.Height
  $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
  $mapped = New-Object System.Drawing.Bitmap($w, $h, $fmt)
  $srcData = $in.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, $fmt)
  $stride = $srcData.Stride
  $bytes = New-Object 'byte[]' ($stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $bytes, 0, $bytes.Length)
  $in.UnlockBits($srcData)
} finally { $in.Dispose() }

$stats = [RoutesCrete.Duotone]::Apply($bytes, $stride, $w, $h, $stops[0], $stops[1], $stops[2])

$dstData = $mapped.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, $fmt)
if ($dstData.Stride -ne $stride) { throw 'stride mismatch between source and mapped bitmaps' }
[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $dstData.Scan0, $bytes.Length)
$mapped.UnlockBits($dstData)

$scale = [math]::Min(1.0, $MaxEdge / [math]::Max($w, $h))
$ow = [int][math]::Round($w * $scale)
$oh = [int][math]::Round($h * $scale)
$outBmp = New-Object System.Drawing.Bitmap($ow, $oh, $fmt)
$gfx = [System.Drawing.Graphics]::FromImage($outBmp)
$gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$attrs = New-Object System.Drawing.Imaging.ImageAttributes
# Mirror the edge pixels into the filter support; without it GDI+ blends the
# outermost row and column with transparent black, a 1 px dark rim.
$attrs.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
$gfx.DrawImage($mapped, (New-Object System.Drawing.Rectangle(0, 0, $ow, $oh)), 0, 0, $w, $h, [System.Drawing.GraphicsUnit]::Pixel, $attrs)
$gfx.Dispose(); $attrs.Dispose(); $mapped.Dispose()

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality)
$ms = New-Object System.IO.MemoryStream
$outBmp.Save($ms, $codec, $ep)
$outBmp.Dispose()
$encoded = $ms.ToArray(); $ms.Dispose()

$clean = Remove-JpegMetadata $encoded
[System.IO.File]::WriteAllBytes($dest, $clean)

# --- verify what was written ------------------------------------------------
$written = [System.IO.File]::ReadAllBytes($dest)
$segs = Get-JpegHeader $written
$names = @($segs | ForEach-Object { Get-MarkerName $_.Marker })
$meta = @($names | Where-Object { $_ -like 'APP*' -or $_ -eq 'COM' })
if ($meta.Count) { throw "metadata segments survived: $($meta -join ', ')" }
$sof = @($segs | Where-Object { $_.Marker -eq 0xC0 -or $_.Marker -eq 0xC1 -or $_.Marker -eq 0xC2 })[0]
$o = $sof.Offset
$sofH = ([int]$written[$o + 5] -shl 8) -bor [int]$written[$o + 6]
$sofW = ([int]$written[$o + 7] -shl 8) -bor [int]$written[$o + 8]
$nComp = [int]$written[$o + 9]
$ids = @(0..($nComp - 1) | ForEach-Object { [int]$written[$o + 10 + 3 * $_] })
if ($nComp -ne 3 -or ($ids -join ',') -ne '1,2,3') { throw "component ids $($ids -join ',') would not decode as YCbCr without JFIF" }
if ($sofW -ne $ow -or $sofH -ne $oh) { throw "SOF says ${sofW}x${sofH}, expected ${ow}x${oh}" }
if ($written[$written.Length - 2] -ne 0xFF -or $written[$written.Length - 1] -ne 0xD9) { throw 'no EOI at end of file' }
$check = [System.Drawing.Image]::FromFile($dest)
try { if ($check.Width -ne $ow -or $check.Height -ne $oh) { throw 'decoded size mismatch' } } finally { $check.Dispose() }

$sha = [System.Security.Cryptography.SHA1]::Create()
$sha1 = -join ($sha.ComputeHash($written) | ForEach-Object { $_.ToString('x2') })
$sha.Dispose()

$fmtLab = { param($l) '{0:N3} {1:N3} {2:N3}' -f $l[0], $l[1], $l[2] }
"duotone grade $Grade  $rel"
"  source      $src (${w}x${h})"
"  output      $dest"
"  ramp Lab    night $(& $fmtLab $stops[0]) | terracotta $(& $fmtLab $stops[1]) | bone $(& $fmtLab $stops[2])"
"  source L*   {0:N2} .. {1:N2}   pixels {2}, gamut-clamped {3}" -f ($stats[2] / 100.0), ($stats[3] / 100.0), $stats[0], $stats[1]
"  dimensions  ${ow}x${oh}"
"  bytes       $($written.Length)  (encoder output $($encoded.Length), metadata removed $($encoded.Length - $written.Length))"
"  segments    $($names -join ' ')"
"  sha1        $sha1"
"  took        $($sw.ElapsedMilliseconds) ms"
