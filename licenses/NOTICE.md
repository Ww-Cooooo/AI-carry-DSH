# Direct UI dependencies and bundled font

Verified 2026-11-09 against npm registry metadata, installed packages and official upstream documentation.

| Component | Version | License text |
|---|---|---|
| Ant Design | 6.7.0 | AntDesign-MIT.txt |
| Ant Design Icons | 6.3.4 | AntDesignIcons-MIT.txt |
| GSAP | 3.15.1 | GSAP-Standard-License.txt |
| @gsap/react | 2.1.2 | GSAP-Standard-License.txt |
| Lenis | 1.3.27 | Lenis-MIT.txt |
| AntV G6 | 5.1.1 | G6-MIT.txt |
| Pts | 1.0.3 | Pts-Apache-2.0.txt |
| Noto Sans SC variable | Font revision 2.004; exact source and distributed hashes in ../assets/fonts/manifest.json | NotoSansSC-OFL.txt |

The GSAP runtime and its React integration use the GSAP Standard “No Charge” License, not MIT. The captured text is from https://gsap.com/community/standard-license/; effective 2025-04-30, last modified 2025-05-30, retrieved 2026-11-09. Its source HTML is retained for provenance; the plain-text license is suitable for the distributed notices.

Noto Sans SC was obtained from the official google/fonts repository and converted to WOFF2 with fontTools 4.63.0 and Brotli 1.2.1. All upstream glyphs, character mappings, names and metrics are preserved; no guessed CJK subset was created. The SIL OFL 1.1 remains attached to the font. Source copyright: Copyright 2014-2021 Adobe, with Reserved Font Name “Source”. The primary family name remains Noto Sans SC.

React Bits, Uiverse, Anime.js and Aceternity examples were researched for behavior and adaptation ideas. Their component source code was not copied into the plugin by this research task. They are not additional runtime dependencies.

This list covers the direct UI dependencies and the chosen font only. Before packaging, generate or check notices for every transitive dependency actually bundled by the production build. Preserve package copyright/license comments. Exclude font build tools, backup downloads and research screenshots from the runtime package.
