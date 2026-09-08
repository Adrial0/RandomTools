const fs=require('node:fs');
const vm=require('node:vm');

const context={
  console,
  localStorage:{getItem(){return null},setItem(){}},
  document:{querySelector(){return null},body:{insertAdjacentHTML(){}}},
  performance:{now:()=>0},requestAnimationFrame:()=>0,cancelAnimationFrame(){},
  setTimeout(){},setInterval(){},clearInterval(){},fetch:async()=>({ok:false}),Image:function(){}
};
vm.createContext(context);
let source=fs.readFileSync(__dirname+'/game.js','utf8').replace(/init\(\);\s*$/,'');
source+=';globalThis.exportNodes=classSkillNodes("Warrior");globalThis.exportLinks=skillRequirementLinks;';
vm.runInContext(source,context);

const nodes=JSON.parse(JSON.stringify(context.exportNodes));
const byId=Object.fromEntries(nodes.map(node=>[node.id,node]));
const layoutId=node=>node.layoutId||node.id;
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const wrap=(text,max=25)=>{const words=String(text).split(/\s+/),rows=[];let row='';for(const word of words){if((row+' '+word).trim().length>max&&row){rows.push(row);row=word}else row=(row+' '+word).trim()}if(row)rows.push(row);return rows.slice(0,4)};
const links=nodes.flatMap(node=>context.exportLinks(node).filter(id=>byId[id]).map(id=>({from:id,to:node.id})));
const lineSvg=links.map(link=>{const a=byId[link.from],b=byId[link.to];return `<line data-from="${esc(layoutId(a))}" data-to="${esc(layoutId(b))}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`}).join('\n');
const nodeSvg=nodes.map(node=>{const sharedId=layoutId(node),genericName=node.classSpecific?`Class Slot ${node.path.replace('class-','')}.${node.depth+1}`:node.name,genericDesc=node.classSpecific?'Class-specific name and effect appear here in game.':node.desc,width=node.major?200:node.basic?126:180,height=node.major?112:node.basic?66:92,x=-width/2,y=-height/2,shape=node.basic?'ellipse':'rect',shapeMarkup=shape==='ellipse'?`<ellipse cx="0" cy="0" rx="${width/2}" ry="${height/2}"/>`:`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${node.keystone?28:12}"/>`,titleY=node.basic?-5:y+25,descY=titleY+18;return `<g class="node ${node.basic?'basic ':''}${node.major?'major ':''}${node.keystone?'keystone ':''}${node.classSpecific?'class-specific':''}" id="node-${esc(sharedId)}" data-id="${esc(sharedId)}" data-layout-id="${esc(sharedId)}" data-x="${node.x}" data-y="${node.y}" transform="translate(${node.x} ${node.y})">
<title>${esc(genericName)} — ${esc(genericDesc)}</title>${shapeMarkup}
<text class="node-title" x="0" y="${titleY}" text-anchor="middle">${esc(genericName)}</text>
${wrap(genericDesc,node.basic?20:28).map((row,index)=>`<text class="node-desc" x="0" y="${descY+index*13}" text-anchor="middle">${esc(row)}</text>`).join('\n')}
</g>`}).join('\n');

const svg=`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="4400" height="4400" viewBox="0 0 4400 4400">
<title>Guildmaster Dungeons — Shared Editable Skill Tree Layout</title>
<desc>This layout controls every class. Drag nodes in a browser, press Save SVG, then replace skill-tree-layout.svg in the project.</desc>
<style>
  :root{background:#080706} text{pointer-events:none;user-select:none}.backdrop{fill:#0b0907}.grid{fill:url(#dots)}
  .connections line{stroke:#665749;stroke-width:5;opacity:.8}.node{cursor:grab}.node:active{cursor:grabbing}
  .node ellipse,.node rect{fill:#17110e;stroke:#90735b;stroke-width:3}.node.basic ellipse{stroke:#6e8c72}.node.class-specific rect{stroke:#a56ac5}.node.major rect{stroke-width:5;stroke:#bd78df}.node.keystone rect{stroke:#f0b652;fill:#29170d}
  .node-title{fill:#f1d495;font:bold 14px Georgia,serif}.node-desc{fill:#c2b18c;font:10px 'Courier New',monospace}
  .core polygon{fill:#2d1b0d;stroke:#efbb54;stroke-width:6}.core text{fill:#ffe09a;font:bold 19px Georgia,serif}
  .toolbar rect{fill:#1d140b;stroke:#d49d45;stroke-width:2}.toolbar text{fill:#ffe0a0;font:bold 15px Georgia,serif}.toolbar{cursor:pointer}
</style>
<defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#71532d" opacity=".35"/></pattern></defs>
<rect class="backdrop" width="4400" height="4400"/><rect class="grid" width="4400" height="4400"/>
<g class="connections">${lineSvg}</g>
<g class="core"><polygon points="2000,1918 2082,2000 2000,2082 1918,2000"/><text x="2000" y="2007" text-anchor="middle">CLASS</text></g>
<g id="nodes">${nodeSvg}</g>
<g class="toolbar" id="save" transform="translate(28 28)"><rect width="180" height="48" rx="5"/><text x="90" y="30" text-anchor="middle">Save SVG</text></g>
<text x="230" y="58" fill="#b9a983" font-family="Courier New" font-size="13">Drag nodes freely. Connections follow automatically.</text>
<script><![CDATA[
(()=>{const root=document.documentElement,nodes=document.getElementById('nodes'),lines=[...document.querySelectorAll('.connections line')];let active=null,offset=null;
const point=e=>{const p=root.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(root.getScreenCTM().inverse())};
const update=id=>{const node=document.querySelector('[data-id="'+CSS.escape(id)+'"]'),x=Number(node.dataset.x),y=Number(node.dataset.y);lines.forEach(line=>{if(line.dataset.from===id){line.x1.baseVal.value=x;line.y1.baseVal.value=y}if(line.dataset.to===id){line.x2.baseVal.value=x;line.y2.baseVal.value=y}})};
nodes.addEventListener('pointerdown',e=>{active=e.target.closest('.node');if(!active)return;const p=point(e);offset={x:p.x-Number(active.dataset.x),y:p.y-Number(active.dataset.y)};active.setPointerCapture(e.pointerId)});
nodes.addEventListener('pointermove',e=>{if(!active)return;const p=point(e),x=Math.round(p.x-offset.x),y=Math.round(p.y-offset.y);active.dataset.x=x;active.dataset.y=y;active.setAttribute('transform','translate('+x+' '+y+')');update(active.dataset.id)});
const release=()=>{active=null;offset=null};nodes.addEventListener('pointerup',release);nodes.addEventListener('pointercancel',release);
document.getElementById('save').addEventListener('click',()=>{const clone=root.cloneNode(true);clone.querySelector('#save')?.remove();const xml='<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(clone),blob=new Blob([xml],{type:'image/svg+xml'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='skill-tree-layout.svg';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});
})();
]]></script>
</svg>`;
fs.writeFileSync(__dirname+'/skill-tree-layout.svg',svg);
console.log(`Exported ${nodes.length} nodes and ${links.length} connections.`);
