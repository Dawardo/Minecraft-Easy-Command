# Troubleshooting the live connection

Run `mc doctor` first: it checks Python, encryption support, the bridge, port 19134, and every Minecraft
data folder it can find (and whether the add-on is installed there). Then go through the matching section.
`mc selftest` runs the full pipeline against a simulated game, which shows whether a problem is on the PC
side or in Minecraft.

## `/connect` in Minecraft fails ("Could not connect to server" or nothing happens)
1. Is the bridge running? `mc status`. If not: `mc start`, and read `~/.mc-claude/bridge.log`.
2. Is the port right? The chat command must match the port `mc start` printed (default 19134). If
   another program uses 19134: `mc stop`, `mc start --port 19135`, then `/connect localhost:19135`.
3. Cheats must be on and the player must be an operator (in single player the host is).
4. Try `/connect 127.0.0.1:19134` (IPv4 literally) or `/wsserver ws://localhost:19134`.
5. Old UWP (Microsoft Store) installs block connections to the same PC. In an **administrator** PowerShell:
   `CheckNetIsolation LoopbackExempt -a -n="Microsoft.MinecraftUWP_8wekyb3d8bbwe"` (Preview:
   `Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe`). The current launcher install doesn't need this.
6. A firewall prompt may appear the first time Python listens on a port; allowing private networks is
   enough (it only listens on 127.0.0.1 unless you use `--lan`).

## Connected, but every command fails
- `[NotEnoughPermissions]` or "You do not have permission": cheats off or not an operator.
- `[EncryptionRequired]`: the bridge enables encryption automatically (Minecraft's "Require Encrypted
  Websockets" setting). If the handshake itself fails, `mc stop`, `mc start --encryption off`, and turn that
  setting off in Minecraft (Settings > General). Report the bridge log so the bug can be fixed.
- `[CommandVersionMismatch]` (very old game versions): the bridge falls back to legacy command parsing by
  itself; modern `/execute` syntax may then fail. Update Minecraft.
- Timeouts: the game is paused (Esc menu, or the window lost focus on some devices), or a loading screen
  is up. Commands run once the game is active again.

## Vision problems
- `mc status` says the add-on is not installed: run `mc addon`, activate "Claude Link" in the world's
  behavior packs, and reopen the world. The world needs cheats on (the add-on's commands are for operators).
- Add-on installed but not detected: the pack must be active in *this* world, and Minecraft must be
  1.21.120 or newer (the add-on uses `@minecraft/server` 2.3.0). The Content Log (Settings > Creator)
  shows script errors.
- Probe vision shows `?name` blocks: the game's language isn't English, so block names couldn't be mapped
  back to ids. The add-on avoids this.
- Blocks far away read as `?`: those chunks aren't loaded. Move closer or add a ticking area.

## Building problems
- "Cannot place blocks outside of the world": y outside -64..319, or the chunks aren't loaded.
- Undo failed: the snapshot structures (`claude_undo_*`) live in the world. Undo in the same world, with the
  area loaded. `mc undo --list` shows what's saved; `mc undo --purge` deletes them all.
- Something faces the wrong way: check minecraft-spatial's orientation table and rebuild with the corrected
  state (`mc undo` first).

## Other devices (phone, tablet, console)
`mc start --lan` listens on the network too. On the device, `/connect <this PC's LAN IP>:19134`. This isn't
tested on every platform, and consoles may not allow it.

## Where things are
- State, token, logs, undo records: `~/.mc-claude/` (override with `MC_CLAUDE_HOME`).
- Bridge log: `~/.mc-claude/bridge.log`.
- Stop the bridge: `mc stop`. Disconnect from the game side: leave the world, or `/closewebsocket` (some versions).
