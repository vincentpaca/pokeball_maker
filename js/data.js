/* ============================================================
   DATA  — berries, types, biomes, pokémon, tiers
   ============================================================ */
var GAME = GAME || {};

/* ---- Tiers ----
   rare < legendary < mythical < ultra-beast
   Each tier has a base difficulty (higher = harder catch) and berry reward weight.
*/
GAME.TIERS = {
  rare:       { label:"Rare",        color:"#41a6f6", difficulty:18, order:0, rewardMult:1   },
  legendary:  { label:"Legendary",   color:"#ffcd75", difficulty:34, order:1, rewardMult:2   },
  mythical:   { label:"Mythical",    color:"#94a2d8", difficulty:48, order:2, rewardMult:3   },
  ub:         { label:"Ultra Beast", color:"#b13e53", difficulty:60, order:3, rewardMult:4   },
};

/* ---- Pokémon types (for color + affinity) ---- */
GAME.TYPES = {
  normal:{c:"#a8a878"}, fire:{c:"#f08030"}, water:{c:"#6890f0"}, electric:{c:"#f8b830"},
  grass:{c:"#78c850"}, ice:{c:"#98d8d8"}, fighting:{c:"#c03028"}, poison:{c:"#a040a0"},
  ground:{c:"#e0c068"}, flying:{c:"#a890f0"}, psychic:{c:"#f85888"}, bug:{c:"#a8b820"},
  rock:{c:"#b8a038"}, ghost:{c:"#705898"}, dragon:{c:"#7038f8"}, dark:{c:"#705848"},
  steel:{c:"#b8b8d0"}, fairy:{c:"#ee99ac"},
};

/* ---- Berries ----
   flavors map to ball stats:
     sweet   -> catchRate
     spicy   -> lure (encounter chance + tier push)
     dry     -> legendary bias
     bitter  -> mythical bias
     sour    -> ultra-beast bias
   Each berry also has a type affinity (which type it lures) and a color.
*/
GAME.BERRIES = [
  {id:"oran",   name:"Oran",   c:"#3a7bd5", flavors:{sweet:2},                  type:"water"},
  {id:"sitrus", name:"Sitrus", c:"#f6c844", flavors:{sweet:3},                  type:"normal"},
  {id:"pecha",  name:"Pecha",  c:"#f49ac2", flavors:{sweet:2,sour:1},           type:"fairy"},
  {id:"rawst",  name:"Rawst",  c:"#5fbf5f", flavors:{bitter:2},                 type:"grass"},
  {id:"aspear", name:"Aspear", c:"#e6c84a", flavors:{bitter:2,sweet:1},         type:"electric"},
  {id:"leppa",  name:"Leppa",  c:"#e8483b", flavors:{spicy:2},                  type:"fire"},
  {id:"chesto", name:"Chesto", c:"#7a5cb8", flavors:{dry:2},                    type:"psychic"},
  {id:"persim", name:"Persim", c:"#e89a3b", flavors:{dry:2,sweet:1},            type:"fighting"},
  {id:"razz",   name:"Razz",   c:"#d83b4a", flavors:{spicy:3},                  type:"fire"},
  {id:"bluk",   name:"Bluk",   c:"#8a4fb8", flavors:{bitter:3},                 type:"poison"},
  {id:"nanab",  name:"Nanab",  c:"#e8b478", flavors:{sweet:2,spicy:1},          type:"ground"},
  {id:"wepear", name:"Wepear", c:"#c8d878", flavors:{sour:2},                   type:"flying"},
  {id:"pinap",  name:"Pinap",  c:"#f4d848", flavors:{sour:3},                   type:"bug"},
  {id:"cornn",  name:"Cornn",  c:"#9a7fd8", flavors:{dry:3},                    type:"dragon"},
  {id:"magost", name:"Magost", c:"#e8789a", flavors:{sour:2,sweet:1},           type:"fairy"},
  {id:"rabuta", name:"Rabuta", c:"#f08840", flavors:{bitter:2,spicy:1},         type:"ghost"},
  {id:"nomel",  name:"Nomel",  c:"#88c848", flavors:{spicy:2,sour:1},           type:"grass"},
  {id:"spelon", name:"Spelon", c:"#ff5a3c", flavors:{spicy:5,dry:2},            type:"dragon", rare:true},
  {id:"pamtre", name:"Pamtre", c:"#c44ad8", flavors:{dry:5,bitter:2},           type:"psychic", rare:true},
  {id:"watmel", name:"Watmel", c:"#ff7ab0", flavors:{sweet:5,sour:2},           type:"fairy",  rare:true},
];

/* ---- Biomes ----
   palette: [skyTop, skyBot, ground, accent, foliage, water]
   pool: pokemon id -> weight within the biome
   tierWeights: relative chance of each tier appearing (before ball bias)
   features: terrain doodads used by the procedural scene
*/
GAME.BIOMES = [
  { id:"forest", name:"Verdant Forest",
    palette:["#5a8a4a","#a8d870","#4a7a3a","#c8e878","#2a5a2a","#4aa0c8"],
    tierWeights:{rare:50,legendary:30,mythical:12,ub:8},
    features:["tree","tree","bush","flower","log"],
    desc:"Sun-dappled groves humming with bug and fairy life." },
  { id:"mountain", name:"Ironpeak Range",
    palette:["#8aa0b0","#c0c8d0","#6a7080","#d0d8e0","#4a5060","#5aa0c8"],
    tierWeights:{rare:45,legendary:35,mythical:12,ub:8},
    features:["rock","rock","crystal","ledge","grass"],
    desc:"Jagged heights where steel and rock titans dwell." },
  { id:"cave", name:"Gloaming Caverns",
    palette:["#2a2a3a","#3a3a4a","#222230","#5a5a7a","#1a1a28","#3a3a5a"],
    tierWeights:{rare:40,legendary:30,mythical:18,ub:12},
    features:["stalactite","crystal","rock","puddle","mushroom"],
    desc:"Dark tunnels echoing with poison and ghost whispers." },
  { id:"ocean", name:"Coral Tides",
    palette:["#4aa0e0","#9ad0f0","#2a6aa0","#c0e8ff","#1a4a80","#3a8ad0"],
    tierWeights:{rare:50,legendary:30,mythical:12,ub:8},
    features:["wave","wave","coral","rock","shell"],
    desc:"Endless blue sheltering leviathans of the deep." },
  { id:"volcano", name:"Ember Caldera",
    palette:["#5a2a2a","#a04030","#3a1a1a","#ff8a40","#2a1010","#c04020"],
    tierWeights:{rare:40,legendary:38,mythical:14,ub:8},
    features:["lavarock","crystal","vent","rock","cinder"],
    desc:"Smoking craters where dragon-fire never sleeps." },
  { id:"sky", name:"Cloud Citadel",
    palette:["#88b8e8","#d8e8f8","#a0c0e0","#ffffff","#7090c0","#c0e0f8"],
    tierWeights:{rare:35,legendary:35,mythical:18,ub:12},
    features:["cloud","cloud","pillar","wind","crystal"],
    desc:"Floating ruins above the clouds, roost of sky legends." },
  { id:"distortion", name:"Distortion Rift",
    palette:["#4a1a5a","#8a3aa0","#2a0a3a","#e048d0","#1a0520","#6a2a8a"],
    tileTint:"#e048d0",
    tierWeights:{rare:25,legendary:25,mythical:20,ub:30},
    features:["glitch","crystal","orb","stalactite","rift"],
    desc:"A torn reality where Ultra Beasts bleed through." },
  { id:"tundra", name:"Frostfell Tundra",
    palette:["#a0c0e0","#e0f0ff","#80a0c0","#ffffff","#608090","#a0c8e8"],
    tierWeights:{rare:45,legendary:32,mythical:15,ub:8},
    features:["snowtree","icicle","rock","snowpatch","crystal"],
    desc:"Silent snowfields hiding ice-bound myths." },
  { id:"desert", name:"Sunscorch Wastes",
    palette:["#e0c878","#f0e0a0","#c8a850","#f8f0c0","#a08838","#e0c878"],
    tierWeights:{rare:45,legendary:33,mythical:14,ub:8},
    features:["dune","rock","cactus","skull","grass"],
    desc:"Blazing dunes where ground and rock giants slumber." },
  { id:"powerplant", name:"Ruined Power Plant",
    palette:["#3a4a6a","#5a7aa0","#2a3450","#f8d830","#1a2438","#4a6aa0"],
    tierWeights:{rare:35,legendary:35,mythical:18,ub:12},
    features:["coil","pipe","crystal","vent","spark"],
    desc:"Crackling ruins humming with electric legends." },
];

/* ---- Pokédex ----
   {id, name, tier, types:[...], biome bias, sprite seed, height/weight optional}
   Sprite seed drives procedural pixel art. type colors drive palette.
*/
GAME.POKEMON = [
  /* ---------- RARE (strong/common-ish "rare") ---------- */
  {id:"dragonite",  name:"Dragonite",  tier:"rare",      types:["dragon","flying"], seed:101, biomes:["ocean","sky","mountain"]},
  {id:"garchomp",   name:"Garchomp",   tier:"rare",      types:["dragon","ground"], seed:102, biomes:["mountain","desert"]},
  {id:"metagross",  name:"Metagross",  tier:"rare",      types:["steel","psychic"], seed:103, biomes:["mountain","cave","powerplant"]},
  {id:"salamence",  name:"Salamence",  tier:"rare",      types:["dragon","flying"], seed:104, biomes:["sky","mountain"]},
  {id:"tyranitar",  name:"Tyranitar",  tier:"rare",      types:["rock","dark"],     seed:105, biomes:["mountain","cave","desert"]},
  {id:"lucario",    name:"Lucario",    tier:"rare",      types:["fighting","steel"],seed:106, biomes:["mountain","forest"]},
  {id:"gyarados",   name:"Gyarados",   tier:"rare",      types:["water","flying"],  seed:107, biomes:["ocean","mountain"]},
  {id:"lapras",     name:"Lapras",     tier:"rare",      types:["water","ice"],     seed:108, biomes:["ocean","tundra"]},
  {id:"snorlax",    name:"Snorlax",    tier:"rare",      types:["normal"],          seed:109, biomes:["forest","mountain"]},
  {id:"eevee",      name:"Eevee",      tier:"rare",      types:["normal"],          seed:110, biomes:["forest","tundra"]},
  {id:"milotic",    name:"Milotic",    tier:"rare",      types:["water"],           seed:111, biomes:["ocean"]},
  {id:"flygon",     name:"Flygon",     tier:"rare",      types:["ground","dragon"], seed:112, biomes:["desert"]},
  {id:"volcarona",  name:"Volcarona",  tier:"rare",      types:["bug","fire"],      seed:113, biomes:["volcano","forest"]},
  {id:"togekiss",   name:"Togekiss",   tier:"rare",      types:["fairy","flying"],  seed:114, biomes:["sky","forest"]},
  {id:"aesclaw",    name:"Aegislash",  tier:"rare",      types:["steel","ghost"],   seed:115, biomes:["cave","powerplant"]},
  {id:"roserade",   name:"Roserade",   tier:"rare",      types:["grass","poison"],  seed:116, biomes:["forest"]},
  {id:"weavile",    name:"Weavile",    tier:"rare",      types:["dark","ice"],      seed:117, biomes:["tundra","cave"]},
  {id:"magnezone",  name:"Magnezone",  tier:"rare",      types:["electric","steel"],seed:118, biomes:["powerplant","sky"]},

  /* ---------- LEGENDARY ---------- */
  {id:"articuno",   name:"Articuno",   tier:"legendary", types:["ice","flying"],    seed:201, biomes:["tundra","sky"]},
  {id:"zapdos",     name:"Zapdos",     tier:"legendary", types:["electric","flying"],seed:202,biomes:["powerplant","sky"]},
  {id:"moltres",    name:"Moltres",    tier:"legendary", types:["fire","flying"],   seed:203, biomes:["volcano","sky"]},
  {id:"mewtwo",     name:"Mewtwo",     tier:"legendary", types:["psychic"],         seed:204, biomes:["cave","powerplant"]},
  {id:"raikou",     name:"Raikou",     tier:"legendary", types:["electric"],        seed:205, biomes:["powerplant","forest"]},
  {id:"entei",      name:"Entei",      tier:"legendary", types:["fire"],            seed:206, biomes:["volcano","forest"]},
  {id:"suicune",    name:"Suicune",    tier:"legendary", types:["water"],           seed:207, biomes:["ocean","tundra","forest"]},
  {id:"lugia",      name:"Lugia",      tier:"legendary", types:["psychic","flying"],seed:208, biomes:["ocean","sky"]},
  {id:"hooh",       name:"Ho-Oh",      tier:"legendary", types:["fire","flying"],   seed:209, biomes:["sky","volcano"]},
  {id:"regirock",   name:"Regirock",   tier:"legendary", types:["rock"],            seed:210, biomes:["desert","mountain","cave"]},
  {id:"regice",     name:"Regice",     tier:"legendary", types:["ice"],             seed:211, biomes:["tundra","cave"]},
  {id:"registeel",  name:"Registeel",  tier:"legendary", types:["steel"],           seed:212, biomes:["mountain","powerplant","cave"]},
  {id:"latias",     name:"Latias",     tier:"legendary", types:["dragon","psychic"],seed:213, biomes:["sky","ocean"]},
  {id:"latios",     name:"Latios",     tier:"legendary", types:["dragon","psychic"],seed:214, biomes:["sky","ocean"]},
  {id:"kyogre",     name:"Kyogre",     tier:"legendary", types:["water"],           seed:215, biomes:["ocean"]},
  {id:"groudon",    name:"Groudon",    tier:"legendary", types:["ground"],          seed:216, biomes:["desert","volcano"]},
  {id:"rayquaza",   name:"Rayquaza",   tier:"legendary", types:["dragon","flying"], seed:217, biomes:["sky"]},
  {id:"dialga",     name:"Dialga",     tier:"legendary", types:["steel","dragon"],  seed:218, biomes:["mountain","cave"]},
  {id:"palkia",     name:"Palkia",     tier:"legendary", types:["water","dragon"],  seed:219, biomes:["ocean","sky"]},
  {id:"giratina",   name:"Giratina",   tier:"legendary", types:["ghost","dragon"],  seed:220, biomes:["distortion","cave"]},
  {id:"reshiram",   name:"Reshiram",   tier:"legendary", types:["fire","dragon"],   seed:221, biomes:["volcano"]},
  {id:"zekrom",     name:"Zekrom",     tier:"legendary", types:["electric","dragon"],seed:222,biomes:["powerplant","volcano"]},
  {id:"kyurem",     name:"Kyurem",     tier:"legendary", types:["ice","dragon"],    seed:223, biomes:["tundra"]},
  {id:"xerneas",    name:"Xerneas",    tier:"legendary", types:["fairy"],           seed:224, biomes:["forest"]},
  {id:"yveltal",    name:"Yveltal",    tier:"legendary", types:["dark","flying"],   seed:225, biomes:["sky","cave"]},
  {id:"zygarde",    name:"Zygarde",    tier:"legendary", types:["dragon","ground"], seed:226, biomes:["cave","desert"]},
  {id:"solgaleo",   name:"Solgaleo",   tier:"legendary", types:["psychic","steel"], seed:227, biomes:["sky","powerplant"]},
  {id:"lunala",     name:"Lunala",     tier:"legendary", types:["psychic","ghost"], seed:228, biomes:["distortion","sky"]},
  {id:"necrozma",   name:"Necrozma",   tier:"legendary", types:["psychic"],         seed:229, biomes:["distortion","powerplant"]},
  {id:"zacian",     name:"Zacian",     tier:"legendary", types:["fairy","steel"],   seed:230, biomes:["sky","forest"]},
  {id:"zamazenta",  name:"Zamazenta",  tier:"legendary", types:["fighting","steel"],seed:231, biomes:["mountain","sky"]},

  /* ---------- MYTHICAL ---------- */
  {id:"mew",        name:"Mew",        tier:"mythical",  types:["psychic"],         seed:301, biomes:["forest","cave","sky"]},
  {id:"celebi",     name:"Celebi",     tier:"mythical",  types:["psychic","grass"], seed:302, biomes:["forest"]},
  {id:"jirachi",    name:"Jirachi",    tier:"mythical",  types:["steel","psychic"], seed:303, biomes:["sky","powerplant"]},
  {id:"deoxys",     name:"Deoxys",     tier:"mythical",  types:["psychic"],         seed:304, biomes:["distortion","sky"]},
  {id:"manaphy",    name:"Manaphy",    tier:"mythical",  types:["water"],           seed:305, biomes:["ocean"]},
  {id:"darkrai",    name:"Darkrai",    tier:"mythical",  types:["dark"],            seed:306, biomes:["cave","distortion"]},
  {id:"shaymin",    name:"Shaymin",    tier:"mythical",  types:["grass","flying"],  seed:307, biomes:["forest","tundra"]},
  {id:"arceus",     name:"Arceus",     tier:"mythical",  types:["normal"],          seed:308, biomes:["sky","distortion"]},
  {id:"victini",    name:"Victini",    tier:"mythical",  types:["psychic","fire"],  seed:309, biomes:["volcano","forest"]},
  {id:"keldeo",     name:"Keldeo",     tier:"mythical",  types:["water","fighting"],seed:310, biomes:["ocean","forest"]},
  {id:"meloetta",   name:"Meloetta",   tier:"mythical",  types:["normal","psychic"],seed:311, biomes:["forest","sky"]},
  {id:"genesect",   name:"Genesect",   tier:"mythical",  types:["bug","steel"],     seed:312, biomes:["powerplant","cave"]},
  {id:"diancie",    name:"Diancie",    tier:"mythical",  types:["rock","fairy"],    seed:313, biomes:["cave","mountain"]},
  {id:"hoopa",      name:"Hoopa",      tier:"mythical",  types:["psychic","ghost"], seed:314, biomes:["distortion","cave"]},
  {id:"volcanion",  name:"Volcanion",  tier:"mythical",  types:["fire","water"],    seed:315, biomes:["volcano","ocean"]},
  {id:"magearna",   name:"Magearna",   tier:"mythical",  types:["steel","fairy"],   seed:316, biomes:["powerplant","sky"]},
  {id:"marshadow",  name:"Marshadow",  tier:"mythical",  types:["fighting","ghost"],seed:317, biomes:["cave","distortion"]},
  {id:"zeraora",    name:"Zeraora",    tier:"mythical",  types:["electric"],        seed:318, biomes:["powerplant","volcano"]},
  {id:"melmetal",   name:"Melmetal",   tier:"mythical",  types:["steel"],           seed:319, biomes:["powerplant","mountain"]},

  /* ---------- ULTRA BEASTS ---------- */
  {id:"nihilego",   name:"Nihilego",   tier:"ub",        types:["rock","poison"],   seed:401, biomes:["distortion","ocean"]},
  {id:"buzzwole",   name:"Buzzwole",   tier:"ub",        types:["bug","fighting"],  seed:402, biomes:["distortion","forest"]},
  {id:"pheromosa",  name:"Pheromosa",  tier:"ub",        types:["bug","fighting"],  seed:403, biomes:["distortion","sky"]},
  {id:"xurkitree",  name:"Xurkitree",  tier:"ub",        types:["electric"],        seed:404, biomes:["distortion","powerplant"]},
  {id:"celesteela", name:"Celesteela", tier:"ub",        types:["steel","flying"],  seed:405, biomes:["distortion","sky"]},
  {id:"kartana",    name:"Kartana",    tier:"ub",        types:["grass","steel"],   seed:406, biomes:["distortion","forest"]},
  {id:"guzzlord",   name:"Guzzlord",   tier:"ub",        types:["dark","dragon"],   seed:407, biomes:["distortion","cave"]},
  {id:"naganadel",  name:"Naganadel",  tier:"ub",        types:["poison","dragon"], seed:408, biomes:["distortion","volcano"]},
  {id:"stakataka",  name:"Stakataka",  tier:"ub",        types:["rock","steel"],    seed:409, biomes:["distortion","mountain"]},
  {id:"blacephalon",name:"Blacephalon",tier:"ub",        types:["fire","ghost"],    seed:410, biomes:["distortion","volcano"]},
];

/* quick lookup */
GAME.pokeById = {};
GAME.POKEMON.forEach(p=>GAME.pokeById[p.id]=p);

/* biome -> pokemon pool (weighted by tier presence) */
GAME.biomePool = {};
GAME.BIOMES.forEach(b=>{
  const pool={};
  GAME.POKEMON.forEach(p=>{
    if(p.biomes.includes(b.id)){
      // weight: higher for rare, lower for higher tiers
      const tw = {rare:10,legendary:6,mythical:3,ub:2}[p.tier];
      pool[p.id]=tw;
    }
  });
  GAME.biomePool[b.id]=pool;
});

/* adjective + noun for procedural location names */
GAME.LOC_ADJ = ["Misty","Hidden","Ancient","Whispering","Forgotten","Sunlit","Moonlit","Shimmering","Twilight","Emerald","Crimson","Azure","Silent","Wandering","Crystal","Old","Sacred","Far","Lonely","Stormy"];
GAME.LOC_NOUN = ["Grove","Ridge","Hollow","Reach","Cape","Spire","Vale","Basin","Cliff","Meadow","Pass","Cavern","Shore","Plateau","Wellspring","Thicket","Bluff","Expanse","Ruins","Crossing"];

/* ---- National Pokédex IDs for real sprite loading ---- */
GAME.DEX = {
  // rare
  dragonite:149, garchomp:445, metagross:376, salamence:373, tyranitar:248,
  lucario:448, gyarados:130, lapras:131, snorlax:143, eevee:133,
  milotic:350, flygon:330, volcarona:637, togekiss:468, aesclaw:681,
  roserade:407, weavile:461, magnezone:462,
  // legendary
  articuno:144, zapdos:145, moltres:146, mewtwo:150, raikou:243,
  entei:244, suicune:245, lugia:249, hooh:250, regirock:377,
  regice:378, registeel:379, latias:380, latios:381, kyogre:382,
  groudon:383, rayquaza:384, dialga:483, palkia:484, giratina:487,
  reshiram:643, zekrom:644, kyurem:646, xerneas:716, yveltal:717,
  zygarde:718, solgaleo:791, lunala:792, necrozma:800, zacian:888, zamazenta:889,
  // mythical
  mew:151, celebi:251, jirachi:385, deoxys:386, manaphy:490,
  darkrai:491, shaymin:492, arceus:493, victini:494, keldeo:647,
  meloetta:648, genesect:649, diancie:719, hoopa:720, volcanion:721,
  magearna:801, marshadow:802, zeraora:807, melmetal:809,
  // ultra beasts
  nihilego:793, buzzwole:794, pheromosa:795, xurkitree:796, celesteela:797,
  kartana:798, guzzlord:799, naganadel:804, stakataka:805, blacephalon:806,
};
GAME.POKEMON.forEach(p => { p.dex = GAME.DEX[p.id]; });
