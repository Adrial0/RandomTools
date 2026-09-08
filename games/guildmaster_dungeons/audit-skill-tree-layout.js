const fs=require('node:fs'),vm=require('node:vm');
const context={console,localStorage:{getItem(){return null},setItem(){}},document:{querySelector(){return null},body:{insertAdjacentHTML(){}}},performance:{now:()=>0},requestAnimationFrame:()=>0,cancelAnimationFrame(){},setTimeout(){},setInterval(){},clearInterval(){},fetch:async()=>({ok:false}),Image:function(){}};
vm.createContext(context);
let source=fs.readFileSync(__dirname+'/game.js','utf8').replace(/init\(\);\s*$/,'');
source+=';globalThis.auditNodes=classSkillNodes("Warrior");globalThis.auditLinks=skillRequirementLinks;';
vm.runInContext(source,context);
const nodes=JSON.parse(JSON.stringify(context.auditNodes)),byId=Object.fromEntries(nodes.map(node=>[node.id,node]));
const size=node=>({w:node.major?200:node.basic?126:180,h:node.major?112:node.basic?66:92});
const links=nodes.flatMap(node=>context.auditLinks(node).filter(id=>byId[id]).map(id=>({from:byId[id],to:node})));
const orient=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const segmentsCross=(a,b,c,d)=>orient(a,b,c)*orient(a,b,d)<0&&orient(c,d,a)*orient(c,d,b)<0;
const segmentHitsRect=(a,b,node)=>{const {w,h}=size(node),left=node.x-w/2-8,right=node.x+w/2+8,top=node.y-h/2-8,bottom=node.y+h/2+8;if((a.x<left&&b.x<left)||(a.x>right&&b.x>right)||(a.y<top&&b.y<top)||(a.y>bottom&&b.y>bottom))return false;const corners=[{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}];return(a.x>=left&&a.x<=right&&a.y>=top&&a.y<=bottom)||(b.x>=left&&b.x<=right&&b.y>=top&&b.y<=bottom)||corners.some((corner,index)=>segmentsCross(a,b,corner,corners[(index+1)%4]))};
const outside=nodes.filter(node=>{const {w,h}=size(node);return node.x-w/2<0||node.y-h/2<0||node.x+w/2>4400||node.y+h/2>4400});
const nodeHits=links.flatMap(link=>nodes.filter(node=>node.id!==link.from.id&&node.id!==link.to.id&&segmentHitsRect(link.from,link.to,node)).map(node=>`${link.from.layoutId||link.from.id} -> ${link.to.layoutId||link.to.id} crosses ${node.layoutId||node.id}`));
const lineHits=[];for(let i=0;i<links.length;i++)for(let j=i+1;j<links.length;j++){const a=links[i],b=links[j];if([a.from.id,a.to.id].some(id=>id===b.from.id||id===b.to.id))continue;if(segmentsCross(a.from,a.to,b.from,b.to))lineHits.push(`${a.from.layoutId||a.from.id} -> ${a.to.layoutId||a.to.id} crosses ${b.from.layoutId||b.from.id} -> ${b.to.layoutId||b.to.id}`)}
const xs=nodes.flatMap(node=>{const {w}=size(node);return[node.x-w/2,node.x+w/2]}),ys=nodes.flatMap(node=>{const {h}=size(node);return[node.y-h/2,node.y+h/2]});
console.log(JSON.stringify({bounds:{left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)},outside:outside.map(node=>node.layoutId||node.id),nodeHits,lineHits},null,2));
if(process.argv.includes('--positions'))console.log(nodes.map(({id,layoutId,x,y,requires})=>({id,layoutId,x:Math.round(x),y:Math.round(y),requires})).filter(node=>/blood|affliction|aether|mana|resolute|ring-gateway|ring-[0-6]|attribute-(str|dex|int)-(5|6|9|10|11|14|15|16|17)|class-3/.test(`${node.id} ${node.layoutId}`)));
if(outside.length||nodeHits.length||lineHits.length)process.exitCode=1;
