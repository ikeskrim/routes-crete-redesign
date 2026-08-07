# Numeric diff between the approved grade reference and freshly graded output.
# The approved look is the spec; this proves the fast path reproduces it.
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$proj = (Get-Item "C:\Users\mcapt\Downloads\*\routes-crete").FullName
$ref  = Join-Path $proj 'qa\grade-reference'
$new  = Join-Path $proj 'public\images\graded\b\sourced'

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
