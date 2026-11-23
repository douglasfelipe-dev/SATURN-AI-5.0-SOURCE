# Testes das distribuições — portátil e instalador
$ErrorActionPreference = 'Continue'
$root = 'C:\Users\salgl\OneDrive\Desktop\novo projeto\nova-desk'
Set-Location $root

function Stop-App { Get-Process electron, 'DOUGLAS FELIPE.DEV' -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Sleep -Seconds 2 }
function Run-Suite($label) {
  Write-Host "`n########## $label ##########"
  foreach ($t in @('t1_nav.mjs','t2_profile.mjs','t3_notes.mjs','t4_music.mjs','t5_cinema.mjs','t6_imports.mjs','t7_personalizacao.mjs')) {
    Write-Host "`n--- $t ---"
    node "tests/$t"
  }
}

Stop-App
Write-Host '=== PORTATIL ==='
$portable = "$root\release-2.0.1\DOUGLAS FELIPE.DEV 2.0.1 Portable.exe"
Start-Process -FilePath $portable -ArgumentList '--remote-debugging-port=9222'
Start-Sleep -Seconds 10
Run-Suite 'PORTATIL'

Stop-App
Write-Host '=== INSTALADOR (install silencioso) ==='
$setup = "$root\release-2.0.1\DOUGLAS FELIPE.DEV 2.0.1 Setup.exe"
Start-Process -FilePath $setup -ArgumentList '/S' -Wait
$installed = "$env:LOCALAPPDATA\Programs\DOUGLAS FELIPE.DEV\DOUGLAS FELIPE.DEV.exe"
if (-not (Test-Path $installed)) { $installed = "$env:ProgramFiles\DOUGLAS FELIPE.DEV\DOUGLAS FELIPE.DEV.exe" }
Write-Host "Instalado em: $installed"
if (Test-Path $installed) {
  Start-Process -FilePath $installed -ArgumentList '--remote-debugging-port=9222'
  Start-Sleep -Seconds 10
  Run-Suite 'INSTALADO'
} else { Write-Host 'FALHA: executável instalado não encontrado' }
