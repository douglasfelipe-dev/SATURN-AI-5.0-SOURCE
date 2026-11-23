Add-Type @"
using System;using System.Runtime.InteropServices;
public class W {
 [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h,int i);
 [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h,int x,int y,int w,int hh,bool r);
 [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h,IntPtr a,int x,int y,int w,int hh,uint f);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r);
 public struct RECT { public int L,T,R,B; }
}
"@
$ps=Get-Process electron | Where-Object {$_.MainWindowTitle -like '*SATURN*'}
foreach($p in $ps){
  $h=$p.MainWindowHandle
  $style=[W]::GetWindowLong($h,-16)
  $r=New-Object W+RECT
  [W]::GetWindowRect($h,[ref]$r)|Out-Null
  "PID=$($p.Id) HWND=$h STYLE=0x$($style.ToString('X8')) RECT=$($r.L),$($r.T),$($r.R),$($r.B)"
  $mv=[W]::MoveWindow($h,1000,150,900,650,$true)
  Start-Sleep -Milliseconds 500
  [W]::GetWindowRect($h,[ref]$r)|Out-Null
  "MOVE=$mv NEWRECT=$($r.L),$($r.T),$($r.R),$($r.B)"
}
