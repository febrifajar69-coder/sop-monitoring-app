# PowerShell script to generate Presentasi_Kaizen_SOP_Agung_Toyota_Gianyar.pptx
param(
    [string]$OutputPath = "C:\Users\Ebix25\.gemini\antigravity\scratch\sop-monitoring-app\presentation\Presentasi_Kaizen_SOP_Agung_Toyota_Gianyar.pptx"
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$destDir = Split-Path $OutputPath -Parent
if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

$tempDir = Join-Path $env:TEMP ("pptx_build_" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$dirs = @(
    "_rels",
    "ppt",
    "ppt\_rels",
    "ppt\slides",
    "ppt\slides\_rels",
    "ppt\slideLayouts",
    "ppt\slideLayouts\_rels",
    "ppt\slideMasters",
    "ppt\slideMasters\_rels",
    "ppt\theme"
)

foreach ($d in $dirs) {
    New-Item -ItemType Directory -Force -Path (Join-Path $tempDir $d) | Out-Null
}

# 1. [Content_Types].xml
$contentTypes = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide4.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide5.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide6.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide7.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide8.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide9.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide10.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "[Content_Types].xml"), $contentTypes, [System.Text.Encoding]::UTF8)

# 2. _rels/.rels
$rootRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "_rels\.rels"), $rootRels, [System.Text.Encoding]::UTF8)

# 3. ppt/theme/theme1.xml
$themeXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Toyota TPOS Theme">
  <a:themeElements>
    <a:clrScheme name="Toyota">
      <a:dk1><a:srgbClr val="09090B"/></a:dk1>
      <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="0B2341"/></a:dk2>
      <a:lt2><a:srgbClr val="F4F5F8"/></a:lt2>
      <a:accent1><a:srgbClr val="E60012"/></a:accent1>
      <a:accent2><a:srgbClr val="0B2341"/></a:accent2>
      <a:accent3><a:srgbClr val="2563EB"/></a:accent3>
      <a:accent4><a:srgbClr val="10B981"/></a:accent4>
      <a:accent5><a:srgbClr val="D97706"/></a:accent5>
      <a:accent6><a:srgbClr val="64748B"/></a:accent6>
      <a:hlink><a:srgbClr val="2563EB"/></a:hlink>
      <a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Toyota Fonts">
      <a:majorFont><a:latin typeface="Segoe UI Semibold"/></a:majorFont>
      <a:minorFont><a:latin typeface="Segoe UI"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst><a:solidClr><a:srgbClr val="FFFFFF"/></a:solidClr><a:solidClr><a:srgbClr val="F4F5F8"/></a:solidClr><a:solidClr><a:srgbClr val="E2E8F0"/></a:solidClr></a:fillStyleLst>
      <a:lnStyleLst><a:ln w="9525"><a:solidClr><a:srgbClr val="CBD5E1"/></a:solidClr></a:ln><a:ln w="25400"><a:solidClr><a:srgbClr val="94A3B8"/></a:solidClr></a:ln><a:ln w="38100"><a:solidClr><a:srgbClr val="64748B"/></a:solidClr></a:ln></a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst><a:solidClr><a:srgbClr val="FFFFFF"/></a:solidClr><a:solidClr><a:srgbClr val="F8FAFC"/></a:solidClr><a:solidClr><a:srgbClr val="0B2341"/></a:solidClr></a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\theme\theme1.xml"), $themeXml, [System.Text.Encoding]::UTF8)

# 4. ppt/slideMasters/slideMaster1.xml
$slideMasterXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgRef idx="1"><a:schemeClr val="lt1"/></p:bgRef></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle><a:lvl1pPr algn="l"><a:defRPr sz="4000"><a:solidClr><a:srgbClr val="0B2341"/></a:solidClr></a:defRPr></a:lvl1pPr></p:titleStyle>
    <p:bodyStyle><a:lvl1pPr algn="l"><a:defRPr sz="1800"><a:solidClr><a:srgbClr val="18181B"/></a:solidClr></a:defRPr></a:lvl1pPr></p:bodyStyle>
    <p:otherStyle><a:lvl1pPr><a:defRPr sz="1400"/></a:lvl1pPr></p:otherStyle>
  </p:txStyles>
</p:sldMaster>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\slideMasters\slideMaster1.xml"), $slideMasterXml, [System.Text.Encoding]::UTF8)

$slideMasterRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\slideMasters\_rels\slideMaster1.xml.rels"), $slideMasterRels, [System.Text.Encoding]::UTF8)

# 5. ppt/slideLayouts/slideLayout1.xml
$slideLayoutXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank Layout">
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMap/></p:clrMapOvr>
</p:sldLayout>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\slideLayouts\slideLayout1.xml"), $slideLayoutXml, [System.Text.Encoding]::UTF8)

$slideLayoutRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\slideLayouts\_rels\slideLayout1.xml.rels"), $slideLayoutRels, [System.Text.Encoding]::UTF8)

# 6. ppt/presentation.xml (16:9 Widescreen)
$presentationXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId2"/>
    <p:sldId id="257" r:id="rId3"/>
    <p:sldId id="258" r:id="rId4"/>
    <p:sldId id="259" r:id="rId5"/>
    <p:sldId id="260" r:id="rId6"/>
    <p:sldId id="261" r:id="rId7"/>
    <p:sldId id="262" r:id="rId8"/>
    <p:sldId id="263" r:id="rId9"/>
    <p:sldId id="264" r:id="rId10"/>
    <p:sldId id="265" r:id="rId11"/>
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="12192000"/>
</p:presentation>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\presentation.xml"), $presentationXml, [System.Text.Encoding]::UTF8)

# 7. ppt/_rels/presentation.xml.rels
$presentationRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide3.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide4.xml"/>
  <Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide5.xml"/>
  <Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide6.xml"/>
  <Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide7.xml"/>
  <Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide8.xml"/>
  <Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide9.xml"/>
  <Relationship Id="rId11" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide10.xml"/>
</Relationships>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\_rels\presentation.xml.rels"), $presentationRels, [System.Text.Encoding]::UTF8)

# Helper to create slide rels
for ($i = 1; $i -le 10; $i++) {
    $slideRelContent = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>
'@
    [System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\slides\_rels\slide$i.xml.rels"), $slideRelContent, [System.Text.Encoding]::UTF8)
}

# Helper function to generate shape XML
function New-BoxShape($id, $name, $x, $y, $cx, $cy, $fillHex, $borderHex, $borderW=19050, $radius=0) {
    $lnXml = if ($borderHex) { "<a:ln w='$borderW'><a:solidClr><a:srgbClr val='$borderHex'/></a:solidClr></a:ln>" } else { "<a:ln><a:noFill/></a:ln>" }
    $fillXml = if ($fillHex) { "<a:solidClr><a:srgbClr val='$fillHex'/></a:solidClr>" } else { "<a:noFill/>" }
    $geom = if ($radius -gt 0) { "<a:prstGeom prst='roundRect'><a:avLst><a:gd name='adj' fmla='val $radius'/></a:avLst></a:prstGeom>" } else { "<a:prstGeom prst='rect'><a:avLst/></a:prstGeom>" }
    return @"
      <p:sp>
        <p:nvSpPr><p:cNvPr id='$id' name='$name'/><p:cNvSpPr><a:spLocks noGrp='1'/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x='$x' y='$y'/><a:ext cx='$cx' cy='$cy'/></a:xfrm>
          $geom
          $fillXml
          $lnXml
        </p:spPr>
      </p:sp>
"@
}

function New-TextShape($id, $name, $x, $y, $cx, $cy, $paragraphsXml, $valign="t") {
    $anchor = switch ($valign) { "ctr" { "ctr" } "b" { "b" } default { "t" } }
    return @"
      <p:sp>
        <p:nvSpPr><p:cNvPr id='$id' name='$name'/><p:cNvSpPr txBox='1'/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x='$x' y='$y'/><a:ext cx='$cx' cy='$cy'/></a:xfrm>
          <a:prstGeom prst='rect'><a:avLst/></a:prstGeom>
          <a:noFill/>
          <a:ln><a:noFill/></a:ln>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap='square' lIns='91440' tIns='91440' rIns='91440' bIns='91440' anchor='$anchor'/>
          <a:lstStyle/>
          $paragraphsXml
        </p:txBody>
      </p:sp>
"@
}

function P($text, $sz=1600, $bold=0, $color="18181B", $align="l", $spaceAfter=100000, $bullet=0) {
    $bAttr = if ($bold -eq 1) { "b='1'" } else { "b='0'" }
    $algnAttr = switch ($align) { "ctr" { "ctr" } "r" { "r" } default { "l" } }
    $pPrXml = if ($bullet -eq 1) {
        "<a:pPr algn='$algnAttr' marL='288000' indent='-288000'><a:buChar char='â€¢'/><a:spcAft><a:spcPts val='$spaceAfter'/></a:spcAft></a:pPr>"
    } else {
        "<a:pPr algn='$algnAttr'><a:spcAft><a:spcPts val='$spaceAfter'/></a:spcAft></a:pPr>"
    }
    $escaped = [System.Security.SecurityElement]::Escape($text)
    return @"
          <a:p>
            $pPrXml
            <a:r>
              <a:rPr $bAttr sz='$sz' dirty='0'>
                <a:solidClr><a:srgbClr val='$color'/></a:solidClr>
                <a:latin typeface='Segoe UI'/>
              </a:rPr>
              <a:t>$escaped</a:t>
            </a:r>
          </a:p>
"@
}

# SLIDE BUILDER
function Build-SlideXml($shapesXml, $bgHex="09090B") {
    return @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgPr>
        <a:solidClr><a:srgbClr val='$bgHex'/></a:solidClr>
      </p:bgPr>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      $shapesXml
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMap/></p:clrMapOvr>
</p:sld>
"@
}

Write-Host "Assembling 10 slides..."

# Helper for Slide Header
function Get-HeaderShapes($stepTitle, $subTitle) {
    $sb = ""
    # Top red decorative line
    $sb += New-BoxShape 10 "TopLine" 0 0 12192000 76200 "E60012" ""
    # Dark card top bar
    $sb += New-BoxShape 11 "HeaderBar" 571500 381000 11049000 1028700 "0B2341" "1E3A8A" 15000 8000

    # Header Titles
    $titleP = (P $stepTitle 2300 1 "FFFFFF" "l" 40000)
    $titleP += (P $subTitle 1300 0 "93C5FD" "l" 0)
    $sb += New-TextShape 14 "HeaderTitleText" 914400 457200 10300000 914400 $titleP "t"
    return $sb
}

# --- SLIDE 1: COVER ---
$s1 = ""
$s1 += New-BoxShape 2 "TopAccent" 0 0 12192000 95250 "E60012" ""
$s1 += New-BoxShape 3 "BgCard" 952500 762000 10287000 5334000 "0B2341" "1E3A8A" 25400 12000
$s1 += New-BoxShape 4 "RedLine" 1524000 1447800 1524000 57150 "E60012" ""

$covP = (P "DIGITALISASI SISTEM ORDER &amp; MONITORING SPECIAL ORDER PART (SOP)" 3000 1 "FFFFFF" "l" 120000)
$covP += (P "Integrasi Real-Time Proses Order, Monitoring Status, dan Revenue Part di Bengkel Agung Toyota Gianyar" 1600 0 "93C5FD" "l" 240000)
$covP += (P "Oleh: FEBRI FAJAR RACHMADANI" 1600 1 "FFFFFF" "l" 40000)
$covP += (P "Partman • Agung Toyota Gianyar" 1300 0 "93C5FD" "l" 0)
$s1 += New-TextShape 7 "MainTitle" 1524000 1800000 9144000 3800000 $covP "t"
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\slides\slide1.xml"), (Build-SlideXml $s1), [System.Text.Encoding]::UTF8)

# --- SLIDE 2: CLARIFY THE PROBLEM ---
$s2 = Get-HeaderShapes "CLARIFY THE PROBLEM" "Identifikasi Masalah &amp; Situasi Aktual Lapangan"
# Card 1: Latar Belakang
$s2 += New-BoxShape 20 "C1" 571500 1600200 5334000 4700000 "18181B" "2563EB" 20000 8000
$s2 += New-BoxShape 21 "C1H" 571500 1600200 5334000 685800 "0F172A" "2563EB" 15000 8000
$pC1H = (P "LATAR BELAKANG PROSES SOP" 1400 1 "60A5FA" "l" 0)
$s2 += New-TextShape 22 "C1HT" 800000 1750000 4800000 500000 $pC1H "ctr"

$pC1B = (P "• Layanan Khusus Pelanggan: Special Order Part (SOP) menangani suku cadang khusus yang membutuhkan koordinasi intensif antara Partman, SA, dan Konsumen." 1250 0 "E2E8F0" "l" 120000)
$pC1B += (P "• Alur Operasional: Order SA &gt; Input Partman &gt; Tunggu Suplai Depo &gt; Part Tiba (ATA) &gt; SA Follow Up &gt; Pemasangan Part." 1250 0 "E2E8F0" "l" 120000)
$pC1B += (P "• Urgensi Penanganan: Keterlambatan follow-up berdampak pada penumpukan barang di rak (holding cost) dan keluhan pelanggan." 1250 0 "E2E8F0" "l" 0)
$s2 += New-TextShape 23 "C1BT" 800000 2400000 4800000 3600000 $pC1B "t"

# Card 2: Masalah Aktual
$s2 += New-BoxShape 24 "C2" 6286500 1600200 5334000 4700000 "18181B" "E60012" 20000 8000
$s2 += New-BoxShape 25 "C2H" 6286500 1600200 5334000 685800 "7F1D1D" "E60012" 15000 8000
$pC2H = (P "MASALAH OPERASIONAL DI LAPANGAN" 1400 1 "FCA5A5" "l" 0)
$s2 += New-TextShape 26 "C2HT" 6515000 1750000 4800000 500000 $pC2H "ctr"

$pC2B = (P "1. Beban Input Manual Partman: Harus membuat Form Order lalu mengetik ulang data baris per baris ke sheet masing-masing SA secara manual." 1200 0 "E2E8F0" "l" 100000 1)
$pC2B += (P "2. Risiko Berkas Fisik Terselip: Mengandalkan form order kertas yang rawan terselip di meja SA; jika terselip, SA harus mengecek manual spreadsheet." 1200 0 "E2E8F0" "l" 100000 1)
$pC2B += (P "3. Part Menginap di Rak: Respon follow-up SA lambat tanpa adanya alarm pengingat aktif sehingga part tertahan berhari-hari di rak bengkel." 1200 0 "E2E8F0" "l" 100000 1)
$pC2B += (P "4. Rekapitulasi Manual &amp; Terlambat: Rekap Job Done dan akumulasi nilai rupiah penjualan part hanya bisa dihitung di akhir bulan." 1200 0 "E2E8F0" "l" 0 1)
$s2 += New-TextShape 27 "C2BT" 6515000 2400000 4800000 3600000 $pC2B "t"
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\slides\slide2.xml"), (Build-SlideXml $s2), [System.Text.Encoding]::UTF8)

# --- SLIDE 3: BREAKDOWN THE PROBLEM ---
$s3 = Get-HeaderShapes "BREAKDOWN THE PROBLEM" "Analisis 3 Area Kritis (Alur Kerja Partman - SA - Manajemen)"
$bColW = 3480000
$bGap = 304800
# Pillar 1: Ordering
$s3 += New-BoxShape 30 "P1" 571500 1676400 $bColW 4686300 "18181B" "3B82F6" 20000 8000
$pP1 = (P "1. ASPEK PEMESANAN" 1500 1 "60A5FA" "l" 80000)
$pP1 += (P "(Peran Partman)" 1200 1 "93C5FD" "l" 140000)
$pP1 += (P "• Input Manual Ganda: Partman menerima permintaan part lalu mengetik ulang ke Form Order dan sheet monitoring SA." 1250 0 "E2E8F0" "l" 100000)
$pP1 += (P "• Kerumitan Multi-Item: Pesanan dengan banyak item part membutuhkan pengaturan rumus harga dan baris kosong manual." 1250 0 "E2E8F0" "l" 100000)
$pP1 += (P "• Human Error: Rawan salah input nopol, harga, atau ada suku cadang yang tertinggal." 1250 0 "E2E8F0" "l" 0)
$s3 += New-TextShape 31 "P1T" 762000 1905000 ($bColW - 381000) 4200000 $pP1 "t"

# Pillar 2: Monitoring & Follow Up
$p2X = 571500 + $bColW + $bGap
$s3 += New-BoxShape 32 "P2" $p2X 1676400 $bColW 4686300 "18181B" "E60012" 20000 8000
$pP2 = (P "2. ASPEK MONITORING" 1500 1 "F87171" "l" 80000)
$pP2 += (P "(Peran Service Advisor)" 1200 1 "FCA5A5" "l" 140000)
$pP2 += (P "• Risiko Berkas Fisik Terselip: Mengandalkan form kertas dari Partman yang rawan terselip di meja SA; jika terselip, SA harus mengecek manual ke spreadsheet." 1250 0 "E2E8F0" "l" 100000)
$pP2 += (P "• Respon Follow-Up Lambat: Padatnya antrian servis membuat SA lambat menghubungi konsumen tanpa adanya alarm pengingat aktif." 1250 0 "E2E8F0" "l" 100000)
$pP2 += (P "• Nihil Early Warning: Tidak ada alarm / pop-up otomatis yang menegur SA jika part lengkap sudah menginap > 2 hari di rak." 1250 0 "E2E8F0" "l" 0)
$s3 += New-TextShape 33 "P2T" ($p2X + 190500) 1905000 ($bColW - 381000) 4200000 $pP2 "t"

# Pillar 3: Reporting & Revenue
$p3X = $p2X + $bColW + $bGap
$s3 += New-BoxShape 34 "P3" $p3X 1676400 $bColW 4686300 "18181B" "10B981" 20000 8000
$pP3 = (P "3. ASPEK REKAPITULASI" 1500 1 "34D399" "l" 80000)
$pP3 += (P "(Peran Manajemen / KaBeng)" 1200 1 "A7F3D0" "l" 140000)
$pP3 += (P "• Sulit Tarik Data Harian: Rekapan omset/revenue part tidak bisa dilihat seketika di tengah bulan." 1250 0 "E2E8F0" "l" 100000)
$pP3 += (P "• Perhitungan Manual: Rentan selisih penjumlahan total rupiah antara fisik nota dan sheet." 1250 0 "E2E8F0" "l" 100000)
$pP3 += (P "• Kontrol Terlambat: Kepala Bengkel baru mengetahui ada part macet di akhir bulan saat evaluasi." 1250 0 "E2E8F0" "l" 0)
$s3 += New-TextShape 35 "P3T" ($p3X + 190500) 1905000 ($bColW - 381000) 4200000 $pP3 "t"
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\slides\slide3.xml"), (Build-SlideXml $s3), [System.Text.Encoding]::UTF8)

# --- SLIDE 4: SET THE TARGET ---
$s4 = Get-HeaderShapes "SET THE TARGET" "Kondisi Ideal, Kesenjangan (Gap), dan Sasaran SMART"
# Top Left: Kondisi Ideal
$s4 += New-BoxShape 40 "IdealBox" 571500 1600200 5334000 2200000 "18181B" "10B981" 20000 8000
$pIdeal = (P "KONDISI IDEAL (TARGET BENGKEL)" 1350 1 "34D399" "l" 40000)
$pIdeal += (P "• Distribusi Otomatis: 1x input form langsung menyalurkan data order ke sheet SA." 1150 0 "E2E8F0" "l" 40000)
$pIdeal += (P "• Zero Dead-Stock: Part tiba lengkap langsung di-follow up cepat &lt;= H+2." 1150 0 "E2E8F0" "l" 40000)
$pIdeal += (P "• Visibilitas Revenue: Nilai penjualan part SOP terpantau transparan dan terukur seketika." 1150 0 "E2E8F0" "l" 0)
$s4 += New-TextShape 41 "IdealTxt" 762000 1700000 4953000 2000000 $pIdeal "t"

# Top Right: The Gap
$s4 += New-BoxShape 42 "GapBox" 6286500 1600200 5334000 2200000 "18181B" "38BDF8" 20000 8000
$pGp = (P "THE GAP (KESENJANGAN KRITIS)" 1350 1 "38BDF8" "l" 40000)
$pGp += (P "Ketiadaan platform terintegrasi real-time antara Partman &amp; SA, serta ketiadaan Sistem Peringatan Dini (Early Warning) otomatis saat part tiba di gudang." 1200 0 "BAE6FD" "l" 60000)
$pGp += (P "Kesenjangan inilah yang dijembatani melalui penetapan 3 Target Kaizen di bawah ini." 1150 1 "FFFFFF" "l" 0)
$s4 += New-TextShape 43 "GapTxt" 6477000 1700000 4953000 2000000 $pGp "t"

# Bottom Row: 3 Target Boxes
$bW = 3480000
$bGap = 304800
# Target 1
$s4 += New-BoxShape 44 "T1" 571500 4050000 $bW 2250000 "18181B" "E60012" 20000 8000
$pT1 = (P "TARGET 1: LEAD TIME &lt;= H+2" 1300 1 "F87171" "l" 30000)
$pT1 += (P "&lt;= 2 Hari Kerja" 1600 1 "FFFFFF" "l" 40000)
$pT1 += (P "100% unit part lengkap WAJIB mendapatkan Follow Up 1 maksimal H+2 sejak part tiba di gudang." 1150 0 "E2E8F0" "l" 0)
$s4 += New-TextShape 45 "T1T" 762000 4180000 ($bW - 381000) 2000000 $pT1 "t"

# Target 2
$t2X = 571500 + $bW + $bGap
$s4 += New-BoxShape 46 "T2" $t2X 4050000 $bW 2250000 "18181B" "2563EB" 20000 8000
$pT2 = (P "TARGET 2: 100% AUTO-DISPATCH" 1300 1 "60A5FA" "l" 30000)
$pT2 += (P "Zero Re-Typing" 1600 1 "FFFFFF" "l" 40000)
$pT2 += (P "Partman cukup 1x input form; data multi-item otomatis mengalir ke sheet masing-masing SA." 1150 0 "E2E8F0" "l" 0)
$s4 += New-TextShape 47 "T2T" ($t2X + 190500) 4180000 ($bW - 381000) 2000000 $pT2 "t"

# Target 3
$t3X = $t2X + $bW + $bGap
$s4 += New-BoxShape 48 "T3" $t3X 4050000 $bW 2250000 "18181B" "10B981" 20000 8000
$pT3 = (P "TARGET 3: PART REVENUE" 1300 1 "34D399" "l" 30000)
$pT3 += (P "100% Real-Time" 1600 1 "FFFFFF" "l" 40000)
$pT3 += (P "Rekap Job Done dan total omset part murni terpantau seketika tanpa tunggu akhir bulan." 1150 0 "E2E8F0" "l" 0)
$s4 += New-TextShape 49 "T3T" ($t3X + 190500) 4180000 ($bW - 381000) 2000000 $pT3 "t"
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\slides\slide4.xml"), (Build-SlideXml $s4), [System.Text.Encoding]::UTF8)

# --- SLIDE 5: ANALYZE ROOT CAUSE ---
$s5 = Get-HeaderShapes "ANALYZE ROOT CAUSE" "Analisis Mendalam Akar Masalah Menggunakan Pendekatan 5-Why Analysis"
$yStart = 1676400
$boxH = 800100
$gapY = 152400

$whys = @(
    @("WHY 1: Mengapa part SOP menginap lama di rak gudang bengkel?", "Karena respon SA lambat menghubungi konsumen untuk jadwal booking.", "1E293B", "38BDF8"),
    @("WHY 2: Mengapa respon SA lambat menghubungi konsumen?", "Karena berkas form fisik rawan terselip di meja SA di tengah padatnya antrian servis.", "1E293B", "38BDF8"),
    @("WHY 3: Mengapa jika berkas terselip SA lambat menindaklanjuti?", "Karena SA harus mengecek manual spreadsheet baris per baris tanpa alarm pengingat aktif.", "1E293B", "38BDF8"),
    @("WHY 4: Mengapa tidak ada alarm pengingat otomatis di sistem?", "Karena monitoring masih mengandalkan lembaran fisik dan spreadsheet statis.", "1E293B", "38BDF8"),
    @("ROOT CAUSE (AKAR MASALAH): Ketiadaan platform monitoring terintegrasi yang menghubungkan Form Order, sheet SA, dan Sistem Early Warning (Pop-Up H+2) otomatis.", "SOLUSI KAIZEN: Membangun Web App terintegrasi Google Sheets dengan Early Warning Pop-Up H+2 &amp; Eskalasi Otomatis.", "7F1D1D", "E60012")
)

for ($i = 0; $i -lt $whys.Length; $i++) {
    $curY = $yStart + ($i * ($boxH + $gapY))
    $wTitle = $whys[$i][0]
    $wDesc = $whys[$i][1]
    $bgC = $whys[$i][2]
    $brdC = $whys[$i][3]
    
    $s5 += New-BoxShape (50 + $i*2) "WBox$i" 571500 $curY 11049000 $boxH $bgC $brdC 20000 8000
    $pW = (P $wTitle 1350 1 "FFFFFF" "l" 30000)
    $pW += (P ("&gt;&gt; " + $wDesc) 1250 0 "E2E8F0" "l" 0)
    $s5 += New-TextShape (51 + $i*2) "WTxt$i" 800000 ($curY + 76200) 10591800 685800 $pW "ctr"
}
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\slides\slide5.xml"), (Build-SlideXml $s5), [System.Text.Encoding]::UTF8)

# --- SLIDE 6: DEVELOP COUNTERMEASURES ---
$s6 = Get-HeaderShapes "DEVELOP COUNTERMEASURES" "Rencana Penanggulangan: 3 Pilar Solusi Berbasis Multi-Tier Early Warning"
$cW = 3480000
$cGap = 304800
# Solusi 1
$s6 += New-BoxShape 60 "S1" 571500 1676400 $cW 4686300 "18181B" "3B82F6" 20000 8000
$pS1 = (P "PILAR 1: INPUT STREAMLINING" 1450 1 "60A5FA" "l" 60000)
$pS1 += (P "(Efisiensi Kerja Partman)" 1200 1 "93C5FD" "l" 120000)
$pS1 += (P "• Form Input Cepat: Partman cukup memasukkan nopol dan multi-item part di web app." 1250 0 "E2E8F0" "l" 90000 1)
$pS1 += (P "• Auto-Routing ke Sheet SA: 1 klik langsung menyalurkan baris order ke sheet SA yang dituju (AJS, AYU, FIK, WBN, OTHER)." 1250 0 "E2E8F0" "l" 90000 1)
$pS1 += (P "• Validasi Rumus &amp; Harga: Menghilangkan risiko selisih total harga atau kolom tergeser." 1250 0 "E2E8F0" "l" 0 1)
$s6 += New-TextShape 61 "S1T" 762000 1905000 ($cW - 381000) 4200000 $pS1 "t"

# Solusi 2
$s2X = 571500 + $cW + $cGap
$s6 += New-BoxShape 62 "S2" $s2X 1676400 $cW 4686300 "18181B" "E60012" 20000 8000
$pS2 = (P "PILAR 2: 3-TIER EARLY WARNING" 1450 1 "F87171" "l" 60000)
$pS2 += (P "(Sistem Poka-Yoke Bertingkat)" 1200 1 "FCA5A5" "l" 120000)
$pS2 += (P "• Lapis 1 (H+2 Part Lengkap): Pop-up otomatis di web app jika seluruh part sudah tiba $\ge$ 2 hari namun belum di-follow up SA." 1250 0 "E2E8F0" "l" 90000 1)
$pS2 += (P "• Lapis 2 (H+7 Follow-Up 2): Pop-up pengingat tindak lanjut ke-2 bagi unit yang sudah di-follow up 1 namun belum booking." 1250 0 "E2E8F0" "l" 90000 1)
$pS2 += (P "• Lapis 3 (Eskalasi Manajemen): Email otomatis resmi ke SA &amp; CC Kepala Bengkel." 1250 0 "E2E8F0" "l" 0 1)
$s6 += New-TextShape 63 "S2T" ($s2X + 190500) 1905000 ($cW - 381000) 4200000 $pS2 "t"

# Solusi 3
$s3X = $s2X + $cW + $cGap
$s6 += New-BoxShape 64 "S3" $s3X 1676400 $cW 4686300 "18181B" "10B981" 20000 8000
$pS3 = (P "PILAR 3: REKAPAN PART REVENUE" 1450 1 "34D399" "l" 60000)
$pS3 += (P "(Transparansi Job Done)" 1200 1 "A7F3D0" "l" 120000)
$pS3 += (P "• Rekapan Otomatis Job Done: Menyajikan daftar unit selesai di bulan berjalan dengan pencatatan tanggal Job Done." 1250 0 "E2E8F0" "l" 90000 1)
$pS3 += (P "• Akumulasi Part Revenue: Menampilkan total rupiah penjualan part SOP secara transparan (tanpa mencampur aduk jasa)." 1250 0 "E2E8F0" "l" 90000 1)
$pS3 += (P "• Modal Rincian Lengkap: Fitur 'Lihat Part Lengkap' untuk inspeksi item part tanpa membebani tabel." 1250 0 "E2E8F0" "l" 0 1)
$s6 += New-TextShape 65 "S3T" ($s3X + 190500) 1905000 ($cW - 381000) 4200000 $pS3 "t"
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\slides\slide6.xml"), (Build-SlideXml $s6), [System.Text.Encoding]::UTF8)

# --- SLIDE 7: SEE COUNTERMEASURES THROUGH ---
$s7 = Get-HeaderShapes "SEE COUNTERMEASURES THROUGH" "Eksekusi Nyata: Fitur Aplikasi Monitoring SOP di Agung Toyota Gianyar"
$fW = 5334000
$fH = 2247900
# Fitur 1
$s7 += New-BoxShape 70 "F1" 571500 1676400 $fW $fH "18181B" "2563EB" 20000 8000
$pF1 = (P "1. FORM ORDER &amp; SINKRONISASI REAL-TIME" 1400 1 "60A5FA" "l" 50000)
$pF1 += (P "• Terhubung langsung 2 arah ke Google Spreadsheet via RESTful API." 1200 0 "E2E8F0" "l" 40000 1)
$pF1 += (P "• Partman cukup 1x klik 'Kirim ke Monitoring', data otomatis tersimpan rapi di sheet SA." 1200 0 "E2E8F0" "l" 40000 1)
$pF1 += (P "• Cetak SOP Lembar 1 &amp; 2 instan dengan layout resmi bengkel." 1200 0 "E2E8F0" "l" 0 1)
$s7 += New-TextShape 71 "F1T" 762000 1800000 4953000 2000000 $pF1 "t"

# Fitur 2
$s7 += New-BoxShape 72 "F2" 6286500 1676400 $fW $fH "18181B" "E60012" 20000 8000
$pF2 = (P "2. EARLY WARNING POP-UP H+2 (PART LENGKAP)" 1400 1 "F87171" "l" 50000)
$pF2 += (P "• Tombol peringatan merah di header: 🚨 X PART LENGKAP (H+2)." 1200 0 "E2E8F0" "l" 40000 1)
$pF2 += (P "• Mendeteksi unit yang semua part-nya sudah tiba $\ge$ 2 hari namun belum ada FU 1." 1200 0 "E2E8F0" "l" 40000 1)
$pF2 += (P "• Fitur Quick Action: SA bisa langsung input hasil Follow Up 1 di dalam pop-up." 1200 0 "E2E8F0" "l" 0 1)
$s7 += New-TextShape 73 "F2T" 6477000 1800000 4953000 2000000 $pF2 "t"

# Fitur 3
$s7 += New-BoxShape 74 "F3" 571500 4114800 $fW $fH "18181B" "D97706" 20000 8000
$pF3 = (P "3. DASHBOARD MONITORING &amp; KARTU SA INTERAKTIF" 1400 1 "FBBF24" "l" 50000)
$pF3 += (P "• Filter tab per Service Advisor (AJS, AYU, FIK, WBN, OTHER)." 1200 0 "E2E8F0" "l" 40000 1)
$pF3 += (P "• Badge visual: 'Semua Part Datang (ATA: DD Mmm • Usia: X Hari)'." 1200 0 "E2E8F0" "l" 40000 1)
$pF3 += (P "• Update NEW ETA, ATA per item part, dan riwayat FU 1, 2, 3 tercatat otomatis." 1200 0 "E2E8F0" "l" 0 1)
$s7 += New-TextShape 75 "F3T" 762000 4238400 4953000 2000000 $pF3 "t"

# Fitur 4
$s7 += New-BoxShape 76 "F4" 6286500 4114800 $fW $fH "18181B" "10B981" 20000 8000
$pF4 = (P "4. REKAPAN JOB DONE &amp; PART REVENUE BULANAN" 1400 1 "34D399" "l" 50000)
$pF4 += (P "• Filter dinamis per bulan/tahun dan per Service Advisor." 1200 0 "E2E8F0" "l" 40000 1)
$pF4 += (P "• Ringkasan KPI: Total Unit Selesai, Total Item Part, dan Total Nilai Part Revenue." 1200 0 "E2E8F0" "l" 40000 1)
$pF4 += (P "• Pencegahan data kotor (banner bulan/header tabel disaring otomatis)." 1200 0 "E2E8F0" "l" 0 1)
$s7 += New-TextShape 77 "F4T" 6477000 4238400 4953000 2000000 $pF4 "t"
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\slides\slide7.xml"), (Build-SlideXml $s7), [System.Text.Encoding]::UTF8)

# --- SLIDE 8: EVALUATE RESULTS & PROCESSES ---
$s8 = Get-HeaderShapes "EVALUATE RESULTS &amp; PROCESSES" "Perbandingan Sebelum vs Sesudah Kaizen &amp; Analisis Manfaat"
# Table Header
$s8 += New-BoxShape 80 "TH1" 571500 1676400 3200400 533400 "0F172A" "38BDF8" 15000
$s8 += New-BoxShape 81 "TH2" 3848100 1676400 3848100 533400 "7F1D1D" "E60012" 15000
$s8 += New-BoxShape 82 "TH3" 7772400 1676400 3848100 533400 "064E3B" "10B981" 15000

$s8 += New-TextShape 83 "TH1T" 571500 1720000 3200400 457200 (P "PARAMETER" 1300 1 "38BDF8" "ctr" 0) "ctr"
$s8 += New-TextShape 84 "TH2T" 3848100 1720000 3848100 457200 (P "BEFORE KAIZEN" 1300 1 "FCA5A5" "ctr" 0) "ctr"
$s8 += New-TextShape 85 "TH3T" 7772400 1720000 3848100 457200 (P "AFTER KAIZEN" 1300 1 "6EE7B7" "ctr" 0) "ctr"

$evalRows = @(
    @("Proses Input Partman", "Ketik ulang manual baris per baris; butuh 10-15 menit per pesanan", "1x klik Form Order otomatis terkirim ke sheet SA dalam 2 detik (Efisiensi 90%)"),
    @("Kecepatan Follow Up", "SA sering terlambat/lupa; part menginap lama tanpa kejelasan", "Pop-up H+2 langsung mengingatkan SA saat part lengkap tiba di gudang"),
    @("Eskalasi Part Tertunda", "Tidak ada pengingat berkala ke Kepala Bengkel", "Email reminder H+7 otomatis dikirim ke SA dan CC Kepala Bengkel"),
    @("Rekapitulasi Part Revenue", "Manual di akhir bulan, memakan waktu dan rawan salah hitung", "Dashboard Job Done real-time menyajikan total unit &amp; omset part seketika")
)

$rY = 2286000
$rH = 762000
for ($i = 0; $i -lt $evalRows.Length; $i++) {
    $yC = $rY + ($i * $rH)
    $bgR = if ($i % 2 -eq 0) { "18181B" } else { "27272A" }
    $s8 += New-BoxShape (90 + $i*4) "R1_$i" 571500 $yC 3200400 $rH $bgR "3F3F46" 10000
    $s8 += New-BoxShape (91 + $i*4) "R2_$i" 3848100 $yC 3848100 $rH $bgR "3F3F46" 10000
    $s8 += New-BoxShape (92 + $i*4) "R3_$i" 7772400 $yC 3848100 $rH $bgR "3F3F46" 10000
    
    $s8 += New-TextShape (93 + $i*4) "RT1_$i" 647700 $yC 3048000 $rH (P $evalRows[$i][0] 1200 1 "FFFFFF" "l" 0) "ctr"
    $s8 += New-TextShape (94 + $i*4) "RT2_$i" 3924300 $yC 3695700 $rH (P $evalRows[$i][1] 1150 0 "FCA5A5" "l" 0) "ctr"
    $s8 += New-TextShape (95 + $i*4) "RT3_$i" 7848600 $yC 3695700 $rH (P $evalRows[$i][2] 1150 1 "6EE7B7" "l" 0) "ctr"
}

# Bottom Cost Benefit
$s8 += New-BoxShape 110 "CostBox" 571500 5486400 11049000 876300 "0B2341" "2563EB" 15000 8000
$pCost = (P "COST &amp; RESOURCE EFFICIENCY: Biaya Investasi Rp 0,- (Memanfaatkan ekosistem Google Workspace &amp; Google Apps Script tanpa biaya langganan software pihak ketiga)." 1300 1 "BAE6FD" "ctr" 0)
$s8 += New-TextShape 111 "CostTxt" 762000 5638800 10668000 571500 $pCost "ctr"
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\slides\slide8.xml"), (Build-SlideXml $s8), [System.Text.Encoding]::UTF8)

# --- SLIDE 9: STANDARDIZE SUCCESSFUL PROCESSES ---
$s9 = Get-HeaderShapes "STANDARDIZE SUCCESSFUL PROCESSES" "Konsistensi Operasional &amp; Pengendalian Standar Mutu di Agung Toyota Gianyar"
$wHalf = 5334000
# Box Standarisasi
$s9 += New-BoxShape 120 "Std" 571500 1676400 $wHalf 4686300 "18181B" "2563EB" 20000 8000
$pStd = (P "A. STANDAR OPERASIONAL PROSEDUR (SOP BARU)" 1500 1 "60A5FA" "l" 80000)
$pStd += (P "1. Standar Pemesanan Partman:" 1300 1 "93C5FD" "l" 40000)
$pStd += (P "Seluruh pesanan SOP wajib diinput melalui Web App Monitoring untuk menjamin validitas data dan auto-dispatch ke sheet SA." 1200 0 "E2E8F0" "l" 100000 1)
$pStd += (P "2. Standar Respon SA (Maksimal H+2):" 1300 1 "93C5FD" "l" 40000)
$pStd += (P "Begitu part lengkap tiba di gudang, SA wajib mengisi catatan Follow Up 1 maksimal dalam 2 hari kerja." 1200 0 "E2E8F0" "l" 100000 1)
$pStd += (P "3. Standar Rekapitulasi Job Done:" 1300 1 "93C5FD" "l" 40000)
$pStd += (P "Penyelesaian pesanan dicatat secara digital dengan tanggal Job Done dan verifikasi Part Revenue otomatis." 1200 0 "E2E8F0" "l" 0 1)
$s9 += New-TextShape 121 "StdT" 800000 1905000 ($wHalf - 457200) 4200000 $pStd "t"

# Box Kontrol & Keberlanjutan Internal
$s9 += New-BoxShape 122 "Contr" 6286500 1676400 $wHalf 4686300 "18181B" "10B981" 20000 8000
$pContr = (P "B. SISTEM KONTROL &amp; KEBERLANJUTAN" 1500 1 "34D399" "l" 80000)
$pContr += (P "1. Disiplin Early Warning H+2:" 1300 1 "A7F3D0" "l" 40000)
$pContr += (P "Pengecekan aktif pop-up notifikasi harian di web app agar tidak ada part lengkap yang tertahan > 2 hari di rak gudang." 1200 0 "E2E8F0" "l" 100000 1)
$pContr += (P "2. Eskalasi Mingguan Bersama KaBeng:" 1300 1 "A7F3D0" "l" 40000)
$pContr += (P "Review berkala status unit tertahan yang belum ada konfirmasi booking servis bersama Kepala Bengkel." 1200 0 "E2E8F0" "l" 100000 1)
$pContr += (P "3. Rekonsiliasi &amp; Audit Fisik Rutin:" 1300 1 "A7F3D0" "l" 40000)
$pContr += (P "Pencocokan fisik part di rak gudang dengan data monitoring web app secara periodik untuk menjaga akurasi 100%." 1200 0 "E2E8F0" "l" 0 1)
$s9 += New-TextShape 123 "ContrT" 6515000 1905000 ($wHalf - 457200) 4200000 $pContr "t"
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\slides\slide9.xml"), (Build-SlideXml $s9), [System.Text.Encoding]::UTF8)

# --- SLIDE 10: CLOSING & Q&A ---
$s10 = ""
$s10 += New-BoxShape 130 "TopAccent" 0 0 12192000 95250 "E60012" ""
$s10 += New-BoxShape 131 "BgCard" 1524000 952500 9144000 4953000 "0B2341" "1E3A8A" 25400 12000
$s10 += New-BoxShape 132 "RedLine" 2286000 1752600 1524000 57150 "E60012" ""

$pClose = (P "TERIMA KASIH" 3600 1 "FFFFFF" "ctr" 80000)
$pClose += (P "ARIGATOU GOZAIMASU" 1800 1 "E60012" "ctr" 180000)
$pClose += (P "Komitmen Kami untuk Pelayanan Prima, Efisiensi Operasional, dan Kepuasan Pelanggan (Customer Delight)" 1450 0 "93C5FD" "ctr" 220000)
$pClose += (P "SESI TANYA JAWAB (Q&amp;A)" 2000 1 "FBBF24" "ctr" 120000)
$pClose += (P "PT AGUNG AUTOMALL GIANYAR (AGUNG TOYOTA GIANYAR)" 1300 1 "FFFFFF" "ctr" 0)
$s10 += New-TextShape 133 "CloseTxt" 2000000 2000000 8192000 3500000 $pClose "ctr"
[System.IO.File]::WriteAllText((Join-Path $tempDir "ppt\slides\slide10.xml"), (Build-SlideXml $s10), [System.Text.Encoding]::UTF8)

# 8. Create ZIP and save as PPTX
if (Test-Path $OutputPath) {
    Remove-Item -Force $OutputPath
}

Write-Host "Compressing OpenXML package into $OutputPath..."
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $OutputPath)

# Cleanup temp dir
Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue

$fInfo = Get-Item $OutputPath
Write-Host "SUCCESS! PPTX generated at $($fInfo.FullName) ($($fInfo.Length) bytes)"
