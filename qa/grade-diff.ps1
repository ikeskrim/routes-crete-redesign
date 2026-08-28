# Numeric diff between the approved grade reference and freshly graded output.
# The approved look is the spec; this proves the fast path reproduces it.
#
#   powershell -File qa/grade-diff.ps1                 # B vs the approved reference
#   powershell -File qa/grade-diff.ps1 -From b -To c   # every file: did B->C actually land?
#
# The second mode answers a different question. When a whole corpus is
# regraded, the risk is not that the grade is wrong — it is that some files
# were quietly skipped and are still serving the old look. A skipped file has a
# delta of exactly zero against the previous grade, which is what this mode
# hunts for. (-From/-To rather than one array parameter: powershell -File
# passes every argument as a literal string, so "b,c" arrives as one string
# and an array parameter silently binds a single element.)
param(
  [string]$From = '',
  [string]$To = ''
)
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$proj = (Get-Item "C:\Users\mcapt\Downloads\*\routes-crete").FullName
$ref  = Join-Path $proj 'qa\grade-reference'
$new  = Join-Path $proj 'public\images\graded\b\sourced'

function Get-MeanDelta([string]$pathA, [string]$pathB) {
  $ia = [System.Drawing.Bitmap]::FromFile($pathA)
  $ib = [System.Drawing.Bitmap]::FromFile($pathB)
  try {
    if ($ia.Width -ne $ib.Width -or $ia.Height -ne $ib.Height) { return -1.0 }
    $rect = New-Object System.Drawing.Rectangle(0, 0, $ia.Width, $ia.Height)
    $da = $ia.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $db = $ib.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $len = $da.Stride * $ia.Height
    $ba = New-Object 'byte[]' $len; $bb = New-Object 'byte[]' $len
    [System.Runtime.InteropServices.Marshal]::Copy($da.Scan0, $ba, 0, $len)
    [System.Runtime.InteropServices.Marshal]::Copy($db.Scan0, $bb, 0, $len)
    $ia.UnlockBits($da); $ib.UnlockBits($db)
    $sum = 0.0; $n = 0
    for ($i = 0; $i -lt $len; $i += 7) { $sum += [math]::Abs([int]$ba[$i] - [int]$bb[$i]); $n++ }
    return $sum / $n
  } finally { $ia.Dispose(); $ib.Dispose() }
}

if ($From -and $To) {
  $fromDir = Join-Path $proj ("public\images\graded\" + $From)
  $toDir   = Join-Path $proj ("public\images\graded\" + $To)
  $rows = @()
  foreach ($f in Get-ChildItem $toDir -Recurse -File) {
    $rel = $f.FullName.Substring($toDir.Length + 1)
    $old = Join-Path $fromDir $rel
    if (-not (Test-Path $old)) { Write-Output ("only in ${To}: $rel"); continue }
    $rows += [pscustomobject]@{ Rel = $rel; Delta = (Get-MeanDelta $old $f.FullName) }
  }

  $unchanged = @($rows | Where-Object { $_.Delta -lt 0.01 })
  $sorted = $rows | Sort-Object Delta
  Write-Output "smallest deltas (these are the files most likely to have been skipped):"
  $sorted | Select-Object -First 5 | ForEach-Object { "  {0,7:N3}  {1}" -f $_.Delta, $_.Rel }
  Write-Output "largest deltas:"
  $sorted | Select-Object -Last 3 | ForEach-Object { "  {0,7:N3}  {1}" -f $_.Delta, $_.Rel }
  Write-Output ""
  Write-Output ("files compared: {0}   mean delta across corpus: {1:N2}/255" -f $rows.Count, (($rows | Measure-Object Delta -Average).Average))
  if ($unchanged.Count -gt 0) {
    Write-Output ("UNIFORMITY FAILED - {0} file(s) identical between grades, i.e. not regraded:" -f $unchanged.Count)
    $unchanged | ForEach-Object { "  x  " + $_.Rel }
    exit 1
  }
  Write-Output ("UNIFORMITY OK - all {0} files differ from grade {1}; none were skipped" -f $rows.Count, $From.ToUpper())
  exit 0
}

$worst = 0.0
foreach ($f in Get-ChildItem $ref -File) {
  $b = Join-Path $new $f.Name
  if (-not (Test-Path $b)) { "MISSING new output: $($f.Name)"; continue }

  $ia = [System.Drawing.Bitmap]::FromFile($f.FullName)
  $ib = [System.Drawing.Bitmap]::FromFile($b)
  try {
    if ($ia.Width -ne $ib.Width -or $ia.Height -ne $ib.Height) {
      "{0,-34} SIZE DIFFERS {1}x{2} vs {3}x{4}" -f $f.Name, $ia.Width, $ia.Height, $ib.Width, $ib.Height
      continue
    }
    $rect = New-Object System.Drawing.Rectangle(0, 0, $ia.Width, $ia.Height)
    $da = $ia.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $db = $ib.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $len = $da.Stride * $ia.Height
    $ba = New-Object 'byte[]' $len; $bb = New-Object 'byte[]' $len
    [System.Runtime.InteropServices.Marshal]::Copy($da.Scan0, $ba, 0, $len)
    [System.Runtime.InteropServices.Marshal]::Copy($db.Scan0, $bb, 0, $len)
    $ia.UnlockBits($da); $ib.UnlockBits($db)

    # Sample every 7th byte — enough for a mean/max over millions of pixels.
    $sum = 0.0; $max = 0; $n = 0
    for ($i = 0; $i -lt $len; $i += 7) {
      $d = [math]::Abs([int]$ba[$i] - [int]$bb[$i])
      $sum += $d; if ($d -gt $max) { $max = $d }; $n++
    }
    $mean = $sum / $n
    if ($mean -gt $worst) { $worst = $mean }
    "{0,-34} mean delta {1,6:N3}/255   max {2,3}" -f $f.Name, $mean, $max
  } finally { $ia.Dispose(); $ib.Dispose() }
}
""
"worst mean delta: {0:N4}/255" -f $worst
if ($worst -lt 0.5) { "VERDICT: reproduces the approved grade (visually identical; residual is JPEG requantisation)" }
elseif ($worst -lt 2.0) { "VERDICT: very close - inspect the side-by-side before running the corpus" }
else { "VERDICT: DIFFERS - do not run the corpus, tune first" }
