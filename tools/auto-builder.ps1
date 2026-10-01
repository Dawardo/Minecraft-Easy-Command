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
  Chat commands are typed like a player would: press / (opens chat with the /), type the rest, press Enter.
  Uses only what ships with Windows (PowerShell 5.1+). -DryRun prints every action instead of doing it.
#>
param(
  [Parameter(Position = 0)][string]$Plan,
  [ValidateSet('fast', 'normal', 'slow', 'veryslow')][string]$Speed = '',
  [int]$Limit = -1,
  [switch]$Recalibrate,
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
  Add-Type -AssemblyName System.Windows.Forms, System.Drawing
  Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
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
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }

    [DllImport("user32.dll", SetLastError = true)] static extern uint SendInput(uint n, INPUT[] inputs, int size);
    [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr h, ref POINT p);
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
    // x, y, width, height of the inside of the window in front (no title bar), in screen pixels
    public static int[] ClientArea() {
      IntPtr h = GetForegroundWindow(); RECT r; POINT p = new POINT();
      GetClientRect(h, out r); ClientToScreen(h, ref p);
      return new int[] { p.X, p.Y, r.Right - r.Left, r.Bottom - r.Top };
    }
    // A box of the screen as 0xRRGGBB values: one screen copy, much faster than GetPixel per pixel
    public static int[] Shot(int x, int y, int w, int h) {
      using (Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
        using (Graphics g = Graphics.FromImage(bmp)) { g.CopyFromScreen(x, y, 0, 0, new Size(w, h)); }
        BitmapData d = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        int[] px = new int[w * h];
        Marshal.Copy(d.Scan0, px, 0, px.Length);
        bmp.UnlockBits(d);
        return px;
      }
    }
    // Pixels in Minecraft's error red (chat color code c, about #FF5555). Tight, so orange command blocks,
    // brown and pink don't count: strong red, with green and blue lower and about equal.
    public static int RedCount(int[] px) {
      int n = 0;
      foreach (int c in px) {
        int r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
        if (r >= 200 && g >= 40 && g <= 130 && b >= 40 && b <= 130 && r - g > 90 && r - b > 90 && Math.Abs(g - b) < 40) n++;
      }
      return n;
    }
    // How many pixels clearly differ between two shots of the same box
    public static int Changed(int[] a, int[] b) {
      int n = 0;
      for (int i = 0; i < a.Length && i < b.Length; i++) {
        int x = a[i], y = b[i];
        int d = Math.Abs(((x >> 16) & 0xFF) - ((y >> 16) & 0xFF)) + Math.Abs(((x >> 8) & 0xFF) - ((y >> 8) & 0xFF)) + Math.Abs((x & 0xFF) - (y & 0xFF));
        if (d > 60) n++;
      }
      return n;
    }
    // Every pixel the same: the screen couldn't be read (black capture), so a check can't tell anything
    public static bool Blank(int[] px) {
      for (int i = 1; i < px.Length; i++) { if (px[i] != px[0]) return false; }
      return true;
    }
  }
}
'@
  [void][Bdm.Win]::SetProcessDPIAware()
}

$VK = @{ Slash = 0xBF; Shift = 0x10; Insert = 0x2D; Ctrl = 0x11; Enter = 0x0D; Esc = 0x1B; Back = 0x08; V = 0x56; A = 0x41; F8 = 0x77; F9 = 0x78; F12 = 0x7B }
$M = @{ LeftDown = 0x0002; LeftUp = 0x0004; RightDown = 0x0008; RightUp = 0x0010; Wheel = 0x0800 }

$script:speedMul = 1.0
function Wait([int]$ms) { if (-not $DryRun) { Start-Sleep -Milliseconds ([int]($ms * $script:speedMul)) } }
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
function MoveTo($p) { Act "move to $($p.x),$($p.y)"; if (-not $DryRun) { [void][Bdm.Win]::SetCursorPos($p.x, $p.y); Start-Sleep -Milliseconds 40 } }
function LeftClick($p) { MoveTo $p; Act 'left click'; if (-not $DryRun) { [Bdm.Win]::Mouse($M.LeftDown, 0); Start-Sleep -Milliseconds 40; [Bdm.Win]::Mouse($M.LeftUp, 0) } }
function RightClick { Act 'right click'; if (-not $DryRun) { [Bdm.Win]::Mouse($M.RightDown, 0); Start-Sleep -Milliseconds 50; [Bdm.Win]::Mouse($M.RightUp, 0) } }
function WheelDown([int]$notches) { Act "wheel down $notches"; if (-not $DryRun) { for ($i = 0; $i -lt $notches; $i++) { [Bdm.Win]::Mouse($M.Wheel, -120); Start-Sleep -Milliseconds 25 } } }
function Pressed([int]$vk) { if ($DryRun) { return $false }; return ([Bdm.Win]::GetAsyncKeyState($vk) -band 0x8000) -ne 0 }
function Cursor { $p = New-Object Bdm.Win+POINT; [void][Bdm.Win]::GetCursorPos([ref]$p); return @{ x = $p.X; y = $p.Y } }
function Beep([int]$f = 880) { if (-not $DryRun) { try { [Console]::Beep($f, 120) } catch {} } }

# Waits for F8 (continue) or F12 (stop)
function WaitF8 {
  if ($DryRun) { return }
  while (-not (Pressed $VK.F8)) { if (Pressed $VK.F12) { throw 'STOP' }; Start-Sleep -Milliseconds 30 }
  while (Pressed $VK.F8) { Start-Sleep -Milliseconds 30 }
}
function StepPause([string]$what) {
  if (-not $Step -or $DryRun) { return }
  Log "  NEXT: $what   (F8 = do it, F12 = stop)" 'Magenta'
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

# ---------------------------------------------------------------- did the text arrive? (screen checks)
# Red error text in chat (Minecraft's red, like "Unknown command" or "Syntax error"). Bedrock shows chat on
# the left, so the left 60% of the window is read. Counted before and after a command, so old lines don't count.
$script:redMin = 150   # new red pixels that mean a new error line
function ChatRed {
  if ($DryRun) { return 0 }
  $a = [Bdm.Win]::ClientArea()
  if ($a[2] -lt 10 -or $a[3] -lt 10) { return 0 }
  return [Bdm.Win]::RedCount([Bdm.Win]::Shot($a[0], $a[1], [int]($a[2] * 0.6), $a[3]))
}
# Screen box around a calibrated point, kept inside the Minecraft window: @(x, y, w, h)
function BoxAround($pt, [int]$rx, [int]$ry) {
  $a = [Bdm.Win]::ClientArea()
  $x0 = [int][math]::Max($a[0], $pt.x - $rx); $y0 = [int][math]::Max($a[1], $pt.y - $ry)
  $x1 = [int][math]::Min($a[0] + $a[2], $pt.x + $rx); $y1 = [int][math]::Min($a[1] + $a[3], $pt.y + $ry)
  return @($x0, $y0, ($x1 - $x0), ($y1 - $y0))
}
function ShotBox($box) {
  if ($box[2] -le 0 -or $box[3] -le 0) { return $null }
  return , [Bdm.Win]::Shot($box[0], $box[1], $box[2], $box[3])
}

# ---------------------------------------------------------------- game actions
$T = @{ chatOpen = 700; afterPaste = 250; afterEnter = 600; tp = 500; openTimeout = 4000; settle = 300; click = 200; scroll = 350; closeTimeout = 3000 }

# Sends a chat command. If Minecraft answers with a red error (letters went missing on the way), it's sent again.
# -MayFail: a red answer is fine (clearing air that's already air), so don't check.
function Chat([string]$command, [switch]$MayFail) {
  Log "    chat: $command" 'DarkCyan'
  for ($try = 1; $try -le 3; $try++) {
    $red = ChatRed
    # Press "/" (opens chat with the "/" already typed), type the rest, Enter. Opening chat with T made
    # the T land in the chat too ("t/tell").
    StepPause "press / and type: $command"
    TapScan $VK.Slash; Wait $T.chatOpen
    TypeText ($command -replace '^/', ''); Wait $T.afterPaste
    StepPause 'press Enter'
    Tap $VK.Enter; Wait $T.afterEnter
    if ($MayFail -or ((ChatRed) - $red) -lt $script:redMin) { return }
    Log "    Minecraft answered with a red error (try $try of 3): sending it again" 'Yellow'
    Wait 1000
  }
  Log "  Minecraft keeps answering this with a red error:  $command" 'Red'
  Log '  Read the chat. If letters are missing, open chat and type it yourself. If it only says nothing needed changing, that''s fine.' 'Red'
  Log '  Then press F8 to continue, or F12 to stop.' 'Red'
  Beep 300; Beep 300
  WaitF8
}

# Clicks a text box, empties it, types the text, and checks on screen that the text showed up in the box.
# $minChanged: how many pixels must change (a whole command changes thousands, a single digit a few dozen).
$script:checkBoxes = $true
function TypeInto($pt, [string]$text, [int]$backs, [int]$minChanged) {
  for ($try = 1; $try -le 2; $try++) {
    LeftClick $pt; Wait $T.click
    Combo $VK.A; for ($i = 0; $i -lt $backs; $i++) { Tap $VK.Back }
    $box = $null; $before = $null
    if ($script:checkBoxes -and -not $DryRun) { Start-Sleep -Milliseconds 100; $box = BoxAround $pt 400 60; $before = ShotBox $box }
    TypeText $text; Wait $T.afterPaste
    if ($null -eq $before -or [Bdm.Win]::Blank($before)) { return }      # not checking, or the screen can't be read
    if ([Bdm.Win]::Changed($before, (ShotBox $box)) -ge $minChanged) { return }
    Log "    the text didn't show up in the box (try $try of 2)" 'Yellow'
  }
  Log "  The text still doesn't show up in the box. If it's missing, click the box and type it yourself:  $text" 'Red'
  Log '  F8 = it''s there now, continue    F9 = it was there all along (stop checking boxes)    F12 = stop' 'Red'
  Beep 300; Beep 300
  while ($true) {
    if (Pressed $VK.F8) { while (Pressed $VK.F8) { Start-Sleep -Milliseconds 30 }; return }
    if (Pressed $VK.F9) { while (Pressed $VK.F9) { Start-Sleep -Milliseconds 30 }; $script:checkBoxes = $false; Log '  OK, not checking the boxes any more.' 'Yellow'; return }
    if (Pressed $VK.F12) { throw 'STOP' }
    Start-Sleep -Milliseconds 30
  }
}

function Fmt([double]$v) { return $v.ToString([System.Globalization.CultureInfo]::InvariantCulture) }
function TpAbove($b) { Chat ("/tp @s {0} {1} {2} 0 90" -f (Fmt ($b.x + 0.5)), (Fmt ($b.y + 2)), (Fmt ($b.z + 0.5))); Wait $T.tp }

function OpenBlock($b) {
  for ($try = 1; $try -le 3; $try++) {
    if ($DryRun) { $script:dryOpen = $true }
    StepPause 'right-click the block below you'
    RightClick
    if (WaitOpen $T.openTimeout) { Wait $T.settle; return $true }
    Log "    the command block screen didn't open (try $try of 3)" 'Yellow'
    if ($try -eq 2) { TpAbove $b }   # maybe the teleport lagged: do it again
  }
  return $false
}

function FillBlock($b) {
  # Command Input (a fresh block is empty; Ctrl+A + Backspace makes sure). Command blocks don't need the
  # leading '/', and leaving it out means no command suggestions popping up to swallow a key.
  StepPause 'click Command Input and type the command'
  TypeInto $cal.command ($b.command -replace '^/', '') 1 150
  # Delay in Ticks: scroll the left panel to the bottom, then replace the value
  StepPause 'scroll the left panel down and type Delay in Ticks'
  MoveTo $cal.panel; WheelDown 12; Wait $T.scroll
  TypeInto $cal.delay ([string]$b.delay) 7 20
  # close = save
  StepPause 'press Esc to close (and save) the command block'
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
  $p = Prompt 'Drag the .slabplan.json file into this window and press Enter'
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
    $s = Prompt 'Speed: 1 = fast, 2 = normal (default), 3 = slow (laggy Realm), 4 = very slow'
    $pick = @{ '1' = 'fast'; '3' = 'slow'; '4' = 'veryslow' }[$s.Trim()]
    if ($pick) { $speedName = $pick }
  }
}
$script:speedMul = @{ fast = 0.6; normal = 1.0; slow = 1.6; veryslow = 2.5 }[$speedName]
Log "Speed: $speedName"

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
  Log ("Where should the song go? The plan's corner is {0} {1} {2} (the first command block)." -f $p.corner.x, $p.corner.y, $p.corner.z) 'White'
  Log '  Tip: to build where you stand, turn on coordinates (chat: /gamerule showcoordinates true),'
  Log '  stand on the ground at the corner you want and type the "Position" numbers shown.'
  $c = Prompt 'Press Enter to keep it, or type a new corner like  120 64 -35'
  $nums = @([regex]::Matches($c, '-?\d+') | ForEach-Object { [int]$_.Value })
  if ($nums.Count -ge 3) {
    $prog.offset = @(($nums[0] - [int]$p.corner.x), ($nums[1] - [int]$p.corner.y), ($nums[2] - [int]$p.corner.z))
    ShiftPlan $prog.offset[0] $prog.offset[1] $prog.offset[2]
    Log ("Building at {0} {1} {2}." -f $nums[0], $nums[1], $nums[2]) 'Green'
  }
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
$stopAt = $blocks.Count
if ($Limit -gt 0) { $stopAt = [math]::Min($blocks.Count, $prog.next + $Limit) }

Log ''
Log 'Before you start, in Minecraft:' 'White'
Log '  - Creative mode, cheats on, you are an operator (on Realms: the owner or an operator)'
Log '  - FLYING (double-tap jump), standing near the corner, nothing in the way'
Log '  - the / key opens chat (Minecraft''s default)'
Log 'Then click into Minecraft and press F8. The builder takes over the keyboard and mouse: don''t touch them.' 'Yellow'
Beep; WaitForKey $VK.F8
EnsureMinecraft
if (-not $DryRun) { [Bdm.Win]::ReleaseModifiers() }   # in case an earlier run was killed with Shift or Ctrl held

$fresh = ($prog.next -eq 0 -and $prog.levelsDone.Count -eq 0)
if ($fresh -and $p.clear -and (Ask 'Clear the build space first (fills the box with air)? Only say yes if nothing there matters.' $false)) {
  foreach ($c in @($p.clear)) { Chat $c -MayFail }
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
$justResumed = ($resuming -and $prog.next -gt 0)
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
        Chat ("/setblock {0} {1} {2} air" -f $b.x, $b.y, $b.z) -MayFail; Chat ("/setblock {0} {1} {2} command_block" -f $b.x, $b.y, $b.z)
        $justResumed = $false
      }
      TpAbove $b
      if (-not (OpenBlock $b)) {
        Log "  Block $($i + 1) at $($b.x) $($b.y) $($b.z) won't open. Fix it by hand if needed (right-click it), close it, then press F8 to continue or F12 to stop." 'Red'
        Beep 300; Beep 300
        WaitF8
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
} finally {
  if (-not $DryRun) { try { [Bdm.Win]::ReleaseModifiers() } catch {} }   # never leave Shift or Ctrl held down
}
