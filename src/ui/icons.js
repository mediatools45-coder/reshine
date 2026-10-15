/* tool icons (inline SVG paths) */
export const ICONS = {
  hammer: '<path d="M13 4l7 7-3 3-7-7z"/><path d="M11.5 9.5L4 17l3 3 7.5-7.5"/>', punch: '<path d="M4 20l9-9"/><path d="M13 11l5-5 2 2-5 5z"/>',
  wire: '<rect x="3" y="10" width="15" height="5" rx="1.5"/><path d="M6 15v5M9 15v5M12 15v5M15 15v5M18 12h3"/>', soft: '<rect x="3" y="10" width="15" height="5" rx="1.5"/><path d="M6 15v4M9 15v4M12 15v4M15 15v4"/>', detail: '<path d="M4 20l9-9"/><path d="M13 11l3-6 3 3-6 3z"/>',
  soap: '<rect x="3" y="11" width="13" height="7" rx="2.5"/><circle cx="19" cy="7" r="2.2"/><circle cx="14" cy="6" r="1.3"/>',
  pick: '<path d="M4 20L14 10"/><path d="M11 4c5 0 9 4 9 9l-4-3-3-2z"/>', sand: '<rect x="3" y="8" width="18" height="9" rx="2"/><path d="M7 12h.01M11 12h.01M15 12h.01M9 14.5h.01M13 14.5h.01"/>',
  grind: '<circle cx="8.5" cy="15.5" r="5"/><path d="M12.5 11.5l7-7M16 4h4v4"/>', buff: '<circle cx="9" cy="15" r="6"/><circle cx="9" cy="15" r="2"/><path d="M13 11l7-7"/>',
  file: '<path d="M3 21l10-10"/><path d="M12 5l7 7M15 2l7 7-3 3-7-7z"/>', cloth: '<path d="M3 8c4-3 12 3 18 0v9c-6 3-14-3-18 0z"/>', micro: '<path d="M3 8c4-3 12 3 18 0v9c-6 3-14-3-18 0z"/><path d="M8 11v3M13 12v3"/>',
  sponge: '<rect x="4" y="7" width="16" height="11" rx="3"/><circle cx="9" cy="11" r="1"/><circle cx="14" cy="13" r="1"/>', pad: '<rect x="4" y="8" width="16" height="9" rx="3"/><path d="M7 12h10"/>',
  stain: '<path d="M5 21l8-8"/><path d="M13 13l5-6 3 3-6 5z"/>', finish: '<path d="M5 21l8-8"/><path d="M13 13l5-6 3 3-6 5z"/><path d="M3 18h3"/>',
  hand: '<path d="M8 13V6.5a1.5 1.5 0 013 0V11M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v7c0 4-2 8-6 8-3 0-4.5-2-6.5-5.5L4 12.5a1.5 1.5 0 012.5-1.5L8 13"/>',
  spray: '<rect x="7" y="9" width="8" height="12" rx="2"/><path d="M9 9V6h4v3M16 5h.01M18.5 3.5h.01M18.5 7h.01"/>', paint: '<rect x="7" y="9" width="8" height="12" rx="2"/><path d="M9 9V6h4v3M17 4l4 1M17 7l4 .5"/>',
  oil: '<path d="M6 20h9l2-9H8z"/><path d="M15 11l5-5"/>', water: '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/>',
  screw: '<path d="M3 21l9-9"/><path d="M12 12l4-4 4 1-1-4-4-1-4 4"/>', pry: '<path d="M3 20l11-11"/><path d="M14 9l4-5 3 3-5 4z"/>',
  tweez: '<path d="M4 20L14 6l2 1L8 21zM20 20L10 6 8 7l8 14z"/>', puller: '<path d="M7 20V9M17 20V9M7 9a5 5 0 0110 0"/>', pliers: '<path d="M6 21l5-9M18 21l-5-9"/><path d="M11 12L8 3M13 12l3-9"/>',
  sandgun: '<path d="M3 11h11v5H3zM14 12h5l2-2M7 16v4"/>', shiner: '<path d="M6 20h12v-8l-3-3H9l-3 3z"/><path d="M9 6V3h6v3"/>', compound: '<path d="M6 20h12v-8l-3-3H9l-3 3z"/><path d="M10 14h4"/>',
  vacuum: '<path d="M4 20l8-8"/><path d="M12 12a4 4 0 118 0v8h-8z"/>', blower: '<path d="M3 12h10"/><path d="M13 8h5a4 4 0 010 8h-5z"/><path d="M5 8c2 0 2 2 4 2M5 16c2 0 2-2 4-2"/>',
  filler: '<path d="M4 20l5-5"/><rect x="9" y="5" width="6" height="12" rx="1" transform="rotate(45 12 11)"/>', press: '<path d="M12 3v9"/><rect x="6" y="12" width="12" height="4" rx="2"/><path d="M4 20h16"/>',
  heat: '<path d="M8 20c-2-3 0-5 2-7s2-5 0-7c4 1 7 5 6 9-1 3-4 5-8 5z"/>', bath: '<path d="M13 2L5 14h6l-1 8 9-12h-6z"/>', magnify: '<circle cx="10" cy="10" r="6.5"/><path d="M15 15l6 6"/>',
  torch: '<path d="M9 21h6v-9H9z"/><path d="M10 12V8h4v4M12 8c-2-2 0-4 0-6 2 2 2 4 0 6"/>', lighter: '<rect x="8" y="10" width="8" height="11" rx="2"/><path d="M12 10c-2-2 0-4 0-7 2 2 2 4 0 7"/>',
  chisel: '<path d="M14 3l3 3-9 9-3-3z"/><path d="M5 12l-2 6 6-2"/>', scraper: '<path d="M4 20h8l-2-6H6z"/><path d="M8 14l8-10 3 2-8 9"/>', laser: '<rect x="7" y="3" width="10" height="7" rx="2"/><path d="M12 10v4M12 17v4M9 21h6"/>',
  snips: '<circle cx="7" cy="18" r="3"/><circle cx="17" cy="18" r="3"/><path d="M8 15l8-12M16 15L8 3"/>', stone: '<rect x="3" y="9" width="18" height="6" rx="1.5"/><path d="M3 12h18"/>', uv: '<rect x="4" y="5" width="16" height="5" rx="1.5"/><path d="M7 14l-1 3M12 14v4M17 14l1 3"/>',
  slider: '<path d="M12 3v18M7 8l-4 4 4 4M17 8l4 4-4 4"/>', crown: '<circle cx="12" cy="12" r="6"/><path d="M12 6V3M18 12h3"/>', none: '<circle cx="12" cy="12" r="3"/>'
};
export const ico = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ICONS.hand}</svg>`;

