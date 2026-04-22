const ICON_MAP = {
  projector: "videocam",
  projectors: "videocam",
  sound_system: "musical-notes",
  soundsystem: "musical-notes",
  speaker_system: "volume-high",
  speaker: "volume-high",
  decorations: "flower",
  decoration: "flower",
  whiteboard: "easel",
  wifi: "wifi",
  wi_fi: "wifi",
  smart_tv: "tv",
  tv: "tv",
  dance_floor: "disc",
  party_lighting: "color-wand",
  microphone: "mic",
  air_conditioning: "snow",
  buffet_setup: "restaurant",
};

function normalizeName(name = "") {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getAmenityIcon(amenity) {
  const name = typeof amenity === "string" ? amenity : amenity?.name;
  const normalized = normalizeName(name);
  return ICON_MAP[normalized] || "sparkles";
}

export function getAmenityLabel(amenity) {
  if (typeof amenity === "string") return amenity;
  return amenity?.name || "Amenity";
}

export function getAmenityPrice(amenity) {
  if (!amenity) return 0;
  if (typeof amenity === "string") return 0;
  return amenity.isChargeable ? Number(amenity.price || 0) : 0;
}

export function getAmenityKey(amenity) {
  if (!amenity) return "";
  if (typeof amenity === "string") return amenity;
  return amenity._id || amenity.amenityId || amenity.name;
}

export function formatAmenityPrice(amenity) {
  return getAmenityPrice(amenity) > 0 ? `Rs. ${getAmenityPrice(amenity)}` : "Free";
}
