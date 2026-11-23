param([string]$Action='info',[int]$X=0,[int]$Y=0,[int]$W=0,[int]$H=0)
Add-Type @"
using System;using System.Runtime.InteropServices;
public class WN {
 [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h,int i);
 [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h,int x,int y,int w,int hh,bool r);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r);
 public struct RECT { public int L,T,R,B; }
}
"@
$p=Get-Process | Where-Object {($_.ProcessName -like '*SATURN*' -or $_.ProcessName -eq 'electron') -and $_.MainWindowTitle -like '*SATURN*'} | Select-Object -First 1
if(-not $p){'{"error":"no window"}';exit}
$h=$p.MainWindowHandle
$style=[WN]::GetWindowLong($h,-16)
if($Action -eq 'move'){ [WN]::MoveWindow($h,$X,$Y,$W,$H,$true)|Out-Null; Start-Sleep -Milliseconds 500 }
$r=New-Object WN+RECT
[WN]::GetWindowRect($h,[ref]$r)|Out-Null
$thick = (($style -band 0x40000) -ne 0).ToString().ToLower()
'{"style":"' + $style.ToString('X8') + '","thick":' + $thick + ',"x":' + $r.L + ',"y":' + $r.T + ',"w":' + ($r.R-$r.L) + ',"h":' + ($r.B-$r.T) + '}'
