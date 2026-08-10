// Self-contained stylesheet: the deliverable must open offline with no CDN.
module.exports = `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font:15px/1.6 "Inter","Segoe UI",system-ui,-apple-system,sans-serif;color:#1f2a33;background:#fff}
a{color:#0f7fb8}
h1,h2,h3{margin:0;font-weight:700;letter-spacing:-.01em}
code{font-family:Consolas,"SFMono-Regular",monospace;font-size:12.5px;background:#f1f4f7;padding:1px 5px;border-radius:4px}

.layout{display:flex;min-height:100vh;align-items:flex-start}

.side{width:280px;flex:none;position:sticky;top:0;height:100vh;overflow-y:auto;background:#f7f9fb;border-right:1px solid #e4eaef;padding:20px 16px}
.side-title{font-size:14.5px;font-weight:700}
.side-sub{font-size:12px;color:#7a8794;margin-top:2px}
.search{width:100%;margin:13px 0 9px;padding:8px 10px;font:13px/1.4 inherit;border:1px solid #d9e1e8;border-radius:7px;background:#fff}
.filters{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:13px}
.filt{font-size:11px;font-weight:600;padding:3px 8px;border-radius:999px;border:1px solid #d9e1e8;background:#fff;color:#5c6a77;cursor:pointer}
.filt.on{background:#1f2a33;border-color:#1f2a33;color:#fff}
.navgrp{margin-bottom:3px;border-bottom:1px solid #eaeff3}
.navgrp summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:8px 7px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#5c6a77}
.navgrp summary::-webkit-details-marker{display:none}
.navgrp summary::before{content:"›";display:inline-block;margin-right:7px;color:#a8b3bd;font-weight:700;transition:transform .12s}
.navgrp[open] summary::before{transform:rotate(90deg)}
.navgrp summary span{color:#a8b3bd;font-weight:600;font-size:11px}
.navgrp summary:hover{color:#1f2a33}
.navlink{display:flex;align-items:center;gap:6px;padding:4px 7px 4px 21px;font-size:12.5px;color:#5c6a77;border-radius:6px;text-decoration:none}
.navlink:hover{background:#eaeff4;color:#1f2a33}
.navgrp > .navlink:last-child{margin-bottom:7px}
.navlink .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dot{width:6px;height:6px;border-radius:50%;flex:none}
.dot.NEW{background:#1a9d5a}.dot.REVISED{background:#0f7fb8}.dot.UNCHANGED{background:#b6c1cb}.dot.REDUNDANT{background:#a12a1c}

.main{flex:1;min-width:0;padding:30px 36px 80px;max-width:1240px}
.pagehead{border-bottom:1px solid #e4eaef;padding-bottom:18px;margin-bottom:20px}
.pagehead h1{font-size:26px}
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

.tpl{border-top:1px solid #e4eaef;padding-top:26px;margin-top:30px;scroll-margin-top:12px}
.tpl-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.tpl h2{font-size:22px}
.chip{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:3px 8px;border-radius:999px;border:1px solid}
.chip.NEW{background:#e8f7ee;color:#12703f;border-color:#bfe6cf}
.chip.REVISED{background:#e9f4fb;color:#0d5f8c;border-color:#c3e0f1}
.chip.UNCHANGED{background:#f1f4f7;color:#5c6a77;border-color:#dde4ea}
.chip.REDUNDANT{background:#fdeceb;color:#8c2418;border-color:#f2ccc6}
.chip.soft{background:#f7f9fb;color:#5c6a77;border-color:#e0e7ec;font-weight:600;text-transform:none;letter-spacing:0}
.track{margin-left:auto;font-size:12px;font-weight:700;color:#008BC7;text-decoration:none;border:1px solid #c3e0f1;border-radius:999px;padding:3px 11px;background:#f4fafd}
.track:hover{background:#e9f4fb}
.boardlink{margin:12px 0 0;font-size:13px;color:#65727e}
.boardlink a{font-weight:600}

.meta{font-size:12.5px;color:#76838f;margin-bottom:16px;display:flex;flex-wrap:wrap;gap:5px 16px}
.meta b{color:#41505d;font-weight:600}
.ch{display:inline-block;font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:4px;margin-right:3px;border:1px solid}
.ch.on{background:#e9f4fb;color:#0d5f8c;border-color:#c3e0f1}
.ch.off{background:#f4f6f8;color:#aab5bf;border-color:#e6ebef;text-decoration:line-through}

.cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start}
@media(max-width:1060px){.cols{grid-template-columns:1fr}}
.newcol{display:flex;flex-direction:column;gap:12px;min-width:0}
.pane{border:1px solid #e4eaef;border-radius:9px;overflow:hidden;min-width:0;background:#fff}
.pane-h{background:#f7f9fb;border-bottom:1px solid #e4eaef;padding:7px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6d7b87}
.pane iframe{width:100%;height:520px;border:0;background:#fff;display:block}
.pane .scroll{height:520px;overflow:auto}
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
.push .ti{font-size:13px;font-weight:700;color:#1f2a33}
.push .bd{font-size:13px;color:#4c5a66;line-height:1.5}
.todo{color:#8a5a10}
.why ul{margin:0;padding-left:17px;font-size:13.5px;color:#4c5a66}
.why li{margin-bottom:3px}
.hide{display:none}

/* email wrapper preview */
.dc-stage{background:#eef2f6;padding:20px 14px 16px}
.dc-card{max-width:600px;margin:0 auto;background:#fff;border-radius:11px;overflow:hidden;box-shadow:0 1px 3px rgba(16,32,48,.09)}
.dc-head{display:flex;align-items:center;gap:9px;padding:20px 28px 0}
.dc-logo{display:inline-flex;align-items:center;justify-content:center;width:25px;height:25px;border-radius:6px;background:#17a2dc;color:#fff;font-size:10px;font-weight:800}
.dc-logo-dealer{width:auto;padding:0 7px;background:#5c6a77;font-size:9px;letter-spacing:.04em}
.dc-brandname{font-size:17px;font-weight:800;color:#0f1418}
.dc-mark{height:26px;width:auto;display:block}
.dc-mark-sm{height:17px;width:auto;display:inline-block;vertical-align:-3px;margin-left:4px}
.dc-mark-side{height:22px;width:auto;display:block}
.dc-cta{background:#008BC7}
.dc-help a,.dc-foot-links a{color:#008BC7}
.dc-h1{font-size:23px;line-height:1.28;color:#0f1418;padding:18px 28px 0}
.dc-body{padding:13px 28px 0}
.dc-p{margin:0 0 12px;font-size:14px;line-height:1.62;color:#47535e}
.dc-ul{margin:0 0 12px;padding-left:19px;font-size:14px;line-height:1.62;color:#47535e}
.dc-details{width:100%;border-collapse:collapse;border:1px solid #e7ecf0;margin:4px 0 14px}
.dc-dt-l,.dc-dt-v{padding:8px 12px;font-size:12.5px;border-bottom:1px solid #eef1f4}
.dc-dt-l{color:#6b7883;background:#fbfcfd}
.dc-dt-v{color:#0f1418;font-weight:700;text-align:right}
.dc-details tr:last-child td{border-bottom:0}
.dc-cta-wrap{text-align:center;padding:4px 28px}
.dc-cta{display:inline-block;background:#17a2dc;color:#fff;font-size:13.5px;font-weight:700;padding:11px 22px;border-radius:6px}
.dc-sig{padding:8px 28px 0;font-size:13.5px;line-height:1.6;color:#47535e}
.dc-rule{height:1px;background:#e7ecf0;margin:18px 28px 0}
.dc-help{padding:14px 28px 18px}
.dc-help strong{font-size:14px;color:#0f1418}
.dc-help p{margin:5px 0 0;font-size:13px;color:#47535e}
.dc-help a{color:#17a2dc}
.dc-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid #eef1f4;padding:13px 28px;flex-wrap:wrap}
.dc-foot-links{display:flex;gap:14px}
.dc-foot-links a{font-size:12px;color:#55616c;text-decoration:none}
.dc-powered{font-size:11.5px;color:#7b8894}
.dc-disclaimer{max-width:600px;margin:13px auto 0;font-size:11px;line-height:1.55;color:#8b98a4;text-align:center}
.dc-social{display:flex;justify-content:center;gap:12px;margin-top:11px}
.dc-social span{width:18px;height:18px;border-radius:4px;background:#d6dee5;color:#67737e;font-size:8.5px;font-weight:700;display:flex;align-items:center;justify-content:center}

@media print{.side{display:none}.main{max-width:none;padding:0}.tpl{break-inside:avoid}}
`;
