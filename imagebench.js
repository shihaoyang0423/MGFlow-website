(() => {
'use strict';
const root=document.getElementById('imagebench');
if(!root)return;
const byId=id=>root.querySelector('#ib-'+id);
const NS='http://www.w3.org/2000/svg';
const svg=byId('chart'), tip=byId('tooltip');
const state={models:[],filter:'All',scale:'log',pareto:true};
const bounds={left:76,right:1126,top:48,bottom:592,width:1160,height:680};
const brandNames={
  'local/mgflow-flux2-klein-4b':'MGFlow (4B)',
  'local/flux-3-klein-nvfp4':'FLUX.3 Klein NVFP4',
  'local/flux-3-klein-fp8':'FLUX.3 Klein FP8',
  'local/flux-3-klein-bf16':'FLUX.3 Klein BF16',
  'local/flux-3-klein-base-nvfp4':'FLUX.3 Klein Base NVFP4',
  'local/flux-3-klein-base-fp8':'FLUX.3 Klein Base FP8',
  'local/flux-3-klein-base-bf16':'FLUX.3 Klein Base BF16',
  'local/iris-3b':'IRIS-3B',
  'local/iris-3b-turbo':'IRIS-3B Turbo',
  'local/ming-image-0.1-design-6b':'Ming-Image Design',
  'local/sensenova-u1.5-8b-mot-base':'SenseNova MoT Base',
  'local/sensenova-u1.5-8b-mot-8step':'SenseNova MoT 8step',
  'local/qwen-image-2512-20b':'Qwen-Image-2512',
  'local/qwen-image-2.1-7b-nf4':'Qwen-Image-2.1 NF4',
  'local/boogu-image-turbo':'Boogu-Image Turbo',
  'local/krea-2-turbo-no-filter':'Krea 2 Turbo (no filter)'
};
function el(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
function labelOf(m){if(brandNames[m.model])return brandNames[m.model];const name=m.model.replace(/^(local|fal|replicate)\//,'').replace(/^openai\//,'').replace(/^bfl\//,'');return name.replace('flux-2-klein','FLUX.2 Klein').replace('gpt-image','GPT Image').replace('google/','').replace('bytedance/','').replace('microsoft/','');}
function revealLinkedChart(){
  if(location.hash!=='#imagebench')return;
  const gallery=document.getElementById('sample-grid');
  const reveal=()=>{
    const jump=()=>requestAnimationFrame(()=>root.scrollIntoView({behavior:'instant',block:'start'}));
    if(document.readyState==='complete')jump();else window.addEventListener('load',jump,{once:true});
  };
  if(gallery&&gallery.textContent.includes('Loading samples')){
    const ready=new MutationObserver(()=>{ready.disconnect();reveal();});
    ready.observe(gallery,{childList:true});
  }else reveal();
}
function current(){return state.models.filter(m=>state.filter==='All'||m.type===state.filter);}
// Lower latency and higher Overall are better. Identical points remain tied.
function paretoFrontier(models){return models.filter(m=>!models.some(n=>n.latency<=m.latency&&n.overall>=m.overall&&(n.latency<m.latency||n.overall>m.overall))).sort((a,b)=>a.latency-b.latency||b.overall-a.overall);}
function overlaps(a,b){return a.x<b.x+b.w+4&&a.x+a.w+4>b.x&&a.y<b.y+b.h+3&&a.y+a.h+3>b.y;}
function escapeXML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function showTip(m,event,g){const rect=root.querySelector('.chart-card').getBoundingClientRect();const point=g.getBoundingClientRect();const cx=event.clientX||point.x,cy=event.clientY||point.y;tip.innerHTML=`<strong>${escapeXML(m.model)}</strong><div class="metrics"><span>Overall</span><span>${m.overall.toFixed(1)}</span><span>Average latency</span><span>${m.latency.toFixed(1)} s</span><span>Capability</span><span>${m.capability.toFixed(1)}%</span><span>EPS</span><span>${m.eps.toFixed(1)}</span></div>${g.dataset.pareto==='true'?'<div class="frontier-status">On the Pareto frontier in this view</div>':''}<div class="route">${m.type} evaluation · click to open ImageBench ↗</div>`;tip.hidden=false;tip.style.left=Math.max(8,Math.min(cx-rect.left+15,rect.width-tip.offsetWidth-12))+'px';tip.style.top=Math.max(8,Math.min(cy-rect.top+15,rect.height-tip.offsetHeight-12))+'px';}
function render(){
  const models=current(), log=state.scale==='log';
  const frontier=paretoFrontier(models),frontierIds=new Set(frontier.map(m=>m.model));
  const mgflow=frontier.some(m=>m.model.includes('/mgflow-'));
  byId('frontier-summary').textContent=`${frontier.length} frontier models in this view.${models.some(m=>m.model.includes('/mgflow-'))?` MGFlow ${mgflow?'is':'is not'} on this frontier.`:''}`;
  byId('pareto-note').hidden=!state.pareto;
  byId('pareto-legend').hidden=!state.pareto;
  byId('count').textContent=`${models.length} ${state.filter==='All'?'models':state.filter.toLowerCase()+' models'}`;
  byId('data-count').textContent=`${models.length} entries`;
  tip.hidden=true;svg.replaceChildren();
  svg.append(el('title',{id:'ib-plot-title'},'Overall score versus average generation latency'));
  svg.append(el('desc',{id:'ib-plot-description'},`${models.length} published ${state.filter.toLowerCase()} runs. Higher and farther left is better. ${log?'Logarithmic':'Linear'} latency axis.${state.pareto?` Dashed line connects ${frontier.length} Pareto-optimal runs in this view.`:''}${models.some(m=>m.model.includes('/mgflow-'))?' MGFlow: Overall 52.8, average latency 0.8 seconds.':''}`));
  const defs=el('defs'),gradient=el('linearGradient',{id:'sweet-spot',x1:0,y1:0,x2:1,y2:1});
  for(const [offset,opacity]of [['0%','.28'],['30%','.06'],['60%','0'],['100%','0']])gradient.append(el('stop',{offset,'stop-color':'#22c55e','stop-opacity':opacity}));
  defs.append(gradient);svg.append(defs,el('rect',{x:0,y:0,width:1160,height:680,fill:'url(#sweet-spot)'}));
  svg.append(el('text',{x:86,y:27,fill:'#22c55e','font-size':12,'font-weight':700,opacity:.9},'↖ faster & higher quality'));
  const xMin=log?.16:0,xMax=log?1200:1000;
  const x=v=>bounds.left+(log?(Math.log10(v)-Math.log10(xMin))/(Math.log10(xMax)-Math.log10(xMin)):v/xMax)*(bounds.right-bounds.left);
  const y=v=>bounds.bottom-v/90*(bounds.bottom-bounds.top);
  for(let v=0;v<=90;v+=10){const yy=y(v);svg.append(el('line',{x1:bounds.left,y1:yy,x2:bounds.right,y2:yy,class:'grid'}),el('text',{x:bounds.left-13,y:yy+4,'text-anchor':'end',class:'axis-text'},v));}
  for(const v of log?[.2,.5,1,2,5,10,20,50,100,200,500,1000]:[0,200,400,600,800,1000]){const xx=x(v);svg.append(el('line',{x1:xx,y1:bounds.top,x2:xx,y2:bounds.bottom,class:'grid',opacity:.5}),el('text',{x:xx,y:bounds.bottom+25,'text-anchor':'middle',class:'axis-text'},v<1?v.toFixed(1):String(v)));}
  svg.append(el('text',{x:(bounds.left+bounds.right)/2,y:653,'text-anchor':'middle',class:'axis-title'},`Average generation latency (seconds${log?' · log scale':''})`),el('text',{transform:`translate(23 ${(bounds.top+bounds.bottom)/2}) rotate(-90)`,'text-anchor':'middle',class:'axis-title'},'Overall score'));
  if(state.pareto&&frontier.length>1){
    const unique=frontier.filter((m,i)=>i===0||m.latency!==frontier[i-1].latency||m.overall!==frontier[i-1].overall);
    const path=el('path',{d:unique.map((m,i)=>`${i?'L':'M'} ${x(m.latency)} ${y(m.overall)}`).join(' '),class:'pareto-line','aria-hidden':'true'});
    svg.append(path);
  }
  const positions=models.map(m=>({m,x:x(m.latency),y:y(m.overall),label:labelOf(m),mgflow:m.model.includes('/mgflow-'),frontier:frontierIds.has(m.model)}));
  const placed=[];
  // Labels are positioned in free space; points retain their exact data coordinates.
  const priority=positions.slice().sort((a,b)=>Number(b.mgflow)-Number(a.mgflow)||Number(b.frontier)-Number(a.frontier)||b.m.overall-a.m.overall);
  for(const p of priority){
    const width=p.label.length*(p.mgflow?7:5.7),height=p.mgflow?17:14;
    const candidates=[];
    for(let radius=0;radius<=140;radius+=14){for(const side of [1,-1]){for(const dy of radius===0?[-10]:[-radius-10,radius+4]){const xx=side===1?p.x+12:p.x-width-12;const yy=p.y+dy;candidates.push({x:xx,y:yy,w:width,h:height});}}}
    let chosen=null;
    for(const c of candidates){if(c.x<bounds.left+3||c.x+c.w>bounds.right-3||c.y<bounds.top+2||c.y+c.h>bounds.bottom-5)continue;if(placed.some(b=>overlaps(c,b)))continue;if(positions.some(q=>q!==p&&q.x>c.x-5&&q.x<c.x+c.w+5&&q.y>c.y-5&&q.y<c.y+c.h+5))continue;chosen=c;break;}
    p.labelBox=chosen;if(chosen)placed.push(chosen);
  }
  for(const p of positions.sort((a,b)=>Number(a.mgflow)-Number(b.mgflow))){
    const m=p.m,group=el('a',{class:`point${p.mgflow?' mgflow':''}${state.pareto&&p.frontier?' frontier':''}`,'data-pareto':String(p.frontier),href:m.url,target:'_blank',rel:'noopener','aria-label':`${m.model}, Overall ${m.overall}, ${m.latency} seconds, ${m.type} run.${p.frontier?' On the Pareto frontier in this view.':''} Open benchmark page.`});
    group.append(el('title',{},`${m.model}\nOverall ${m.overall} · ${m.latency} s · EPS ${m.eps}`));
    if(p.labelBox){const b=p.labelBox;const start=b.x>p.x;const tx=start?b.x:b.x+b.w;const ty=b.y+b.h*.78;group.append(el('line',{x1:p.x,y1:p.y,x2:tx,y2:ty-3,class:'leader'}),el('text',{x:tx,y:ty,'text-anchor':start?'start':'end',class:'label'},p.label));}
    group.append(el('circle',{cx:p.x,cy:p.y,r:13,fill:'transparent'}));
    if(p.mgflow)group.append(el('circle',{cx:p.x,cy:p.y,r:10,fill:'none',stroke:'#22c55e','stroke-width':1.6}));
    if(state.pareto&&p.frontier)group.append(el('circle',{cx:p.x,cy:p.y,r:7.5,class:'frontier-ring'}));
    group.append(el('circle',{cx:p.x,cy:p.y,r:p.mgflow?6:4.8,class:'dot'}));
    group.addEventListener('pointerenter',e=>showTip(m,e,group));group.addEventListener('pointermove',e=>showTip(m,e,group));group.addEventListener('pointerleave',()=>tip.hidden=true);group.addEventListener('focus',e=>showTip(m,e,group));group.addEventListener('blur',()=>tip.hidden=true);
    svg.append(group);
  }
  const rows=byId('rows');rows.replaceChildren();
  for(const m of models.slice().sort((a,b)=>b.overall-a.overall)){const tr=document.createElement('tr');if(m.model.includes('/mgflow-'))tr.className='highlight';const cell=document.createElement('td'),link=document.createElement('a');link.href=m.url;link.target='_blank';link.rel='noopener';link.textContent=m.model;cell.append(link);tr.append(cell);for(const v of [m.overall.toFixed(1),m.capability.toFixed(1)+'%',m.eps.toFixed(1),m.latency.toFixed(1)+' s']){const td=document.createElement('td');td.textContent=v;tr.append(td);}rows.append(tr);}
  root.querySelector('.mgflow-summary').hidden=state.filter==='API';
}
root.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{state.filter=button.dataset.filter;root.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();}));
byId('download').addEventListener('click',()=>{const clone=svg.cloneNode(true);clone.setAttribute('xmlns',NS);clone.setAttribute('width',bounds.width);clone.setAttribute('height',bounds.height);const css=getComputedStyle(root);for(const n of ['--background','--foreground','--muted','--border','--accent','--pareto'])clone.style.setProperty(n,css.getPropertyValue(n));const style=el('style',{},'.grid{stroke:var(--border);stroke-width:1}.axis-text{fill:var(--muted);font:12px system-ui}.axis-title{fill:var(--muted);font:14px system-ui}.label{fill:var(--foreground);font:11px system-ui}.leader{stroke:var(--foreground);opacity:.4;stroke-width:.8}.dot{fill:#22c55e;fill-opacity:.78;stroke:var(--background);stroke-width:1.5}.mgflow .label{font-size:13px;font-weight:700}.pareto-line{fill:none;stroke:var(--pareto);stroke-width:2;stroke-dasharray:7 5;stroke-linejoin:round;stroke-linecap:round}.frontier-ring{fill:none;stroke:var(--pareto);stroke-width:1.2}.frontier .dot{fill-opacity:1}');clone.prepend(el('rect',{x:0,y:0,width:bounds.width,height:bounds.height,fill:css.getPropertyValue('--background').trim()}),style);const blob=new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`imagebench-overall-latency-${state.filter.toLowerCase()}-${state.scale}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
fetch('imagebench-data.json?v=20261021').then(r=>{if(!r.ok)throw new Error('Snapshot unavailable');return r.json();}).then(data=>{state.models=data.models;render();revealLinkedChart();}).catch(()=>byId('load-error').hidden=false);
root.addEventListener('keydown',event=>{if(event.key==='Escape')tip.hidden=true;});
})();
