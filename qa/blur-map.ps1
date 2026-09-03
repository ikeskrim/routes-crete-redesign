# ---------------------------------------------------------------------------
# Blur placeholders for every graded image.
#
#   powershell -File qa/blur-map.ps1            # regenerate for the live grade
#   powershell -File qa/blur-map.ps1 -Grade B   # or any grade
#
# Why this exists as a script.
#
# `content/blur-map.json` maps an image path to a tiny base64 JPEG, and
# next/image paints that JPEG, blurred, while the real file loads. The map was
# built once, by hand, with keys under /images/graded/b/. When the grade
# flipped to C every `getBlur()` lookup missed, the placeholder silently
# became `undefined`, and the whole site shipped without blur placeholders
# from that commit on — including the hero, which is the LCP element. Nothing
# failed. No guard noticed. It was found by reading the live HTML.
#
# So the map is generated, not curated, and it is generated for the grade that
# is actually live. Keys for the other grades are kept so flipping the constant
# back never loses its placeholders either.
#
# Output matches the existing entries: ~10px wide, low quality, ~700 bytes —
# enough for a colour wash, nothing that could be mistaken for the image.
# ---------------------------------------------------------------------------
param(
  [ValidateSet('A', 'B', 'C')] [string]$Grade = 'C',
  [int]$Width = 10,
  [int]$Quality = 45
)

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

$proj = (Get-Item "C:\Users\mcapt\Downloads\*\routes-crete").FullName
$root = Join-Path $proj ("public\images\graded\" + $Grade.ToLower())
$mapPath = Join-Path $proj 'content\blur-map.json'

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality)

# Keep every existing key. The map is a union across grades, so the other
# grades keep their placeholders if the constant ever flips back.
$map = @{}
if (Test-Path $mapPath) {
  $json = Get-Content $mapPath -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($p in $json.PSObject.Properties) { $map[$p.Name] = $p.Value }
}
$before = $map.Count

$n = 0
foreach ($f in Get-ChildItem $root -Recurse -File | Where-Object { $_.Extension -match '^\.(jpg|jpeg|png)$' }) {
  $rel = $f.FullName.Substring($proj.Length).Replace('\', '/')   # /public/images/graded/c/...
  $key = $rel.Substring('/public'.Length)                          # /images/graded/c/...

  $img = [System.Drawing.Image]::FromFile($f.FullName)
  try {
    $h = [math]::Max(1, [int][math]::Round($img.Height * ($Width / $img.Width)))
    $bmp = New-Object System.Drawing.Bitmap($Width, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $Width, $h)
    $g.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, $codec, $ep)
    $bmp.Dispose()
    $map[$key] = 'data:image/jpeg;base64,' + [Convert]::ToBase64String($ms.ToArray())
    $ms.Dispose()
    $n++
  } finally { $img.Dispose() }
}

# Stable, sorted output so the diff is readable.
$ordered = [ordered]@{}
foreach ($k in ($map.Keys | Sort-Object)) { $ordered[$k] = $map[$k] }
$out = ($ordered | ConvertTo-Json -Depth 2)
[System.IO.File]::WriteAllText($mapPath, $out + "`n", (New-Object System.Text.UTF8Encoding($false)))

"grade $Grade -> $n placeholders generated"
"map entries: $before -> $($map.Count)"
