// Atlas at War — tunable configuration. (Europe board, merged into ~20 territories.)

export const API_URL =
  "https://api.mapjson.com/v1/geo?layer=countries&detail=medium" +
  "&properties=name,iso2,borders&format=topojson";

// ── Territories ──────────────────────────────────────────────────────
// Each playable territory is one or more countries (merged for a chunkier,
// easier-to-click board). Every member iso2 renders in the owner's colour;
// one army badge sits at the merged centroid. `region` groups territories for
// hold bonuses. Anything not listed here renders as neutral context land.
export const TERRITORIES = [
  // West
  { id: "france",         name: "France",         region: "West",          members: ["FR"] },
  { id: "germany",        name: "Germany",        region: "West",          members: ["DE"] },
  { id: "lowlands",       name: "Low Countries",  region: "West",          members: ["BE", "NL"] },
  { id: "alpine",         name: "Alpine",         region: "West",          members: ["AT", "CH"] },
  // Mediterranean
  { id: "iberia",         name: "Iberia",         region: "Mediterranean", members: ["ES", "PT"] },
  { id: "italy",          name: "Italy",          region: "Mediterranean", members: ["IT"] },
  { id: "greece",         name: "Greece",         region: "Mediterranean", members: ["GR"] },
  // Balkans
  { id: "adriatic",       name: "Adriatic",       region: "Balkans",       members: ["SI", "HR", "BA", "ME"] },
  { id: "serbia",         name: "Serbia",         region: "Balkans",       members: ["RS", "XK", "MK", "AL"] },
  { id: "bulgaria",       name: "Bulgaria",       region: "Balkans",       members: ["BG"] },
  // East
  { id: "poland",         name: "Poland",         region: "East",          members: ["PL"] },
  { id: "czechoslovakia", name: "Czechoslovakia", region: "East",          members: ["CZ", "SK"] },
  { id: "hungary",        name: "Hungary",        region: "East",          members: ["HU"] },
  { id: "romania",        name: "Romania",        region: "East",          members: ["RO", "MD"] },
  { id: "ukraine",        name: "Ukraine",        region: "East",          members: ["UA"] },
  { id: "belarus",        name: "Belarus",        region: "East",          members: ["BY"] },
  // North
  { id: "scandinavia",    name: "Scandinavia",    region: "North",         members: ["NO", "SE"] },
  { id: "finland",        name: "Finland",        region: "North",         members: ["FI"] },
  { id: "denmark",        name: "Denmark",        region: "North",         members: ["DK"] },
  { id: "baltics",        name: "Baltics",        region: "North",         members: ["EE", "LV", "LT"] },
];

// Curated ocean crossing (country-level; mapped to the owning territories).
export const SEA_ROUTES = [["SE", "DK"]]; // Øresund → Scandinavia ↔ Denmark

// Hold every territory in a region for a per-turn bonus.
export const REGION_BONUS = {
  "West": 4, "Mediterranean": 3, "Balkans": 3, "East": 5, "North": 4,
};

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
