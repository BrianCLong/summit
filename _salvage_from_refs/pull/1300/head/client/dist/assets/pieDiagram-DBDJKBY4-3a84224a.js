import{p as H}from"./chunk-ANTBXLJU-57991e18.js";import{ae as S,a6 as z,aI as J,C as Z,n as q,o as K,s as Q,g as X,c as Y,b as ee,_ as g,l as F,t as te,d as ae,D as re,H as ne,T as ie,aJ as se,k as le}from"./index-9fe5d049.js";import{p as oe}from"./mermaid-parser.core-192d8531.js";import{d as R}from"./arc-98815852.js";import"./_baseUniq-0830d111.js";import"./_basePickBy-6519264b.js";import"./clone-2ea79de7.js";function ce(e,a){return a<e?-1:a>e?1:a>=e?0:NaN}function ue(e){return e}function pe(){var e=ue,a=ce,f=null,x=S(0),s=S(z),o=S(0);function l(t){var n,c=(t=J(t)).length,u,y,m=0,p=new Array(c),i=new Array(c),v=+x.apply(this,arguments),w=Math.min(z,Math.max(-z,s.apply(this,arguments)-v)),h,C=Math.min(Math.abs(w)/c,o.apply(this,arguments)),$=C*(w<0?-1:1),d;for(n=0;n<c;++n)(d=i[p[n]=n]=+e(t[n],n,t))>0&&(m+=d);for(a!=null?p.sort(function(A,D){return a(i[A],i[D])}):f!=null&&p.sort(function(A,D){return f(t[A],t[D])}),n=0,y=m?(w-c*$)/m:0;n<c;++n,v=h)u=p[n],d=i[u],h=v+(d>0?d*y:0)+$,i[u]={data:t[u],index:n,value:d,startAngle:v,endAngle:h,padAngle:C};return i}return l.value=function(t){return arguments.length?(e=typeof t=="function"?t:S(+t),l):e},l.sortValues=function(t){return arguments.length?(a=t,f=null,l):a},l.sort=function(t){return arguments.length?(f=t,a=null,l):f},l.startAngle=function(t){return arguments.length?(x=typeof t=="function"?t:S(+t),l):x},l.endAngle=function(t){return arguments.length?(s=typeof t=="function"?t:S(+t),l):s},l.padAngle=function(t){return arguments.length?(o=typeof t=="function"?t:S(+t),l):o},l}var L=Z.pie,G={sections:new Map,showData:!1,config:L},T=G.sections,N=G.showData,ge=structuredClone(L),de=g(()=>structuredClone(ge),"getConfig"),fe=g(()=>{T=new Map,N=G.showData,te()},"clear"),he=g(({label:e,value:a})=>{if(a<0)throw new Error(`"${e}" has invalid value: ${a}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);T.has(e)||(T.set(e,a),F.debug(`added new section: ${e}, with value: ${a}`))},"addSection"),me=g(()=>T,"getSections"),ve=g(e=>{N=e},"setShowData"),Se=g(()=>N,"getShowData"),_={getConfig:de,clear:fe,setDiagramTitle:q,getDiagramTitle:K,setAccTitle:Q,getAccTitle:X,setAccDescription:Y,getAccDescription:ee,addSection:he,getSections:me,setShowData:ve,getShowData:Se},xe=g((e,a)=>{H(e,a),a.setShowData(e.showData),e.sections.map(a.addSection)},"populateDb"),ye={parse:g(async e=>{const a=await oe("pie",e);F.debug(a),xe(a,_)},"parse")},we=g(e=>`
  .pieCircle{
    stroke: ${e.pieStrokeColor};
    stroke-width : ${e.pieStrokeWidth};
    opacity : ${e.pieOpacity};
  }
  .pieOuterCircle{
    stroke: ${e.pieOuterStrokeColor};
    stroke-width: ${e.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${e.pieTitleTextSize};
    fill: ${e.pieTitleTextColor};
    font-family: ${e.fontFamily};
  }
  .slice {
    font-family: ${e.fontFamily};
    fill: ${e.pieSectionTextColor};
    font-size:${e.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${e.pieLegendTextColor};
    font-family: ${e.fontFamily};
    font-size: ${e.pieLegendTextSize};
  }
`,"getStyles"),Ae=we,De=g(e=>{const a=[...e.values()].reduce((s,o)=>s+o,0),f=[...e.entries()].map(([s,o])=>({label:s,value:o})).filter(s=>s.value/a*100>=1).sort((s,o)=>o.value-s.value);return pe().value(s=>s.value)(f)},"createPieArcs"),Ce=g((e,a,f,x)=>{F.debug(`rendering pie chart
`+e);const s=x.db,o=ae(),l=re(s.getConfig(),o.pie),t=40,n=18,c=4,u=450,y=u,m=ne(a),p=m.append("g");p.attr("transform","translate("+y/2+","+u/2+")");const{themeVariables:i}=o;let[v]=ie(i.pieOuterStrokeWidth);v??(v=2);const w=l.textPosition,h=Math.min(y,u)/2-t,C=R().innerRadius(0).outerRadius(h),$=R().innerRadius(h*w).outerRadius(h*w);p.append("circle").attr("cx",0).attr("cy",0).attr("r",h+v/2).attr("class","pieOuterCircle");const d=s.getSections(),A=De(d),D=[i.pie1,i.pie2,i.pie3,i.pie4,i.pie5,i.pie6,i.pie7,i.pie8,i.pie9,i.pie10,i.pie11,i.pie12];let b=0;d.forEach(r=>{b+=r});const W=A.filter(r=>(r.data.value/b*100).toFixed(0)!=="0"),k=se(D);p.selectAll("mySlices").data(W).enter().append("path").attr("d",C).attr("fill",r=>k(r.data.label)).attr("class","pieCircle"),p.selectAll("mySlices").data(W).enter().append("text").text(r=>(r.data.value/b*100).toFixed(0)+"%").attr("transform",r=>"translate("+$.centroid(r)+")").style("text-anchor","middle").attr("class","slice"),p.append("text").text(s.getDiagramTitle()).attr("x",0).attr("y",-(u-50)/2).attr("class","pieTitleText");const I=[...d.entries()].map(([r,M])=>({label:r,value:M})),E=p.selectAll(".legend").data(I).enter().append("g").attr("class","legend").attr("transform",(r,M)=>{const P=n+c,V=P*I.length/2,U=12*n,j=M*P-V;return"translate("+U+","+j+")"});E.append("rect").attr("width",n).attr("height",n).style("fill",r=>k(r.label)).style("stroke",r=>k(r.label)),E.append("text").attr("x",n+c).attr("y",n-c).text(r=>s.getShowData()?`${r.label} [${r.value}]`:r.label);const B=Math.max(...E.selectAll("text").nodes().map(r=>(r==null?void 0:r.getBoundingClientRect().width)??0)),O=y+t+n+c+B;m.attr("viewBox",`0 0 ${O} ${u}`),le(m,u,O,l.useMaxWidth)},"draw"),$e={draw:Ce},Ge={parser:ye,db:_,renderer:$e,styles:Ae};export{Ge as diagram};
//# sourceMappingURL=pieDiagram-DBDJKBY4-3a84224a.js.map
