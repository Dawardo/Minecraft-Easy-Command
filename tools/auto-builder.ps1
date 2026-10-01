<#
  Bedrock Music Maker - Auto Builder
  Builds a "slab plan" (made by the web page) in Minecraft Bedrock by pressing keys and clicking for you.
  Works on Realms: it only uses chat commands and the command block screen, like a player would.

  For every command block it:
    1. teleports above the block looking straight down     (/tp @s x y z 0 90, typed into chat)
    2. right-clicks it and checks the screen really opened  (pixel check, retries if not)
    3. pastes the command into Command Input
    4. scrolls the left panel down and pastes Delay in Ticks
    5. presses Esc and checks the screen closed

  Keys while it runs:  F9 = pause / resume    F12 = stop (progress is saved, run again to resume)
  Uses only what ships with Windows (PowerShell 5.1+). -DryRun prints every action instead of doing it.
#>
param(
  [Parameter(Position = 0)][string]$Plan,
  [ValidateSet('fast', 'normal', 'slow', 'veryslow')][string]$Speed = '',
  [string]$ChatKey = 'T',
  [int]$Limit = -1,
  [switch]$Recalibrate,
  [switch]$DryRun,
  [switch]$Yes                     # answer "yes" to every question (used by the dry-run test)
)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$calFile = Join-Path $here 'calibration.json'

# ---------------------------------------------------------------- Windows input / screen helpers
if (-not $DryRun) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
namespace Bdm {
  public static class Win {
    [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
    [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
    [StructLayout(LayoutKind.Explicit)] public struct InputUnion { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
    [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint type; public InputUnion U; }
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }

    [DllImport("user32.dll", SetLastError = true)] static extern uint SendInput(uint n, INPUT[] inputs, int size);
    [DllImport("user32.dll")] static extern uint MapVirtualKey(uint code, uint mapType);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
    [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vk);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] static extern IntPtr GetDC(IntPtr h);
    [DllImport("user32.dll")] static extern int ReleaseDC(IntPtr h, IntPtr dc);
    [DllImport("gdi32.dll")] static extern uint GetPixel(IntPtr dc, int x, int y);
    [DllImport("user32.dll")] public static extern int GetSystemMetrics(int i);

    const uint INPUT_MOUSE = 0, INPUT_KEYBOARD = 1;
    const uint KEYUP = 0x0002, SCANCODE = 0x0008;

    static void Send(INPUT i) { SendInput(1, new INPUT[] { i }, Marshal.SizeOf(typeof(INPUT))); }

    // Games read scan codes, not virtual keys, so send the scan code.
    public static void Key(int vk, bool up) {
      INPUT i = new INPUT(); i.type = INPUT_KEYBOARD;
      i.U.ki.wScan = (ushort)MapVirtualKey((uint)vk, 0);
      i.U.ki.dwFlags = SCANCODE | (up ? KEYUP : 0);
      Send(i);
    }
    public static void Mouse(uint flags, int data) {
      INPUT i = new INPUT(); i.type = INPUT_MOUSE;
      i.U.mi.dwFlags = flags; i.U.mi.mouseData = unchecked((uint)data);
      Send(i);
    }
    public static int[] Pixel(int x, int y) {
      IntPtr dc = GetDC(IntPtr.Zero);
      uint c = GetPixel(dc, x, y);
      ReleaseDC(IntPtr.Zero, dc);
      return new int[] { (int)(c & 0xFF), (int)((c >> 8) & 0xFF), (int)((c >> 16) & 0xFF) };
    }
    public static string ForegroundTitle() {
      StringBuilder sb = new StringBuilder(256);
      GetWindowText(GetForegroundWindow(), sb, 256);
      return sb.ToString();
    }
  }
}
'@
  [void][Bdm.Win]::SetProcessDPIAware()
}

$VK = @{ Ctrl = 0x11; Enter = 0x0D; Esc = 0x1B; Back = 0x08; V = 0x56; A = 0x41; F8 = 0x77; F9 = 0x78; F12 = 0x7B }
$M = @{ LeftDown = 0x0002; LeftUp = 0x0004; RightDown = 0x0008; RightUp = 0x0010; Wheel = 0x0800 }

$script:speedMul = 1.0
function Wait([int]$ms) { if (-not $DryRun) { Start-Sleep -Milliseconds ([int]($ms * $script:speedMul)) } }
function Log([string]$msg, [string]$color = 'Gray') { Write-Host $msg -ForegroundColor $color }
function Act([string]$msg) { if ($DryRun) { Write-Host "  [dry] $msg" -ForegroundColor DarkGray } }

function Tap([int]$vk) { Act "key $vk"; if (-not $DryRun) { [Bdm.Win]::Key($vk, $false); Start-Sleep -Milliseconds 30; [Bdm.Win]::Key($vk, $true); Start-Sleep -Milliseconds 30 } }
function Combo([int]$vk) {
  Act "ctrl+$vk"
  if (-not $DryRun) {
    [Bdm.Win]::Key($VK.Ctrl, $false); Start-Sleep -Milliseconds 30
    [Bdm.Win]::Key($vk, $false); Start-Sleep -Milliseconds 30; [Bdm.Win]::Key($vk, $true); Start-Sleep -Milliseconds 30
    [Bdm.Win]::Key($VK.Ctrl, $true); Start-Sleep -Milliseconds 30
  }
}
function Clip([string]$text) { Act "clipboard = $text"; if (-not $DryRun) { Set-Clipboard -Value $text; Start-Sleep -Milliseconds 40 } }
function Paste([string]$text) { Clip $text; Combo $VK.V }
function MoveTo($p) { Act "move to $($p.x),$($p.y)"; if (-not $DryRun) { [void][Bdm.Win]::SetCursorPos($p.x, $p.y); Start-Sleep -Milliseconds 40 } }
function LeftClick($p) { MoveTo $p; Act 'left click'; if (-not $DryRun) { [Bdm.Win]::Mouse($M.LeftDown, 0); Start-Sleep -Milliseconds 40; [Bdm.Win]::Mouse($M.LeftUp, 0) } }
function RightClick { Act 'right click'; if (-not $DryRun) { [Bdm.Win]::Mouse($M.RightDown, 0); Start-Sleep -Milliseconds 50; [Bdm.Win]::Mouse($M.RightUp, 0) } }
function WheelDown([int]$notches) { Act "wheel down $notches"; if (-not $DryRun) { for ($i = 0; $i -lt $notches; $i++) { [Bdm.Win]::Mouse($M.Wheel, -120); Start-Sleep -Milliseconds 25 } } }
function Pressed([int]$vk) { if ($DryRun) { return $false }; return ([Bdm.Win]::GetAsyncKeyState($vk) -band 0x8000) -ne 0 }
function Cursor { $p = New-Object Bdm.Win+POINT; [void][Bdm.Win]::GetCursorPos([ref]$p); return @{ x = $p.X; y = $p.Y } }
function Beep([int]$f = 880) { if (-not $DryRun) { try { [Console]::Beep($f, 120) } catch {} } }

function WaitForKey([int]$vk) {
  if ($DryRun) { return }
  while (Pressed $vk) { Start-Sleep -Milliseconds 30 }          # let go first
  while (-not (Pressed $vk)) { Start-Sleep -Milliseconds 30 }
  while (Pressed $vk) { Start-Sleep -Milliseconds 30 }
}
function Ask([string]$question, [bool]$default = $true) {
  if ($Yes) { Log "$question -> yes (auto)"; return $true }
  $hint = '[y/n]'; if ($default) { $hint = '[Y/n]' } else { $hint = '[y/N]' }
  $a = Read-Host "$question $hint"
  if ([string]::IsNullOrWhiteSpace($a)) { return $default }
  return $a.Trim().ToLower().StartsWith('y')
}

# ---------------------------------------------------------------- open / closed check (pixels)
function Sample($points) { if ($DryRun) { return @() }; return @($points | ForEach-Object { , [Bdm.Win]::Pixel($_.x, $_.y) }) }
function Near($a, $b) { return ([math]::Abs($a[0] - $b[0]) + [math]::Abs($a[1] - $b[1]) + [math]::Abs($a[2] - $b[2])) -le 45 }
function IsOpen {
  if ($DryRun) { return $script:dryOpen }
  $now = Sample $cal.points
  for ($i = 0; $i -lt $now.Count; $i++) { if (-not (Near $now[$i] $cal.open[$i])) { return $false } }
  return $true
}
function WaitOpen([int]$timeoutMs) {
  $end = (Get-Date).AddMilliseconds($timeoutMs * $script:speedMul)
  while ((Get-Date) -lt $end) { if (IsOpen) { return $true }; Start-Sleep -Milliseconds 50 }
  return (IsOpen)
}
function WaitClosed([int]$timeoutMs) {
  $end = (Get-Date).AddMilliseconds($timeoutMs * $script:speedMul)
  while ((Get-Date) -lt $end) { if (-not (IsOpen)) { return $true }; Start-Sleep -Milliseconds 50 }
  return (-not (IsOpen))
}

# ---------------------------------------------------------------- game actions
$T = @{ chatOpen = 350; afterPaste = 150; afterEnter = 450; tp = 450; openTimeout = 4000; settle = 250; click = 150; scroll = 300; closeTimeout = 3000 }

function Chat([string]$command) {
  Log "    chat: $command" 'DarkCyan'
  Clip $command
  Tap ([int][char]$ChatKey.ToUpper()); Wait $T.chatOpen
  Combo $VK.V; Wait $T.afterPaste
  Tap $VK.Enter; Wait $T.afterEnter
}
function Fmt([double]$v) { return $v.ToString([System.Globalization.CultureInfo]::InvariantCulture) }
function TpAbove($b) { Chat ("/tp @s {0} {1} {2} 0 90" -f (Fmt ($b.x + 0.5)), (Fmt ($b.y + 2)), (Fmt ($b.z + 0.5))); Wait $T.tp }

function OpenBlock($b) {
  for ($try = 1; $try -le 3; $try++) {
    if ($DryRun) { $script:dryOpen = $true }
    RightClick
    if (WaitOpen $T.openTimeout) { Wait $T.settle; return $true }
    Log "    the command block screen didn't open (try $try of 3)" 'Yellow'
    if ($try -eq 2) { TpAbove $b }   # maybe the teleport lagged: do it again
  }
  return $false
}

function FillBlock($b) {
  # Command Input (a fresh block is empty; Ctrl+A + Backspace makes sure)
  LeftClick $cal.command; Wait $T.click
  Combo $VK.A; Tap $VK.Back
  Paste $b.command; Wait $T.afterPaste
  # Delay in Ticks: scroll the left panel to the bottom, then replace the value
  MoveTo $cal.panel; WheelDown 12; Wait $T.scroll
  LeftClick $cal.delay; Wait $T.click
  Combo $VK.A; for ($i = 0; $i -lt 7; $i++) { Tap $VK.Back }
  Paste ([string]$b.delay); Wait $T.afterPaste
  # close = save
  if ($DryRun) { $script:dryOpen = $false }
  Tap $VK.Esc
  if (-not (WaitClosed $T.closeTimeout)) { Tap $VK.Esc; [void](WaitClosed $T.closeTimeout) }
}

# ---------------------------------------------------------------- pause / stop / focus
function CheckKeys {
  if (Pressed $VK.F12) { throw 'STOP' }
  if (Pressed $VK.F9) {
    while (Pressed $VK.F9) { Start-Sleep -Milliseconds 30 }
    Log '  PAUSED. Press F9 to continue (F12 to stop).' 'Yellow'; Beep 500
    while (-not (Pressed $VK.F9)) { if (Pressed $VK.F12) { throw 'STOP' }; Start-Sleep -Milliseconds 50 }
    while (Pressed $VK.F9) { Start-Sleep -Milliseconds 30 }
    Log '  Continuing in 2 seconds...' 'Green'; Start-Sleep -Seconds 2
  }
}
function EnsureMinecraft {
  if ($DryRun) { return }
  $warned = $false
  while ([Bdm.Win]::ForegroundTitle() -notmatch 'Minecraft') {
    if (-not $warned) { Log '  Waiting: click on the Minecraft window to continue (the builder pauses whenever Minecraft is not in front).' 'Yellow'; Beep 400; $warned = $true }
    if (Pressed $VK.F12) { throw 'STOP' }
    Start-Sleep -Milliseconds 200
  }
  if ($warned) { Log '  Minecraft is in front again, continuing in 2 seconds...' 'Green'; Start-Sleep -Seconds 2 }
}

# ---------------------------------------------------------------- plan
function FindPlan {
  if ($Plan) { return (Resolve-Path $Plan).Path }
  $dl = Join-Path $env:USERPROFILE 'Downloads'
  $f = $null
  if (Test-Path $dl) { $f = Get-ChildItem $dl -Filter '*.slabplan.json' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 }
  if ($f) {
    if (Ask "Use the newest plan: $($f.Name) ($($f.LastWriteTime))?") { return $f.FullName }
  }
  $p = Read-Host 'Drag the .slabplan.json file into this window and press Enter'
  return (Resolve-Path ($p.Trim('"', ' '))).Path
}

# ---------------------------------------------------------------- calibration
function Calibrate($firstBlock) {
  Log ''
  Log '=== One-time calibration ===' 'Cyan'
  Log 'Tip: run Minecraft in a window (not full screen) next to this one so you can read these steps.'
  Log 'The builder will now open the first command block for you.'
  TpAbove $firstBlock
  RightClick; Start-Sleep -Milliseconds ([int](1500 * $script:speedMul))
  Log ''
  Log '1) Is the Command Block screen open? If not, right-click the block below you yourself.' 'White'
  Log '   Hover the mouse over the MIDDLE of the "Command Input" box and press F8.' 'White'
  Beep; WaitForKey $VK.F8; $command = Cursor; Log "   got $($command.x),$($command.y)" 'Green'
  Log '2) Hover over the LEFT panel (for example on the "Block Type" button) and press F8.' 'White'
  Beep; WaitForKey $VK.F8; $panel = Cursor; Log "   got $($panel.x),$($panel.y)" 'Green'
  $mid = @{ x = [int](($command.x + $panel.x) / 2); y = [int](($command.y + $panel.y) / 2) }
  $points = @($command, $panel, $mid)
  $open = Sample $points
  MoveTo $panel; WheelDown 12; Start-Sleep -Milliseconds 500
  Log '3) The left panel scrolled down. Hover over the RIGHT end of the "Delay in Ticks" box and press F8.' 'White'
  Beep; WaitForKey $VK.F8; $delay = Cursor; Log "   got $($delay.x),$($delay.y)" 'Green'
  Log '   Closing the screen to learn what "closed" looks like...'
  Tap $VK.Esc; Start-Sleep -Milliseconds 1200
  $closed = Sample $points
  $differs = 0
  for ($i = 0; $i -lt 3; $i++) { if (-not (Near $open[$i] $closed[$i])) { $differs++ } }
  if ($differs -eq 0) { throw 'Calibration failed: the screen looks the same open and closed. Run again with -Recalibrate.' }
  $c = @{
    screen = @{ w = [Bdm.Win]::GetSystemMetrics(0); h = [Bdm.Win]::GetSystemMetrics(1) }
    command = $command; panel = $panel; delay = $delay; points = $points; open = $open
  }
  $c | ConvertTo-Json -Depth 5 | Set-Content -Path $calFile -Encoding UTF8
  Log 'Calibration saved. Keep the same window size and GUI scale from now on.' 'Green'
  return (Get-Content $calFile -Raw | ConvertFrom-Json)
}

# ================================================================ main
Log '=== Bedrock Music Maker: Auto Builder ===' 'Cyan'
Log 'F9 = pause / resume     F12 = stop (progress is saved)' 'Cyan'
if ($DryRun) { Log '(dry run: nothing is pressed, every action is printed)' 'DarkGray' }

$planPath = FindPlan
$p = Get-Content $planPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($p.format -ne 'bedrock-music-maker/slab-plan') { throw "$planPath is not a slab plan from Bedrock Music Maker." }
$blocks = @($p.blocks)
$levels = @($p.levels)
Log ("Plan: {0}  -  {1} command blocks  -  {2} levels  -  corner {3} {4} {5}" -f $p.song, $blocks.Count, $levels.Count, $p.corner.x, $p.corner.y, $p.corner.z)

$speedName = $Speed
if (-not $speedName) {
  $speedName = 'normal'
  if (-not $Yes) {
    $s = Read-Host 'Speed: 1 = fast, 2 = normal (default), 3 = slow (laggy Realm), 4 = very slow'
    $pick = @{ '1' = 'fast'; '3' = 'slow'; '4' = 'veryslow' }[$s.Trim()]
    if ($pick) { $speedName = $pick }
  }
}
$script:speedMul = @{ fast = 0.6; normal = 1.0; slow = 1.6; veryslow = 2.5 }[$speedName]
Log "Speed: $speedName"

# progress
$progFile = "$planPath.progress.json"
if ($DryRun) { $progFile = "$planPath.dryrun-progress.json" }
$prog = @{ next = 0; levelsDone = @() }
if (Test-Path $progFile) {
  $old = Get-Content $progFile -Raw | ConvertFrom-Json
  if ($old.next -gt 0 -or @($old.levelsDone).Count -gt 0) {
    if (Ask "Resume where it stopped (block $($old.next + 1) of $($blocks.Count))?") { $prog = @{ next = [int]$old.next; levelsDone = @($old.levelsDone) } }
  }
}
function SaveProgress { $prog | ConvertTo-Json | Set-Content -Path $progFile -Encoding UTF8 }

if ($Limit -lt 0 -and -not $Yes) {
  $t = Read-Host 'Test run first? Enter how many blocks to build (e.g. 10), or press Enter for the whole song'
  if ($t.Trim() -match '^\d+$') { $Limit = [int]$t.Trim() }
}
$stopAt = $blocks.Count
if ($Limit -gt 0) { $stopAt = [math]::Min($blocks.Count, $prog.next + $Limit) }

Log ''
Log 'Before you start, in Minecraft:' 'White'
Log '  - Creative mode, cheats on, you are an operator (on Realms: the owner or an operator)'
Log '  - FLYING (double-tap jump), standing near the corner, nothing in the way'
Log '  - Chat key is T (start with -ChatKey to change it)'
Log 'Then click into Minecraft and press F8. The builder takes over the keyboard and mouse: don''t touch them.' 'Yellow'
Beep; WaitForKey $VK.F8
EnsureMinecraft

$fresh = ($prog.next -eq 0 -and $prog.levelsDone.Count -eq 0)
if ($fresh -and $p.clear -and (Ask 'Clear the build space first (fills the box with air)? Only say yes if nothing there matters.' $false)) {
  foreach ($c in @($p.clear)) { Chat $c }
}

# levels must exist before calibration can open the first block
$firstLevel = $levels | Where-Object { $_.kind -eq 'command' } | Select-Object -First 1
$cal = $null
if (-not $Recalibrate -and (Test-Path $calFile)) {
  $cal = Get-Content $calFile -Raw | ConvertFrom-Json
  if (-not $DryRun -and ($cal.screen.w -ne [Bdm.Win]::GetSystemMetrics(0) -or $cal.screen.h -ne [Bdm.Win]::GetSystemMetrics(1))) { Log 'Screen size changed since calibration: calibrating again.' 'Yellow'; $cal = $null }
}

$startTime = Get-Date
$builtThisRun = 0
$justResumed = ($prog.next -gt 0)
try {
  foreach ($lv in $levels) {
    if ($prog.levelsDone -notcontains $lv.y) {
      CheckKeys; EnsureMinecraft
      Log ("Level y={0}: {1}" -f $lv.y, $lv.kind) 'Cyan'
      Chat $lv.fill
      $prog.levelsDone += $lv.y; SaveProgress
    }
    if ($lv.kind -ne 'command') { continue }
    if (-not $cal) {
      if ($DryRun) { $cal = @{ command = @{ x = 900; y = 300 }; panel = @{ x = 500; y = 450 }; delay = @{ x = 700; y = 770 }; points = @(); open = @() } }
      else { $cal = Calibrate $blocks[$prog.next] }
    }
    for ($i = $prog.next; $i -lt $stopAt; $i++) {
      $b = $blocks[$i]
      if ($b.y -ne $lv.y) { break }
      CheckKeys; EnsureMinecraft
      if ($justResumed) {
        # after a stop the block might be half filled in: replace it with a fresh one
        Chat ("/setblock {0} {1} {2} air" -f $b.x, $b.y, $b.z); Chat ("/setblock {0} {1} {2} command_block" -f $b.x, $b.y, $b.z)
        $justResumed = $false
      }
      TpAbove $b
      if (-not (OpenBlock $b)) {
        Log "  Block $($i + 1) at $($b.x) $($b.y) $($b.z) won't open. Fix it by hand if needed (right-click it), close it, then press F8 to continue or F12 to stop." 'Red'
        Beep 300; Beep 300
        while (-not (Pressed $VK.F8)) { if (Pressed $VK.F12) { throw 'STOP' }; Start-Sleep -Milliseconds 50 }
        while (Pressed $VK.F8) { Start-Sleep -Milliseconds 30 }
        if (-not (OpenBlock $b)) { throw "Block $($i + 1) still won't open." }
      }
      FillBlock $b
      $prog.next = $i + 1; SaveProgress
      $builtThisRun++
      $elapsed = ((Get-Date) - $startTime).TotalSeconds
      $left = ($stopAt - $i - 1) * ($elapsed / $builtThisRun)
      Log ("  block {0}/{1}  ({2} {3} {4}, delay {5})  -  about {6} left" -f ($i + 1), $blocks.Count, $b.x, $b.y, $b.z, $b.delay, ([TimeSpan]::FromSeconds([int]$left)).ToString()) 'Gray'
    }
    if ($prog.next -ge $stopAt) { break }
  }
  Beep 660; Beep 880
  if ($prog.next -ge $blocks.Count) {
    Log ''
    Log 'DONE! Every command block is built. In chat, run once:' 'Green'
    Log "  $($p.gamerule)"
    Log "  $($p.tickingArea)"
    Log 'Start the song:' 'Green'
    Log "  $($p.start)"
    Log 'Stop / reset:' 'Green'
    Log "  $($p.stop)"
    Remove-Item $progFile -ErrorAction SilentlyContinue
  } else {
    Log ''
    Log "Test run finished: built up to block $($prog.next) of $($blocks.Count). Check a few blocks in game, then run again to continue." 'Green'
  }
} catch {
  if ($_.Exception.Message -eq 'STOP') { Log "Stopped. Progress saved at block $($prog.next + 1). Run the builder again to resume." 'Yellow' }
  else { Log "Error: $($_.Exception.Message)" 'Red'; Log "Progress saved at block $($prog.next + 1)." 'Yellow'; exit 1 }
}
