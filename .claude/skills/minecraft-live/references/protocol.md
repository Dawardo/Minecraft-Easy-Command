# Minecraft Bedrock WebSocket protocol (as implemented by the bridge)

For debugging or extending `scripts/mclive/bridge.py`. The protocol is undocumented by Mojang; this matches
the behaviour of the game and of the widely used `mcpews` library, which the bridge is tested against.

## Connection
- `/connect <host:port>` (alias of `/wsserver`, needs cheats and operator permission) makes the game open a
  WebSocket to that server. It offers the subprotocol `com.microsoft.minecraft.wsencrypt`; the bridge echoes it.
- One connection = one player (the one who typed the command). Commands run as that player: `~ ~ ~` is their
  feet, `@s` is them.

## Frames (JSON text)
Command request (server -> game):
```json
{"header": {"version": 1, "requestId": "<uuid4>", "messageType": "commandRequest", "messagePurpose": "commandRequest"},
 "body": {"version": 42, "commandLine": "setblock ~ ~ ~ stone", "origin": {"type": "player"}}}
```
- `commandLine` has no leading slash.
- `body.version` is the **command-parser version**, not the protocol. 1 means pre-1.19.50 rules (old
  `execute <target> <pos> <cmd>`, aux values). The bridge sends 42 (1.21.20 rules) so modern syntax works,
  and falls back to 1 if the game answers CommandVersionMismatch.

Response (game -> server), same requestId:
```json
{"header": {"requestId": "<same>", "messagePurpose": "commandResponse", "version": 1},
 "body": {"statusCode": 0, "statusMessage": "Block placed"}}
```
`statusCode` < 0 means failure (names: `STATUS_NAMES` in bridge.py, e.g. -2147483648 FailedToParseCommand,
-2147418109 TooManyPendingRequests, -2147418107 EncryptionRequired). Some commands add fields (`testfor` ->
`victim`, `querytarget` -> `details`). Custom (script) commands return their `message` in `statusMessage`,
which is how the Claude Link add-on sends data back.

Subscribe / unsubscribe (no response is needed):
```json
{"header": {"version": 1, "requestId": "<uuid4>", "messageType": "commandRequest", "messagePurpose": "subscribe"},
 "body": {"eventName": "PlayerMessage"}}
```

Event (game -> server). Current format (header version 16842752 = protocol 1.1.0):
```json
{"header": {"eventName": "PlayerMessage", "messagePurpose": "event", "version": 16842752},
 "body": {"message": "hi", "sender": "Steve", "receiver": "", "type": "chat"}}
```
Old format: `body.eventName` plus `body.properties` with capitalised keys (`Message`, `Sender`). The bridge
converts both to the first form. PlayerMessage `type` is chat, say, tell, me or title. Other events known to
fire with data: BlockPlaced, BlockBroken, PlayerTravelled and PlayerTransform (body includes `player` with
`name`, `position`, `yRot`), and EndOfDay. Older names (ItemUsed, MobKilled, ...) may or may not still fire,
so try them: `mc subscribe <Name>`, then `mc events --wait 30`.

## Limits
- At most **100 commands awaiting a response**; more gets `TooManyPendingRequests`. The bridge keeps up to 90
  in flight and pipelines the rest in order.
- Commands only execute while the world ticks (not while paused).

## Encryption ("Require Encrypted Websockets")
1. The server sends the command `enableencryption "<server public key>" "<salt>" cfb8`: the public key is a
   base64 DER SubjectPublicKeyInfo of a secp384r1 key, the salt 16 random bytes in base64.
2. The game replies (in plain text) with `body.publicKey`, its own key, then switches.
3. Both sides: `secret = ECDH(secp384r1)`, `key = SHA-256(salt + secret)`, `iv = key[:16]`.
4. From then on every frame, in each direction, is AES-256-CFB8 encrypted as one continuous stream (sent as
   binary frames). The bridge holds all other outgoing frames during the switch so nothing plain arrives after
   it. `mccrypto.py` implements this with `cryptography` or pure Python (they are tested to be identical).

## The Claude Link add-on (custom commands)
`/claude:ping`, `/claude:scan <from> <to>`, `/claude:heights <from> <to>`, `/claude:sense [radius]`,
`/claude:inventory`. Scan format: `{"v":1,"from":[x,y,z],"size":[sx,sy,sz],"palette":["air","stone",...],
"data":"0*120,1*3,..."}`, where the data is run-length encoded palette indices ordered y, then z, then x;
palette entries are command-syntax block specs with states, and `?` means unloaded or outside the world.
`codec.py` decodes it; the add-on's output is tested byte-for-byte against the simulator's.
