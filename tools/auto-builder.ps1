<#
  Bedrock Music Maker - Auto Builder
  Builds a "slab plan" (made by the web page) in Minecraft Bedrock by pressing keys and clicking for you.
  Works on Realms: it only uses chat commands and the command block screen, like a player would.

  For every command block it:
    1. teleports above the block looking straight down     (/tp @s x y z 0 90, typed into chat)
    2. right-clicks it to open the command block screen
    3. clicks the bottom of the left scroll bar, so Delay in Ticks shows
    4. clicks Command Input and types the command
    5. clicks Delay in Ticks and types the delay
    6. presses Esc (closes and saves)

  Keys while it runs:  F9 = STOP right away (progress is saved, run again to resume)    F10 = pause / resume
  Chat commands are typed like a player would: press / (opens chat with the /), type the rest, press Enter.
  Uses only what ships with Windows (PowerShell 5.1+). -DryRun prints every action instead of doing it.
#>
param(
  [Parameter(Position = 0)][string]$Plan,
  [ValidateSet('250', '500', '750', '1000')][string]$Speed = '',   # extra delay after every action, in ms
  [int]$Limit = -1,
  [switch]$Recalibrate,            # show the builder where to click again
  [switch]$Step,                   # step-by-step: press F8 before every action (for finding problems)
  [switch]$DryRun,
  [switch]$Yes,                    # answer "yes" to every question (used by the dry-run test)
  [string]$Answers                 # answers to the questions in order, separated by | (used by the dry-run test)
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
    // MOUSEINPUT must be in the union: it makes INPUT 40 bytes on 64-bit. Without it SendInput rejects every event.
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
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr value);
    // Work in real screen pixels on every monitor, whatever the Windows display scaling (125%, 150%...).
    // Otherwise a recorded click and the replayed click can be scaled differently and land off to the side.
    public static void UseRealPixels() {
      try { if (SetProcessDpiAwarenessContext(new IntPtr(-4))) return; } catch (EntryPointNotFoundException) { }   // per-monitor v2 (Windows 10 1703+)
      SetProcessDPIAware();
    }
    // Moves the mouse to a screen point the way a real mouse does (absolute move through SendInput, so the
    // game sees it), then also sets the cursor there.
    public static void MoveAbs(int x, int y) {
      int vx = GetSystemMetrics(76), vy = GetSystemMetrics(77), vw = GetSystemMetrics(78), vh = GetSystemMetrics(79);
      INPUT i = new INPUT(); i.type = INPUT_MOUSE;
      i.U.mi.dx = (int)(((long)(x - vx) * 65535) / Math.Max(1, vw - 1));
      i.U.mi.dy = (int)(((long)(y - vy) * 65535) / Math.Max(1, vh - 1));
      i.U.mi.dwFlags = 0x0001 | 0x8000 | 0x4000;   // move | absolute | whole virtual desktop
      Send(i);
      SetCursorPos(x, y);
    }
    [DllImport("user32.dll")] public static extern int GetSystemMetrics(int i);

    const uint INPUT_MOUSE = 0, INPUT_KEYBOARD = 1;
    const uint KEYUP = 0x0002, SCANCODE = 0x0008, EXTENDED = 0x0001;

    // SendInput returns how many events Windows took. A wrong INPUT size makes it take none and type
    // NOTHING without any error, so check it instead of carrying on blind.
    static void Send(INPUT[] inputs) {
      uint sent = SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
      if (sent != inputs.Length) throw new Exception("Windows didn't take the key or mouse press (SendInput error " + Marshal.GetLastWin32Error() + "). If Minecraft runs as administrator, run the builder as administrator too.");
    }
    static void Send(INPUT i) { Send(new INPUT[] { i }); }

    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern short VkKeyScanW(char c);
    const uint UNICODE = 0x0004;

    // useScan = scan code only (what games read for movement keys); otherwise virtual key + scan code (like a real keyboard driver)
    static INPUT KeyInput(int vk, bool up, bool useScan) {
      INPUT i = new INPUT(); i.type = INPUT_KEYBOARD;
      i.U.ki.wScan = (ushort)MapVirtualKey((uint)vk, 0);
      // Insert, Delete, Home, End, Page Up/Down, the arrows and right Ctrl are "extended" keys
      uint ext = ((vk >= 0x21 && vk <= 0x28) || vk == 0x2D || vk == 0x2E || vk == 0xA3) ? EXTENDED : 0;
      if (useScan) { i.U.ki.dwFlags = SCANCODE | ext | (up ? KEYUP : 0); }
      else { i.U.ki.wVk = (ushort)vk; i.U.ki.dwFlags = ext | (up ? KEYUP : 0); }
      return i;
    }
    public static void Key(int vk, bool up, bool useScan) { Send(KeyInput(vk, up, useScan)); }
    // Modifier + key in ONE SendInput call: nothing can get in between, and the modifier can't stay held down
    public static void Chord(int mod, int vk, bool useScan) {
      Send(new INPUT[] { KeyInput(mod, false, useScan), KeyInput(vk, false, useScan), KeyInput(vk, true, useScan), KeyInput(mod, true, useScan) });
    }
    // Lets go of both Shifts and both Ctrls, so a stop or crash never leaves one stuck down
    public static void ReleaseModifiers() {
      Send(new INPUT[] { KeyInput(0xA0, true, false), KeyInput(0xA1, true, false), KeyInput(0xA2, true, false), KeyInput(0xA3, true, false) });
    }
    public static void Unicode(char c, bool up) {
      INPUT i = new INPUT(); i.type = INPUT_KEYBOARD;
      i.U.ki.wScan = c; i.U.ki.dwFlags = UNICODE | (up ? KEYUP : 0);
      Send(i);
    }
    // Types one character the way a keyboard would (with Shift when needed). Returns false if the layout can't type it.
    public static bool TypeChar(char c, bool useScan, int gapMs) {
      short r = VkKeyScanW(c);
      if (r == -1) return false;
      int vk = r & 0xFF, shift = (r >> 8) & 0xFF;
      if ((shift & 6) != 0) return false; // needs Ctrl/Alt: not typable reliably
      if ((shift & 1) != 0) { Key(0x10, false, useScan); System.Threading.Thread.Sleep(gapMs); }
      Key(vk, false, useScan); System.Threading.Thread.Sleep(gapMs);
      Key(vk, true, useScan); System.Threading.Thread.Sleep(gapMs);
      if ((shift & 1) != 0) { Key(0x10, true, useScan); System.Threading.Thread.Sleep(gapMs); }
      return true;
    }
    // moves the mouse by a few pixels (relative, like a real mouse)
    public static void Nudge(int dx, int dy) {
      INPUT i = new INPUT(); i.type = INPUT_MOUSE;
      i.U.mi.dx = dx; i.U.mi.dy = dy; i.U.mi.dwFlags = 0x0001;
      Send(i);
    }
    public static void Mouse(uint flags, int data) {
      INPUT i = new INPUT(); i.type = INPUT_MOUSE;
      i.U.mi.dwFlags = flags; i.U.mi.mouseData = unchecked((uint)data);
      Send(i);
    }
    // F9 = kill switch: a background thread that stops the builder at once, even in the middle of typing.
    // It lets go of Shift and Ctrl first so nothing stays held down.
    public static void StartKillWatch() {
      System.Threading.Thread t = new System.Threading.Thread(delegate () {
        while (true) {
          if ((GetAsyncKeyState(0x78) & 0x8000) != 0) {
            try { ReleaseModifiers(); } catch { }
            Console.WriteLine("STOPPED (F9). Progress is saved: run the builder again to resume.");
            Environment.Exit(0);
          }
          System.Threading.Thread.Sleep(30);
        }
      });
      t.IsBackground = true; t.Start();
    }
    public static string ForegroundTitle() {
      StringBuilder sb = new StringBuilder(256);
      GetWindowText(GetForegroundWindow(), sb, 256);
      return sb.ToString();
    }
  }
}
'@
  [Bdm.Win]::UseRealPixels()
}

$VK = @{ Slash = 0xBF; End = 0x23; Shift = 0x10; Insert = 0x2D; Ctrl = 0x11; Enter = 0x0D; Esc = 0x1B; Back = 0x08; V = 0x56; A = 0x41; F8 = 0x77; F9 = 0x78; F10 = 0x79 }
$M = @{ LeftDown = 0x0002; LeftUp = 0x0004; RightDown = 0x0008; RightUp = 0x0010 }

# Speed = an extra delay (250 / 500 / 750 / 1000 ms) added to every wait between actions
$script:gap = 500
function Wait([int]$ms) { if (-not $DryRun) { Start-Sleep -Milliseconds ($ms + $script:gap) } }
function Log([string]$msg, [string]$color = 'Gray') { Write-Host $msg -ForegroundColor $color }
function Act([string]$msg) { if ($DryRun) { Write-Host "  [dry] $msg" -ForegroundColor DarkGray } }

# Keys are sent as virtual key + scan code, like a real keyboard driver.
function Tap([int]$vk) { Act "key $vk"; if (-not $DryRun) { [Bdm.Win]::Key($vk, $false, $false); Start-Sleep -Milliseconds 30; [Bdm.Win]::Key($vk, $true, $false); Start-Sleep -Milliseconds 30 } }
function TapScan([int]$vk) { Act "key $vk (scan)"; if (-not $DryRun) { [Bdm.Win]::Key($vk, $false, $true); Start-Sleep -Milliseconds 30; [Bdm.Win]::Key($vk, $true, $true); Start-Sleep -Milliseconds 30 } }
function Combo([int]$vk) {
  Act "ctrl+$vk"
  if (-not $DryRun) {
    [Bdm.Win]::Key($VK.Ctrl, $false, $false); Start-Sleep -Milliseconds 30
    [Bdm.Win]::Key($vk, $false, $false); Start-Sleep -Milliseconds 30; [Bdm.Win]::Key($vk, $true, $false); Start-Sleep -Milliseconds 30
    [Bdm.Win]::Key($VK.Ctrl, $true, $false); Start-Sleep -Milliseconds 30
  }
}
# Types text into whatever text box has focus, one key at a time (Shift when needed).
function TypeText([string]$text) {
  Act "type: $text"
  if ($DryRun) { return }
  foreach ($c in $text.ToCharArray()) {
    if (-not [Bdm.Win]::TypeChar($c, $false, 12)) {   # a character this keyboard layout can't type: send it as a character
      [Bdm.Win]::Unicode($c, $false); Start-Sleep -Milliseconds 12; [Bdm.Win]::Unicode($c, $true); Start-Sleep -Milliseconds 12
    }
    Start-Sleep -Milliseconds 15
  }
}
function MoveTo($p) {
  Act "move to $($p.x),$($p.y)"
  if ($DryRun) { return }
  [Bdm.Win]::MoveAbs([int]$p.x, [int]$p.y); Start-Sleep -Milliseconds 60
  $now = Cursor
  if ([math]::Abs($now.x - $p.x) -gt 3 -or [math]::Abs($now.y - $p.y) -gt 3) {
    Log "    mouse is at $($now.x),$($now.y) instead of $($p.x),$($p.y): moving again" 'Yellow'
    [void][Bdm.Win]::SetCursorPos([int]$p.x, [int]$p.y); Start-Sleep -Milliseconds 60
  }
}
function LeftClick($p) { MoveTo $p; Act 'left click'; if (-not $DryRun) { [Bdm.Win]::Mouse($M.LeftDown, 0); Start-Sleep -Milliseconds 40; [Bdm.Win]::Mouse($M.LeftUp, 0) } }
function RightClick { Act 'right click'; if (-not $DryRun) { [Bdm.Win]::Mouse($M.RightDown, 0); Start-Sleep -Milliseconds 150; [Bdm.Win]::Mouse($M.RightUp, 0) } }
function Pressed([int]$vk) { if ($DryRun) { return $false }; return ([Bdm.Win]::GetAsyncKeyState($vk) -band 0x8000) -ne 0 }
function Cursor { $p = New-Object Bdm.Win+POINT; [void][Bdm.Win]::GetCursorPos([ref]$p); return @{ x = $p.X; y = $p.Y } }
function Beep([int]$f = 880) { if (-not $DryRun) { try { [Console]::Beep($f, 120) } catch {} } }

# Waits for F8 (continue) or F9 (stop)
function WaitF8 {
  if ($DryRun) { return }
  while (-not (Pressed $VK.F8)) { if (Pressed $VK.F9) { throw 'STOP' }; Start-Sleep -Milliseconds 30 }
  while (Pressed $VK.F8) { Start-Sleep -Milliseconds 30 }
}
function StepPause([string]$what) {
  if (-not $Step -or $DryRun) { return }
  Log "  NEXT: $what   (F8 = do it, F9 = stop)" 'Magenta'
  WaitF8
}
function WaitForKey([int]$vk) {
  if ($DryRun) { return }
  while (Pressed $vk) { Start-Sleep -Milliseconds 30 }          # let go first
  while (-not (Pressed $vk)) { Start-Sleep -Milliseconds 30 }
  while (Pressed $vk) { Start-Sleep -Milliseconds 30 }
}
$script:answerQueue = New-Object System.Collections.Queue
if ($Answers) { foreach ($a in ($Answers -split '\|')) { $script:answerQueue.Enqueue($a) } }
function Prompt([string]$question) {
  if ($script:answerQueue.Count -gt 0) { $a = [string]$script:answerQueue.Dequeue(); Log "$question -> $a (given)"; return $a }
  return (Read-Host $question)
}
function Ask([string]$question, [bool]$default = $true) {
  if ($Yes) { Log "$question -> yes (auto)"; return $true }
  $hint = '[y/n]'; if ($default) { $hint = '[Y/n]' } else { $hint = '[y/N]' }
  $a = Prompt "$question $hint"
  if ([string]::IsNullOrWhiteSpace($a)) { return $default }
  return $a.Trim().ToLower().StartsWith('y')
}

# ---------------------------------------------------------------- game actions
$T = @{ chatOpen = 1000; afterPaste = 250; afterEnter = 600; tp = 500; open = 1200; click = 200; beforeType = 500; scroll = 350; close = 800; beforeFill = 2000; beforeClick = 800 }

# Sends a chat command: press "/" (opens chat with the "/" already typed), type the rest, Enter.
function Chat([string]$command) {
  Log "    chat: $command" 'DarkCyan'
  StepPause "press / and type: $command"
  TapScan $VK.Slash; Wait $T.chatOpen
  # Minecraft eats the first key after chat opens ("/tp" arrived as "/p", "/fill" as "/ill"), so the first
  # key is a throwaway End (no letter; if it does arrive it just moves to the end of the "/")
  Tap $VK.End; Wait 300
  TypeText ($command -replace '^/', ''); Wait $T.afterPaste
  StepPause 'press Enter'
  Tap $VK.Enter; Wait $T.afterEnter
}

# Clicks a text box, empties it, waits a moment, then types the text.
function TypeInto($pt, [string]$text, [int]$backs) {
  LeftClick $pt; Wait $T.click
  Combo $VK.A; for ($i = 0; $i -lt $backs; $i++) { Tap $VK.Back }
  Wait $T.beforeType
  TypeText $text; Wait $T.afterPaste
}

function Fmt([double]$v) { return $v.ToString([System.Globalization.CultureInfo]::InvariantCulture) }
function TpAbove($b) { Chat ("/tp @s {0} {1} {2} 0 90" -f (Fmt ($b.x + 0.5)), (Fmt ($b.y + 2)), (Fmt ($b.z + 0.5))); Wait $T.tp }

# Right after chat closes Minecraft takes the mouse back and ignores the first click (like the first key
# after chat opens). So: wait, wiggle the mouse a pixel, right-click, and right-click once more (a second
# right-click on an open command block screen does nothing).
# Closes (and saves) the command block screen. While a text box is being typed in, Esc only leaves the
# box, so first click the scroll bar (outside the text boxes), then press Esc the way a keyboard does
# (scan code, held a moment).
function CloseBlock($scrollPt) {
  LeftClick $scrollPt; Wait $T.click
  Act 'esc (scan, held)'
  if (-not $DryRun) { [Bdm.Win]::Key($VK.Esc, $false, $true); Start-Sleep -Milliseconds 120; [Bdm.Win]::Key($VK.Esc, $true, $true) }
  Wait $T.close
}

function OpenBlock {
  StepPause 'right-click the block below you'
  Wait $T.beforeClick
  if (-not $DryRun) { [Bdm.Win]::Nudge(1, 0); Start-Sleep -Milliseconds 60; [Bdm.Win]::Nudge(-1, 0); Start-Sleep -Milliseconds 200 }
  RightClick; Wait 600
  RightClick; Wait $T.open
}

function FillBlock($b) {
  # scroll the left panel down so Delay in Ticks shows
  StepPause 'click the bottom of the left scroll bar'
  LeftClick $cal.scroll; Wait $T.click; LeftClick $cal.scroll; Wait $T.scroll
  # Command Input (a fresh block is empty; Ctrl+A + Backspace makes sure). Command blocks don't need the
  # leading '/', and leaving it out means no command suggestions popping up to swallow a key.
  StepPause 'click Command Input and type the command'
  TypeInto $cal.command ($b.command -replace '^/', '') 1
  StepPause 'click Delay in Ticks and type the delay'
  TypeInto $cal.delay ([string]$b.delay) 7
  # close = save
  StepPause 'press Esc to close (and save) the command block'
  CloseBlock $cal.scroll
}

# ---------------------------------------------------------------- pause / stop / focus
function CheckKeys {
  if (Pressed $VK.F9) { throw 'STOP' }
  if (Pressed $VK.F10) {
    while (Pressed $VK.F10) { Start-Sleep -Milliseconds 30 }
    Log '  PAUSED. Press F10 to continue (F9 to stop).' 'Yellow'; Beep 500
    while (-not (Pressed $VK.F10)) { if (Pressed $VK.F9) { throw 'STOP' }; Start-Sleep -Milliseconds 50 }
    while (Pressed $VK.F10) { Start-Sleep -Milliseconds 30 }
    Log '  Continuing in 2 seconds...' 'Green'; Start-Sleep -Seconds 2
  }
}
function EnsureMinecraft {
  if ($DryRun) { return }
  $warned = $false
  while ([Bdm.Win]::ForegroundTitle() -notmatch 'Minecraft') {
    if (-not $warned) { Log '  Waiting: click on the Minecraft window to continue (the builder pauses whenever Minecraft is not in front).' 'Yellow'; Beep 400; $warned = $true }
    if (Pressed $VK.F9) { throw 'STOP' }
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
  $p = Prompt 'Drag the .slabplan.json file into this window and press Enter'
  return (Resolve-Path ($p.Trim('"', ' '))).Path
}

# ---------------------------------------------------------------- calibration (one time: you click, the builder records)
function WaitClick {
  while (Pressed 0x01) { Start-Sleep -Milliseconds 20 }
  while (-not (Pressed 0x01)) { if (Pressed $VK.F9) { throw 'STOP' }; Start-Sleep -Milliseconds 20 }
  $pt = Cursor
  while (Pressed 0x01) { Start-Sleep -Milliseconds 20 }
  Log "   got $($pt.x),$($pt.y)" 'Green'
  return $pt
}
function Calibrate($firstBlock) {
  Log ''
  Log '=== One-time setup: show the builder where to click ===' 'Cyan'
  Log 'Tip: run Minecraft in a window (not full screen) next to this one so you can read these steps.'
  while ($true) {
    Log 'The builder opens the first command block for you...'
    TpAbove $firstBlock
    OpenBlock
    Log ''
    Log '0) The command block screen should be open. If not, right-click the block below you yourself.' 'White'
    Log '1) Click the BOTTOM of the scroll bar on the LEFT side (the left panel scrolls down).' 'White'
    Beep; $scroll = WaitClick
    Log '2) Click inside the "Command Input" box. The builder then types the command by itself.' 'White'
    Beep; $command = WaitClick
    Start-Sleep -Milliseconds 600
    TypeText ($firstBlock.command -replace '^/', '')
    Log '3) Click inside the "Delay in Ticks" box. The builder types 67, waits 1 second, then changes it to 0.' 'White'
    Beep; $delay = WaitClick
    Start-Sleep -Milliseconds 600
    Combo $VK.A; for ($i = 0; $i -lt 7; $i++) { Tap $VK.Back }
    TypeText '67'; Start-Sleep -Milliseconds 1000
    Combo $VK.A; for ($i = 0; $i -lt 7; $i++) { Tap $VK.Back }
    TypeText '0'
    Log 'Did the command show up in Command Input, and Delay in Ticks show 67 and then 0?' 'Yellow'
    Log '   F8 = YES, save it    F10 = NO, do it again    (F9 = stop)' 'Yellow'
    Beep
    $ok = $false
    while ($true) {
      if (Pressed $VK.F8) { while (Pressed $VK.F8) { Start-Sleep -Milliseconds 30 }; $ok = $true; break }
      if (Pressed $VK.F10) { while (Pressed $VK.F10) { Start-Sleep -Milliseconds 30 }; break }
      if (Pressed $VK.F9) { throw 'STOP' }
      Start-Sleep -Milliseconds 30
    }
    CloseBlock $scroll
    if ($ok) { break }
  }
  @{ version = 2; scroll = $scroll; command = $command; delay = $delay } | ConvertTo-Json -Depth 5 | Set-Content -Path $calFile -Encoding UTF8
  Log 'Saved. Keep the same window size and GUI scale from now on (or say yes to "set up the clicks again" at the start).' 'Green'
  # the test typing went into the first block: put a fresh one back for the real build
  Chat ("/setblock {0} {1} {2} air" -f $firstBlock.x, $firstBlock.y, $firstBlock.z)
  Chat ("/setblock {0} {1} {2} command_block" -f $firstBlock.x, $firstBlock.y, $firstBlock.z)
  return (Get-Content $calFile -Raw | ConvertFrom-Json)
}

# ---------------------------------------------------------------- moving the build to another corner
function ShiftCoords([string]$cmd, [int]$dx, [int]$dy, [int]$dz) {
  # shifts the first one or two "x y z" triples of /fill, /tickingarea add, /setblock
  $m = [regex]::Match($cmd, '^(/fill|/tickingarea add|/setblock) (-?\d+) (-?\d+) (-?\d+)( (-?\d+) (-?\d+) (-?\d+))?(.*)$')
  if (-not $m.Success) { return $cmd }
  $out = '{0} {1} {2} {3}' -f $m.Groups[1].Value, ([int]$m.Groups[2].Value + $dx), ([int]$m.Groups[3].Value + $dy), ([int]$m.Groups[4].Value + $dz)
  if ($m.Groups[5].Success) { $out += ' {0} {1} {2}' -f ([int]$m.Groups[6].Value + $dx), ([int]$m.Groups[7].Value + $dy), ([int]$m.Groups[8].Value + $dz) }
  return $out + $m.Groups[9].Value
}
function ShiftPlan([int]$dx, [int]$dy, [int]$dz) {
  if ($dx -eq 0 -and $dy -eq 0 -and $dz -eq 0) { return }
  $script:blocks = @($script:blocks | ForEach-Object { [pscustomobject]@{ x = $_.x + $dx; y = $_.y + $dy; z = $_.z + $dz; delay = $_.delay; command = $_.command } })
  $script:levels = @($script:levels | ForEach-Object { [pscustomobject]@{ y = $_.y + $dy; kind = $_.kind; fill = (ShiftCoords $_.fill $dx $dy $dz) } })
  $p.clear = @(@($p.clear) | ForEach-Object { ShiftCoords $_ $dx $dy $dz })
  $p.start = ShiftCoords $p.start $dx $dy $dz
  $p.stop = ShiftCoords $p.stop $dx $dy $dz
  $p.tickingArea = ShiftCoords $p.tickingArea $dx $dy $dz
}

# ================================================================ main
Log '=== Bedrock Music Maker: Auto Builder ===' 'Cyan'
Log 'F9 = STOP right away (progress is saved)     F10 = pause / resume' 'Cyan'
if ($DryRun) { Log '(dry run: nothing is pressed, every action is printed)' 'DarkGray' }

$planPath = FindPlan
$p = Get-Content $planPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($p.format -ne 'bedrock-music-maker/slab-plan') { throw "$planPath is not a slab plan from Bedrock Music Maker." }
$blocks = @($p.blocks)
$levels = @($p.levels)
Log ("Plan: {0}  -  {1} command blocks  -  {2} levels  -  corner {3} {4} {5}" -f $p.song, $blocks.Count, $levels.Count, $p.corner.x, $p.corner.y, $p.corner.z)

$gapName = $Speed
if (-not $gapName) {
  $gapName = '500'
  if (-not $Yes) {
    $s = Prompt 'Speed (extra delay after every action): 1 = 250 ms, 2 = 500 ms (default), 3 = 750 ms, 4 = 1000 ms'
    $pick = @{ '1' = '250'; '2' = '500'; '3' = '750'; '4' = '1000' }[$s.Trim()]
    if ($pick) { $gapName = $pick }
  }
}
$script:gap = [int]$gapName
Log "Speed: $($script:gap) ms extra delay after every action"

# progress
$progFile = "$planPath.progress.json"
if ($DryRun) { $progFile = "$planPath.dryrun-progress.json" }
$prog = @{ next = 0; levelsDone = @(); offset = @(0, 0, 0) }
$resuming = $false
if (Test-Path $progFile) {
  $old = Get-Content $progFile -Raw | ConvertFrom-Json
  if ($old.next -gt 0 -or @($old.levelsDone).Count -gt 0) {
    if (Ask "Resume where it stopped (block $($old.next + 1) of $($blocks.Count))?") {
      $off = @(0, 0, 0); if ($old.offset) { $off = @($old.offset | ForEach-Object { [int]$_ }) }
      $prog = @{ next = [int]$old.next; levelsDone = @($old.levelsDone | ForEach-Object { [int]$_ }); offset = $off }
      $resuming = $true
    }
  }
}
function SaveProgress { $prog | ConvertTo-Json | Set-Content -Path $progFile -Encoding UTF8 }

if ($resuming) {
  ShiftPlan $prog.offset[0] $prog.offset[1] $prog.offset[2]   # levelsDone are stored already shifted
} elseif (-not $Yes) {
  # where to build
  Log ''
  Log 'Where should the song go? This is the corner of the build (the first command block).' 'White'
  Log '  Tip: turn on coordinates (chat: /gamerule showcoordinates true), stand where you want it'
  Log '  and type the "Position" numbers shown. x 0 z 0 is not allowed.'
  while ($true) {
    $c = Prompt 'Corner to build at (x y z), like  120 64 -35'
    $nums = @([regex]::Matches($c, '-?\d+') | ForEach-Object { [int]$_.Value })
    if ($nums.Count -lt 3) { Log '  Type three numbers: x y z.' 'Yellow'; continue }
    if ($nums[0] -eq 0 -and $nums[2] -eq 0) { Log '  x 0 z 0 is not allowed: pick another spot.' 'Yellow'; continue }
    break
  }
  $prog.offset = @(($nums[0] - [int]$p.corner.x), ($nums[1] - [int]$p.corner.y), ($nums[2] - [int]$p.corner.z))
  ShiftPlan $prog.offset[0] $prog.offset[1] $prog.offset[2]
  Log ("Building at {0} {1} {2}." -f $nums[0], $nums[1], $nums[2]) 'Green'
  # which block to start from
  $sb = Prompt "Start at block 1? Press Enter, or type a block number (1-$($blocks.Count)) if earlier ones are already built"
  if ($sb.Trim() -match '^\d+$' -and [int]$sb.Trim() -gt 1 -and [int]$sb.Trim() -le $blocks.Count) {
    $prog.next = [int]$sb.Trim() - 1
    $by = $blocks[$prog.next].y
    $firstOfLevel = ($prog.next -eq 0) -or ($blocks[$prog.next - 1].y -ne $by)
    $prog.levelsDone = @($levels | Where-Object { $_.y -lt $by -or ($_.y -eq $by -and -not $firstOfLevel) } | ForEach-Object { [int]$_.y })
    $resuming = $true
    Log "Starting at block $($prog.next + 1)." 'Green'
  }
}

if ($Limit -lt 0 -and -not $Yes) {
  $t = Prompt 'Test run first? Enter how many blocks to build (e.g. 10), or press Enter for the whole song'
  if ($t.Trim() -match '^\d+$') { $Limit = [int]$t.Trim() }
}
if (-not $Step -and -not $Yes -and $Limit -gt 0 -and $Limit -le 20) {
  if (Ask 'Step-by-step (press F8 before every action, to see exactly what happens)?' $false) { $Step = $true }
}
if (-not $Recalibrate -and -not $Yes -and -not $DryRun -and (Test-Path $calFile)) {
  if (Ask 'Set up the clicks again (only if clicks landed in the wrong place last time)?' $false) { $Recalibrate = $true }
}
$stopAt = $blocks.Count
if ($Limit -gt 0) { $stopAt = [math]::Min($blocks.Count, $prog.next + $Limit) }

Log ''
Log 'Before you start, in Minecraft:' 'White'
Log '  - Creative mode, cheats on, you are an operator (on Realms: the owner or an operator)'
Log '  - FLYING (double-tap jump), standing near the corner, nothing in the way'
Log '  - the / key opens chat (Minecraft''s default)'
Log 'Now click into Minecraft. The builder starts 3 seconds after Minecraft is in front, then takes over the keyboard and mouse: don''t touch them.' 'Yellow'
Beep
EnsureMinecraft
if (-not $DryRun) { for ($n = 3; $n -ge 1; $n--) { Log "  starting in $n..." 'Yellow'; Start-Sleep -Seconds 1 } }
if (-not $DryRun) { [Bdm.Win]::StartKillWatch() }   # from here on F9 stops everything at once
if (-not $DryRun) { [Bdm.Win]::ReleaseModifiers() }   # in case an earlier run was killed with Shift or Ctrl held

$fresh = ($prog.next -eq 0 -and $prog.levelsDone.Count -eq 0)
if ($fresh -and $p.clear -and (Ask 'Clear the build space first (fills the box with air)? Only say yes if nothing there matters.' $false)) {
  foreach ($c in @($p.clear)) { Chat $c }
}

# levels must exist before calibration can open the first block
$firstLevel = $levels | Where-Object { $_.kind -eq 'command' } | Select-Object -First 1
$cal = $null
if (-not $Recalibrate -and (Test-Path $calFile)) {
  $cal = Get-Content $calFile -Raw | ConvertFrom-Json
  if ($cal.version -ne 2) { $cal = $null }   # recorded before clicks used real screen pixels: record again
}

$startTime = Get-Date
$builtThisRun = 0
$justResumed = ($resuming -and $prog.next -gt 0)
try {
  foreach ($lv in $levels) {
    if ($prog.levelsDone -notcontains $lv.y) {
      CheckKeys; EnsureMinecraft
      Log ("Level y={0}: {1}" -f $lv.y, $lv.kind) 'Cyan'
      # teleport there first and wait (so that area is loaded), then fill
      $f = [regex]::Match($lv.fill, '^/fill (-?\d+) (-?\d+) (-?\d+)')
      if ($f.Success) {
        Chat ("/tp @s {0} {1} {2} 0 90" -f (Fmt ([int]$f.Groups[1].Value + 0.5)), (Fmt ([int]$f.Groups[2].Value + 2)), (Fmt ([int]$f.Groups[3].Value + 0.5)))
        Wait $T.beforeFill
      }
      Chat $lv.fill
      $prog.levelsDone += $lv.y; SaveProgress
    }
    if ($lv.kind -ne 'command') { continue }
    if (-not $cal) {
      if ($DryRun) { $cal = @{ scroll = @{ x = 520; y = 800 }; command = @{ x = 900; y = 300 }; delay = @{ x = 700; y = 770 } } }
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
      OpenBlock
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
} finally {
  if (-not $DryRun) { try { [Bdm.Win]::ReleaseModifiers() } catch {} }   # never leave Shift or Ctrl held down
}
