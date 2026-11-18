/**
 * SVG sprites for WhackAMoleDemo (they replace the original erba/head/rear PNGs).
 * Exposed as data URLs: the page is assembled into a single script, there is no folder to load image files from.
 * Every sprite is 100x100 and shares the same hole, so swapping them doesn't shift anything.
 */
const MolesSprites = (() => {
    const svg = (body) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`
    );

    // the hole, drawn first
    const HOLE = `
        <ellipse cx="50" cy="78" rx="38" ry="12" fill="#5a3d1e"/>
        <ellipse cx="50" cy="76" rx="31" ry="8" fill="#24180c"/>`;

    // front edge of the hole, drawn over the mole so it looks like it's coming out of the ground
    const LIP = `<path d="M10 80 Q50 92 90 80 L92 88 Q50 102 8 88 Z" fill="#5a3d1e"/>`;

    const GRASS = `
        ${HOLE}
        <g fill="#6fbf4a">
            <path d="M8 96 L12 70 L17 96 Z"/>
            <path d="M16 96 L23 64 L27 96 Z"/>
            <path d="M74 96 L79 66 L83 96 Z"/>
            <path d="M84 96 L90 72 L93 96 Z"/>
            <path d="M40 98 L45 84 L49 98 Z"/>
            <path d="M55 98 L60 86 L63 98 Z"/>
        </g>
        <g fill="#8fd96a">
            <path d="M4 98 L5 80 L10 98 Z"/>
            <path d="M27 98 L33 78 L35 98 Z"/>
            <path d="M66 98 L69 80 L73 98 Z"/>
            <path d="M91 98 L96 82 L97 98 Z"/>
        </g>
        <g fill="#6fbf4a" opacity=".7">
            <path d="M20 30 l3 -10 l3 10 z"/>
            <path d="M72 24 l3 -9 l3 9 z"/>
            <path d="M47 16 l2 -8 l3 8 z"/>
        </g>`;

    const HEAD = `
        ${HOLE}
        <path d="M26 80 V46 A24 24 0 0 1 74 46 V80 Z" fill="#5b4636"/>
        <ellipse cx="50" cy="30" rx="13" ry="6" fill="#6e5643"/>
        <ellipse cx="50" cy="60" rx="15" ry="11" fill="#9c7b61"/>
        <circle cx="40" cy="43" r="4" fill="#111"/>
        <circle cx="60" cy="43" r="4" fill="#111"/>
        <circle cx="41.4" cy="41.6" r="1.4" fill="#fff"/>
        <circle cx="61.4" cy="41.6" r="1.4" fill="#fff"/>
        <g stroke="#2b1f15" stroke-width="1.1" stroke-linecap="round">
            <path d="M36 56 L20 52 M36 59 L19 60 M64 56 L80 52 M64 59 L81 60"/>
        </g>
        <ellipse cx="50" cy="53" rx="6.5" ry="4.5" fill="#f48fb1"/>
        <ellipse cx="47.6" cy="53.6" rx="1.2" ry="1" fill="#b4486f"/>
        <ellipse cx="52.4" cy="53.6" rx="1.2" ry="1" fill="#b4486f"/>
        <path d="M44 62 Q50 67 56 62" stroke="#3e2f24" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <rect x="46.8" y="64.2" width="3" height="4.5" rx=".8" fill="#fff"/>
        <rect x="50.2" y="64.2" width="3" height="4.5" rx=".8" fill="#fff"/>
        ${LIP}
        <g fill="#f4a3b8">
            <ellipse cx="33" cy="80" rx="8" ry="4.5"/>
            <ellipse cx="67" cy="80" rx="8" ry="4.5"/>
        </g>
        <g stroke="#b4486f" stroke-width="1" stroke-linecap="round">
            <path d="M28 79 v3 M32 78.5 v3.5 M36 78.5 v3.5 M64 78.5 v3.5 M68 78.5 v3.5 M72 79 v3"/>
        </g>`;

    // diving head first: rump, pink tail and hind feet in the air
    const REAR = `
        ${HOLE}
        <g stroke="#5b4636" stroke-width="8" stroke-linecap="round">
            <path d="M30 64 L16 40"/>
            <path d="M70 64 L84 40"/>
        </g>
        <g fill="#f4a3b8">
            <ellipse cx="14" cy="34" rx="5.5" ry="8" transform="rotate(-25 14 34)"/>
            <ellipse cx="86" cy="34" rx="5.5" ry="8" transform="rotate(25 86 34)"/>
            <circle cx="8" cy="26.5" r="2"/>
            <circle cx="11" cy="24.5" r="2"/>
            <circle cx="14.5" cy="25.5" r="2"/>
            <circle cx="85.5" cy="25.5" r="2"/>
            <circle cx="89" cy="24.5" r="2"/>
            <circle cx="92" cy="26.5" r="2"/>
        </g>
        <path d="M24 80 V58 A13 13 0 0 1 50 58 A13 13 0 0 1 76 58 V80 Z" fill="#5b4636"/>
        <ellipse cx="35" cy="51" rx="6" ry="3.5" fill="#7a604b"/>
        <ellipse cx="65" cy="51" rx="6" ry="3.5" fill="#7a604b"/>
        <path d="M50 58 V74" stroke="#3e2f24" stroke-width="2" stroke-linecap="round"/>
        <path d="M50 58 Q47 48 54 42" stroke="#f48fb1" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        ${LIP}`;

    return Object.freeze({
        grass: svg(GRASS),
        head: svg(HEAD),
        rear: svg(REAR),
    });
})();
