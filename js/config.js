// Atlas at War — tunable configuration. Multiple continent maps; each is a set of
// merged territories (one or more countries), grouped into regions for hold bonuses.

export const API_URL =
  "https://api.mapjson.com/v1/geo?layer=countries&detail=medium" +
  "&properties=name,iso2,borders&format=topojson";

// ── Maps ─────────────────────────────────────────────────────────────
// territories: { id, name, region, members:[iso2] }
// seaRoutes: country-level [isoA, isoB] pairs mapped onto their territories.
export const MAPS = {
  europe: {
    name: "Europe",
    regionBonus: { "West": 4, "Mediterranean": 3, "Balkans": 3, "East": 5, "North": 4 },
    seaRoutes: [["SE", "DK"]],
    territories: [
      { id: "france",         name: "France",         region: "West",          members: ["FR"] },
      { id: "germany",        name: "Germany",        region: "West",          members: ["DE"] },
      { id: "lowlands",       name: "Low Countries",  region: "West",          members: ["BE", "NL"] },
      { id: "alpine",         name: "Alpine",         region: "West",          members: ["AT", "CH"] },
      { id: "iberia",         name: "Iberia",         region: "Mediterranean", members: ["ES", "PT"] },
      { id: "italy",          name: "Italy",          region: "Mediterranean", members: ["IT"] },
      { id: "greece",         name: "Greece",         region: "Mediterranean", members: ["GR"] },
      { id: "adriatic",       name: "Adriatic",       region: "Balkans",       members: ["SI", "HR", "BA", "ME"] },
      { id: "serbia",         name: "Serbia",         region: "Balkans",       members: ["RS", "XK", "MK", "AL"] },
      { id: "bulgaria",       name: "Bulgaria",       region: "Balkans",       members: ["BG"] },
      { id: "poland",         name: "Poland",         region: "East",          members: ["PL"] },
      { id: "czechoslovakia", name: "Czechoslovakia", region: "East",          members: ["CZ", "SK"] },
      { id: "hungary",        name: "Hungary",        region: "East",          members: ["HU"] },
      { id: "romania",        name: "Romania",        region: "East",          members: ["RO", "MD"] },
      { id: "ukraine",        name: "Ukraine",        region: "East",          members: ["UA"] },
      { id: "belarus",        name: "Belarus",        region: "East",          members: ["BY"] },
      { id: "scandinavia",    name: "Scandinavia",    region: "North",         members: ["NO", "SE"] },
      { id: "finland",        name: "Finland",        region: "North",         members: ["FI"] },
      { id: "denmark",        name: "Denmark",        region: "North",         members: ["DK"] },
      { id: "baltics",        name: "Baltics",        region: "North",         members: ["EE", "LV", "LT"] },
    ],
  },

  africa: {
    name: "Africa",
    regionBonus: { "Northern Africa": 5, "Western Africa": 5, "Middle Africa": 5, "Eastern Africa": 5, "Southern Africa": 3 },
    seaRoutes: [],
    territories: [
      { id: "morocco",         name: "Morocco",          region: "Northern Africa", members: ["MA", "EH"] },
      { id: "algeria",         name: "Algeria",          region: "Northern Africa", members: ["DZ", "TN"] },
      { id: "libya",           name: "Libya",            region: "Northern Africa", members: ["LY"] },
      { id: "egypt",           name: "Egypt",            region: "Northern Africa", members: ["EG"] },
      { id: "sudan",           name: "Sudan",            region: "Northern Africa", members: ["SD"] },
      { id: "mali",            name: "Mali & Mauritania",region: "Western Africa",  members: ["MR", "ML"] },
      { id: "niger",           name: "Niger",            region: "Western Africa",  members: ["NE"] },
      { id: "nigeria",         name: "Nigeria",          region: "Western Africa",  members: ["NG", "BJ"] },
      { id: "volta",           name: "Volta",            region: "Western Africa",  members: ["BF", "GH", "TG"] },
      { id: "ivory_coast",     name: "Ivory Coast",      region: "Western Africa",  members: ["CI", "LR", "SL"] },
      { id: "senegambia",      name: "Senegambia",       region: "Western Africa",  members: ["SN", "GM", "GW", "GN"] },
      { id: "dr_congo",        name: "DR Congo",         region: "Middle Africa",   members: ["CD"] },
      { id: "chad",            name: "Chad",             region: "Middle Africa",   members: ["TD"] },
      { id: "car",             name: "Central Africa",   region: "Middle Africa",   members: ["CF"] },
      { id: "angola",          name: "Angola",           region: "Middle Africa",   members: ["AO"] },
      { id: "cameroon",        name: "Cameroon",         region: "Middle Africa",   members: ["CM", "GQ"] },
      { id: "congo_gabon",     name: "Congo-Gabon",      region: "Middle Africa",   members: ["CG", "GA"] },
      { id: "horn",            name: "Horn of Africa",   region: "Eastern Africa",  members: ["ET", "ER", "DJ", "SO"] },
      { id: "kenya",           name: "Kenya",            region: "Eastern Africa",  members: ["KE"] },
      { id: "south_sudan",     name: "South Sudan",      region: "Eastern Africa",  members: ["SS"] },
      { id: "great_lakes",     name: "Great Lakes",      region: "Eastern Africa",  members: ["UG", "RW", "BI"] },
      { id: "tanzania",        name: "Tanzania",         region: "Eastern Africa",  members: ["TZ"] },
      { id: "zambezi",         name: "Zambezi",          region: "Eastern Africa",  members: ["ZM", "MW", "ZW", "MZ"] },
      { id: "south_africa",    name: "South Africa",     region: "Southern Africa", members: ["ZA", "LS", "SZ"] },
      { id: "namibia",         name: "Namibia",          region: "Southern Africa", members: ["NA"] },
      { id: "botswana",        name: "Botswana",         region: "Southern Africa", members: ["BW"] },
    ],
  },

  americas: {
    name: "the Americas",
    regionBonus: { "Northern America": 2, "Central America": 3, "South America": 7 },
    seaRoutes: [],
    territories: [
      { id: "canada",     name: "Canada",         region: "Northern America", members: ["CA"] },
      { id: "usa",        name: "United States",  region: "Northern America", members: ["US"] },
      { id: "mexico",     name: "Mexico",         region: "Central America",  members: ["MX"] },
      { id: "guatemala",  name: "Guatemala",      region: "Central America",  members: ["GT", "BZ", "SV"] },
      { id: "honduras",   name: "Honduras",       region: "Central America",  members: ["HN", "NI"] },
      { id: "costa_rica", name: "Costa Rica",     region: "Central America",  members: ["CR", "PA"] },
      { id: "colombia",   name: "Colombia",       region: "South America",    members: ["CO"] },
      { id: "venezuela",  name: "Venezuela",      region: "South America",    members: ["VE"] },
      { id: "guianas",    name: "Guianas",        region: "South America",    members: ["GY", "SR", "GF"] },
      { id: "brazil",     name: "Brazil",         region: "South America",    members: ["BR"] },
      { id: "peru",       name: "Peru & Ecuador", region: "South America",    members: ["PE", "EC"] },
      { id: "bolivia",    name: "Bolivia",        region: "South America",    members: ["BO"] },
      { id: "paraguay",   name: "Paraguay",       region: "South America",    members: ["PY"] },
      { id: "chile",      name: "Chile",          region: "South America",    members: ["CL"] },
      { id: "argentina",  name: "Argentina",      region: "South America",    members: ["AR", "UY"] },
    ],
  },
};

export const DEFAULT_MAP = "europe";

export const PLAYERS = [
  { id: "you", name: "You",     color: "#3b7cb3", human: true  },
  { id: "red", name: "Crimson", color: "#b0402f", human: false },
  { id: "grn", name: "Verdant", color: "#4c8a5b", human: false },
];

export const COLORS = {
  ocean:  "#c7d6dd",
  land:   "#cabfa6", // neutral / non-playable land
  stroke: "#f2ede3",
  sea:    "#5a6b73",
};
