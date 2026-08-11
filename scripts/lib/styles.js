// Self-contained stylesheet: the deliverable must open offline with no CDN.
module.exports = `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font:15px/1.6 "Inter","Segoe UI",system-ui,-apple-system,sans-serif;color:#1f2a33;background:#fff}
a{color:#0f7fb8}
h1,h2,h3{margin:0;font-weight:700;letter-spacing:-.01em}
code{font-family:Consolas,"SFMono-Regular",monospace;font-size:12.5px;background:#f1f4f7;padding:1px 5px;border-radius:4px}

.layout{display:flex;min-height:100vh;align-items:flex-start}

.side{width:232px;flex:none;position:sticky;top:0;height:100vh;overflow-y:auto;background:#f7f9fb;border-right:1px solid #e4eaef;padding:18px 12px}
.side-title{font-size:14.5px;font-weight:700}
.side-sub{font-size:12px;color:#7a8794;margin-top:2px}
.search{width:100%;margin:13px 0 9px;padding:8px 10px;font:13px/1.4 inherit;border:1px solid #d9e1e8;border-radius:7px;background:#fff}
.filters{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:13px}
.filt{font-size:11px;font-weight:600;padding:3px 8px;border-radius:999px;border:1px solid #d9e1e8;background:#fff;color:#5c6a77;cursor:pointer}
.filt.on{background:#1f2a33;border-color:#1f2a33;color:#fff}
.navgrp{margin-bottom:3px;border-bottom:1px solid #eaeff3}
.navgrp summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:8px 7px;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#5c6a77}
.navgrp summary::-webkit-details-marker{display:none}
.navgrp summary::before{content:"›";display:inline-block;margin-right:7px;color:#a8b3bd;font-weight:700;transition:transform .12s}
.navgrp[open] summary::before{transform:rotate(90deg)}
.navgrp summary span{color:#a8b3bd;font-weight:600;font-size:11px}
.navgrp summary:hover{color:#1f2a33}
.navtop{padding-left:7px!important;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#5c6a77;margin-bottom:6px}
.navlink{display:flex;align-items:center;gap:7px;padding:4px 7px;font-size:12.5px;color:#5c6a77;border-radius:6px;text-decoration:none}
.navlink .n{flex:none;width:19px;text-align:right;font-size:10.5px;color:#b0bbc5;font-variant-numeric:tabular-nums}
.navlink.cur .n{color:#3d90bd}
.navlink .dot{margin-left:auto}
.navlink:hover{background:#eaeff4;color:#1f2a33}
.navlink.cur{background:#e7f1f8;color:#0d5f8c;font-weight:600;box-shadow:inset 2px 0 0 #008BC7}
.navgrp > .navlink:last-child{margin-bottom:7px}
.navlink .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dot{width:6px;height:6px;border-radius:50%;flex:none}
.dot.NEW{background:#1a9d5a}.dot.REVISED{background:#0f7fb8}.dot.UNCHANGED{background:#b6c1cb}.dot.REDUNDANT{background:#a12a1c}

.main{flex:1;min-width:0;padding:32px 40px 80px;max-width:1280px}
.pagehead{padding-bottom:8px;margin-bottom:24px}
.pagehead h1{font-size:24px}
.stats{display:flex;flex-wrap:wrap;gap:20px;margin:14px 0 0}
.stats div{font-size:12.5px;color:#76838f}
.stats b{display:block;font-size:20px;color:#1f2a33;line-height:1.2}

.common{border:1px solid #e4eaef;background:#fbfcfd;border-radius:9px;padding:12px 16px;margin-bottom:10px}
.common h3{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:#8b98a4;margin-bottom:7px}
.common ul{margin:0;padding-left:17px;font-size:13.5px;color:#4c5a66;columns:2;column-gap:26px}
@media(max-width:900px){.common ul{columns:1}}
.common li{margin-bottom:3px;break-inside:avoid}
.common span{color:#93a0ac;font-size:12px}
.issues{border:1px solid #f2ccc6;background:#fef6f5;border-radius:9px;padding:12px 16px;margin-bottom:26px}
.issues ul{margin:0;padding-left:18px;font-size:13.5px;color:#5b6873}
.issues li{margin-bottom:3px}

/* One template per view: the hash router toggles .active */
.tpl{display:none;padding-top:2px}
.tpl.active{display:block;animation:fade .16s ease-out}
@keyframes fade{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
.crumb{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#9aa6b1;margin-bottom:9px}
.crumb span{font-weight:600;letter-spacing:.04em;color:#b6c1cb}
.crumb span::before{content:"·";margin-right:10px}

/* Channel tabs, inside the New panel header */
.tabs{display:flex;gap:3px}
.tab{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border:1px solid transparent;border-radius:6px;background:transparent;font:700 10.5px/1 inherit;text-transform:uppercase;letter-spacing:.05em;color:#7a8794;cursor:pointer;transition:background .12s,color .12s}
.tab .ci{width:12px;height:12px;fill:currentColor}
.tab:hover{background:#eef3f7;color:#2c3a45}
.tab.on{background:#0d5f8c;color:#fff}
.tab.empty{color:#b3bec7}
.tab.empty span{text-decoration:line-through}
.tab.empty.on{background:#98a4ae;color:#fff}
/* Height is set per template by fit(), sized to the taller of the two previews
   so neither side scrolls. The value here is only the pre-measurement default. */
.panel{height:520px;overflow:hidden}
.chan{padding:16px 18px}

.pagenav{display:flex;justify-content:space-between;gap:16px;margin-top:40px}
.pagenav a{display:flex;flex-direction:column;gap:4px;max-width:47%;padding:12px 16px;border:1px solid #e4eaef;border-radius:10px;text-decoration:none;background:#fff;transition:border-color .12s,background .12s}
.pagenav a:hover{border-color:#b9ccd9;background:#fbfdfe}
.pagenav a.nx{text-align:right;margin-left:auto}
.pagenav a > span{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9aa6b1}
.pagenav a em{font-style:normal;font-size:14px;font-weight:600;color:#2c3a45}
.pagenav a em b{color:#a8b3bd;font-weight:600;margin-right:7px;font-variant-numeric:tabular-nums}
.kbd{margin-top:14px;font-size:11.5px;color:#a8b3bd}
.kbd b{font-weight:600;color:#7a8794;background:#f3f6f8;border:1px solid #e4eaef;border-radius:4px;padding:1px 5px;font-family:inherit}
.tpl-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.main:focus{outline:none}
.tpl h2{font-size:22px;line-height:1.25}
.box.wide{max-width:none}
.chip{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:3px 8px;border-radius:999px;border:1px solid}
.chip.NEW{background:#e8f7ee;color:#12703f;border-color:#bfe6cf}
.chip.REVISED{background:#e9f4fb;color:#0d5f8c;border-color:#c3e0f1}
.chip.UNCHANGED{background:#f1f4f7;color:#5c6a77;border-color:#dde4ea}
.chip.REDUNDANT{background:#fdeceb;color:#8c2418;border-color:#f2ccc6}
.chip.LAYOUT{background:#f2f0f7;color:#544273;border-color:#ddd6ea}
.dot.LAYOUT{background:#8b7aa8}
.layoutnote{margin:10px 0 0;padding-left:17px;font-size:13.5px;color:#5b6873}
.layoutnote li{margin-bottom:4px}
.chip.soft{background:#f7f9fb;color:#5c6a77;border-color:#e0e7ec;font-weight:600;text-transform:none;letter-spacing:0}
.track{margin-left:auto;font-size:12px;font-weight:700;color:#008BC7;text-decoration:none;border:1px solid #c3e0f1;border-radius:999px;padding:3px 11px;background:#f4fafd}
.track:hover{background:#e9f4fb}
.boardlink{margin:12px 0 0;font-size:13px;color:#65727e}
.boardlink a{font-weight:600}

.meta{font-size:12.5px;color:#76838f;margin-bottom:24px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 20px}
.meta b{color:#41505d;font-weight:600}
.ch{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:5px;margin-right:4px;border:1px solid}
.ch .ci{width:11px;height:11px;fill:currentColor;flex:none}
.ch.on{background:#e9f4fb;color:#0d5f8c;border-color:#c3e0f1}
.ch.off{background:#f4f6f8;color:#b3bec7;border-color:#e6ebef}
.ch.off span{text-decoration:line-through}

.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;margin-bottom:24px}
@media(max-width:1060px){.cols{grid-template-columns:1fr}}
.newcol{display:flex;flex-direction:column;gap:12px;min-width:0}
.pane{border:1px solid #e4eaef;border-radius:9px;overflow:hidden;min-width:0;background:#fff}
/* Warm ground for what exists today, cool for what replaces it. */
.pane.old{border-color:#e9e3dd}
.pane.old .pane-h{background:#f7f4f1;color:#8c8078;border-bottom-color:#eee7e1}
.pane.new{border-color:#d9e6f0}
.pane.new .pane-h{background:#eef5fa;color:#0d5f8c;border-bottom-color:#dde9f2}
.pane-h{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:37px;background:#f7f9fb;border-bottom:1px solid #e4eaef;padding:4px 8px 4px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6d7b87}
.pane iframe{width:100%;height:520px;border:0;background:#fff;display:block}
.pane .none{padding:26px 15px;text-align:center;color:#9aa6b1;font-size:13.5px}

.row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
@media(max-width:1060px){.row{grid-template-columns:1fr}}
.box{border:1px solid #e4eaef;border-radius:9px;padding:13px 15px}
.box h3{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:#8b98a4;margin-bottom:8px}
.bubble{background:#f6fbfe;border:1px solid #d3e3ee;border-radius:13px;padding:9px 13px;font-size:13.5px;line-height:1.55}
.to{font-size:11.5px;color:#8b98a4;margin-top:7px;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.ruled{font-size:13.5px;color:#5b6873;margin:0}
.push{background:#f3f5f7;border:1px solid #e0e6ea;border-radius:11px;padding:10px 13px}
.push .tx{min-width:0;display:block}
.push .ti{display:block;font-size:13px;font-weight:700;color:#1f2a33;margin-bottom:2px}
.push .bd{display:block;font-size:13px;color:#4c5a66;line-height:1.5}
.todo{color:#8a5a10}
.why ul{margin:0;padding-left:17px;font-size:13.5px;color:#4c5a66}
.why li{margin-bottom:3px}
.guide .box h3{font-size:13.5px;text-transform:none;letter-spacing:0;color:#1f2a33;margin-bottom:7px}
.guide .box ul{margin:0;padding-left:17px;font-size:13.5px;color:#4c5a66}
.guide .box li{margin-bottom:4px}
.g-scope{margin:0 0 10px;font-size:13.5px;color:#4c5a66}
.g-sig{background:#fbfcfd;border:1px solid #eaeff3;border-radius:7px;padding:10px 12px;font-size:13px;line-height:1.55;color:#47535e}
.g-note{margin:9px 0 0;font-size:12.5px;color:#76838f}
.g-disc{margin:8px 0 0;font-size:11.5px;line-height:1.5;color:#98a4ae}
.hide{display:none}

/* email wrapper preview */
.dc-stage{background:#eef2f6;padding:20px 14px 16px}
.dc-card{max-width:600px;margin:0 auto;background:#fff;border-radius:11px;overflow:hidden;box-shadow:0 1px 3px rgba(16,32,48,.09)}
.dc-head{display:flex;align-items:center;gap:9px;padding:20px 28px 0}
.dc-logo{display:inline-flex;align-items:center;justify-content:center;width:25px;height:25px;border-radius:6px;background:#17a2dc;color:#fff;font-size:10px;font-weight:800}
.dc-logo-dealer{width:auto;padding:0 7px;background:#5c6a77;font-size:9px;letter-spacing:.04em}
.dc-brandname{font-size:17px;font-weight:800;color:#0f1418}
.dc-mark{height:26px;width:auto;display:block}
.dl-ph{display:inline-flex;align-items:center;gap:9px}
.dl-mk{width:31px;height:31px;flex:none;display:block}
.dl-tx{display:flex;flex-direction:column;line-height:1}
.dl-tx b{font-size:15px;font-weight:800;letter-spacing:.01em;color:#1E3A8A;text-transform:uppercase}
.dl-tx i{font-size:8.5px;font-weight:600;font-style:normal;letter-spacing:.42em;color:#3B82F6;text-transform:uppercase;margin-top:3px}
.dc-mark-sm{height:17px;width:auto;display:inline-block;vertical-align:-3px;margin-left:4px}
.dc-mark-side{height:22px;width:auto;display:block}
.dc-h1{font-size:23px;line-height:1.28;color:#0f1418;padding:18px 28px 0}
.dc-body{padding:13px 28px 0}
.dc-p{margin:0 0 12px;font-size:14px;line-height:1.62;color:#47535e}
.dc-ul{margin:0 0 12px;padding-left:19px;font-size:14px;line-height:1.62;color:#47535e}
/* Borderless detail rows, hairline separated: uppercase label left, bold value right */
.dc-details{width:100%;border-collapse:collapse;margin:8px 0 18px}
.dc-dt-l,.dc-dt-v{padding:11px 0;border-bottom:1px solid #edf0f3;vertical-align:top}
.dc-dt-l{font-size:11px;color:#8b98a4;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.dc-dt-v{font-size:12.5px;color:#0f1418;font-weight:700;text-align:right;padding-left:14px}
.dc-details tr:last-child td{border-bottom:0}

.dc-cta-wrap{text-align:center;padding:12px 28px 4px}
.dc-cta{display:inline-block;background:#1d8fd1;color:#fff;font-size:14px;font-weight:600;padding:12px 26px;border-radius:5px}
.dc-cta-note{display:block;margin-top:12px;font-size:11.5px;color:#9aa6b1}

/* Amber assistance note */
.dc-note{display:flex;gap:10px;align-items:flex-start;margin:22px 28px 0;padding:13px 15px;background:#fdf6e9;border-radius:7px}
.dc-note-i{flex:none;width:15px;height:15px;border-radius:50%;background:#e0a83a;color:#fff;font-size:9.5px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-top:1px}
.dc-note p{margin:0;font-size:12.5px;line-height:1.55;color:#7a6432}

.dc-sig{padding:22px 28px 26px;font-size:13.5px;line-height:1.7;color:#47535e}
.dc-sig-off{color:#47535e}

/* Footer: centred links, social row, then the disclaimer */
.dc-foot{padding:20px 28px 24px;border-top:1px solid #eef1f4;text-align:center}
.dc-powered{display:flex;align-items:center;justify-content:center;gap:5px;margin-bottom:13px;font-size:11px;color:#a8b3bd}
.dc-powered .dc-mark-sm{height:14px;margin-left:0}
.dc-foot-links{display:flex;justify-content:center;align-items:center;gap:9px;flex-wrap:wrap}
.dc-foot-links a{font-size:11.5px;color:#7b8894;text-decoration:none}
.dc-foot-links a+a::before{content:"·";margin-right:9px;color:#c2ccd5}
.dc-disclaimer{margin:14px 0 0;font-size:10.5px;line-height:1.6;color:#a8b3bd;text-align:center}
.dc-social{display:flex;justify-content:center;align-items:center;gap:13px;margin-top:14px;color:#b6c1cb}
.dc-social .so{width:14px;height:14px;fill:currentColor;display:block}

@media print{.side{display:none}.main{max-width:none;padding:0}.tpl{break-inside:avoid}}
`;
