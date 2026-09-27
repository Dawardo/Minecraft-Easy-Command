# Bedrock block IDs and block states (Minecraft 1.26.50.4)

Generated from Mojang's vanilla metadata by tools/gen_minecraft_data.py. One block per line:
`id` - English name - states (`name=values`). In commands write states like
`/setblock ~ ~ ~ oak_stairs ["weirdo_direction"=2,"upside_down_bit"=false]` (strings quoted, numbers/booleans bare).
Unlisted states keep their default (first value). grep this file instead of reading it whole.

acacia_button - Acacia Button - button_pressed_bit=true|false; facing_direction=0..5
acacia_door - Acacia Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
acacia_double_slab - Acacia Double Slab - minecraft:vertical_half="bottom"|"top"
acacia_fence - Acacia Fence - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
acacia_fence_gate - Acacia Fence Gate - in_wall_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false
acacia_hanging_sign - Acacia Hanging Sign - attached_bit=true|false; facing_direction=0..5; ground_sign_direction=0..15; hanging=true|false
acacia_leaves - Acacia Leaves - persistent_bit=true|false; update_bit=true|false
acacia_log - Acacia Log - pillar_axis="y"|"x"|"z"
acacia_planks - Acacia Planks
acacia_pressure_plate - Acacia Pressure Plate - redstone_signal=0..15
acacia_sapling - Acacia Sapling - age_bit=true|false
acacia_shelf - Acacia Shelf - minecraft:cardinal_direction="south"|"west"|"north"|"east"; powered_bit=true|false; powered_shelf_type=0..3
acacia_slab - Acacia Slab - minecraft:vertical_half="bottom"|"top"
acacia_stairs - Acacia Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
acacia_standing_sign - Acacia Sign - ground_sign_direction=0..15
acacia_trapdoor - Acacia Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
acacia_wall_sign - Acacia Wall Sign - facing_direction=0..5
acacia_wood - Acacia Wood - pillar_axis="y"|"x"|"z"
activator_rail - Activator Rail - rail_data_bit=true|false; rail_direction=0..9
air - Air
allium - Allium
allow - Allow
amethyst_block - Block of Amethyst
amethyst_cluster - Amethyst Cluster - minecraft:block_face="down"|"up"|"north"|"south"|"west"|"east"
ancient_debris - Ancient Debris
andesite - Andesite
andesite_double_slab - Andesite Double Slab - minecraft:vertical_half="bottom"|"top"
andesite_slab - Andesite Slab - minecraft:vertical_half="bottom"|"top"
andesite_stairs - Andesite Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
andesite_wall - Andesite Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
anvil - Anvil - minecraft:cardinal_direction="south"|"west"|"north"|"east"
azalea - Azalea
azalea_leaves - Azalea Leaves - persistent_bit=true|false; update_bit=true|false
azalea_leaves_flowered - Flowering Azalea Leaves - persistent_bit=true|false; update_bit=true|false
azure_bluet - Azure Bluet
bamboo - Bamboo - age_bit=true|false; bamboo_leaf_size="no_leaves"|"small_leaves"|"large_leaves"; bamboo_stalk_thickness="thin"|"thick"
bamboo_block - Block of Bamboo - pillar_axis="y"|"x"|"z"
bamboo_button - Bamboo Button - button_pressed_bit=true|false; facing_direction=0..5
bamboo_door - Bamboo Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
bamboo_double_slab - Bamboo Double Slab - minecraft:vertical_half="bottom"|"top"
bamboo_fence - Bamboo Fence - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
bamboo_fence_gate - Bamboo Fence Gate - in_wall_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false
bamboo_hanging_sign - Bamboo Hanging Sign - attached_bit=true|false; facing_direction=0..5; ground_sign_direction=0..15; hanging=true|false
bamboo_mosaic - Bamboo Mosaic
bamboo_mosaic_double_slab - Bamboo Mosaic Double Slab - minecraft:vertical_half="bottom"|"top"
bamboo_mosaic_slab - Bamboo Mosaic Slab - minecraft:vertical_half="bottom"|"top"
bamboo_mosaic_stairs - Bamboo Mosaic Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
bamboo_planks - Bamboo Planks
bamboo_pressure_plate - Bamboo Pressure Plate - redstone_signal=0..15
bamboo_sapling - Bamboo Sapling - age_bit=true|false
bamboo_shelf - Bamboo Shelf - minecraft:cardinal_direction="south"|"west"|"north"|"east"; powered_bit=true|false; powered_shelf_type=0..3
bamboo_slab - Bamboo Slab - minecraft:vertical_half="bottom"|"top"
bamboo_stairs - Bamboo Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
bamboo_standing_sign - Bamboo Sign - ground_sign_direction=0..15
bamboo_trapdoor - Bamboo Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
bamboo_wall_sign - Bamboo Wall Sign - facing_direction=0..5
barrel - Barrel - facing_direction=0..5; open_bit=true|false
barrier - Barrier
basalt - Basalt - pillar_axis="y"|"x"|"z"
beacon - Beacon
bed - Bed - direction=0..3; head_piece_bit=true|false; occupied_bit=true|false
bedrock - Bedrock - infiniburn_bit=true|false
bee_nest - Bee Nest - direction=0..3; honey_level=0..5
beehive - Beehive - direction=0..3; honey_level=0..5
beetroot - Beetroot - growth=0..7
bell - Bell - attachment="standing"|"hanging"|"side"|"multiple"; direction=0..3; toggle_bit=true|false
big_dripleaf - Big Dripleaf - big_dripleaf_head=true|false; big_dripleaf_tilt="none"|"unstable"|"partial_tilt"|"full_tilt"; minecraft:cardinal_direction="south"|"west"|"north"|"east"
birch_button - Birch Button - button_pressed_bit=true|false; facing_direction=0..5
birch_door - Birch Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
birch_double_slab - Birch Double Slab - minecraft:vertical_half="bottom"|"top"
birch_fence - Birch Fence - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
birch_fence_gate - Birch Fence Gate - in_wall_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false
birch_hanging_sign - Birch Hanging Sign - attached_bit=true|false; facing_direction=0..5; ground_sign_direction=0..15; hanging=true|false
birch_leaves - Birch Leaves - persistent_bit=true|false; update_bit=true|false
birch_log - Birch Log - pillar_axis="y"|"x"|"z"
birch_planks - Birch Planks
birch_pressure_plate - Birch Pressure Plate - redstone_signal=0..15
birch_sapling - Birch Sapling - age_bit=true|false
birch_shelf - Birch Shelf - minecraft:cardinal_direction="south"|"west"|"north"|"east"; powered_bit=true|false; powered_shelf_type=0..3
birch_slab - Birch Slab - minecraft:vertical_half="bottom"|"top"
birch_stairs - Birch Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
birch_standing_sign - Birch Sign - ground_sign_direction=0..15
birch_trapdoor - Birch Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
birch_wall_sign - Birch Wall Sign - facing_direction=0..5
birch_wood - Birch Wood - pillar_axis="y"|"x"|"z"
black_candle - Black Candle - candles=0..3; lit=true|false
black_candle_cake - Cake with Black Candle - lit=true|false
black_carpet - Black Carpet
black_concrete - Black Concrete
black_concrete_double_slab - Black Concrete Double Slab - minecraft:vertical_half="bottom"|"top"
black_concrete_powder - Black Concrete Powder
black_concrete_slab - Black Concrete Slab - minecraft:vertical_half="bottom"|"top"
black_concrete_stairs - Black Concrete Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
black_glazed_terracotta - Black Glazed Terracotta - facing_direction=0..5
black_shulker_box - Black Shulker Box
black_stained_glass - Black Stained Glass
black_stained_glass_pane - Black Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
black_terracotta - Black Terracotta
black_wool - Black Wool
black_wool_double_slab - Black Wool Double Slab - minecraft:vertical_half="bottom"|"top"
black_wool_slab - Black Wool Slab - minecraft:vertical_half="bottom"|"top"
black_wool_stairs - Black Wool Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
blackstone - Blackstone
blackstone_double_slab - Blackstone Double Slab - minecraft:vertical_half="bottom"|"top"
blackstone_slab - Blackstone Slab - minecraft:vertical_half="bottom"|"top"
blackstone_stairs - Blackstone Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
blackstone_wall - Blackstone Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
blast_furnace - Blast Furnace - minecraft:cardinal_direction="south"|"west"|"north"|"east"
blue_candle - Blue Candle - candles=0..3; lit=true|false
blue_candle_cake - Cake with Blue Candle - lit=true|false
blue_carpet - Blue Carpet
blue_concrete - Blue Concrete
blue_concrete_double_slab - Blue Concrete Double Slab - minecraft:vertical_half="bottom"|"top"
blue_concrete_powder - Blue Concrete Powder
blue_concrete_slab - Blue Concrete Slab - minecraft:vertical_half="bottom"|"top"
blue_concrete_stairs - Blue Concrete Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
blue_glazed_terracotta - Blue Glazed Terracotta - facing_direction=0..5
blue_ice - Blue Ice
blue_orchid - Blue Orchid
blue_shulker_box - Blue Shulker Box
blue_stained_glass - Blue Stained Glass
blue_stained_glass_pane - Blue Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
blue_terracotta - Blue Terracotta
blue_wool - Blue Wool
blue_wool_double_slab - Blue Wool Double Slab - minecraft:vertical_half="bottom"|"top"
blue_wool_slab - Blue Wool Slab - minecraft:vertical_half="bottom"|"top"
blue_wool_stairs - Blue Wool Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
bone_block - Bone Block - deprecated=0..3; pillar_axis="y"|"x"|"z"
bookshelf - Bookshelf
border_block - Border - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
brain_coral - Brain Coral
brain_coral_block - Brain Coral Block
brain_coral_fan - Brain Coral Fan - coral_fan_direction=0|1
brain_coral_wall_fan - Brain Coral Wall Fan - coral_direction=0..3
brewing_stand - Brewing Stand - brewing_stand_slot_a_bit=true|false; brewing_stand_slot_b_bit=true|false; brewing_stand_slot_c_bit=true|false
brick_block - Bricks
brick_double_slab - Brick Slab - minecraft:vertical_half="bottom"|"top"
brick_slab - Brick Slab - minecraft:vertical_half="bottom"|"top"
brick_stairs - Brick Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
brick_wall - Brick Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
brown_candle - Brown Candle - candles=0..3; lit=true|false
brown_candle_cake - Cake with Brown Candle - lit=true|false
brown_carpet - Brown Carpet
brown_concrete - Brown Concrete
brown_concrete_double_slab - Brown Concrete Double Slab - minecraft:vertical_half="bottom"|"top"
brown_concrete_powder - Brown Concrete Powder
brown_concrete_slab - Brown Concrete Slab - minecraft:vertical_half="bottom"|"top"
brown_concrete_stairs - Brown Concrete Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
brown_glazed_terracotta - Brown Glazed Terracotta - facing_direction=0..5
brown_mushroom - Brown Mushroom
brown_mushroom_block - Brown Mushroom Block - huge_mushroom_bits=0..15
brown_shulker_box - Brown Shulker Box
brown_stained_glass - Brown Stained Glass
brown_stained_glass_pane - Brown Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
brown_terracotta - Brown Terracotta
brown_wool - Brown Wool
brown_wool_double_slab - Brown Wool Double Slab - minecraft:vertical_half="bottom"|"top"
brown_wool_slab - Brown Wool Slab - minecraft:vertical_half="bottom"|"top"
brown_wool_stairs - Brown Wool Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
bubble_column - Bubble Column - drag_down=true|false
bubble_coral - Bubble Coral
bubble_coral_block - Bubble Coral Block
bubble_coral_fan - Bubble Coral Fan - coral_fan_direction=0|1
bubble_coral_wall_fan - Bubble Coral Wall Fan - coral_direction=0..3
budding_amethyst - Budding Amethyst
bush - Bush
cactus - Cactus - age=0..15
cactus_flower - Cactus Flower
cake - Cake - bite_counter=0..6
calcite - Calcite
calibrated_sculk_sensor - Calibrated Sculk Sensor - minecraft:cardinal_direction="south"|"west"|"north"|"east"; sculk_sensor_phase=0|1|2
camera - Camera
campfire - Campfire - extinguished=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"
candle - Candle - candles=0..3; lit=true|false
candle_cake - Cake with Candle - lit=true|false
carrots - Carrots - growth=0..7
cartography_table - Cartography Table
carved_pumpkin - Carved Pumpkin - minecraft:cardinal_direction="south"|"west"|"north"|"east"
cauldron - Cauldron - cauldron_liquid="water"|"lava"|"powder_snow"; fill_level=0..6
cave_vines - Cave Vines - growing_plant_age=0..25
cave_vines_body_with_berries - Cave Vines - growing_plant_age=0..25
cave_vines_head_with_berries - Cave Vines - growing_plant_age=0..25
chain_command_block - Chain Command Block - conditional_bit=true|false; facing_direction=0..5
chemical_heat - Chemical Heat
cherry_button - Cherry Button - button_pressed_bit=true|false; facing_direction=0..5
cherry_door - Cherry Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
cherry_double_slab - Cherry Double Slab - minecraft:vertical_half="bottom"|"top"
cherry_fence - Cherry Fence - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
cherry_fence_gate - Cherry Fence Gate - in_wall_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false
cherry_hanging_sign - Cherry Hanging Sign - attached_bit=true|false; facing_direction=0..5; ground_sign_direction=0..15; hanging=true|false
cherry_leaves - Cherry Leaves - persistent_bit=true|false; update_bit=true|false
cherry_log - Cherry Log - pillar_axis="y"|"x"|"z"
cherry_planks - Cherry Planks
cherry_pressure_plate - Cherry Pressure Plate - redstone_signal=0..15
cherry_sapling - Cherry Sapling - age_bit=true|false
cherry_shelf - Cherry Shelf - minecraft:cardinal_direction="south"|"west"|"north"|"east"; powered_bit=true|false; powered_shelf_type=0..3
cherry_slab - Cherry Slab - minecraft:vertical_half="bottom"|"top"
cherry_stairs - Cherry Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
cherry_standing_sign - Cherry Sign - ground_sign_direction=0..15
cherry_trapdoor - Cherry Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
cherry_wall_sign - Cherry Wall Sign - facing_direction=0..5
cherry_wood - Cherry Wood - pillar_axis="y"|"x"|"z"
chest - Chest - minecraft:cardinal_direction="south"|"west"|"north"|"east"
chipped_anvil - Chipped Anvil - minecraft:cardinal_direction="south"|"west"|"north"|"east"
chiseled_bookshelf - Chiseled Bookshelf - books_stored=0..63; direction=0..3
chiseled_cinnabar - Chiseled Cinnabar
chiseled_copper - Chiseled Copper
chiseled_deepslate - Chiseled Deepslate
chiseled_nether_bricks - Chiseled Nether Bricks
chiseled_polished_blackstone - Chiseled Polished Blackstone
chiseled_quartz_block - Chiseled Quartz Block - pillar_axis="y"|"x"|"z"
chiseled_red_sandstone - Chiseled Red Sandstone
chiseled_resin_bricks - Chiseled Resin Bricks
chiseled_sandstone - Chiseled Sandstone
chiseled_stone_bricks - Chiseled Stone Bricks
chiseled_sulfur - Chiseled Sulfur
chiseled_tuff - Chiseled Tuff
chiseled_tuff_bricks - Chiseled Tuff Bricks
chorus_flower - Chorus Flower - age=0..15
chorus_plant - Chorus Plant
cinnabar - Cinnabar
cinnabar_brick_double_slab - Cinnabar Brick Double Slab - minecraft:vertical_half="bottom"|"top"
cinnabar_brick_slab - Cinnabar Brick Slab - minecraft:vertical_half="bottom"|"top"
cinnabar_brick_stairs - Cinnabar Brick Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
cinnabar_brick_wall - Cinnabar Brick Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
cinnabar_bricks - Cinnabar Bricks
cinnabar_double_slab - Cinnabar Double Slab - minecraft:vertical_half="bottom"|"top"
cinnabar_slab - Cinnabar Slab - minecraft:vertical_half="bottom"|"top"
cinnabar_stairs - Cinnabar Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
cinnabar_wall - Cinnabar Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
clay - Clay
closed_eyeblossom - Closed Eyeblossom
coal_block - Block of Coal
coal_ore - Coal Ore
coarse_dirt - Coarse Dirt
cobbled_deepslate - Cobbled Deepslate
cobbled_deepslate_double_slab - Cobbled Deepslate Double Slab - minecraft:vertical_half="bottom"|"top"
cobbled_deepslate_slab - Cobbled Deepslate Slab - minecraft:vertical_half="bottom"|"top"
cobbled_deepslate_stairs - Cobbled Deepslate Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
cobbled_deepslate_wall - Cobbled Deepslate Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
cobblestone - Cobblestone
cobblestone_double_slab - Cobblestone Slab - minecraft:vertical_half="bottom"|"top"
cobblestone_slab - Cobblestone Slab - minecraft:vertical_half="bottom"|"top"
cobblestone_wall - Cobblestone Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
cocoa - Cocoa - age=0..15; direction=0..3
colored_torch_blue - Colored Torch Blue - torch_facing_direction="unknown"|"west"|"east"|"north"|"south"|"top"
colored_torch_green - Colored Torch Green - torch_facing_direction="unknown"|"west"|"east"|"north"|"south"|"top"
colored_torch_purple - Colored Torch Purple - torch_facing_direction="unknown"|"west"|"east"|"north"|"south"|"top"
colored_torch_red - Colored Torch Red - torch_facing_direction="unknown"|"west"|"east"|"north"|"south"|"top"
command_block - Command Block - conditional_bit=true|false; facing_direction=0..5
composter - Composter - composter_fill_level=0..8
compound_creator - Compound Creator - direction=0..3
conduit - Conduit
copper_bars - Copper Bars - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
copper_block - Block of Copper
copper_bulb - Copper Bulb - lit=true|false; powered_bit=true|false
copper_chain - Copper Chain - pillar_axis="y"|"x"|"z"
copper_chest - Copper Chest - minecraft:cardinal_direction="south"|"west"|"north"|"east"
copper_door - Copper Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
copper_golem_statue - Copper Golem Statue - minecraft:cardinal_direction="south"|"west"|"north"|"east"
copper_grate - Copper Grate
copper_lantern - Copper Lantern - hanging=true|false
copper_ore - Copper Ore
copper_torch - Copper Torch - torch_facing_direction="unknown"|"west"|"east"|"north"|"south"|"top"
copper_trapdoor - Copper Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
cornflower - Cornflower
cracked_deepslate_bricks - Cracked Deepslate Bricks
cracked_deepslate_tiles - Cracked Deepslate Tiles
cracked_nether_bricks - Cracked Nether Bricks
cracked_polished_blackstone_bricks - Cracked Polished Blackstone Bricks
cracked_stone_bricks - Cracked Stone Bricks
crafter - Crafter - crafting=true|false; orientation="down_east"|"down_north"|"down_south"|"down_west"|"up_east"|"up_north"|"up_south"|"up_west"|"west_up"|"east_up"|"north_up"|"south_up"; triggered_bit=true|false
crafting_table - Crafting Table
creaking_heart - Creaking Heart - creaking_heart_state="uprooted"|"dormant"|"awake"; natural=true|false; pillar_axis="y"|"x"|"z"
creeper_head - Creeper Head - facing_direction=0..5
crimson_button - Crimson Button - button_pressed_bit=true|false; facing_direction=0..5
crimson_door - Crimson Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
crimson_double_slab - Crimson Slab - minecraft:vertical_half="bottom"|"top"
crimson_fence - Crimson Fence - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
crimson_fence_gate - Crimson Fence Gate - in_wall_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false
crimson_fungus - Crimson Fungus
crimson_hanging_sign - Crimson Hanging Sign - attached_bit=true|false; facing_direction=0..5; ground_sign_direction=0..15; hanging=true|false
crimson_hyphae - Crimson Hyphae - pillar_axis="y"|"x"|"z"
crimson_nylium - Crimson Nylium
crimson_planks - Crimson Planks
crimson_pressure_plate - Crimson Pressure Plate - redstone_signal=0..15
crimson_roots - Crimson Roots
crimson_shelf - Crimson Shelf - minecraft:cardinal_direction="south"|"west"|"north"|"east"; powered_bit=true|false; powered_shelf_type=0..3
crimson_slab - Crimson Slab - minecraft:vertical_half="bottom"|"top"
crimson_stairs - Crimson Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
crimson_standing_sign - Crimson Sign - ground_sign_direction=0..15
crimson_stem - Crimson Stem - pillar_axis="y"|"x"|"z"
crimson_trapdoor - Crimson Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
crimson_wall_sign - Crimson Sign - facing_direction=0..5
crying_obsidian - Crying Obsidian
cut_copper - Cut Copper
cut_copper_slab - Cut Copper Slab - minecraft:vertical_half="bottom"|"top"
cut_copper_stairs - Cut Copper Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
cut_red_sandstone - Cut Red Sandstone
cut_red_sandstone_double_slab - Cut Red Sandstone Double Slab - minecraft:vertical_half="bottom"|"top"
cut_red_sandstone_slab - Cut Red Sandstone Slab - minecraft:vertical_half="bottom"|"top"
cut_sandstone - Cut Sandstone
cut_sandstone_double_slab - Cut Sandstone Double Slab - minecraft:vertical_half="bottom"|"top"
cut_sandstone_slab - Cut Sandstone Slab - minecraft:vertical_half="bottom"|"top"
cyan_candle - Cyan Candle - candles=0..3; lit=true|false
cyan_candle_cake - Cake with Cyan Candle - lit=true|false
cyan_carpet - Cyan Carpet
cyan_concrete - Cyan Concrete
cyan_concrete_double_slab - Cyan Concrete Double Slab - minecraft:vertical_half="bottom"|"top"
cyan_concrete_powder - Cyan Concrete Powder
cyan_concrete_slab - Cyan Concrete Slab - minecraft:vertical_half="bottom"|"top"
cyan_concrete_stairs - Cyan Concrete Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
cyan_glazed_terracotta - Cyan Glazed Terracotta - facing_direction=0..5
cyan_shulker_box - Cyan Shulker Box
cyan_stained_glass - Cyan Stained Glass
cyan_stained_glass_pane - Cyan Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
cyan_terracotta - Cyan Terracotta
cyan_wool - Cyan Wool
cyan_wool_double_slab - Cyan Wool Double Slab - minecraft:vertical_half="bottom"|"top"
cyan_wool_slab - Cyan Wool Slab - minecraft:vertical_half="bottom"|"top"
cyan_wool_stairs - Cyan Wool Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
damaged_anvil - Damaged Anvil - minecraft:cardinal_direction="south"|"west"|"north"|"east"
dandelion - Dandelion
dark_oak_button - Dark Oak Button - button_pressed_bit=true|false; facing_direction=0..5
dark_oak_door - Dark Oak Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
dark_oak_double_slab - Dark Oak Double Slab - minecraft:vertical_half="bottom"|"top"
dark_oak_fence - Dark Oak Fence - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
dark_oak_fence_gate - Dark Oak Fence Gate - in_wall_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false
dark_oak_hanging_sign - Dark Oak Hanging Sign - attached_bit=true|false; facing_direction=0..5; ground_sign_direction=0..15; hanging=true|false
dark_oak_leaves - Dark Oak Leaves - persistent_bit=true|false; update_bit=true|false
dark_oak_log - Dark Oak Log - pillar_axis="y"|"x"|"z"
dark_oak_planks - Dark Oak Planks
dark_oak_pressure_plate - Dark Oak Pressure Plate - redstone_signal=0..15
dark_oak_sapling - Dark Oak Sapling - age_bit=true|false
dark_oak_shelf - Dark Oak Shelf - minecraft:cardinal_direction="south"|"west"|"north"|"east"; powered_bit=true|false; powered_shelf_type=0..3
dark_oak_slab - Dark Oak Slab - minecraft:vertical_half="bottom"|"top"
dark_oak_stairs - Dark Oak Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
dark_oak_trapdoor - Dark Oak Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
dark_oak_wood - Dark Oak Wood - pillar_axis="y"|"x"|"z"
dark_prismarine - Dark Prismarine
dark_prismarine_double_slab - Dark Prismarine Double Slab - minecraft:vertical_half="bottom"|"top"
dark_prismarine_slab - Dark Prismarine Slab - minecraft:vertical_half="bottom"|"top"
dark_prismarine_stairs - Dark Prismarine Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
darkoak_standing_sign - Dark Oak Sign - ground_sign_direction=0..15
darkoak_wall_sign - Dark Oak Wall Sign - facing_direction=0..5
daylight_detector - Daylight Detector - redstone_signal=0..15
daylight_detector_inverted - Daylight Detector Inverted - redstone_signal=0..15
dead_brain_coral - Dead Brain Coral
dead_brain_coral_block - Dead Brain Coral Block
dead_brain_coral_fan - Dead Brain Coral Fan - coral_fan_direction=0|1
dead_brain_coral_wall_fan - Dead Brain Coral Wall Fan - coral_direction=0..3
dead_bubble_coral - Dead Bubble Coral
dead_bubble_coral_block - Dead Bubble Coral Block
dead_bubble_coral_fan - Dead Bubble Coral Fan - coral_fan_direction=0|1
dead_bubble_coral_wall_fan - Dead Bubble Coral Wall Fan - coral_direction=0..3
dead_fire_coral - Dead Fire Coral
dead_fire_coral_block - Dead Fire Coral Block
dead_fire_coral_fan - Dead Fire Coral Fan - coral_fan_direction=0|1
dead_fire_coral_wall_fan - Dead Fire Coral Wall Fan - coral_direction=0..3
dead_horn_coral - Dead Horn Coral
dead_horn_coral_block - Dead Horn Coral Block
dead_horn_coral_fan - Dead Horn Coral Fan - coral_fan_direction=0|1
dead_horn_coral_wall_fan - Dead Horn Coral Wall Fan - coral_direction=0..3
dead_tube_coral - Dead Tube Coral
dead_tube_coral_block - Dead Tube Coral Block
dead_tube_coral_fan - Dead Tube Coral Fan - coral_fan_direction=0|1
dead_tube_coral_wall_fan - Dead Tube Coral Wall Fan - coral_direction=0..3
deadbush - Dead Bush
decorated_pot - Decorated Pot - direction=0..3
deepslate - Deepslate - pillar_axis="y"|"x"|"z"
deepslate_brick_double_slab - Deepslate Brick Double Slab - minecraft:vertical_half="bottom"|"top"
deepslate_brick_slab - Deepslate Brick Slab - minecraft:vertical_half="bottom"|"top"
deepslate_brick_stairs - Deepslate Brick Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
deepslate_brick_wall - Deepslate Brick Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
deepslate_bricks - Deepslate Bricks
deepslate_coal_ore - Deepslate Coal Ore
deepslate_copper_ore - Deepslate Copper Ore
deepslate_diamond_ore - Deepslate Diamond Ore
deepslate_emerald_ore - Deepslate Emerald Ore
deepslate_gold_ore - Deepslate Gold Ore
deepslate_iron_ore - Deepslate Iron Ore
deepslate_lapis_ore - Deepslate Lapis Lazuli Ore
deepslate_redstone_ore - Deepslate Redstone Ore
deepslate_tile_double_slab - Deepslate Tile Double Slab - minecraft:vertical_half="bottom"|"top"
deepslate_tile_slab - Deepslate Tile Slab - minecraft:vertical_half="bottom"|"top"
deepslate_tile_stairs - Deepslate Tile Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
deepslate_tile_wall - Deepslate Tile Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
deepslate_tiles - Deepslate Tiles
deny - Deny
detector_rail - Detector Rail - rail_data_bit=true|false; rail_direction=0..9
diamond_block - Block of Diamond
diamond_ore - Diamond Ore
diorite - Diorite
diorite_double_slab - Diorite Double Slab - minecraft:vertical_half="bottom"|"top"
diorite_slab - Diorite Slab - minecraft:vertical_half="bottom"|"top"
diorite_stairs - Diorite Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
diorite_wall - Diorite Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
dirt - Dirt
dirt_with_roots - Rooted Dirt
dispenser - Dispenser - facing_direction=0..5; triggered_bit=true|false
double_cut_copper_slab - Cut Copper Double Slab - minecraft:vertical_half="bottom"|"top"
dragon_egg - Dragon Egg
dragon_head - Dragon Head - facing_direction=0..5
dried_ghast - Dried Ghast - minecraft:cardinal_direction="south"|"west"|"north"|"east"; rehydration_level=0..3
dried_kelp_block - Dried Kelp Block
dripstone_block - Dripstone Block
dropper - Dropper - facing_direction=0..5; triggered_bit=true|false
element_0 - Element 0
element_1 - Element 1
element_10 - Element 10
element_100 - Element 100
element_101 - Element 101
element_102 - Element 102
element_103 - Element 103
element_104 - Element 104
element_105 - Element 105
element_106 - Element 106
element_107 - Element 107
element_108 - Element 108
element_109 - Element 109
element_11 - Element 11
element_110 - Element 110
element_111 - Element 111
element_112 - Element 112
element_113 - Element 113
element_114 - Element 114
element_115 - Element 115
element_116 - Element 116
element_117 - Element 117
element_118 - Element 118
element_12 - Element 12
element_13 - Element 13
element_14 - Element 14
element_15 - Element 15
element_16 - Element 16
element_17 - Element 17
element_18 - Element 18
element_19 - Element 19
element_2 - Element 2
element_20 - Element 20
element_21 - Element 21
element_22 - Element 22
element_23 - Element 23
element_24 - Element 24
element_25 - Element 25
element_26 - Element 26
element_27 - Element 27
element_28 - Element 28
element_29 - Element 29
element_3 - Element 3
element_30 - Element 30
element_31 - Element 31
element_32 - Element 32
element_33 - Element 33
element_34 - Element 34
element_35 - Element 35
element_36 - Element 36
element_37 - Element 37
element_38 - Element 38
element_39 - Element 39
element_4 - Element 4
element_40 - Element 40
element_41 - Element 41
element_42 - Element 42
element_43 - Element 43
element_44 - Element 44
element_45 - Element 45
element_46 - Element 46
element_47 - Element 47
element_48 - Element 48
element_49 - Element 49
element_5 - Element 5
element_50 - Element 50
element_51 - Element 51
element_52 - Element 52
element_53 - Element 53
element_54 - Element 54
element_55 - Element 55
element_56 - Element 56
element_57 - Element 57
element_58 - Element 58
element_59 - Element 59
element_6 - Element 6
element_60 - Element 60
element_61 - Element 61
element_62 - Element 62
element_63 - Element 63
element_64 - Element 64
element_65 - Element 65
element_66 - Element 66
element_67 - Element 67
element_68 - Element 68
element_69 - Element 69
element_7 - Element 7
element_70 - Element 70
element_71 - Element 71
element_72 - Element 72
element_73 - Element 73
element_74 - Element 74
element_75 - Element 75
element_76 - Element 76
element_77 - Element 77
element_78 - Element 78
element_79 - Element 79
element_8 - Element 8
element_80 - Element 80
element_81 - Element 81
element_82 - Element 82
element_83 - Element 83
element_84 - Element 84
element_85 - Element 85
element_86 - Element 86
element_87 - Element 87
element_88 - Element 88
element_89 - Element 89
element_9 - Element 9
element_90 - Element 90
element_91 - Element 91
element_92 - Element 92
element_93 - Element 93
element_94 - Element 94
element_95 - Element 95
element_96 - Element 96
element_97 - Element 97
element_98 - Element 98
element_99 - Element 99
element_constructor - Element Constructor - direction=0..3
emerald_block - Block of Emerald
emerald_ore - Emerald Ore
enchanting_table - Enchanting Table
end_brick_stairs - End Stone Brick Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
end_bricks - End Stone Bricks
end_portal - End Portal
end_portal_frame - End Portal Frame - end_portal_eye_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"
end_rod - End Rod - facing_direction=0..5
end_stone - End Stone
end_stone_brick_double_slab - End Stone Brick Double Slab - minecraft:vertical_half="bottom"|"top"
end_stone_brick_slab - End Stone Brick Slab - minecraft:vertical_half="bottom"|"top"
end_stone_brick_wall - End Stone Brick Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
ender_chest - Ender Chest - minecraft:cardinal_direction="south"|"west"|"north"|"east"
exposed_chiseled_copper - Exposed Chiseled Copper
exposed_copper - Exposed Copper
exposed_copper_bars - Exposed Copper Bars - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
exposed_copper_bulb - Exposed Copper Bulb - lit=true|false; powered_bit=true|false
exposed_copper_chain - Exposed Copper Chain - pillar_axis="y"|"x"|"z"
exposed_copper_chest - Exposed Copper Chest - minecraft:cardinal_direction="south"|"west"|"north"|"east"
exposed_copper_door - Exposed Copper Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
exposed_copper_golem_statue - Exposed Copper Golem Statue - minecraft:cardinal_direction="south"|"west"|"north"|"east"
exposed_copper_grate - Exposed Copper Grate
exposed_copper_lantern - Exposed Copper Lantern - hanging=true|false
exposed_copper_trapdoor - Exposed Copper Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
exposed_cut_copper - Exposed Cut Copper
exposed_cut_copper_slab - Exposed Cut Copper Slab - minecraft:vertical_half="bottom"|"top"
exposed_cut_copper_stairs - Exposed Cut Copper Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
exposed_double_cut_copper_slab - Exposed Cut Copper Double Slab - minecraft:vertical_half="bottom"|"top"
exposed_lightning_rod - Exposed Lightning Rod - facing_direction=0..5; powered_bit=true|false
farmland - Farmland - moisturized_amount=0..7
fence_gate - Oak Fence Gate - in_wall_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false
fern - Fern
fire - Fire - age=0..15
fire_coral - Fire Coral
fire_coral_block - Fire Coral Block
fire_coral_fan - Fire Coral Fan - coral_fan_direction=0|1
fire_coral_wall_fan - Fire Coral Wall Fan - coral_direction=0..3
firefly_bush - Firefly Bush
fletching_table - Fletching Table
flower_pot - Flower Pot - update_bit=true|false
flowering_azalea - Flowering Azalea
flowing_lava - Lava - liquid_depth=0..15
flowing_water - Water - liquid_depth=0..15
frame - Item Frame - facing_direction=0..5; item_frame_map_bit=true|false; item_frame_photo_bit=true|false
frog_spawn - Frogspawn
frosted_ice - Frosted Ice - age=0..15
furnace - Furnace - minecraft:cardinal_direction="south"|"west"|"north"|"east"
gilded_blackstone - Gilded Blackstone
glass - Glass
glass_pane - Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
glow_frame - Glow Frame - facing_direction=0..5; item_frame_map_bit=true|false; item_frame_photo_bit=true|false
glow_lichen - Glow Lichen - multi_face_direction_bits=0..63
glowstone - Glowstone
gold_block - Block of Gold
gold_ore - Gold Ore
golden_dandelion - Golden Dandelion
golden_rail - Powered Rail - rail_data_bit=true|false; rail_direction=0..9
granite - Granite
granite_double_slab - Granite Double Slab - minecraft:vertical_half="bottom"|"top"
granite_slab - Granite Slab - minecraft:vertical_half="bottom"|"top"
granite_stairs - Granite Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
granite_wall - Granite Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
grass_block - Grass Block
grass_path - Dirt Path
gravel - Gravel
gray_candle - Gray Candle - candles=0..3; lit=true|false
gray_candle_cake - Cake with Gray Candle - lit=true|false
gray_carpet - Gray Carpet
gray_concrete - Gray Concrete
gray_concrete_double_slab - Gray Concrete Double Slab - minecraft:vertical_half="bottom"|"top"
gray_concrete_powder - Gray Concrete Powder
gray_concrete_slab - Gray Concrete Slab - minecraft:vertical_half="bottom"|"top"
gray_concrete_stairs - Gray Concrete Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
gray_glazed_terracotta - Gray Glazed Terracotta - facing_direction=0..5
gray_shulker_box - Gray Shulker Box
gray_stained_glass - Gray Stained Glass
gray_stained_glass_pane - Gray Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
gray_terracotta - Gray Terracotta
gray_wool - Gray Wool
gray_wool_double_slab - Gray Wool Double Slab - minecraft:vertical_half="bottom"|"top"
gray_wool_slab - Gray Wool Slab - minecraft:vertical_half="bottom"|"top"
gray_wool_stairs - Gray Wool Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
green_candle - Green Candle - candles=0..3; lit=true|false
green_candle_cake - Cake with Green Candle - lit=true|false
green_carpet - Green Carpet
green_concrete - Green Concrete
green_concrete_double_slab - Green Concrete Double Slab - minecraft:vertical_half="bottom"|"top"
green_concrete_powder - Green Concrete Powder
green_concrete_slab - Green Concrete Slab - minecraft:vertical_half="bottom"|"top"
green_concrete_stairs - Green Concrete Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
green_glazed_terracotta - Green Glazed Terracotta - facing_direction=0..5
green_shulker_box - Green Shulker Box
green_stained_glass - Green Stained Glass
green_stained_glass_pane - Green Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
green_terracotta - Green Terracotta
green_wool - Green Wool
green_wool_double_slab - Green Wool Double Slab - minecraft:vertical_half="bottom"|"top"
green_wool_slab - Green Wool Slab - minecraft:vertical_half="bottom"|"top"
green_wool_stairs - Green Wool Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
grindstone - Grindstone - attachment="standing"|"hanging"|"side"|"multiple"; direction=0..3
hanging_roots - Hanging Roots
hard_black_stained_glass - Hard Black Stained Glass
hard_black_stained_glass_pane - Hard Black Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hard_blue_stained_glass - Hard Blue Stained Glass
hard_blue_stained_glass_pane - Hard Blue Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hard_brown_stained_glass - Hard Brown Stained Glass
hard_brown_stained_glass_pane - Hard Brown Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hard_cyan_stained_glass - Hard Cyan Stained Glass
hard_cyan_stained_glass_pane - Hard Cyan Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hard_glass - Hard Glass
hard_glass_pane - Hard Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hard_gray_stained_glass - Hard Gray Stained Glass
hard_gray_stained_glass_pane - Hard Gray Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hard_green_stained_glass - Hard Green Stained Glass
hard_green_stained_glass_pane - Hard Green Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hard_light_blue_stained_glass - Hard Light Blue Stained Glass
hard_light_blue_stained_glass_pane - Hard Light Blue Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hard_light_gray_stained_glass - Hard Light Gray Stained Glass
hard_light_gray_stained_glass_pane - Hard Light Gray Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hard_lime_stained_glass - Hard Lime Stained Glass
hard_lime_stained_glass_pane - Hard Lime Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hard_magenta_stained_glass - Hard Magenta Stained Glass
hard_magenta_stained_glass_pane - Hard Magenta Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hard_orange_stained_glass - Hard Orange Stained Glass
hard_orange_stained_glass_pane - Hard Orange Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hard_pink_stained_glass - Hard Pink Stained Glass
hard_pink_stained_glass_pane - Hard Pink Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hard_purple_stained_glass - Hard Purple Stained Glass
hard_purple_stained_glass_pane - Hard Purple Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hard_red_stained_glass - Hard Red Stained Glass
hard_red_stained_glass_pane - Hard Red Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hard_white_stained_glass - Hard White Stained Glass
hard_white_stained_glass_pane - Hard White Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hard_yellow_stained_glass - Hard Yellow Stained Glass
hard_yellow_stained_glass_pane - Hard Yellow Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
hardened_clay - Terracotta
hay_block - Hay Bale - deprecated=0..3; pillar_axis="y"|"x"|"z"
heavy_core - Heavy Core
heavy_weighted_pressure_plate - Heavy Weighted Pressure Plate - redstone_signal=0..15
honey_block - Honey Block
honeycomb_block - Honeycomb Block
hopper - Hopper - facing_direction=0..5; toggle_bit=true|false
horn_coral - Horn Coral
horn_coral_block - Horn Coral Block
horn_coral_fan - Horn Coral Fan - coral_fan_direction=0|1
horn_coral_wall_fan - Horn Coral Wall Fan - coral_direction=0..3
ice - Ice
infested_chiseled_stone_bricks - Infested Chiseled Stone Brick
infested_cobblestone - Infested Cobblestone
infested_cracked_stone_bricks - Infested Cracked Stone Brick
infested_deepslate - Infested Deepslate - pillar_axis="y"|"x"|"z"
infested_mossy_stone_bricks - Infested Mossy Stone Brick
infested_stone - Infested Stone
infested_stone_bricks - Infested Stone Bricks
iron_bars - Iron Bars - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
iron_block - Block of Iron
iron_chain - Iron Chain - pillar_axis="y"|"x"|"z"
iron_door - Iron Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
iron_ore - Iron Ore
iron_trapdoor - Iron Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
jigsaw - Jigsaw Block - facing_direction=0..5; rotation=0..3
jukebox - Jukebox
jungle_button - Jungle Button - button_pressed_bit=true|false; facing_direction=0..5
jungle_door - Jungle Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
jungle_double_slab - Jungle Double Slab - minecraft:vertical_half="bottom"|"top"
jungle_fence - Jungle Fence - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
jungle_fence_gate - Jungle Fence Gate - in_wall_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false
jungle_hanging_sign - Jungle Hanging Sign - attached_bit=true|false; facing_direction=0..5; ground_sign_direction=0..15; hanging=true|false
jungle_leaves - Jungle Leaves - persistent_bit=true|false; update_bit=true|false
jungle_log - Jungle Log - pillar_axis="y"|"x"|"z"
jungle_planks - Jungle Planks
jungle_pressure_plate - Jungle Pressure Plate - redstone_signal=0..15
jungle_sapling - Jungle Sapling - age_bit=true|false
jungle_shelf - Jungle Shelf - minecraft:cardinal_direction="south"|"west"|"north"|"east"; powered_bit=true|false; powered_shelf_type=0..3
jungle_slab - Jungle Slab - minecraft:vertical_half="bottom"|"top"
jungle_stairs - Jungle Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
jungle_standing_sign - Jungle Sign - ground_sign_direction=0..15
jungle_trapdoor - Jungle Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
jungle_wall_sign - Jungle Wall Sign - facing_direction=0..5
jungle_wood - Jungle Wood - pillar_axis="y"|"x"|"z"
kelp - Kelp - kelp_age=0..25
lab_table - Lab Table - direction=0..3
ladder - Ladder - facing_direction=0..5
lantern - Lantern - hanging=true|false
lapis_block - Block of Lapis Lazuli
lapis_ore - Lapis Lazuli Ore
large_amethyst_bud - Large Amethyst Bud - minecraft:block_face="down"|"up"|"north"|"south"|"west"|"east"
large_fern - Large Fern - upper_block_bit=true|false
lava - Lava - liquid_depth=0..15
leaf_litter - Leaf Litter - growth=0..7; minecraft:cardinal_direction="south"|"west"|"north"|"east"
lectern - Lectern - minecraft:cardinal_direction="south"|"west"|"north"|"east"; powered_bit=true|false
lever - Lever - lever_direction="down_east_west"|"east"|"west"|"south"|"north"|"up_north_south"|"up_east_west"|"down_north_south"; open_bit=true|false
light_block_0 - Light
light_block_1 - Light
light_block_10 - Light
light_block_11 - Light
light_block_12 - Light
light_block_13 - Light
light_block_14 - Light
light_block_15 - Light
light_block_2 - Light
light_block_3 - Light
light_block_4 - Light
light_block_5 - Light
light_block_6 - Light
light_block_7 - Light
light_block_8 - Light
light_block_9 - Light
light_blue_candle - Light Blue Candle - candles=0..3; lit=true|false
light_blue_candle_cake - Cake with Light Blue Candle - lit=true|false
light_blue_carpet - Light Blue Carpet
light_blue_concrete - Light Blue Concrete
light_blue_concrete_double_slab - Light Blue Concrete Double Slab - minecraft:vertical_half="bottom"|"top"
light_blue_concrete_powder - Light Blue Concrete Powder
light_blue_concrete_slab - Light Blue Concrete Slab - minecraft:vertical_half="bottom"|"top"
light_blue_concrete_stairs - Light Blue Concrete Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
light_blue_glazed_terracotta - Light Blue Glazed Terracotta - facing_direction=0..5
light_blue_shulker_box - Light Blue Shulker Box
light_blue_stained_glass - Light Blue Stained Glass
light_blue_stained_glass_pane - Light Blue Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
light_blue_terracotta - Light Blue Terracotta
light_blue_wool - Light Blue Wool
light_blue_wool_double_slab - Light Blue Wool Double Slab - minecraft:vertical_half="bottom"|"top"
light_blue_wool_slab - Light Blue Wool Slab - minecraft:vertical_half="bottom"|"top"
light_blue_wool_stairs - Light Blue Wool Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
light_gray_candle - Light Gray Candle - candles=0..3; lit=true|false
light_gray_candle_cake - Cake with Light Gray Candle - lit=true|false
light_gray_carpet - Light Gray Carpet
light_gray_concrete - Light Gray Concrete
light_gray_concrete_double_slab - Light Gray Concrete Double Slab - minecraft:vertical_half="bottom"|"top"
light_gray_concrete_powder - Light Gray Concrete Powder
light_gray_concrete_slab - Light Gray Concrete Slab - minecraft:vertical_half="bottom"|"top"
light_gray_concrete_stairs - Light Gray Concrete Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
light_gray_shulker_box - Light Gray Shulker Box
light_gray_stained_glass - Light Gray Stained Glass
light_gray_stained_glass_pane - Light Gray Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
light_gray_terracotta - Light Gray Terracotta
light_gray_wool - Light Gray Wool
light_gray_wool_double_slab - Light Gray Wool Double Slab - minecraft:vertical_half="bottom"|"top"
light_gray_wool_slab - Light Gray Wool Slab - minecraft:vertical_half="bottom"|"top"
light_gray_wool_stairs - Light Gray Wool Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
light_weighted_pressure_plate - Light Weighted Pressure Plate - redstone_signal=0..15
lightning_rod - Lightning Rod - facing_direction=0..5; powered_bit=true|false
lilac - Lilac - upper_block_bit=true|false
lily_of_the_valley - Lily of the Valley
lime_candle - Lime Candle - candles=0..3; lit=true|false
lime_candle_cake - Cake with Lime Candle - lit=true|false
lime_carpet - Lime Carpet
lime_concrete - Lime Concrete
lime_concrete_double_slab - Lime Concrete Double Slab - minecraft:vertical_half="bottom"|"top"
lime_concrete_powder - Lime Concrete Powder
lime_concrete_slab - Lime Concrete Slab - minecraft:vertical_half="bottom"|"top"
lime_concrete_stairs - Lime Concrete Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
lime_glazed_terracotta - Lime Glazed Terracotta - facing_direction=0..5
lime_shulker_box - Lime Shulker Box
lime_stained_glass - Lime Stained Glass
lime_stained_glass_pane - Lime Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
lime_terracotta - Lime Terracotta
lime_wool - Lime Wool
lime_wool_double_slab - Lime Wool Double Slab - minecraft:vertical_half="bottom"|"top"
lime_wool_slab - Lime Wool Slab - minecraft:vertical_half="bottom"|"top"
lime_wool_stairs - Lime Wool Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
lit_blast_furnace - Lit Blast Furnace - minecraft:cardinal_direction="south"|"west"|"north"|"east"
lit_deepslate_redstone_ore - Lit Deepslate Redstone Ore
lit_furnace - Lit Furnace - minecraft:cardinal_direction="south"|"west"|"north"|"east"
lit_pumpkin - Jack o'Lantern - minecraft:cardinal_direction="south"|"west"|"north"|"east"
lit_redstone_lamp - Lit Redstone Lamp
lit_redstone_ore - Lit Redstone Ore
lit_smoker - Lit Smoker - minecraft:cardinal_direction="south"|"west"|"north"|"east"
lodestone - Lodestone
loom - Loom - direction=0..3
magenta_candle - Magenta Candle - candles=0..3; lit=true|false
magenta_candle_cake - Cake with Magenta Candle - lit=true|false
magenta_carpet - Magenta Carpet
magenta_concrete - Magenta Concrete
magenta_concrete_double_slab - Magenta Concrete Double Slab - minecraft:vertical_half="bottom"|"top"
magenta_concrete_powder - Magenta Concrete Powder
magenta_concrete_slab - Magenta Concrete Slab - minecraft:vertical_half="bottom"|"top"
magenta_concrete_stairs - Magenta Concrete Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
magenta_glazed_terracotta - Magenta Glazed Terracotta - facing_direction=0..5
magenta_shulker_box - Magenta Shulker Box
magenta_stained_glass - Magenta Stained Glass
magenta_stained_glass_pane - Magenta Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
magenta_terracotta - Magenta Terracotta
magenta_wool - Magenta Wool
magenta_wool_double_slab - Magenta Wool Double Slab - minecraft:vertical_half="bottom"|"top"
magenta_wool_slab - Magenta Wool Slab - minecraft:vertical_half="bottom"|"top"
magenta_wool_stairs - Magenta Wool Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
magma - Magma Block
mangrove_button - Mangrove Button - button_pressed_bit=true|false; facing_direction=0..5
mangrove_door - Mangrove Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
mangrove_double_slab - Mangrove Double Slab - minecraft:vertical_half="bottom"|"top"
mangrove_fence - Mangrove Fence - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
mangrove_fence_gate - Mangrove Fence Gate - in_wall_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false
mangrove_hanging_sign - Mangrove Hanging Sign - attached_bit=true|false; facing_direction=0..5; ground_sign_direction=0..15; hanging=true|false
mangrove_leaves - Mangrove Leaves - persistent_bit=true|false; update_bit=true|false
mangrove_log - Mangrove Log - pillar_axis="y"|"x"|"z"
mangrove_planks - Mangrove Planks
mangrove_pressure_plate - Mangrove Pressure Plate - redstone_signal=0..15
mangrove_propagule - Mangrove Propagule - hanging=true|false; propagule_stage=0..4
mangrove_roots - Mangrove Roots
mangrove_shelf - Mangrove Shelf - minecraft:cardinal_direction="south"|"west"|"north"|"east"; powered_bit=true|false; powered_shelf_type=0..3
mangrove_slab - Mangrove Slab - minecraft:vertical_half="bottom"|"top"
mangrove_stairs - Mangrove Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
mangrove_standing_sign - Mangrove Sign - ground_sign_direction=0..15
mangrove_trapdoor - Mangrove Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
mangrove_wall_sign - Mangrove Wall Sign - facing_direction=0..5
mangrove_wood - Mangrove Wood - pillar_axis="y"|"x"|"z"
material_reducer - Material Reducer - direction=0..3
medium_amethyst_bud - Medium Amethyst Bud - minecraft:block_face="down"|"up"|"north"|"south"|"west"|"east"
melon_block - Melon
melon_stem - Melon Stem - facing_direction=0..5; growth=0..7
mob_spawner - Monster Spawner
moss_block - Moss Block
moss_carpet - Moss Carpet
mossy_cobblestone - Mossy Cobblestone
mossy_cobblestone_double_slab - Mossy Cobblestone Double Slab - minecraft:vertical_half="bottom"|"top"
mossy_cobblestone_slab - Mossy Cobblestone Slab - minecraft:vertical_half="bottom"|"top"
mossy_cobblestone_stairs - Mossy Cobblestone Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
mossy_cobblestone_wall - Mossy Cobblestone Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
mossy_stone_brick_double_slab - Mossy Stone Brick Double Slab - minecraft:vertical_half="bottom"|"top"
mossy_stone_brick_slab - Mossy Stone Brick Slab - minecraft:vertical_half="bottom"|"top"
mossy_stone_brick_stairs - Mossy Stone Brick Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
mossy_stone_brick_wall - Mossy Stone Brick Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
mossy_stone_bricks - Mossy Stone Bricks
mud - Mud
mud_brick_double_slab - Mud Brick Double Slab - minecraft:vertical_half="bottom"|"top"
mud_brick_slab - Mud Brick Slab - minecraft:vertical_half="bottom"|"top"
mud_brick_stairs - Mud Brick Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
mud_brick_wall - Mud Brick Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
mud_bricks - Mud Bricks
muddy_mangrove_roots - Muddy Mangrove Roots - pillar_axis="y"|"x"|"z"
mushroom_stem - Mushroom Stem - huge_mushroom_bits=0..15
mycelium - Mycelium
nether_brick - Nether Bricks
nether_brick_double_slab - Nether Brick Slab - minecraft:vertical_half="bottom"|"top"
nether_brick_fence - Nether Brick Fence - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
nether_brick_slab - Nether Brick Slab - minecraft:vertical_half="bottom"|"top"
nether_brick_stairs - Nether Brick Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
nether_brick_wall - Nether Brick Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
nether_gold_ore - Nether Gold Ore
nether_sprouts - Nether Sprouts
nether_wart - Nether Wart - age=0..15
nether_wart_block - Nether Wart Block
netherite_block - Block of Netherite
netherrack - Netherrack
normal_stone_double_slab - Stone Double Slab - minecraft:vertical_half="bottom"|"top"
normal_stone_slab - Stone Slab - minecraft:vertical_half="bottom"|"top"
normal_stone_stairs - Stone Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
noteblock - Note Block
oak_double_slab - Oak Double Slab - minecraft:vertical_half="bottom"|"top"
oak_fence - Oak Fence - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
oak_hanging_sign - Oak Hanging Sign - attached_bit=true|false; facing_direction=0..5; ground_sign_direction=0..15; hanging=true|false
oak_leaves - Oak Leaves - persistent_bit=true|false; update_bit=true|false
oak_log - Oak Log - pillar_axis="y"|"x"|"z"
oak_planks - Oak Planks
oak_sapling - Oak Sapling - age_bit=true|false
oak_shelf - Oak Shelf - minecraft:cardinal_direction="south"|"west"|"north"|"east"; powered_bit=true|false; powered_shelf_type=0..3
oak_slab - Oak Slab - minecraft:vertical_half="bottom"|"top"
oak_stairs - Oak Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
oak_wood - Oak Wood - pillar_axis="y"|"x"|"z"
observer - Observer - minecraft:facing_direction="down"|"up"|"north"|"south"|"west"|"east"; powered_bit=true|false
obsidian - Obsidian
ochre_froglight - Ochre Froglight - pillar_axis="y"|"x"|"z"
open_eyeblossom - Open Eyeblossom
orange_candle - Orange Candle - candles=0..3; lit=true|false
orange_candle_cake - Cake with Orange Candle - lit=true|false
orange_carpet - Orange Carpet
orange_concrete - Orange Concrete
orange_concrete_double_slab - Orange Concrete Double Slab - minecraft:vertical_half="bottom"|"top"
orange_concrete_powder - Orange Concrete Powder
orange_concrete_slab - Orange Concrete Slab - minecraft:vertical_half="bottom"|"top"
orange_concrete_stairs - Orange Concrete Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
orange_glazed_terracotta - Orange Glazed Terracotta - facing_direction=0..5
orange_poplar_leaves - Orange Poplar Leaves - persistent_bit=true|false; update_bit=true|false
orange_shulker_box - Orange Shulker Box
orange_stained_glass - Orange Stained Glass
orange_stained_glass_pane - Orange Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
orange_terracotta - Orange Terracotta
orange_tulip - Orange Tulip
orange_wool - Orange Wool
orange_wool_double_slab - Orange Wool Double Slab - minecraft:vertical_half="bottom"|"top"
orange_wool_slab - Orange Wool Slab - minecraft:vertical_half="bottom"|"top"
orange_wool_stairs - Orange Wool Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
oxeye_daisy - Oxeye Daisy
oxidized_chiseled_copper - Oxidized Chiseled Copper
oxidized_copper - Oxidized Copper
oxidized_copper_bars - Oxidized Copper Bars - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
oxidized_copper_bulb - Oxidized Copper Bulb - lit=true|false; powered_bit=true|false
oxidized_copper_chain - Oxidized Copper Chain - pillar_axis="y"|"x"|"z"
oxidized_copper_chest - Oxidized Copper Chest - minecraft:cardinal_direction="south"|"west"|"north"|"east"
oxidized_copper_door - Oxidized Copper Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
oxidized_copper_golem_statue - Oxidized Copper Golem Statue - minecraft:cardinal_direction="south"|"west"|"north"|"east"
oxidized_copper_grate - Oxidized Copper Grate
oxidized_copper_lantern - Oxidized Copper Lantern - hanging=true|false
oxidized_copper_trapdoor - Oxidized Copper Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
oxidized_cut_copper - Oxidized Cut Copper
oxidized_cut_copper_slab - Oxidized Cut Copper Slab - minecraft:vertical_half="bottom"|"top"
oxidized_cut_copper_stairs - Oxidized Cut Copper Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
oxidized_double_cut_copper_slab - Oxidized Cut Copper Double Slab - minecraft:vertical_half="bottom"|"top"
oxidized_lightning_rod - Oxidized Lightning Rod - facing_direction=0..5; powered_bit=true|false
packed_ice - Packed Ice
packed_mud - Packed Mud
pale_hanging_moss - Pale Hanging Moss - tip=true|false
pale_moss_block - Pale Moss Block
pale_moss_carpet - Pale Moss Carpet - pale_moss_carpet_side_east="none"|"short"|"tall"; pale_moss_carpet_side_north="none"|"short"|"tall"; pale_moss_carpet_side_south="none"|"short"|"tall"; pale_moss_carpet_side_west="none"|"short"|"tall"; upper_block_bit=true|false
pale_oak_button - Pale Oak Button - button_pressed_bit=true|false; facing_direction=0..5
pale_oak_door - Pale Oak Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
pale_oak_double_slab - Pale Oak Double Slab - minecraft:vertical_half="bottom"|"top"
pale_oak_fence - Pale Oak Fence - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
pale_oak_fence_gate - Pale Oak Fence Gate - in_wall_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false
pale_oak_hanging_sign - Pale Oak Hanging Sign - attached_bit=true|false; facing_direction=0..5; ground_sign_direction=0..15; hanging=true|false
pale_oak_leaves - Pale Oak Leaves - persistent_bit=true|false; update_bit=true|false
pale_oak_log - Pale Oak Log - pillar_axis="y"|"x"|"z"
pale_oak_planks - Pale Oak Planks
pale_oak_pressure_plate - Pale Oak Pressure Plate - redstone_signal=0..15
pale_oak_sapling - Pale Oak Sapling - age_bit=true|false
pale_oak_shelf - Pale Oak Shelf - minecraft:cardinal_direction="south"|"west"|"north"|"east"; powered_bit=true|false; powered_shelf_type=0..3
pale_oak_slab - Pale Oak Slab - minecraft:vertical_half="bottom"|"top"
pale_oak_stairs - Pale Oak Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
pale_oak_standing_sign - Pale Oak Sign - ground_sign_direction=0..15
pale_oak_trapdoor - Pale Oak Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
pale_oak_wall_sign - Pale Oak Wall Sign - facing_direction=0..5
pale_oak_wood - Pale Oak Wood - pillar_axis="y"|"x"|"z"
pearlescent_froglight - Pearlescent Froglight - pillar_axis="y"|"x"|"z"
peony - Peony - upper_block_bit=true|false
petrified_oak_double_slab - Wooden Slab - minecraft:vertical_half="bottom"|"top"
petrified_oak_slab - Wooden Slab - minecraft:vertical_half="bottom"|"top"
piglin_head - Piglin Head - facing_direction=0..5
pink_candle - Pink Candle - candles=0..3; lit=true|false
pink_candle_cake - Cake with Pink Candle - lit=true|false
pink_carpet - Pink Carpet
pink_concrete - Pink Concrete
pink_concrete_double_slab - Pink Concrete Double Slab - minecraft:vertical_half="bottom"|"top"
pink_concrete_powder - Pink Concrete Powder
pink_concrete_slab - Pink Concrete Slab - minecraft:vertical_half="bottom"|"top"
pink_concrete_stairs - Pink Concrete Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
pink_glazed_terracotta - Pink Glazed Terracotta - facing_direction=0..5
pink_petals - Pink Petals - growth=0..7; minecraft:cardinal_direction="south"|"west"|"north"|"east"
pink_shulker_box - Pink Shulker Box
pink_stained_glass - Pink Stained Glass
pink_stained_glass_pane - Pink Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
pink_terracotta - Pink Terracotta
pink_tulip - Pink Tulip
pink_wool - Pink Wool
pink_wool_double_slab - Pink Wool Double Slab - minecraft:vertical_half="bottom"|"top"
pink_wool_slab - Pink Wool Slab - minecraft:vertical_half="bottom"|"top"
pink_wool_stairs - Pink Wool Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
piston - Piston - facing_direction=0..5
piston_arm_collision - Piston Arm Collision - facing_direction=0..5
pitcher_crop - Pitcher Crop - growth=0..7; upper_block_bit=true|false
pitcher_plant - Pitcher Plant - upper_block_bit=true|false
player_head - Player Head - facing_direction=0..5
podzol - Podzol
pointed_dripstone - Pointed Dripstone - dripstone_thickness="tip"|"frustum"|"middle"|"base"|"merge"; hanging=true|false
polished_andesite - Polished Andesite
polished_andesite_double_slab - Polished Andesite Double Slab - minecraft:vertical_half="bottom"|"top"
polished_andesite_slab - Polished Andesite Slab - minecraft:vertical_half="bottom"|"top"
polished_andesite_stairs - Polished Andesite Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
polished_basalt - Polished Basalt - pillar_axis="y"|"x"|"z"
polished_blackstone - Polished Blackstone
polished_blackstone_brick_double_slab - Polished Blackstone Brick Double Slab - minecraft:vertical_half="bottom"|"top"
polished_blackstone_brick_slab - Polished Blackstone Brick Slab - minecraft:vertical_half="bottom"|"top"
polished_blackstone_brick_stairs - Polished Blackstone Brick Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
polished_blackstone_brick_wall - Polished Blackstone Brick Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
polished_blackstone_bricks - Polished Blackstone Bricks
polished_blackstone_button - Polished Blackstone Button - button_pressed_bit=true|false; facing_direction=0..5
polished_blackstone_double_slab - Polished Blackstone Double Slab - minecraft:vertical_half="bottom"|"top"
polished_blackstone_pressure_plate - Polished Blackstone Pressure Plate - redstone_signal=0..15
polished_blackstone_slab - Polished Blackstone Slab - minecraft:vertical_half="bottom"|"top"
polished_blackstone_stairs - Polished Blackstone Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
polished_blackstone_wall - Polished Blackstone Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
polished_cinnabar - Polished Cinnabar
polished_cinnabar_double_slab - Polished Cinnabar Double Slab - minecraft:vertical_half="bottom"|"top"
polished_cinnabar_slab - Polished Cinnabar Slab - minecraft:vertical_half="bottom"|"top"
polished_cinnabar_stairs - Polished Cinnabar Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
polished_cinnabar_wall - Polished Cinnabar Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
polished_deepslate - Polished Deepslate
polished_deepslate_double_slab - Polished Deepslate Double Slab - minecraft:vertical_half="bottom"|"top"
polished_deepslate_slab - Polished Deepslate Slab - minecraft:vertical_half="bottom"|"top"
polished_deepslate_stairs - Polished Deepslate Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
polished_deepslate_wall - Polished Deepslate Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
polished_diorite - Polished Diorite
polished_diorite_double_slab - Polished Diorite Double Slab - minecraft:vertical_half="bottom"|"top"
polished_diorite_slab - Polished Diorite Slab - minecraft:vertical_half="bottom"|"top"
polished_diorite_stairs - Polished Diorite Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
polished_granite - Polished Granite
polished_granite_double_slab - Polished Granite Double Slab - minecraft:vertical_half="bottom"|"top"
polished_granite_slab - Polished Granite Slab - minecraft:vertical_half="bottom"|"top"
polished_granite_stairs - Polished Granite Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
polished_sulfur - Polished Sulfur
polished_sulfur_double_slab - Polished Sulfur Double Slab - minecraft:vertical_half="bottom"|"top"
polished_sulfur_slab - Polished Sulfur Slab - minecraft:vertical_half="bottom"|"top"
polished_sulfur_stairs - Polished Sulfur Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
polished_sulfur_wall - Polished Sulfur Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
polished_tuff - Polished Tuff
polished_tuff_double_slab - Polished Tuff Double Slab - minecraft:vertical_half="bottom"|"top"
polished_tuff_slab - Polished Tuff Slab - minecraft:vertical_half="bottom"|"top"
polished_tuff_stairs - Polished Tuff Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
polished_tuff_wall - Polished Tuff Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
poplar_button - Poplar Button - button_pressed_bit=true|false; facing_direction=0..5
poplar_door - Poplar Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
poplar_double_slab - Poplar Double Slab - minecraft:vertical_half="bottom"|"top"
poplar_fence - Poplar Fence - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
poplar_fence_gate - Poplar Fence Gate - in_wall_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false
poplar_hanging_sign - Poplar Hanging Sign - attached_bit=true|false; facing_direction=0..5; ground_sign_direction=0..15; hanging=true|false
poplar_log - Poplar Log - pillar_axis="y"|"x"|"z"
poplar_planks - Poplar Planks
poplar_pressure_plate - Poplar Pressure Plate - redstone_signal=0..15
poplar_sapling - Poplar Sapling - age_bit=true|false
poplar_shelf - Poplar Shelf - minecraft:cardinal_direction="south"|"west"|"north"|"east"; powered_bit=true|false; powered_shelf_type=0..3
poplar_slab - Poplar Slab - minecraft:vertical_half="bottom"|"top"
poplar_stairs - Poplar Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
poplar_standing_sign - Poplar Sign - ground_sign_direction=0..15
poplar_trapdoor - Poplar Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
poplar_wall_sign - Poplar Wall Sign - facing_direction=0..5
poplar_wood - Poplar Wood - pillar_axis="y"|"x"|"z"
poppy - Poppy
portal - Portal - portal_axis="unknown"|"x"|"z"
potatoes - Potatoes - growth=0..7
potent_sulfur - Potent Sulfur - potent_sulfur_state="dry"|"wet"|"dormant"|"erupting"|"continuous"
powder_snow - Powder Snow
powered_comparator - Powered Comparator - minecraft:cardinal_direction="south"|"west"|"north"|"east"; output_lit_bit=true|false; output_subtract_bit=true|false
powered_repeater - Powered Repeater - minecraft:cardinal_direction="south"|"west"|"north"|"east"; repeater_delay=0..3
prismarine - Prismarine
prismarine_brick_double_slab - Prismarine Brick Double Slab - minecraft:vertical_half="bottom"|"top"
prismarine_brick_slab - Prismarine Brick Slab - minecraft:vertical_half="bottom"|"top"
prismarine_bricks - Prismarine Bricks
prismarine_bricks_stairs - Prismarine Brick Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
prismarine_double_slab - Prismarine DoubleSlab - minecraft:vertical_half="bottom"|"top"
prismarine_slab - Prismarine Slab - minecraft:vertical_half="bottom"|"top"
prismarine_stairs - Prismarine Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
prismarine_wall - Prismarine Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
pumpkin - Pumpkin - minecraft:cardinal_direction="south"|"west"|"north"|"east"
pumpkin_stem - Pumpkin Stem - facing_direction=0..5; growth=0..7
purple_candle - Purple Candle - candles=0..3; lit=true|false
purple_candle_cake - Cake with Purple Candle - lit=true|false
purple_carpet - Purple Carpet
purple_concrete - Purple Concrete
purple_concrete_double_slab - Purple Concrete Double Slab - minecraft:vertical_half="bottom"|"top"
purple_concrete_powder - Purple Concrete Powder
purple_concrete_slab - Purple Concrete Slab - minecraft:vertical_half="bottom"|"top"
purple_concrete_stairs - Purple Concrete Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
purple_glazed_terracotta - Purple Glazed Terracotta - facing_direction=0..5
purple_shulker_box - Purple Shulker Box
purple_stained_glass - Purple Stained Glass
purple_stained_glass_pane - Purple Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
purple_terracotta - Purple Terracotta
purple_wool - Purple Wool
purple_wool_double_slab - Purple Wool Double Slab - minecraft:vertical_half="bottom"|"top"
purple_wool_slab - Purple Wool Slab - minecraft:vertical_half="bottom"|"top"
purple_wool_stairs - Purple Wool Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
purpur_block - Purpur Block - pillar_axis="y"|"x"|"z"
purpur_double_slab - Purpur Double Slab - minecraft:vertical_half="bottom"|"top"
purpur_pillar - Purpur Pillar - pillar_axis="y"|"x"|"z"
purpur_slab - Purpur Slab - minecraft:vertical_half="bottom"|"top"
purpur_stairs - Purpur Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
quartz_block - Block of Quartz - pillar_axis="y"|"x"|"z"
quartz_bricks - Quartz Bricks
quartz_double_slab - Quartz Slab - minecraft:vertical_half="bottom"|"top"
quartz_ore - Nether Quartz Ore
quartz_pillar - Quartz Pillar - pillar_axis="y"|"x"|"z"
quartz_slab - Quartz Slab - minecraft:vertical_half="bottom"|"top"
quartz_stairs - Quartz Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
rail - Rail - rail_direction=0..9
raw_copper_block - Block of Raw Copper
raw_gold_block - Block of Raw Gold
raw_iron_block - Block of Raw Iron
red_candle - Red Candle - candles=0..3; lit=true|false
red_candle_cake - Cake with Red Candle - lit=true|false
red_carpet - Red Carpet
red_concrete - Red Concrete
red_concrete_double_slab - Red Concrete Double Slab - minecraft:vertical_half="bottom"|"top"
red_concrete_powder - Red Concrete Powder
red_concrete_slab - Red Concrete Slab - minecraft:vertical_half="bottom"|"top"
red_concrete_stairs - Red Concrete Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
red_glazed_terracotta - Red Glazed Terracotta - facing_direction=0..5
red_mushroom - Red Mushroom
red_mushroom_block - Red Mushroom Block - huge_mushroom_bits=0..15
red_nether_brick - Red Nether Bricks
red_nether_brick_double_slab - Red Nether Brick Double Slab - minecraft:vertical_half="bottom"|"top"
red_nether_brick_slab - Red Nether Brick Slab - minecraft:vertical_half="bottom"|"top"
red_nether_brick_stairs - Red Nether Brick Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
red_nether_brick_wall - Red Nether Brick Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
red_poplar_leaves - Red Poplar Leaves - persistent_bit=true|false; update_bit=true|false
red_sand - Red Sand
red_sandstone - Red Sandstone
red_sandstone_double_slab - Red Sandstone Slab - minecraft:vertical_half="bottom"|"top"
red_sandstone_slab - Red Sandstone Slab - minecraft:vertical_half="bottom"|"top"
red_sandstone_stairs - Red Sandstone Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
red_sandstone_wall - Red Sandstone Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
red_shrub - Red Shrub
red_shulker_box - Red Shulker Box
red_stained_glass - Red Stained Glass
red_stained_glass_pane - Red Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
red_terracotta - Red Terracotta
red_tulip - Red Tulip
red_wool - Red Wool
red_wool_double_slab - Red Wool Double Slab - minecraft:vertical_half="bottom"|"top"
red_wool_slab - Red Wool Slab - minecraft:vertical_half="bottom"|"top"
red_wool_stairs - Red Wool Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
redstone_block - Block of Redstone
redstone_lamp - Redstone Lamp
redstone_ore - Redstone Ore
redstone_torch - Redstone Torch - torch_facing_direction="unknown"|"west"|"east"|"north"|"south"|"top"
redstone_wire - Redstone Dust - redstone_signal=0..15
reeds - Sugar cane - age=0..15
reinforced_deepslate - Reinforced Deepslate
repeating_command_block - Repeating Command Block - conditional_bit=true|false; facing_direction=0..5
resin_block - Block of Resin
resin_brick_double_slab - Resin Brick Double Slab - minecraft:vertical_half="bottom"|"top"
resin_brick_slab - Resin Brick Slab - minecraft:vertical_half="bottom"|"top"
resin_brick_stairs - Resin Brick Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
resin_brick_wall - Resin Brick Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
resin_bricks - Resin Bricks
resin_clump - Resin Clump - multi_face_direction_bits=0..63
respawn_anchor - Respawn Anchor - respawn_anchor_charge=0..4
rose_bush - Rose Bush - upper_block_bit=true|false
sand - Sand
sandstone - Sandstone
sandstone_double_slab - Sandstone Slab - minecraft:vertical_half="bottom"|"top"
sandstone_slab - Sandstone Slab - minecraft:vertical_half="bottom"|"top"
sandstone_stairs - Sandstone Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
sandstone_wall - Sandstone Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
scaffolding - Scaffolding - stability=0..7; stability_check=true|false
sculk - Sculk
sculk_catalyst - Sculk Catalyst - bloom=true|false
sculk_sensor - Sculk Sensor - sculk_sensor_phase=0|1|2
sculk_shrieker - Sculk Shrieker - active=true|false; can_summon=true|false
sculk_vein - Sculk Vein - multi_face_direction_bits=0..63
sea_lantern - Sea Lantern
sea_pickle - Sea Pickle - cluster_count=0..3; dead_bit=true|false
seagrass - Seagrass - sea_grass_type="default"|"double_top"|"double_bot"
shelf_mushroom - Shelf Mushroom - growth=0..7; minecraft:cardinal_direction="south"|"west"|"north"|"east"
short_dry_grass - Short Dry Grass
short_grass - Short Grass
shroomlight - Shroomlight
silver_glazed_terracotta - Light Gray Glazed Terracotta - facing_direction=0..5
skeleton_skull - Skeleton Skull - facing_direction=0..5
slime - Slime Block
small_amethyst_bud - Small Amethyst Bud - minecraft:block_face="down"|"up"|"north"|"south"|"west"|"east"
small_dripleaf_block - Small Dripleaf - minecraft:cardinal_direction="south"|"west"|"north"|"east"; upper_block_bit=true|false
smithing_table - Smithing Table
smoker - Smoker - minecraft:cardinal_direction="south"|"west"|"north"|"east"
smooth_basalt - Smooth Basalt
smooth_quartz - Smooth Quartz Block - pillar_axis="y"|"x"|"z"
smooth_quartz_double_slab - Smooth Quartz Double Slab - minecraft:vertical_half="bottom"|"top"
smooth_quartz_slab - Smooth Quartz Slab - minecraft:vertical_half="bottom"|"top"
smooth_quartz_stairs - Smooth Quartz Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
smooth_red_sandstone - Smooth Red Sandstone
smooth_red_sandstone_double_slab - Smooth Red Sandstone Double Slab - minecraft:vertical_half="bottom"|"top"
smooth_red_sandstone_slab - Smooth Red Sandstone Slab - minecraft:vertical_half="bottom"|"top"
smooth_red_sandstone_stairs - Smooth Red Sandstone Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
smooth_sandstone - Smooth Sandstone
smooth_sandstone_double_slab - Smooth Sandstone Double Slab - minecraft:vertical_half="bottom"|"top"
smooth_sandstone_slab - Smooth Sandstone Slab - minecraft:vertical_half="bottom"|"top"
smooth_sandstone_stairs - Smooth Sandstone Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
smooth_stone - Smooth Stone
smooth_stone_double_slab - Stone Slab - minecraft:vertical_half="bottom"|"top"
smooth_stone_slab - Smooth Stone Slab - minecraft:vertical_half="bottom"|"top"
sniffer_egg - Sniffer Egg - cracked_state="no_cracks"|"cracked"|"max_cracked"
snow - Snow Block
snow_layer - Snow - covered_bit=true|false; height=0..7
soul_campfire - Soul Campfire - extinguished=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"
soul_fire - Soul Fire - age=0..15
soul_lantern - Soul Lantern - hanging=true|false
soul_sand - Soul Sand
soul_soil - Soul Soil
soul_torch - Soul Torch - torch_facing_direction="unknown"|"west"|"east"|"north"|"south"|"top"
sponge - Sponge
spore_blossom - Spore Blossom
spruce_button - Spruce Button - button_pressed_bit=true|false; facing_direction=0..5
spruce_door - Spruce Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
spruce_double_slab - Spruce Double Slab - minecraft:vertical_half="bottom"|"top"
spruce_fence - Spruce Fence - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
spruce_fence_gate - Spruce Fence Gate - in_wall_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false
spruce_hanging_sign - Spruce Hanging Sign - attached_bit=true|false; facing_direction=0..5; ground_sign_direction=0..15; hanging=true|false
spruce_leaves - Spruce Leaves - persistent_bit=true|false; update_bit=true|false
spruce_log - Spruce Log - pillar_axis="y"|"x"|"z"
spruce_planks - Spruce Planks
spruce_pressure_plate - Spruce Pressure Plate - redstone_signal=0..15
spruce_sapling - Spruce Sapling - age_bit=true|false
spruce_shelf - Spruce Shelf - minecraft:cardinal_direction="south"|"west"|"north"|"east"; powered_bit=true|false; powered_shelf_type=0..3
spruce_slab - Spruce Slab - minecraft:vertical_half="bottom"|"top"
spruce_stairs - Spruce Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
spruce_standing_sign - Spruce Sign - ground_sign_direction=0..15
spruce_trapdoor - Spruce Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
spruce_wall_sign - Spruce Wall Sign - facing_direction=0..5
spruce_wood - Spruce Wood - pillar_axis="y"|"x"|"z"
standing_banner - Banner - ground_sign_direction=0..15
standing_sign - Sign - ground_sign_direction=0..15
sticky_piston - Sticky Piston - facing_direction=0..5
sticky_piston_arm_collision - Sticky Piston Arm Collision - facing_direction=0..5
stone - Stone
stone_brick_double_slab - Stone Brick Slab - minecraft:vertical_half="bottom"|"top"
stone_brick_slab - Stone Brick Slab - minecraft:vertical_half="bottom"|"top"
stone_brick_stairs - Stone Brick Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
stone_brick_wall - Stone Brick Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
stone_bricks - Stone Bricks
stone_button - Stone Button - button_pressed_bit=true|false; facing_direction=0..5
stone_pressure_plate - Stone Pressure Plate - redstone_signal=0..15
stone_stairs - Cobblestone Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
stonecutter_block - Stonecutter - minecraft:cardinal_direction="south"|"west"|"north"|"east"
straw_bed - Straw Bed - head_piece_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; occupied_bit=true|false
stripped_acacia_log - Stripped Acacia Log - pillar_axis="y"|"x"|"z"
stripped_acacia_wood - Stripped Acacia Wood - pillar_axis="y"|"x"|"z"
stripped_bamboo_block - Block of Stripped Bamboo - pillar_axis="y"|"x"|"z"
stripped_birch_log - Stripped Birch Log - pillar_axis="y"|"x"|"z"
stripped_birch_wood - Stripped Birch Wood - pillar_axis="y"|"x"|"z"
stripped_cherry_log - Stripped Cherry Log - pillar_axis="y"|"x"|"z"
stripped_cherry_wood - Stripped Cherry Wood - pillar_axis="y"|"x"|"z"
stripped_crimson_hyphae - Stripped Crimson Hyphae - pillar_axis="y"|"x"|"z"
stripped_crimson_stem - Stripped Crimson Stem - pillar_axis="y"|"x"|"z"
stripped_dark_oak_log - Stripped Dark Oak Log - pillar_axis="y"|"x"|"z"
stripped_dark_oak_wood - Stripped Dark Oak Wood - pillar_axis="y"|"x"|"z"
stripped_jungle_log - Stripped Jungle Log - pillar_axis="y"|"x"|"z"
stripped_jungle_wood - Stripped Jungle Wood - pillar_axis="y"|"x"|"z"
stripped_mangrove_log - Stripped Mangrove Log - pillar_axis="y"|"x"|"z"
stripped_mangrove_wood - Stripped Mangrove Wood - pillar_axis="y"|"x"|"z"
stripped_oak_log - Stripped Oak Log - pillar_axis="y"|"x"|"z"
stripped_oak_wood - Stripped Oak Wood - pillar_axis="y"|"x"|"z"
stripped_pale_oak_log - Stripped Pale Oak Log - pillar_axis="y"|"x"|"z"
stripped_pale_oak_wood - Stripped Pale Oak Wood - pillar_axis="y"|"x"|"z"
stripped_poplar_log - Stripped Poplar Log - pillar_axis="y"|"x"|"z"
stripped_poplar_wood - Stripped Poplar Wood - pillar_axis="y"|"x"|"z"
stripped_spruce_log - Stripped Spruce Log - pillar_axis="y"|"x"|"z"
stripped_spruce_wood - Stripped Spruce Wood - pillar_axis="y"|"x"|"z"
stripped_warped_hyphae - Stripped Warped Hyphae - pillar_axis="y"|"x"|"z"
stripped_warped_stem - Stripped Warped Stem - pillar_axis="y"|"x"|"z"
structure_block - Structure Block - structure_block_type="data"|"save"|"load"|"corner"|"invalid"|"export"
structure_void - Structure Void
sulfur - Sulfur
sulfur_brick_double_slab - Sulfur Brick Double Slab - minecraft:vertical_half="bottom"|"top"
sulfur_brick_slab - Sulfur Brick Slab - minecraft:vertical_half="bottom"|"top"
sulfur_brick_stairs - Sulfur Brick Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
sulfur_brick_wall - Sulfur Brick Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
sulfur_bricks - Sulfur Bricks
sulfur_double_slab - Sulfur Double Slab - minecraft:vertical_half="bottom"|"top"
sulfur_slab - Sulfur Slab - minecraft:vertical_half="bottom"|"top"
sulfur_spike - Sulfur Spike - dripstone_thickness="tip"|"frustum"|"middle"|"base"|"merge"; hanging=true|false
sulfur_stairs - Sulfur Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
sulfur_wall - Sulfur Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
sunflower - Sunflower - upper_block_bit=true|false
suspicious_gravel - Suspicious Gravel - brushed_progress=0..3; hanging=true|false
suspicious_sand - Suspicious Sand - brushed_progress=0..3; hanging=true|false
sweet_berry_bush - Sweet Berry Bush - growth=0..7
tall_dry_grass - Tall Dry Grass
tall_grass - Tall Grass - upper_block_bit=true|false
target - Target
tinted_glass - Tinted Glass
tnt - TNT - explode_bit=true|false
torch - Torch - torch_facing_direction="unknown"|"west"|"east"|"north"|"south"|"top"
torchflower - Torchflower
torchflower_crop - Torchflower Crop - growth=0..7
trapdoor - Oak Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
trapped_chest - Trapped Chest - minecraft:cardinal_direction="south"|"west"|"north"|"east"
trial_spawner - Trial Spawner - ominous=true|false; trial_spawner_state=0..5
trip_wire - Tripwire - attached_bit=true|false; disarmed_bit=true|false; minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false; powered_bit=true|false; suspended_bit=true|false
tripwire_hook - Tripwire Hook - attached_bit=true|false; direction=0..3; powered_bit=true|false
tube_coral - Tube Coral
tube_coral_block - Tube Coral Block
tube_coral_fan - Tube Coral Fan - coral_fan_direction=0|1
tube_coral_wall_fan - Tube Coral Wall Fan - coral_direction=0..3
tuff - Tuff
tuff_brick_double_slab - Tuff Brick Double Slab - minecraft:vertical_half="bottom"|"top"
tuff_brick_slab - Tuff Brick Slab - minecraft:vertical_half="bottom"|"top"
tuff_brick_stairs - Tuff Brick Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
tuff_brick_wall - Tuff Brick Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
tuff_bricks - Tuff Bricks
tuff_double_slab - Tuff Double Slab - minecraft:vertical_half="bottom"|"top"
tuff_slab - Tuff Slab - minecraft:vertical_half="bottom"|"top"
tuff_stairs - Tuff Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
tuff_wall - Tuff Wall - wall_connection_type_east="none"|"short"|"tall"; wall_connection_type_north="none"|"short"|"tall"; wall_connection_type_south="none"|"short"|"tall"; wall_connection_type_west="none"|"short"|"tall"; wall_post_bit=true|false
turtle_egg - Turtle Egg - cracked_state="no_cracks"|"cracked"|"max_cracked"; turtle_egg_count="one_egg"|"two_egg"|"three_egg"|"four_egg"
twisting_vines - Twisting Vines - twisting_vines_age=0..25
underwater_tnt - TNT - explode_bit=true|false
underwater_torch - Underwater Torch - torch_facing_direction="unknown"|"west"|"east"|"north"|"south"|"top"
undyed_shulker_box - Shulker Box
unknown - Unknown
unlit_redstone_torch - Redstone Torch - torch_facing_direction="unknown"|"west"|"east"|"north"|"south"|"top"
unpowered_comparator - Unpowered Comparator - minecraft:cardinal_direction="south"|"west"|"north"|"east"; output_lit_bit=true|false; output_subtract_bit=true|false
unpowered_repeater - Unpowered Repeater - minecraft:cardinal_direction="south"|"west"|"north"|"east"; repeater_delay=0..3
vault - Vault - minecraft:cardinal_direction="south"|"west"|"north"|"east"; ominous=true|false; vault_state="inactive"|"active"|"unlocking"|"ejecting"
verdant_froglight - Verdant Froglight - pillar_axis="y"|"x"|"z"
vine - Vines - vine_direction_bits=0..15
wall_banner - Wall Banner - facing_direction=0..5
wall_sign - Wall Sign - facing_direction=0..5
warped_button - Warped Button - button_pressed_bit=true|false; facing_direction=0..5
warped_door - Warped Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
warped_double_slab - Warped Slab - minecraft:vertical_half="bottom"|"top"
warped_fence - Warped Fence - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
warped_fence_gate - Warped Fence Gate - in_wall_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false
warped_fungus - Warped Fungus
warped_hanging_sign - Warped Hanging Sign - attached_bit=true|false; facing_direction=0..5; ground_sign_direction=0..15; hanging=true|false
warped_hyphae - Warped Hyphae - pillar_axis="y"|"x"|"z"
warped_nylium - Warped Nylium
warped_planks - Warped Planks
warped_pressure_plate - Warped Pressure Plate - redstone_signal=0..15
warped_roots - Warped Roots
warped_shelf - Warped Shelf - minecraft:cardinal_direction="south"|"west"|"north"|"east"; powered_bit=true|false; powered_shelf_type=0..3
warped_slab - Warped Slab - minecraft:vertical_half="bottom"|"top"
warped_stairs - Warped Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
warped_standing_sign - Warped Sign - ground_sign_direction=0..15
warped_stem - Warped Stem - pillar_axis="y"|"x"|"z"
warped_trapdoor - Warped Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
warped_wall_sign - Warped Sign - facing_direction=0..5
warped_wart_block - Warped Wart Block
water - Water - liquid_depth=0..15
waterlily - Lily Pad
waxed_chiseled_copper - Waxed Chiseled Copper
waxed_copper - Waxed Block of Copper
waxed_copper_bars - Waxed Copper Bars - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
waxed_copper_bulb - Waxed Copper Bulb - lit=true|false; powered_bit=true|false
waxed_copper_chain - Waxed Copper Chain - pillar_axis="y"|"x"|"z"
waxed_copper_chest - Waxed Copper Chest - minecraft:cardinal_direction="south"|"west"|"north"|"east"
waxed_copper_door - Waxed Copper Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
waxed_copper_golem_statue - Waxed Copper Golem Statue - minecraft:cardinal_direction="south"|"west"|"north"|"east"
waxed_copper_grate - Waxed Copper Grate
waxed_copper_lantern - Waxed Copper Lantern - hanging=true|false
waxed_copper_trapdoor - Waxed Copper Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
waxed_cut_copper - Waxed Cut Copper
waxed_cut_copper_slab - Waxed Cut Copper Slab - minecraft:vertical_half="bottom"|"top"
waxed_cut_copper_stairs - Waxed Cut Copper Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
waxed_double_cut_copper_slab - Waxed Cut Copper Double Slab - minecraft:vertical_half="bottom"|"top"
waxed_exposed_chiseled_copper - Waxed Exposed Chiseled Copper
waxed_exposed_copper - Waxed Exposed Copper
waxed_exposed_copper_bars - Waxed Exposed Copper Bars - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
waxed_exposed_copper_bulb - Waxed Exposed Copper Bulb - lit=true|false; powered_bit=true|false
waxed_exposed_copper_chain - Waxed Exposed Copper Chain - pillar_axis="y"|"x"|"z"
waxed_exposed_copper_chest - Waxed Exposed Copper Chest - minecraft:cardinal_direction="south"|"west"|"north"|"east"
waxed_exposed_copper_door - Waxed Exposed Copper Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
waxed_exposed_copper_golem_statue - Waxed Exposed Copper Golem Statue - minecraft:cardinal_direction="south"|"west"|"north"|"east"
waxed_exposed_copper_grate - Waxed Exposed Copper Grate
waxed_exposed_copper_lantern - Waxed Exposed Copper Lantern - hanging=true|false
waxed_exposed_copper_trapdoor - Waxed Exposed Copper Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
waxed_exposed_cut_copper - Waxed Exposed Cut Copper
waxed_exposed_cut_copper_slab - Waxed Exposed Cut Copper Slab - minecraft:vertical_half="bottom"|"top"
waxed_exposed_cut_copper_stairs - Waxed Exposed Cut Copper Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
waxed_exposed_double_cut_copper_slab - Waxed Exposed Cut Copper Double Slab - minecraft:vertical_half="bottom"|"top"
waxed_exposed_lightning_rod - Waxed Exposed Lightning Rod - facing_direction=0..5; powered_bit=true|false
waxed_lightning_rod - Waxed Lightning Rod - facing_direction=0..5; powered_bit=true|false
waxed_oxidized_chiseled_copper - Waxed Oxidized Chiseled Copper
waxed_oxidized_copper - Waxed Oxidized Copper
waxed_oxidized_copper_bars - Waxed Oxidized Copper Bars - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
waxed_oxidized_copper_bulb - Waxed Oxidized Copper Bulb - lit=true|false; powered_bit=true|false
waxed_oxidized_copper_chain - Waxed Oxidized Copper Chain - pillar_axis="y"|"x"|"z"
waxed_oxidized_copper_chest - Waxed Oxidized Copper Chest - minecraft:cardinal_direction="south"|"west"|"north"|"east"
waxed_oxidized_copper_door - Waxed Oxidized Copper Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
waxed_oxidized_copper_golem_statue - Waxed Oxidized Copper Golem Statue - minecraft:cardinal_direction="south"|"west"|"north"|"east"
waxed_oxidized_copper_grate - Waxed Oxidized Copper Grate
waxed_oxidized_copper_lantern - Waxed Oxidized Copper Lantern - hanging=true|false
waxed_oxidized_copper_trapdoor - Waxed Oxidized Copper Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
waxed_oxidized_cut_copper - Waxed Oxidized Cut Copper
waxed_oxidized_cut_copper_slab - Waxed Oxidized Cut Copper Slab - minecraft:vertical_half="bottom"|"top"
waxed_oxidized_cut_copper_stairs - Waxed Oxidized Cut Copper Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
waxed_oxidized_double_cut_copper_slab - Waxed Oxidized Cut Copper Double Slab - minecraft:vertical_half="bottom"|"top"
waxed_oxidized_lightning_rod - Waxed Oxidized Lightning Rod - facing_direction=0..5; powered_bit=true|false
waxed_weathered_chiseled_copper - Waxed Weathered Chiseled Copper
waxed_weathered_copper - Waxed Weathered Copper
waxed_weathered_copper_bars - Waxed Weathered Copper Bars - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
waxed_weathered_copper_bulb - Waxed Weathered Copper Bulb - lit=true|false; powered_bit=true|false
waxed_weathered_copper_chain - Waxed Weathered Copper Chain - pillar_axis="y"|"x"|"z"
waxed_weathered_copper_chest - Waxed Weathered Copper Chest - minecraft:cardinal_direction="south"|"west"|"north"|"east"
waxed_weathered_copper_door - Waxed Weathered Copper Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
waxed_weathered_copper_golem_statue - Waxed Weathered Copper Golem Statue - minecraft:cardinal_direction="south"|"west"|"north"|"east"
waxed_weathered_copper_grate - Waxed Weathered Copper Grate
waxed_weathered_copper_lantern - Waxed Weathered Copper Lantern - hanging=true|false
waxed_weathered_copper_trapdoor - Waxed Weathered Copper Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
waxed_weathered_cut_copper - Waxed Weathered Cut Copper
waxed_weathered_cut_copper_slab - Waxed Weathered Cut Copper Slab - minecraft:vertical_half="bottom"|"top"
waxed_weathered_cut_copper_stairs - Waxed Weathered Cut Copper Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
waxed_weathered_double_cut_copper_slab - Waxed Weathered Cut Copper Double Slab - minecraft:vertical_half="bottom"|"top"
waxed_weathered_lightning_rod - Waxed Weathered Lightning Rod - facing_direction=0..5; powered_bit=true|false
weathered_chiseled_copper - Weathered Chiseled Copper
weathered_copper - Weathered Copper
weathered_copper_bars - Weathered Copper Bars - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
weathered_copper_bulb - Weathered Copper Bulb - lit=true|false; powered_bit=true|false
weathered_copper_chain - Weathered Copper Chain - pillar_axis="y"|"x"|"z"
weathered_copper_chest - Weathered Copper Chest - minecraft:cardinal_direction="south"|"west"|"north"|"east"
weathered_copper_door - Weathered Copper Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
weathered_copper_golem_statue - Weathered Copper Golem Statue - minecraft:cardinal_direction="south"|"west"|"north"|"east"
weathered_copper_grate - Weathered Copper Grate
weathered_copper_lantern - Weathered Copper Lantern - hanging=true|false
weathered_copper_trapdoor - Weathered Copper Trapdoor - direction=0..3; open_bit=true|false; upside_down_bit=true|false
weathered_cut_copper - Weathered Cut Copper
weathered_cut_copper_slab - Weathered Cut Copper Slab - minecraft:vertical_half="bottom"|"top"
weathered_cut_copper_stairs - Weathered Cut Copper Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
weathered_double_cut_copper_slab - Weathered Cut Copper Double Slab - minecraft:vertical_half="bottom"|"top"
weathered_lightning_rod - Weathered Lightning Rod - facing_direction=0..5; powered_bit=true|false
web - Cobweb
weeping_vines - Weeping Vines - weeping_vines_age=0..25
wet_sponge - Wet Sponge
wheat - Crops - growth=0..7
white_candle - White Candle - candles=0..3; lit=true|false
white_candle_cake - Cake with White Candle - lit=true|false
white_carpet - White Carpet
white_concrete - White Concrete
white_concrete_double_slab - White Concrete Double Slab - minecraft:vertical_half="bottom"|"top"
white_concrete_powder - White Concrete Powder
white_concrete_slab - White Concrete Slab - minecraft:vertical_half="bottom"|"top"
white_concrete_stairs - White Concrete Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
white_glazed_terracotta - White Glazed Terracotta - facing_direction=0..5
white_shulker_box - White Shulker Box
white_stained_glass - White Stained Glass
white_stained_glass_pane - White Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
white_terracotta - White Terracotta
white_tulip - White Tulip
white_wool - White Wool
white_wool_double_slab - White Wool Double Slab - minecraft:vertical_half="bottom"|"top"
white_wool_slab - White Wool Slab - minecraft:vertical_half="bottom"|"top"
white_wool_stairs - White Wool Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
wildflowers - Wildflowers - growth=0..7; minecraft:cardinal_direction="south"|"west"|"north"|"east"
wither_rose - Wither Rose
wither_skeleton_skull - Wither Skeleton Skull - facing_direction=0..5
wooden_button - Oak Button - button_pressed_bit=true|false; facing_direction=0..5
wooden_door - Wooden Door - door_hinge_bit=true|false; minecraft:cardinal_direction="south"|"west"|"north"|"east"; open_bit=true|false; upper_block_bit=true|false
wooden_pressure_plate - Oak Pressure Plate - redstone_signal=0..15
yellow_candle - Yellow Candle - candles=0..3; lit=true|false
yellow_candle_cake - Cake with Yellow Candle - lit=true|false
yellow_carpet - Yellow Carpet
yellow_concrete - Yellow Concrete
yellow_concrete_double_slab - Yellow Concrete Double Slab - minecraft:vertical_half="bottom"|"top"
yellow_concrete_powder - Yellow Concrete Powder
yellow_concrete_slab - Yellow Concrete Slab - minecraft:vertical_half="bottom"|"top"
yellow_concrete_stairs - Yellow Concrete Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
yellow_glazed_terracotta - Yellow Glazed Terracotta - facing_direction=0..5
yellow_poplar_leaves - Yellow Poplar Leaves - persistent_bit=true|false; update_bit=true|false
yellow_shulker_box - Yellow Shulker Box
yellow_stained_glass - Yellow Stained Glass
yellow_stained_glass_pane - Yellow Stained Glass Pane - minecraft:connection_east=true|false; minecraft:connection_north=true|false; minecraft:connection_south=true|false; minecraft:connection_west=true|false
yellow_terracotta - Yellow Terracotta
yellow_wool - Yellow Wool
yellow_wool_double_slab - Yellow Wool Double Slab - minecraft:vertical_half="bottom"|"top"
yellow_wool_slab - Yellow Wool Slab - minecraft:vertical_half="bottom"|"top"
yellow_wool_stairs - Yellow Wool Stairs - minecraft:corner="none"|"inner_left"|"inner_right"|"outer_left"|"outer_right"; upside_down_bit=true|false; weirdo_direction=0..3
zombie_head - Zombie Head - facing_direction=0..5
