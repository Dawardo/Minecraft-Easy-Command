# Bedrock command syntax (Minecraft 1.26.50.4)

Generated from Mojang's command metadata: every overload of every server command, exactly as the game
parses it. `<required>` `[optional]`, `a|b` = literal choices. `perm` = permission level (1 = operator/cheats).
grep for the command name instead of reading the whole file.

## /aimassist
Enable Aim Assist  perm=1 cheats=yes
```
/aimassist <players: target> set [x angle: float] [y angle: float] [max distance: float] [distance|angle] [preset id: string]
/aimassist <players: target> clear
```

## /allowlist (alias: /whitelist)
Manages the server allowlist.  perm=4 cheats=yes
```
/allowlist <add|remove|off|list|reload|on> [name: string]
```

## /camera
Issues a camera instruction  perm=1 cheats=yes
```
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> ease <easeTime: float> <easeType: easing (32 values)> pos <position: x y z> rot <xRot: rot> <yRot: rot>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> ease <easeTime: float> <easeType: easing (32 values)> pos <position: x y z> facing <lookAtEntity: target>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> ease <easeTime: float> <easeType: easing (32 values)> pos <position: x y z> facing <lookAtPosition: x y z>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> ease <easeTime: float> <easeType: easing (32 values)> pos <position: x y z>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> ease <easeTime: float> <easeType: easing (32 values)> rot <xRot: rot> <yRot: rot>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> ease <easeTime: float> <easeType: easing (32 values)> facing <lookAtEntity: target>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> ease <easeTime: float> <easeType: easing (32 values)> facing <lookAtPosition: x y z>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> ease <easeTime: float> <easeType: easing (32 values)> [default]
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> pos <position: x y z> rot <xRot: rot> <yRot: rot>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> pos <position: x y z> facing <lookAtEntity: target>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> pos <position: x y z> facing <lookAtPosition: x y z>
/camera <players: target> attach_to_entity <entity: target>
/camera <players: target> detach_from_entity
/camera <players: target> play_spline <name: string>
/camera <players: target> target_entity <entity: target>
/camera <players: target> target_entity <entity: target> target_center_offset <xTargetCenterOffset: float> <yTargetCenterOffset: float> <zTargetCenterOffset: float>
/camera <players: target> remove_target
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> view_offset <xViewOffset: float> <yViewOffset: float>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> entity_offset <xEntityOffset: float> <yEntityOffset: float> <zEntityOffset: float>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> rot <xRot: rot> <yRot: rot> view_offset <xViewOffset: float> <yViewOffset: float>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> rot <xRot: rot> <yRot: rot> entity_offset <xEntityOffset: float> <yEntityOffset: float> <zEntityOffset: float>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> view_offset <xViewOffset: float> <yViewOffset: float> entity_offset <xEntityOffset: float> <yEntityOffset: float> <zEntityOffset: float>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> rot <xRot: rot> <yRot: rot> view_offset <xViewOffset: float> <yViewOffset: float> entity_offset <xEntityOffset: float> <yEntityOffset: float> <zEntityOffset: float>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> ease <easeTime: float> <easeType: easing (32 values)> view_offset <xViewOffset: float> <yViewOffset: float>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> ease <easeTime: float> <easeType: easing (32 values)> entity_offset <xEntityOffset: float> <yEntityOffset: float> <zEntityOffset: float>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> ease <easeTime: float> <easeType: easing (32 values)> rot <xRot: rot> <yRot: rot> view_offset <xViewOffset: float> <yViewOffset: float>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> ease <easeTime: float> <easeType: easing (32 values)> rot <xRot: rot> <yRot: rot> entity_offset <xEntityOffset: float> <yEntityOffset: float> <zEntityOffset: float>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> ease <easeTime: float> <easeType: easing (32 values)> view_offset <xViewOffset: float> <yViewOffset: float> entity_offset <xEntityOffset: float> <yEntityOffset: float> <zEntityOffset: float>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> ease <easeTime: float> <easeType: easing (32 values)> rot <xRot: rot> <yRot: rot> view_offset <xViewOffset: float> <yViewOffset: float> entity_offset <xEntityOffset: float> <yEntityOffset: float> <zEntityOffset: float>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> pos <position: x y z>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> rot <xRot: rot> <yRot: rot>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> facing <lookAtEntity: target>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> facing <lookAtPosition: x y z>
/camera <players: target> set <minecraft:first_person|minecraft:fixed_boom|minecraft:follow_orbit|minecraft:free|minecraft:third_person|minecraft:third_person_front|minecraft:control_scheme_camera> [default]
/camera <players: target> clear
/camera <players: target> fade time <fadeInSeconds: float> <holdSeconds: float> <fadeOutSeconds: float> color <red: int> <green: int> <blue: int>
/camera <players: target> fade time <fadeInSeconds: float> <holdSeconds: float> <fadeOutSeconds: float>
/camera <players: target> fade color <red: int> <green: int> <blue: int>
/camera <players: target> fade
/camera <players: target> fov_set <fov_value: float> [fovEaseTime: float] [fovEaseType: easing (32 values)]
/camera <players: target> fov_clear [fovEaseTime: float] [fovEaseType: easing (32 values)]
```

## /camerashake
Applies shaking to the players' camera with a specified intensity and duration.  perm=1 cheats=yes
```
/camerashake add <player: target> [intensity: float] [seconds: float] [positional|rotational]
/camerashake stop [player: target]
```

## /changesetting
Changes a setting on the dedicated server while it's running.  perm=4 cheats=yes
```
/changesetting allow-cheats <true|false>
/changesetting difficulty <normal|peaceful|easy|hard|p|e|n|h>
/changesetting difficulty <value: int>
```

## /clear
Clears items from player inventory.  perm=1 cheats=yes
```
/clear [player: target] [itemName: item (3411 values)] [data: int] [maxCount: int]
```

## /clearspawnpoint
Removes the spawn point for a player.  perm=1 cheats=yes
```
/clearspawnpoint [player: target]
```

## /clone
Clones blocks from one region to another.  perm=1 cheats=yes
```
/clone <begin: x y z> <end: x y z> <destination: x y z> [replace|masked] [normal|force|move]
/clone <begin: x y z> <end: x y z> <destination: x y z> filtered <normal|force|move> <tileName: block (2648 values)> [blockStates: [states]]
```

## /controlscheme
Sets or clears control scheme.  perm=1 cheats=yes
```
/controlscheme <players: target> set <camera_relative_strafe|camera_relative|player_relative_strafe|player_relative|locked_player_relative_strafe>
/controlscheme <players: target> clear
```

## /damage
Apply damage to the specified entities.  perm=1 cheats=yes
```
/damage <target: target> <amount: int> [cause: damagecause (36 values)]
/damage <target: target> <amount: int> <cause: damagecause (36 values)> entity <damager: target>
```

## /daylock (alias: /alwaysday)
Locks and unlocks the day-night cycle.  perm=1 cheats=yes
```
/daylock [true|false]
```

## /deop
Revokes operator status from a player.  perm=2 cheats=no
```
/deop <player: target>
```

## /dialogue
Opens NPC dialogue for a player.  perm=1 cheats=yes
```
/dialogue open <npc: target> <player: target> [sceneName: string]
/dialogue change <npc: target> <sceneName: string> [players: target]
```

## /difficulty
Sets the difficulty level.  perm=1 cheats=yes
```
/difficulty <normal|peaceful|easy|hard|p|e|n|h>
/difficulty <difficulty: int>
```

## /editor-allowlist
Manages the editor allowlist.  perm=4 cheats=yes
```
/editor-allowlist reload
```

## /effect
Add or remove status effects.  perm=1 cheats=yes
```
/effect <player: target> clear [effect: effect (37 values)]
/effect <player: target> <effect: effect (37 values)> [seconds: int] [amplifier: int] [true|false]
/effect <player: target> <effect: effect (37 values)> infinite [amplifier: int] [true|false]
```

## /enchant
Adds an enchantment to a player's selected item.  perm=1 cheats=yes
```
/enchant <player: target> <enchantmentName: enchant (42 values)> [level: int]
/enchant <player: target> <enchantmentId: int> [level: int]
```

## /event
Triggers an event for the specified object(s)  perm=1 cheats=yes
```
/event entity <target: target> <eventName: entityevents (479 values)>
```

## /execute
Executes a command on behalf of one or more entities.  perm=1 cheats=yes
```
/execute as <origin: target> <chainedCommand: subcommand...>
/execute at <origin: target> <chainedCommand: subcommand...>
/execute in <overworld|nether|the_end> <chainedCommand: subcommand...>
/execute positioned <position: x y z> <chainedCommand: subcommand...>
/execute positioned as <origin: target> <chainedCommand: subcommand...>
/execute rotated <yaw: rot> <pitch: rot> <chainedCommand: subcommand...>
/execute rotated as <origin: target> <chainedCommand: subcommand...>
/execute facing <position: x y z> <chainedCommand: subcommand...>
/execute facing entity <origin: target> <eyes|feet> <chainedCommand: subcommand...>
/execute align <axes: string> <chainedCommand: subcommand...>
/execute anchored <eyes|feet> <chainedCommand: subcommand...>
/execute <if|unless> block <position: x y z> <block: block (2648 values)> [chainedCommand: subcommand...]
/execute <if|unless> block <position: x y z> <block: block (2648 values)> <blockStates: [states]> [chainedCommand: subcommand...]
/execute <if|unless> blocks <begin: x y z> <end: x y z> <destination: x y z> <masked|all> [chainedCommand: subcommand...]
/execute <if|unless> entity <target: target> [chainedCommand: subcommand...]
/execute <if|unless> score <target: target> <objective: scoreboardobjectives> <operation: <|<=|=|>=|>> <source: target> <objective: scoreboardobjectives> [chainedCommand: subcommand...]
/execute <if|unless> score <target: target> <objective: scoreboardobjectives> matches <range: range> [chainedCommand: subcommand...]
/execute run <command: command>
```

## /fill
Fills all or parts of a region with a specific block.  perm=1 cheats=yes
```
/fill <from: x y z> <to: x y z> <tileName: block (2648 values)> <blockStates: [states]> [outline|hollow|destroy|keep]
/fill <from: x y z> <to: x y z> <tileName: block (2648 values)> [outline|hollow|destroy|keep]
/fill <from: x y z> <to: x y z> <tileName: block (2648 values)> <blockStates: [states]> replace [replaceTileName: block (2648 values)] [replaceBlockStates: [states]]
/fill <from: x y z> <to: x y z> <tileName: block (2648 values)> replace [replaceTileName: block (2648 values)] [replaceBlockStates: [states]]
```

## /fog
Add or remove fog settings file  perm=1 cheats=yes
```
/fog <victim: target> push <fogId: string> <userProvidedId: string>
/fog <victim: target> <pop|remove> <userProvidedId: string>
```

## /function
Runs commands found in the corresponding function file.  perm=1 cheats=yes
```
/function <name: pathcommand>
```

## /gamemode
Sets a player's game mode.  perm=1 cheats=yes
```
/gamemode <default|creative|spectator|survival|adventure|d|c|s|a> [player: target]
/gamemode <gameMode: int> [player: target]
```

## /gamerule
Sets or queries a game rule value.  perm=1 cheats=no
```
/gamerule 
/gamerule playerwaypoints <everyone|off>
/gamerule <rule: boolgamerule (32 values)> [true|false]
/gamerule <maxcommandchainlength|randomtickspeed|functioncommandlimit|spawnradius|playerssleepingpercentage> [value: int]
```

## /gametest
Interacts with gametest.  perm=1 cheats=yes
```
/gametest runthis
/gametest run <testName: gametestname> [rotationSteps: int]
/gametest run <testName: gametestname> <true|false> <repeatCount: int> [rotationSteps: int]
/gametest runset [tag: gametesttag] [rotationSteps: int]
/gametest runsetuntilfail [tag: gametesttag] [rotationSteps: int]
/gametest clearall
/gametest pos
/gametest create <testName: string> [width: int] [height: int] [depth: int]
/gametest runthese
/gametest stopall
```

## /give
Gives an item to a player.  perm=1 cheats=yes
```
/give <player: target> <itemName: item (3411 values)> [amount: int] [data: int] [components: json]
```

## /help (alias: /?)
Provides help/list of commands.  perm=0 cheats=no
```
/help [command: commandname (98 values)]
/help <page: int>
```

## /hud
Changes the visibility of hud elements.  perm=1 cheats=yes
```
/hud <target: target> <hide|reset> [hud_element: hudelement (14 values)]
```

## /inputpermission
Sets whether or not a player's input can affect their character.  perm=1 cheats=yes
```
/inputpermission set <targets: target> <camera|movement|jump|lateral_movement|sneak|dismount|mount|move_backward|move_forward|move_left|move_right> <enabled|disabled>
/inputpermission query <targets: target> <camera|movement|jump|lateral_movement|sneak|dismount|mount|move_backward|move_forward|move_left|move_right> [enabled|disabled]
```

## /kick
Kicks a player from the server.  perm=1 cheats=no
```
/kick <name: target> <reason: message>
```

## /kill
Kills entities (players, mobs, etc.).  perm=1 cheats=yes
```
/kill [target: target]
```

## /list
Lists players on the server.  perm=0 cheats=no
```
/list 
```

## /locate
Displays the coordinates for the closest structure or biome of a given type.  perm=1 cheats=yes
```
/locate structure <structure: structurefeature (35 values)> [true|false]
/locate biome <biome: biome (88 values)>
/locate poi <poi_type: poi_type>
/locate poi <tags: poi_tag>
```

## /loot
Drops the given loot table into the specified inventory or into the world.  perm=1 cheats=yes
```
/loot spawn <position: x y z> loot <loot_table: string> [<tool>|mainhand|offhand: tool (2079 values)]
/loot spawn <position: x y z> kill <entity: target> [<tool>|mainhand|offhand: tool (2079 values)]
/loot spawn <position: x y z> mine <TargetBlockPosition: x y z> [<tool>|mainhand|offhand: tool (2079 values)]
/loot give <players: target> loot <loot_table: string> [<tool>|mainhand|offhand: tool (2079 values)]
/loot give <players: target> kill <entity: target> [<tool>|mainhand|offhand: tool (2079 values)]
/loot give <players: target> mine <TargetBlockPosition: x y z> [<tool>|mainhand|offhand: tool (2079 values)]
/loot insert <position: x y z> loot <loot_table: string> [<tool>|mainhand|offhand: tool (2079 values)]
/loot insert <position: x y z> kill <entity: target> [<tool>|mainhand|offhand: tool (2079 values)]
/loot insert <position: x y z> mine <TargetBlockPosition: x y z> [<tool>|mainhand|offhand: tool (2079 values)]
/loot replace entity <entity: target> <slotType: entityequipmentslot (14 values)> <slotId: int> <count: int> loot <loot_table: string> [<tool>|mainhand|offhand: tool (2079 values)]
/loot replace entity <entity: target> <slotType: entityequipmentslot (14 values)> <slotId: int> loot <loot_table: string> [<tool>|mainhand|offhand: tool (2079 values)]
/loot replace entity <entity: target> <slotType: entityequipmentslot (14 values)> <slotId: int> <count: int> kill <entity: target> [<tool>|mainhand|offhand: tool (2079 values)]
/loot replace entity <entity: target> <slotType: entityequipmentslot (14 values)> <slotId: int> kill <entity: target> [<tool>|mainhand|offhand: tool (2079 values)]
/loot replace entity <entity: target> <slotType: entityequipmentslot (14 values)> <slotId: int> <count: int> mine <TargetBlockPosition: x y z> [<tool>|mainhand|offhand: tool (2079 values)]
/loot replace entity <entity: target> <slotType: entityequipmentslot (14 values)> <slotId: int> mine <TargetBlockPosition: x y z> [<tool>|mainhand|offhand: tool (2079 values)]
/loot replace block <position: x y z> slot.container <slotId: int> <count: int> loot <loot_table: string> [<tool>|mainhand|offhand: tool (2079 values)]
/loot replace block <position: x y z> slot.container <slotId: int> loot <loot_table: string> [<tool>|mainhand|offhand: tool (2079 values)]
/loot replace block <position: x y z> slot.container <slotId: int> <count: int> kill <entity: target> [<tool>|mainhand|offhand: tool (2079 values)]
/loot replace block <position: x y z> slot.container <slotId: int> kill <entity: target> [<tool>|mainhand|offhand: tool (2079 values)]
/loot replace block <position: x y z> slot.container <slotId: int> <count: int> mine <TargetBlockPosition: x y z> [<tool>|mainhand|offhand: tool (2079 values)]
/loot replace block <position: x y z> slot.container <slotId: int> mine <TargetBlockPosition: x y z> [<tool>|mainhand|offhand: tool (2079 values)]
```

## /me
Displays a message about yourself.  perm=0 cheats=no
```
/me <message: message>
```

## /mobevent
Controls what mob events are allowed to run.  perm=1 cheats=yes
```
/mobevent <minecraft:pillager_patrols_event|minecraft:wandering_trader_event|minecraft:ender_dragon_event|events_enabled> [true|false]
```

## /music
Allows you to control playing music tracks.  perm=1 cheats=yes
```
/music queue <trackName: string> [volume: float] [fadeSeconds: float] [play_once|loop]
/music play <trackName: string> [volume: float] [fadeSeconds: float] [play_once|loop]
/music stop [fadeSeconds: float]
/music volume <volume: float>
```

## /op
Grants operator status to a player.  perm=2 cheats=no
```
/op <player: target>
```

## /packstack
Prints client or server pack stack to chat  perm=0 cheats=no
```
/packstack <server|client> [verbose] [exclude-vanilla]
```

## /particle
Creates a particle emitter  perm=1 cheats=yes
```
/particle <effect: string> [position: x y z]
```

## /permission (alias: /ops)
Reloads and applies permissions.  perm=2 cheats=no
```
/permission <set|list|reload>
/permission <set|list|reload> <player: target> [visitor|member|operator]
```

## /place
Places a jigsaw structure, feature, or feature rule in the world.  perm=2 cheats=yes
```
/place structure <structure: jigsawstructure (20 values)> [pos: x y z] [true|false] [true|false] [true|false] [apply_waterlogging|ignore_waterlogging]
/place jigsaw <pool: pathcommand> <jigsawTarget: string> <maxDepth: int> [pos: x y z] [true|false] [true|false] [apply_waterlogging|ignore_waterlogging]
/place feature <feature: features (286 values)> [position: x y z]
/place featurerule <featurerule: featurerules (170 values)> [position: x y z]
```

## /playanimation
Makes one or more entities play a one-off animation. Assumes all variables are setup correctly.  perm=1 cheats=yes
```
/playanimation <entity: target> <animation: string> [next_state: string] [blend_out_time: float] [stop_expression: string] [controller: string]
```

## /playsound
Plays a sound.  perm=1 cheats=yes
```
/playsound <sound: string> [player: target] [position: x y z] [volume: float] [pitch: float] [minimumVolume: float]
```

## /project
Manipulate the currently loaded project  perm=1 cheats=no
```
/project export <project|template|world>
```

## /recipe
Unlocks recipe in the recipe book for a player.  perm=1 cheats=yes
```
/recipe give <player: target> <recipe: unlockablerecipevalues (4202 values)>
/recipe take <player: target> <recipe: unlockablerecipevalues (4202 values)>
```

## /reload
Reloads all function and script files from all behavior packs, or optionally reloads the world and all resource and behavior packs.  perm=2 cheats=yes
```
/reload [all]
```

## /reloadconfig
Reloads configuration files relating to variables, secrets, permissions, etc.  perm=4 cheats=yes
```
/reloadconfig 
```

## /reloadpacketlimitconfig
Reload packet limit config from file  perm=4 cheats=yes
```
/reloadpacketlimitconfig 
```

## /replaceitem
Replaces items in inventories.  perm=1 cheats=yes
```
/replaceitem block <position: x y z> slot.container <slotId: int> <itemName: item (3411 values)> [amount: int] [data: int] [components: json]
/replaceitem entity <target: target> <slotType: entityequipmentslot (14 values)> <slotId: int> <itemName: item (3411 values)> [amount: int] [data: int] [components: json]
/replaceitem block <position: x y z> slot.container <slotId: int> <destroy|keep> <itemName: item (3411 values)> [amount: int] [data: int] [components: json]
/replaceitem entity <target: target> <slotType: entityequipmentslot (14 values)> <slotId: int> <destroy|keep> <itemName: item (3411 values)> [amount: int] [data: int] [components: json]
```

## /ride
Makes entities ride other entities, stops entities from riding, makes rides evict their riders, or summons rides or riders.  perm=1 cheats=yes
```
/ride <riders: target> start_riding <ride: target> [teleport_rider|teleport_ride] [until_full|if_group_fits]
/ride <riders: target> stop_riding
/ride <rides: target> evict_riders
/ride <rides: target> summon_rider <entityType: entitytype (229 values)> [spawnEvent: string] [nameTag: string]
/ride <riders: target> summon_ride <entityType: entitytype (229 values)> [no_ride_change|reassign_rides|skip_riders] [spawnEvent: string] [nameTag: string]
```

## /save
Control or check how the game saves data to disk.  perm=4 cheats=yes
```
/save <query|resume|hold>
```

## /say
Sends a message in the chat to other players.  perm=1 cheats=no
```
/say <message: message>
```

## /schedule
Schedules an action to be executed once an area is loaded, or after a certain amount of time.  perm=1 cheats=yes
```
/schedule delay add <function: pathcommand> <time: int> [replace|append]
/schedule delay add <function: pathcommand> <time: postfix_t> [replace|append]
/schedule delay add <function: pathcommand> <time: postfix_s> [replace|append]
/schedule delay add <function: pathcommand> <time: postfix_d> [replace|append]
/schedule delay clear <function: pathcommand>
/schedule clear <function: pathcommand>
/schedule on_area_loaded add <from: x y z> <to: x y z> <function: pathcommand>
/schedule on_area_loaded add circle <center: x y z> <radius: int> <function: pathcommand>
/schedule on_area_loaded add tickingarea <name: string> <function: pathcommand>
/schedule on_area_loaded clear tickingarea <name: string> [function: pathcommand]
/schedule on_area_loaded clear function <function: pathcommand>
```

## /scoreboard
Tracks and displays scores for various objectives.  perm=1 cheats=yes
```
/scoreboard objectives add <objective: scoreboardobjectives> dummy [displayName: string]
/scoreboard objectives remove <objective: scoreboardobjectives>
/scoreboard objectives list
/scoreboard objectives setdisplay <list|sidebar> [objective: scoreboardobjectives] [ascending|descending]
/scoreboard objectives setdisplay belowname [objective: scoreboardobjectives]
/scoreboard players list [playername: target|*]
/scoreboard players reset <player: target|*> [objective: scoreboardobjectives]
/scoreboard players test <player: target|*> <objective: scoreboardobjectives> <min: int|*> [max: int|*]
/scoreboard players random <player: target|*> <objective: scoreboardobjectives> <min: int> <max: int>
/scoreboard players <set|add|remove> <player: target|*> <objective: scoreboardobjectives> <count: int>
/scoreboard players operation <targetName: target|*> <targetObjective: scoreboardobjectives> <operation: =|+=|-=|*=|/=|%=|<|>|><> <selector: target|*> <objective: scoreboardobjectives>
```

## /script
Script debugger commands.  perm=2 cheats=yes
```
/script debugger listen <port: int>
/script debugger connect [host: string] [port: int]
/script debugger close
/script profiler start
/script profiler stop
/script diagnostics startcapture
/script diagnostics stopcapture
```

## /scriptevent
Triggers a script event with an ID and message.  perm=1 cheats=yes
```
/scriptevent <messageId: string> <message: message>
```

## /sendshowstoreoffer
Sends a request to show a store offer to the target player.  perm=4 cheats=yes
```
/sendshowstoreoffer <player: target> <marketplace|character> <offerId: string>
/sendshowstoreoffer <player: target> server
```

## /serveridentity
Manages the server identity key. Use save, delete, or status.  perm=4 cheats=no
```
/serveridentity <save|delete|status>
```

## /setblock
Changes a block to another block.  perm=1 cheats=yes
```
/setblock <position: x y z> <tileName: block (2648 values)> <blockStates: [states]> [replace|destroy|keep]
/setblock <position: x y z> <tileName: block (2648 values)> [replace|destroy|keep]
```

## /setmaxplayers
Sets the maximum number of players for this game session.  perm=3 cheats=yes
```
/setmaxplayers <maxPlayers: int>
```

## /setworldspawn
Sets the world spawn.  perm=1 cheats=yes
```
/setworldspawn [spawnPoint: x y z]
```

## /spawnpoint
Sets the spawn point for a player.  perm=1 cheats=yes
```
/spawnpoint [player: target] [spawnPos: x y z]
```

## /spreadplayers
Teleports entities to random locations.  perm=1 cheats=yes
```
/spreadplayers <x: rot> <z: rot> <spreadDistance: float> <maxRange: float> <victim: target> [maxHeight: rot]
```

## /stop
Stops the server.  perm=4 cheats=yes
```
/stop 
```

## /stopsound
Stops a sound.  perm=1 cheats=yes
```
/stopsound <player: target> [sound: string]
```

## /structure
Saves or loads a structure in the world.  perm=1 cheats=yes
```
/structure save <name: string> <from: x y z> <to: x y z> [disk|memory]
/structure save <name: string> <from: x y z> <to: x y z> [true|false] [disk|memory] [true|false]
/structure delete <name: string>
/structure load <name: string> <to: x y z> [0_degrees|90_degrees|180_degrees|270_degrees] [x|z|none|xz] [true|false] [true|false] [true|false] [integrity: float] [seed: string]
/structure load <name: string> <to: x y z> [0_degrees|90_degrees|180_degrees|270_degrees] [x|z|none|xz] [block_by_block|layer_by_layer] [animationSeconds: float] [true|false] [true|false] [true|false] [integrity: float] [seed: string]
```

## /summon
Summons an entity.  perm=1 cheats=yes
```
/summon <entityType: entitytype (229 values)> [spawnPos: x y z] [yRot: rot] [xRot: rot] [spawnEvent: entityevents (479 values)] [nameTag: string]
/summon <entityType: entitytype (229 values)> <nameTag: string> [spawnPos: x y z]
/summon <entityType: entitytype (229 values)> [spawnPos: x y z] facing <lookAtPosition: x y z> [spawnEvent: entityevents (479 values)] [nameTag: string]
/summon <entityType: entitytype (229 values)> [spawnPos: x y z] facing <lookAtEntity: target> [spawnEvent: entityevents (479 values)] [nameTag: string]
```

## /tag
Manages tags stored in entities.  perm=1 cheats=yes
```
/tag <entity: target|*> <add|remove> <name: tagvalues>
/tag <entity: target|*> list
```

## /teleport (alias: /tp)
Teleports entities (players, mobs, etc.).  perm=1 cheats=yes
```
/teleport <destination: x y z> [true|false] [true|false]
/teleport <destination: x y z> [yRot: rot] [xRot: rot] [true|false] [true|false]
/teleport <destination: x y z> facing <lookAtPosition: x y z> [true|false] [true|false]
/teleport <destination: x y z> facing <lookAtEntity: target> [true|false] [true|false]
/teleport <victim: target> <destination: x y z> [yRot: rot] [xRot: rot] [true|false] [true|false]
/teleport <victim: target> <destination: x y z> [true|false] [true|false]
/teleport <victim: target> <destination: x y z> facing <lookAtPosition: x y z> [true|false] [true|false]
/teleport <victim: target> <destination: x y z> facing <lookAtEntity: target> [true|false] [true|false]
/teleport <destination: target>
/teleport <victim: target> <destination: target> [true|false] [true|false]
```

## /tell (alias: /w, /msg)
Sends a private message to one or more players.  perm=0 cheats=no
```
/tell <target: target> <message: message>
```

## /tellraw
Sends a JSON message to players.  perm=1 cheats=no
```
/tellraw <target: target> <raw json message: json>
```

## /testfor
Counts entities (players, mobs, items, etc.) matching specified conditions.  perm=1 cheats=yes
```
/testfor <victim: target>
```

## /testforblock
Tests whether a certain block is in a specific location.  perm=1 cheats=yes
```
/testforblock <position: x y z> <tileName: block (2648 values)> [blockStates: [states]]
```

## /testforblocks
Tests whether the blocks in two regions match.  perm=1 cheats=yes
```
/testforblocks <begin: x y z> <end: x y z> <destination: x y z> [masked|all]
```

## /tickingarea
Add, remove, or list ticking areas.  perm=1 cheats=yes
```
/tickingarea add <from: x y z> <to: x y z> [name: string] [true|false]
/tickingarea add circle <center: x y z> <radius: int> [name: string] [true|false]
/tickingarea remove <position: x y z>
/tickingarea remove <name: string>
/tickingarea remove_all
/tickingarea list [all-dimensions]
/tickingarea preload <position: x y z> [true|false]
/tickingarea preload <name: string> [true|false]
```

## /time
Changes or queries the world's game time.  perm=1 cheats=yes
```
/time add <amount: int>
/time set <amount: int>
/time set <day|sunrise|noon|sunset|night|midnight>
/time query <daytime|gametime|day>
/time of minecraft:overworld add <amount: int>
/time of minecraft:overworld set <amount: int>
/time of minecraft:overworld set <timeMarkerName: clock_timemarker_name> [next|previous|stay]
/time of minecraft:overworld query time
/time of minecraft:overworld pause
/time of minecraft:overworld resume
```

## /title
Controls screen titles.  perm=1 cheats=yes
```
/title <player: target> clear
/title <player: target> reset
/title <player: target> <title|subtitle|actionbar> <titleText: message>
/title <player: target> times <fadeIn: int> <stay: int> <fadeOut: int>
```

## /titleraw
Controls screen titles with JSON messages.  perm=1 cheats=yes
```
/titleraw <player: target> clear
/titleraw <player: target> reset
/titleraw <player: target> <title|subtitle|actionbar> <raw json titleText: json>
/titleraw <player: target> times <fadeIn: int> <stay: int> <fadeOut: int>
```

## /toggledownfall
Toggles the weather.  perm=1 cheats=yes
```
/toggledownfall 
```

## /transfer
Transfers a player to another server.  perm=4 cheats=yes
```
/transfer <pfidOrMSA: string> <server: string> [port: int]
```

## /weather
Sets the weather.  perm=1 cheats=yes
```
/weather <clear|rain|thunder> [duration: int]
/weather query
```

## /wsserver (alias: /connect)
Attempts to connect to the websocket server on the provided URL.  perm=2 cheats=yes
```
/wsserver <serverUri: text>
```

## /xp
Adds or removes player experience.  perm=1 cheats=yes
```
/xp <amount: int> [player: target]
/xp <amount: postfix_l> [player: target]
```

## Enum values

Named values accepted by the parameters above (large lists like blocks and items: see the minecraft-knowledge references).

### biome (used by /locate)
minecraft:ocean, minecraft:plains, minecraft:desert, minecraft:extreme_hills, minecraft:forest, minecraft:taiga, minecraft:swampland, minecraft:river, minecraft:hell, minecraft:the_end, minecraft:legacy_frozen_ocean, minecraft:frozen_river, minecraft:ice_plains, minecraft:ice_mountains, minecraft:mushroom_island, minecraft:mushroom_island_shore, minecraft:beach, minecraft:desert_hills, minecraft:forest_hills, minecraft:taiga_hills, minecraft:extreme_hills_edge, minecraft:jungle, minecraft:jungle_hills, minecraft:jungle_edge, minecraft:deep_ocean, minecraft:stone_beach, minecraft:cold_beach, minecraft:birch_forest, minecraft:birch_forest_hills, minecraft:roofed_forest, minecraft:cold_taiga, minecraft:cold_taiga_hills, minecraft:mega_taiga, minecraft:mega_taiga_hills, minecraft:extreme_hills_plus_trees, minecraft:savanna, minecraft:savanna_plateau, minecraft:mesa, minecraft:mesa_plateau_stone, minecraft:mesa_plateau, minecraft:warm_ocean, minecraft:lukewarm_ocean, minecraft:deep_lukewarm_ocean, minecraft:cold_ocean, minecraft:deep_cold_ocean, minecraft:frozen_ocean, minecraft:deep_frozen_ocean, minecraft:bamboo_jungle, minecraft:bamboo_jungle_hills, minecraft:sunflower_plains, minecraft:desert_mutated, minecraft:extreme_hills_mutated, minecraft:flower_forest, minecraft:taiga_mutated, minecraft:swampland_mutated, minecraft:ice_plains_spikes, minecraft:jungle_mutated, minecraft:jungle_edge_mutated, minecraft:birch_forest_mutated, minecraft:birch_forest_hills_mutated, minecraft:roofed_forest_mutated, minecraft:cold_taiga_mutated, minecraft:redwood_taiga_mutated, minecraft:redwood_taiga_hills_mutated, minecraft:extreme_hills_plus_trees_mutated, minecraft:savanna_mutated, minecraft:savanna_plateau_mutated, minecraft:mesa_bryce, minecraft:mesa_plateau_stone_mutated, minecraft:mesa_plateau_mutated, minecraft:soulsand_valley, minecraft:crimson_forest, minecraft:warped_forest, minecraft:basalt_deltas, minecraft:jagged_peaks, minecraft:frozen_peaks, minecraft:snowy_slopes, minecraft:grove, minecraft:meadow, minecraft:lush_caves, minecraft:dripstone_caves, minecraft:stony_peaks, minecraft:deep_dark, minecraft:mangrove_swamp, minecraft:cherry_grove, minecraft:pale_garden, minecraft:sulfur_caves, minecraft:dappled_forest

### boolgamerule (used by /gamerule)
commandblockoutput, dodaylightcycle, doentitydrops, dofiretick, recipesunlock, dolimitedcrafting, domobloot, domobspawning, dotiledrops, doweathercycle, drowningdamage, falldamage, firedamage, keepinventory, mobgriefing, pvp, showcoordinates, showdaysplayed, naturalregeneration, tntexplodes, sendcommandfeedback, doinsomnia, commandblocksenabled, doimmediaterespawn, showdeathmessages, showtags, freezedamage, respawnblocksexplode, showbordereffect, showrecipemessages, projectilescanbreakblocks, tntexplosiondropdecay

### commandname (used by /help)
tag, camera, script, connect, stop, transfer, clear, aimassist, time, camerashake, clearspawnpoint, clone, controlscheme, damage, daylock, alwaysday, deop, dialogue, difficulty, effect, event, execute, fill, fog, function, gamemode, gamerule, gametest, gettopsolidblock, give, help, ?, hud, inputpermission, kick, kill, list, listd, structure, locate, loot, me, mobevent, music, op, packstack, particle, reload, permission, ops, place, playanimation, playsound, querytarget, replaceitem, ride, say, tickingarea, schedule, scoreboard, scriptevent, setblock, setmaxplayers, setworldspawn, spawnpoint, spreadplayers, stopsound, save, summon, teleport, tp, tell, w, msg, tellraw, testforblock, testforblocks, testfor, title, titleraw, toggledownfall, weather, wsserver, xp, recipe, project, agent, codebuilder_actorinfo, enchant, clearrealmevents, serveridentity, allowlist, whitelist, editor-allowlist, reloadpacketlimitconfig, changesetting, sendshowstoreoffer, reloadconfig

### damagecause (used by /damage)
piston, lava, campfire, fire, anvil, magma, soul_campfire, wither, falling_block, fireworks, thorns, none, contact, sonic_boom, override, entity_attack, projectile, suffocation, mace_smash, fall, starve, ram_attack, fire_tick, stalactite, drowning, block_explosion, entity_explosion, void, self_destruct, magic, charging, stalagmite, fly_into_wall, lightning, freezing, temperature

### easing (used by /camera)
linear, spring, in_quad, out_quad, in_out_quad, in_cubic, out_cubic, in_out_cubic, in_quart, out_quart, in_out_quart, in_quint, out_quint, in_out_quint, in_sine, out_sine, in_out_sine, in_expo, out_expo, in_out_expo, in_circ, out_circ, in_out_circ, in_bounce, out_bounce, in_out_bounce, in_back, out_back, in_out_back, in_elastic, out_elastic, in_out_elastic

### effect (used by /effect)
wither, speed, slowness, haste, mining_fatigue, strength, instant_health, instant_damage, jump_boost, nausea, regeneration, resistance, fire_resistance, water_breathing, invisibility, blindness, night_vision, hunger, weakness, poison, health_boost, absorption, saturation, levitation, fatal_poison, conduit_power, slow_falling, bad_omen, village_hero, darkness, trial_omen, wind_charged, weaving, oozing, infested, raid_omen, breath_of_the_nautilus

### enchant (used by /enchant)
protection, fire_protection, feather_falling, blast_protection, projectile_protection, thorns, respiration, depth_strider, aqua_affinity, sharpness, smite, bane_of_arthropods, knockback, fire_aspect, looting, efficiency, silk_touch, unbreaking, fortune, power, punch, flame, infinity, luck_of_the_sea, lure, frost_walker, mending, binding, vanishing, impaling, riptide, loyalty, channeling, multishot, piercing, quick_charge, soul_speed, swift_sneak, wind_burst, density, breach, lunge

### entityequipmentslot (used by /loot, /replaceitem)
slot.weapon.mainhand, slot.weapon.offhand, slot.armor.head, slot.armor.chest, slot.armor.legs, slot.armor.feet, slot.armor.body, slot.hotbar, slot.inventory, slot.enderchest, slot.saddle, slot.armor, slot.chest, slot.equippable

### featurerules (used by /place)
minecraft:warped_fungus_feature, minecraft:warped_roots_feature, minecraft:nether_cave_carver_feature, minecraft:sculk_vein_feature, minecraft:small_dripstone_feature, minecraft:crimson_roots_feature, minecraft:mesa_after_surface_dry_grass_feature_rules, minecraft:cold_taiga_first_sweet_berry_bush_feature, minecraft:mangrove_swamp_mangrove_tree_feature, minecraft:meadow_after_surface_tall_grass_feature_rules, minecraft:plains_first_double_plant_grass_feature, minecraft:jungle_after_surface_tall_grass_feature_rules, minecraft:mushroom_island_after_surface_brown_mushroom_feature_rules, minecraft:ocean_after_surface_seagrass_feature_rules, minecraft:savanna_first_double_plant_grass_feature, minecraft:minecraft:savanna_mutated_after_surface_tall_grass_feature_rules, minecraft:plains_first_double_plant_sunflower_feature, minecraft:pale_garden_surface_pale_moss_patch_feature_rules, minecraft:taiga_first_double_plant_fern_feature, minecraft:cherry_grove_pink_petals_feature_rules, minecraft:taiga_first_sweet_berry_bush_feature, minecraft:crimson_fungus_warped_feature, minecraft:bamboo_jungle_after_surface_bamboo_feature, minecraft:cherry_grove_after_surface_cherry_tree_feature_rules, minecraft:crimson_feature, minecraft:dappled_forest_after_surface_brown_mushroom_feature_rules, minecraft:overworld_surface_flowers_feature, minecraft:overworld_after_surface_bush_feature_rules, minecraft:overworld_after_surface_extra_brown_mushroom_feature_rules, minecraft:plains_surface_tall_grass_feature, minecraft:mega_taiga_after_surface_brown_mushroom_feature_rules, minecraft:overworld_after_surface_extra_red_mushroom_feature_rules, minecraft:overworld_underground_diorite_feature, minecraft:mega_taiga_after_surface_red_mushroom_feature_rules, minecraft:overworld_after_surface_flowers_feature_rules, minecraft:desert_after_surface_dry_grass_feature_rules, minecraft:flower_forest_after_surface_flowers_feature_rules, minecraft:desert_or_swamp_after_surface_fossil_deepslate_feature, minecraft:overworld_underwater_magma_feature, minecraft:bamboo_jungle_after_surface_tall_grass_feature_rules, minecraft:plains_after_surface_double_plant_sunflower_feature_rules, minecraft:savanna_after_surface_tall_grass_feature_rules, minecraft:cold_ocean_after_surface_seagrass_feature_rules, minecraft:overworld_underground_andesite_upper_feature, minecraft:overworld_underground_gravel_ore_feature, minecraft:cold_taiga_after_surface_sweet_berry_bush_feature_rules, minecraft:deep_cold_ocean_after_surface_seagrass_feature_rules, minecraft:forest_surface_tall_grass_feature, minecraft:deep_ocean_after_surface_seagrass_feature_rules, minecraft:deep_warm_ocean_after_surface_seagrass_feature_rules, minecraft:flower_forest_surface_flowers_feature, minecraft:swamp_after_surface_flowers_feature_rules, minecraft:jungle_after_surface_flowers_feature_rules, minecraft:forest_after_surface_tall_grass_feature_rules, minecraft:meadow_after_surface_flowers_feature_rules, minecraft:overworld_underground_coal_ore_lower_feature, minecraft:savanna_after_surface_flowers_feature_rules, minecraft:mangrove_swamp_after_surface_seagrass_feature_rules, minecraft:mangrove_swamp_after_surface_tall_grass_feature_rules, minecraft:meadow_after_surface_double_plant_feature_rules, minecraft:swamp_after_surface_red_mushroom_feature_rules, minecraft:swamp_after_surface_brown_mushroom_feature_rules, minecraft:mega_taiga_after_surface_tall_grass_feature_rules, minecraft:overworld_after_surface_tall_grass_feature_rules, minecraft:mushroom_island_after_surface_red_mushroom_feature_rules, minecraft:plains_after_surface_flowers_feature_rules, minecraft:plains_after_surface_tall_grass_feature_rules, minecraft:river_after_surface_seagrass_feature_rules, minecraft:swamp_after_surface_seagrass_feature_rules, minecraft:swamp_after_surface_tall_grass_feature_rules, minecraft:swamp_after_surface_waterlily_feature_rules, minecraft:taiga_after_surface_brown_mushroom_feature_rules, minecraft:taiga_after_surface_red_mushroom_feature_rules, minecraft:taiga_after_surface_sweet_berry_bush_feature_rules, minecraft:taiga_after_surface_tall_grass_feature_rules, minecraft:warm_ocean_after_surface_seagrass_feature_rules, minecraft:lush_caves_after_surface_azalea_root_system_feature, minecraft:lush_caves_after_surface_cave_vines_feature, minecraft:lush_caves_after_surface_leaf_clay_feature, minecraft:lush_caves_after_surface_moss_ceiling_feature, minecraft:lush_caves_after_surface_spore_blossom_feature, minecraft:lush_caves_after_surface_vegetation_feature, minecraft:scatter_tree_dappled_forest_feature_rules, minecraft:after_surface_silverfish_feature, minecraft:extreme_hills_after_surface_silverfish_feature, minecraft:desert_or_swamp_after_surface_fossil_feature, minecraft:jungle_after_surface_vines_feature, minecraft:overworld_amethyst_geode_feature, minecraft:swamp_surface_flowers_feature, minecraft:scatter_red_shrub_bush_feature_rules, minecraft:savanna_surface_tall_grass_feature, minecraft:overworld_surface_extra_brown_mushroom_feature, minecraft:bamboo_jungle_surface_tall_grass_feature, minecraft:birch_forest_before_surface_wildflowers_feature_rules, minecraft:grove_spruce_tree_feature, minecraft:savanna_surface_flowers_feature, minecraft:crimson_roots_warped_feature, minecraft:sulfur_caves_before_surface_sulfur_spring_trail_to_surface_feature_rules, minecraft:bamboo_jungle_before_surface_bamboo_feature_rules, minecraft:sulfur_caves_surface_sulfur_pool_with_potent_sulfur_feature_rules, minecraft:cherry_biome_surface_double_plant_feature_rules, minecraft:cherry_biome_surface_tall_grass_feature_rules, minecraft:cherry_grove_cherry_tree_feature_rules, minecraft:overworld_surface_extra_red_mushroom_feature, minecraft:cherry_grove_surface_pink_petals_feature_rules, minecraft:lush_caves_underground_clay_ore_feature, minecraft:meadow_flowers_feature, minecraft:jungle_surface_flowers_feature, minecraft:overworld_underground_emerald_ore_feature, minecraft:meadow_surface_tall_grass_feature, minecraft:jungle_surface_tall_grass_feature, minecraft:warped_fungus_crimson_feature, minecraft:mesa_before_surface_gold_ore_feature, minecraft:pale_garden_pale_oak_tree_feature_rules, minecraft:overworld_underground_gold_ore_lower_feature, minecraft:pale_garden_surface_double_plant_feature_rules, minecraft:meadow_before_surface_wildflowers_feature_rules, minecraft:minecraft:savanna_mutated_surface_tall_grass_feature, minecraft:mangrove_swamp_surface_tall_grass_feature, minecraft:mangrove_swamp_tall_mangrove_tree_feature, minecraft:meadow_surface_double_plant_feature_rules, minecraft:mega_taiga_surface_tall_grass_feature, minecraft:overworld_underground_diamond_ore_large_feature, minecraft:overworld_surface_tall_grass_feature, minecraft:pale_garden_surface_tall_grass_feature_rules, minecraft:plains_surface_flowers_feature, minecraft:swamp_surface_tall_grass_feature, minecraft:swamp_surface_waterlily_feature, minecraft:taiga_surface_tall_grass_feature, minecraft:eyeblossom_feature_rules, minecraft:mangrove_swamp_mangrove_tree_with_beenest_feature, minecraft:mangrove_swamp_tall_mangrove_tree_with_beenest_feature, minecraft:grove_pine_tree_feature, minecraft:overworld_underground_lapis_ore_buried_feature, minecraft:crimson_roots_soul_sand_valley_feature, minecraft:nether_sprouts_feature_rules, minecraft:roofed_forest_surface_roofed_tree_feature_rules, minecraft:overworld_underground_iron_ore_small_feature, minecraft:mesa_underground_gold_ore_feature, minecraft:overworld_underground_diamond_ore_feature_square, minecraft:overworld_underground_coal_ore_upper_feature, minecraft:overworld_underground_andesite_feature, minecraft:dripstone_caves_underground_copper_ore_feature, minecraft:overworld_underground_iron_ore_upper_feature, minecraft:mountains_underground_coal_ore_feature, minecraft:overworld_underground_gold_ore_feature, minecraft:overworld_underground_diamond_ore_buried_feature, minecraft:overworld_underground_andesite_lower_feature, minecraft:overworld_underground_coal_ore_feature, minecraft:overworld_underground_copper_ore_feature, minecraft:overworld_underground_diamond_ore_feature, minecraft:overworld_underground_iron_ore_middle_feature, minecraft:overworld_underground_diorite_lower_feature, minecraft:overworld_underground_diorite_upper_feature, minecraft:overworld_underground_redstone_ore_lower_feature, minecraft:overworld_underground_dirt_feature, minecraft:overworld_underground_extra_gravel_ore_feature, minecraft:overworld_underground_granite_feature, minecraft:overworld_underground_granite_lower_feature, minecraft:overworld_underground_granite_upper_feature, minecraft:overworld_underground_iron_ore_feature, minecraft:overworld_underground_lapis_ore_feature, minecraft:overworld_underground_redstone_ore_feature, minecraft:overworld_underground_tuff_feature, minecraft:nether_soul_sand_underground_feature_rules, minecraft:overworld_underground_glow_lichen_feature, minecraft:overworld_underground_deepslate_feature, minecraft:overworld_extra_cave_carver_feature, minecraft:overworld_cave_carver_feature, minecraft:overworld_underwater_cave_carver_feature

### hudelement (used by /hud)
hunger, all, paperdoll, armor, tooltips, touch_controls, crosshair, hotbar, health, progress_bar, air_bubbles, horse_health, status_effects, item_text

### jigsawstructure (used by /place)
minecraft:abandoned_camp_bamboo_jungle, minecraft:abandoned_camp_birch_forest, minecraft:abandoned_camp_birch_forest_mutated, minecraft:abandoned_camp_cherry_grove, minecraft:abandoned_camp_cold_taiga, minecraft:abandoned_camp_dappled_forest, minecraft:abandoned_camp_extreme_hills_plus_trees, minecraft:abandoned_camp_flower_forest, minecraft:abandoned_camp_forest, minecraft:abandoned_camp_jungle_edge, minecraft:abandoned_camp_meadow, minecraft:abandoned_camp_mega_taiga, minecraft:abandoned_camp_mesa_plateau_stone, minecraft:abandoned_camp_pale_garden, minecraft:abandoned_camp_redwood_taiga_mutated, minecraft:abandoned_camp_savanna, minecraft:abandoned_camp_swampland, minecraft:abandoned_camp_taiga, minecraft:trail_ruins, minecraft:trial_chambers

### structurefeature (used by /locate)
minecraft:end_city, minecraft:fortress, minecraft:mineshaft, minecraft:monument, minecraft:stronghold, minecraft:temple, minecraft:village, minecraft:mansion, minecraft:shipwreck, minecraft:buried_treasure, minecraft:ruins, minecraft:pillager_outpost, minecraft:ruined_portal, minecraft:bastion_remnant, minecraft:ancient_city, minecraft:trail_ruins, minecraft:trial_chambers, minecraft:abandoned_camp_birch_forest, minecraft:abandoned_camp_bamboo_jungle, minecraft:abandoned_camp_cherry_grove, minecraft:abandoned_camp_dappled_forest, minecraft:abandoned_camp_extreme_hills_plus_trees, minecraft:abandoned_camp_flower_forest, minecraft:abandoned_camp_pale_garden, minecraft:abandoned_camp_swampland, minecraft:abandoned_camp_birch_forest_mutated, minecraft:abandoned_camp_cold_taiga, minecraft:abandoned_camp_forest, minecraft:abandoned_camp_jungle_edge, minecraft:abandoned_camp_meadow, minecraft:abandoned_camp_mega_taiga, minecraft:abandoned_camp_mesa_plateau_stone, minecraft:abandoned_camp_redwood_taiga_mutated, minecraft:abandoned_camp_savanna, minecraft:abandoned_camp_taiga

