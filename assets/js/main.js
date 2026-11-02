(function(){
  var root=document.documentElement;
  root.classList.remove('no-js');root.classList.add('js');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduce) root.classList.add('motion');
  var clamp=function(v){return Math.max(0,Math.min(1,v))};
  var NS='http://www.w3.org/2000/svg';

  // seeded candle generator for sparklines and finale
  function rng(seed){return function(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646}}
  function candles(svg,n,vol,drift,seed,w,h,lime){
    if(!svg) return;
    var r=rng(seed),p=50,data=[];
    for(var i=0;i<n;i++){var o=p,c=p+drift+(r()-0.5)*2*vol;data.push([o,c,Math.max(o,c)+r()*vol*.6,Math.min(o,c)-r()*vol*.6]);p=c}
    var mn=Math.min.apply(null,data.map(function(d){return d[3]})),mx=Math.max.apply(null,data.map(function(d){return d[2]}));
    var sy=function(v){return h-6-(v-mn)/(mx-mn)*(h-12)},cw=w/n;
    data.forEach(function(d,i){
      var up=d[1]>=d[0],col=up?(lime||'#4A9CFF'):'#33476E',x=i*cw+cw*.2,bw=cw*.6;
      var g=document.createElementNS(NS,'g');g.setAttribute('style','--k:'+i);
      var l=document.createElementNS(NS,'line');l.setAttribute('x1',x+bw/2);l.setAttribute('x2',x+bw/2);l.setAttribute('y1',sy(d[2]));l.setAttribute('y2',sy(d[3]));l.setAttribute('stroke',col);l.setAttribute('stroke-width','1.4');l.setAttribute('vector-effect','non-scaling-stroke');
      var t=sy(Math.max(d[0],d[1])),b=sy(Math.min(d[0],d[1]));
      var rc=document.createElementNS(NS,'rect');rc.setAttribute('x',x);rc.setAttribute('y',t);rc.setAttribute('width',bw);rc.setAttribute('height',Math.max(2,b-t));rc.setAttribute('rx',1.5);rc.setAttribute('fill',col);
      if(i===data.length-1) g.setAttribute('class','last');
      g.appendChild(l);g.appendChild(rc);svg.appendChild(g);
    });
  }
  candles(document.getElementById('sparkG'),28,2.2,0.55,7,440,110);
  candles(document.getElementById('sparkB'),20,5,0.45,19,240,60);
  candles(document.getElementById('sparkS'),28,1.8,0.4,23,440,110);
  candles(document.getElementById('sparkE'),20,4.5,0.3,31,240,60);
  // finale equaliser: rising candles around a centre gap
  (function(){
    var svg=document.getElementById('eqSvg'),n=31,w=820,h=200,cw=w/n;
    if(!svg) return;
    for(var i=0;i<n;i++){
      var d=Math.abs(i-(n-1)/2),hh=Math.max(14,(1-d/16)*170+(i%3)*8);
      if(d<3.5) continue;
      var g=document.createElementNS(NS,'g');g.setAttribute('class','c');g.setAttribute('style','--k:'+Math.round(d));
      var x=i*cw+cw*.22,bw=cw*.56,col=d<6?'#4A9CFF':'rgba(74,156,255,'+(0.75-d*0.04).toFixed(2)+')';
      var l=document.createElementNS(NS,'line');l.setAttribute('x1',x+bw/2);l.setAttribute('x2',x+bw/2);l.setAttribute('y1',h-hh-10);l.setAttribute('y2',h);l.setAttribute('stroke',col);l.setAttribute('stroke-width','1.5');l.setAttribute('vector-effect','non-scaling-stroke');
      var rc=document.createElementNS(NS,'rect');rc.setAttribute('x',x);rc.setAttribute('y',h-hh);rc.setAttribute('width',bw);rc.setAttribute('height',hh*0.8);rc.setAttribute('rx',3);rc.setAttribute('fill',col);
      g.appendChild(l);g.appendChild(rc);svg.appendChild(g);
    }
  })();

  // split statement into words for the scroll fill
  var big=document.getElementById('bigText'),words=0;
  (function walk(node){
    Array.prototype.slice.call(node.childNodes).forEach(function(n){
      if(n.nodeType===3){
        var f=document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function(part){
          if(!part) return;
          if(/^\s+$/.test(part)){f.appendChild(document.createTextNode(part));return}
          var s=document.createElement('span');s.className='w';s.textContent=part;s.dataset.k=words++;f.appendChild(s);
        });
        n.parentNode.replaceChild(f,n);
      } else if(n.nodeType===1) walk(n);
    });
  })(big||document.createElement('p'));
  (big?big.querySelectorAll('.w'):[]).forEach(function(s){s.style.setProperty('--k',(s.dataset.k/words).toFixed(3))});

  // logo animations play when each mark comes into view
  var marks=document.querySelectorAll('.lte-mark');
  if('IntersectionObserver' in window && !reduce){var mio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('go');mio.unobserve(e.target)}})},{threshold:.3});marks.forEach(function(m){mio.observe(m)})}
  // reveals
  var targets=document.querySelectorAll('[data-rise]');
  if('IntersectionObserver' in window && !reduce){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.15,rootMargin:'0px 0px -6% 0px'});
    targets.forEach(function(t){io.observe(t)});
  } else targets.forEach(function(t){t.classList.add('in')});



  // footer marquee
  (function(){
    var tr=document.getElementById('mqTrack');if(!tr||reduce) return;
    var x=0,dir=-1,boost=0,last=scrollY,w=0,vis=false;
    function measure(){w=tr.scrollWidth/4}
    measure();addEventListener('resize',measure);
    if('IntersectionObserver' in window) new IntersectionObserver(function(es){vis=es[0].isIntersecting}).observe(tr);
    addEventListener('scroll',function(){var d=scrollY-last;last=scrollY;if(d) dir=d>0?-1:1;boost=Math.min(14,boost+Math.abs(d)*0.08)},{passive:true});
    (function loop(){
      if(vis){x+=dir*(0.6+boost);boost*=0.92;if(x<=-w) x+=w;if(x>0) x-=w;tr.style.setProperty('--mqx',x.toFixed(1)+'px')}
      requestAnimationFrame(loop);
    })();
  })();
  // slider
  var acct=document.getElementById('acct'),fmt=function(n){return '$'+Math.round(n).toLocaleString('en-GB')};
  function slide(){var v=+acct.value;document.getElementById('acctOut').textContent=fmt(v);document.getElementById('acctEcho').textContent=fmt(v);if(reduce) document.getElementById('riskOut').textContent='$'+(v/100).toLocaleString('en-GB',{maximumFractionDigits:2})}
  if(acct){acct.addEventListener('input',slide);slide();}
  // ===== site-wide motion layer =====
  if(!reduce){
    // split section headings into masked words
    document.querySelectorAll('.head h2, #final-h, #start-h').forEach(function(h){
      var i=0;(function walk(node){
        Array.prototype.slice.call(node.childNodes).forEach(function(n){
          if(n.nodeType===3){
            var f=document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function(part){
              if(!part) return;
              if(/^\s+$/.test(part)){f.appendChild(document.createTextNode(part));return}
              var w=document.createElement('span');w.className='sw';var inner=document.createElement('span');inner.textContent=part;w.style.setProperty('--i',i++);inner.style.setProperty('--i',i);w.appendChild(inner);f.appendChild(w);
            });
            n.parentNode.replaceChild(f,n);
          } else if(n.nodeType===1) walk(n);
        });
      })(h);
      h.setAttribute('aria-label',h.textContent.replace(/\s+/g,' ').trim());
    });
    // stagger siblings that reveal together
    ['.mk-grid','.bento','.plans','.revs','.gets','.lime-cols','.mk-mini','.prin-grid','.focus','.steps3','.stat-row'].forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(g){var k=0;Array.prototype.forEach.call(g.children,function(c){if(c.hasAttribute('data-rise')) c.style.setProperty('--d',k++)})});
    });
    var fine=window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    if(fine){
      // card tilt + highlight
      document.querySelectorAll('.tilt').forEach(function(el){
        el.addEventListener('pointermove',function(e){
          var r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
          el.style.setProperty('--mx',(x*100).toFixed(1)+'%');el.style.setProperty('--my',(y*100).toFixed(1)+'%');
          if(!el.classList.contains('in')&&el.hasAttribute('data-rise')) return;
          el.style.transition='transform .15s ease-out';
          el.style.transform='perspective(1000px) rotateX('+((0.5-y)*5).toFixed(2)+'deg) rotateY('+((x-0.5)*6).toFixed(2)+'deg) translateZ(0)';
        });
        el.addEventListener('pointerleave',function(){el.style.transition='transform .6s cubic-bezier(.2,.8,.2,1)';el.style.transform=''});
      });
      // magnetic buttons
      document.querySelectorAll('.btn').forEach(function(b){
        b.addEventListener('pointermove',function(e){var r=b.getBoundingClientRect();b.style.transform='translate('+((e.clientX-r.left-r.width/2)*0.12).toFixed(1)+'px,'+((e.clientY-r.top-r.height/2)*0.2).toFixed(1)+'px)'});
        b.addEventListener('pointerleave',function(){b.style.transform=''});
      });
    }
    // gauge counts up when it appears
    var gauge=document.querySelector('.gauge b span');
    if(gauge&&'IntersectionObserver' in window){
      var small=gauge.querySelector('small'),txt=gauge.firstChild;
      var gio=new IntersectionObserver(function(es){if(es[0].isIntersecting){gio.disconnect();var t0=performance.now();(function step(t){var k=Math.min(1,(t-t0)/1300),e=1-Math.pow(1-k,3);txt.textContent=(e*1).toFixed(k<1?1:0)+'%';if(k<1) requestAnimationFrame(step)})(t0)}},{threshold:.5});
      gio.observe(gauge);
    }
    // risk amount tweens and bumps when the slider moves
    var ro=document.getElementById('riskOut'),shown=10,target=10,raf=0;
    if(acct&&ro) acct.addEventListener('input',function(){
      target=+acct.value/100;ro.classList.add('bump');clearTimeout(ro._t);ro._t=setTimeout(function(){ro.classList.remove('bump')},180);
      cancelAnimationFrame(raf);(function tw(){shown+=(target-shown)*0.25;if(Math.abs(target-shown)<0.01) shown=target;ro.textContent='$'+shown.toLocaleString('en-GB',{maximumFractionDigits:shown<100?2:0});if(shown!==target) raf=requestAnimationFrame(tw)})();
    });
  }


  // aurora ribbons
  var cv=document.getElementById('aurora'),ctx=cv.getContext&&cv.getContext('2d'),W=0,H=0,dpr=Math.min(window.devicePixelRatio||1,1.5);
  function size(){W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;ctx&&ctx.setTransform(dpr,0,0,dpr,0,0)}
  var scrollPhase=0,scrollProg=0;
  // ---- light-strand bundle (modelled on the reference video) ----
  var cv2=document.getElementById('aurora2'),ctx2=cv2&&cv2.getContext&&cv2.getContext('2d');
  function size2(){if(!ctx2) return;cv2.width=Math.max(1,Math.round(innerWidth/3));cv2.height=Math.max(1,Math.round(innerHeight/3))}
  size2();addEventListener('resize',size2);
  function R(seed){return function(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646}}
  var rr=R(42),strands=[],stars=[],nS=innerWidth<700?110:230;
  for(var si=0;si<nS;si++){var c=rr();strands.push({r:Math.pow(rr(),0.75),th:rr()*Math.PI*2,c:c,a:0.22+rr()*0.55,sp:0.5+rr()*1.0,tw:3.2+rr()*2.2})}
  for(var sj=0;sj<70;sj++) stars.push({x:rr(),y:rr(),z:0.25+rr()*0.75});
  var P=[[-3.2,-2.9,0.8],[-0.4,-2.2,2.6],[1.6,1.4,-0.4],[5.4,3.6,-2.6]];
  var STEPS=innerWidth<700?44:64,CP=[],CT1=[],CT2=[];
  (function frames(){
    for(var st=0;st<=STEPS;st++){
      var s=st/STEPS,u=1-s,a=u*u*u,b=3*u*u*s,c=3*u*s*s,d=s*s*s;
      var C=[0,0,0],T=[0,0,0];
      for(var q=0;q<3;q++){C[q]=a*P[0][q]+b*P[1][q]+c*P[2][q]+d*P[3][q];T[q]=3*u*u*(P[1][q]-P[0][q])+6*u*s*(P[2][q]-P[1][q])+3*s*s*(P[3][q]-P[2][q])}
      var tl=Math.hypot(T[0],T[1],T[2])||1;T=[T[0]/tl,T[1]/tl,T[2]/tl];
      var N1=[T[1],-T[0],0],nl=Math.hypot(N1[0],N1[1])||1;N1=[N1[0]/nl,N1[1]/nl,0];
      var N2=[T[1]*N1[2]-T[2]*N1[1],T[2]*N1[0]-T[0]*N1[2],T[0]*N1[1]-T[1]*N1[0]];
      CP.push(C);CT1.push(N1);CT2.push(N2);
    }
  })();
  // keyframes along the page: [scroll, rotZ, rotY, x, y, z, focus]
  var KF=[[0,0.15,0,2.73,-0.4,0,1],[0.1,-1.15,0.35,1.5,0.7,0.6,0.85],[0.22,2.3,-0.4,-1.3,0.4,2.7,0.08],[0.36,-2.5,0.5,0.2,0.3,1.4,0.22],[0.5,-0.55,0.2,3.3,-2.7,-0.6,0.92],[0.64,2.8,-0.3,-0.5,-1.5,0.5,0.55],[0.8,-2.2,0.4,-1.7,1.3,2.3,0.18],[1,1.5,0,0.1,-0.7,0.3,0.65]];
  var spS=0,cur=[0,0,0,0,0,0,1],pt=[0,0];
  // mouse steering for the glow (desktop only)
  var gm={x:0,y:0,tx:0,ty:0,on:false,px:0,py:0};
  if(window.matchMedia('(hover:hover) and (pointer:fine)').matches&&!reduce){
    addEventListener('pointermove',function(e){gm.on=true;gm.tx=e.clientX/innerWidth-0.5;gm.ty=e.clientY/innerHeight-0.5;gm.px=e.clientX;gm.py=e.clientY},{passive:true});
    document.documentElement.addEventListener('pointerleave',function(){gm.tx=0;gm.ty=0;gm.on=false});
  }
  function drawAurora(time){
    if(!ctx) return;
    spS+=(scrollProg-spS)*0.06;
    for(var k=0;k<KF.length-1&&spS>KF[k+1][0];k++);
    var A=KF[k],B=KF[Math.min(k+1,KF.length-1)],f=B[0]>A[0]?Math.max(0,Math.min(1,(spS-A[0])/(B[0]-A[0]))):0;f=f*f*(3-2*f);
    for(var q=1;q<7;q++) cur[q]=A[q]+(B[q]-A[q])*f;
    gm.x+=(gm.tx-gm.x)*0.05;gm.y+=(gm.ty-gm.y)*0.05;
    var rz=cur[1]-gm.x*0.35+gm.y*0.25,ry=cur[2]+gm.x*0.75;
    var cz=Math.cos(rz),sz=Math.sin(rz),cy=Math.cos(ry),sy=Math.sin(ry),tx=cur[3]+gm.x*3.4,ty=cur[4]-gm.y*2.6,tz=cur[5],focus=cur[6];
    var mob=W<700,FOC=mob?Math.max(W*1.1,H*0.5):Math.min(W,H)*1.1,cx0=W/2,cy0=H/2;
    if(mob){tx*=0.55;ty-=0.9}
    function proj(x,y,z){var x1=x*cy+z*sy,z1=-x*sy+z*cy,x2=x1*cz-y*sz+tx,y2=x1*sz+y*cz+ty,dd=9-(z1+tz);if(dd<0.6)dd=0.6;var ff=FOC/dd;pt[0]=cx0+x2*ff;pt[1]=cy0-y2*ff}
    ctx.clearRect(0,0,W,H);
    // star specks
    var sY=scrollY;
    for(var i=0;i<stars.length;i++){var st=stars[i];var x=(st.x*W)%W,y=((st.y*H-sY*0.06*st.z)%H+H)%H;ctx.fillStyle='rgba(210,230,255,'+(0.18*st.z).toFixed(3)+')';ctx.fillRect(x,y,1.3,1.3)}
    ctx.globalCompositeOperation='lighter';
    var tm=time*0.00018;
    for(var n=0;n<strands.length;n++){
      var sd=strands[n],x0,y0,x1,y1;
      ctx.beginPath();
      for(var j=0;j<=STEPS;j++){
        var s=j/STEPS,rad=sd.r*(0.04+2.3*Math.pow(s,1.1)),ang=sd.th+s*sd.tw+tm*sd.sp,ca=Math.cos(ang)*rad,sa=Math.sin(ang)*rad,C=CP[j],N1=CT1[j],N2=CT2[j];
        proj(C[0]+ca*N1[0]+sa*N2[0],C[1]+ca*N1[1]+sa*N2[1],C[2]+ca*N1[2]+sa*N2[2]);
        if(j===0){ctx.moveTo(pt[0],pt[1]);x0=pt[0];y0=pt[1]} else ctx.lineTo(pt[0],pt[1]);
      }
      x1=pt[0];y1=pt[1];
      var hue=sd.c<0.7?'212,95%,64%':(sd.c<0.9?'200,100%,86%':'190,100%,60%'),al=sd.a*(mob?0.85:1);
      var g=ctx.createLinearGradient(x0,y0,x1,y1);
      g.addColorStop(0,'hsla('+hue+','+(al).toFixed(3)+')');
      g.addColorStop(0.18,'hsla('+hue+','+(al*0.85).toFixed(3)+')');
      g.addColorStop(0.62,'hsla('+hue+','+(al*0.3).toFixed(3)+')');
      g.addColorStop(1,'hsla('+hue+',0)');
      ctx.strokeStyle=g;ctx.lineWidth=sd.c>0.95?1.6:1;ctx.stroke();
    }
    // hotspot where the strands converge
    proj(CP[1][0],CP[1][1],CP[1][2]);
    var hx=pt[0],hy=pt[1],M=Math.min(W,H),hg=ctx.createRadialGradient(hx,hy,0,hx,hy,M*0.16);
    var hot=Math.max(0.25,1-spS*6);ctx.globalAlpha=hot;hg.addColorStop(0,'rgba(235,248,255,.95)');hg.addColorStop(0.12,'rgba(150,210,255,.55)');hg.addColorStop(0.45,'rgba(74,156,255,.12)');hg.addColorStop(1,'rgba(74,156,255,0)');
    ctx.fillStyle=hg;ctx.fillRect(hx-M*0.16,hy-M*0.16,M*0.32,M*0.32);ctx.globalAlpha=1;
    ctx.globalCompositeOperation='source-over';
    // soft, out-of-focus copy for the smoky glow and bloom
    if(ctx2){ctx2.clearRect(0,0,cv2.width,cv2.height);ctx2.drawImage(cv,0,0,cv2.width,cv2.height)}
    root.style.setProperty('--fo',focus.toFixed(3));
    proj(CP[Math.round(STEPS*0.45)][0],CP[Math.round(STEPS*0.45)][1],CP[Math.round(STEPS*0.45)][2]);
    root.style.setProperty('--o1x',pt[0].toFixed(0)+'px');root.style.setProperty('--o1y',pt[1].toFixed(0)+'px');
  }
  var running=true;
  document.addEventListener('visibilitychange',function(){running=!document.hidden});
  if(ctx){size();addEventListener('resize',size);
    if(reduce){drawAurora(0)} else (function loop(ts){if(running) drawAurora(ts);requestAnimationFrame(loop)})(0);
  }

  // scroll: echo headline, aurora visibility, scrubs, mobile bar
  var heroEl=document.getElementById('top'),h1=document.getElementById('h1'),lastY=scrollY,vel=0,scrubs=document.querySelectorAll('[data-scrub]'),lines=document.querySelectorAll('[data-line]'),lime=document.getElementById('limePanel'),mbar=document.getElementById('mbar'),fin=document.getElementById('final-h');
  var auroraSecs=document.querySelectorAll('[data-aurora]');
  function frame(){
    var y=scrollY,vh=innerHeight;
    if(!reduce){
      vel+=((y-lastY)-vel)*0.25;lastY=y;
      h1&&h1.style.setProperty('--v',Math.max(-14,Math.min(14,vel)).toFixed(2));
      scrollPhase=y*0.0009;
      scrollProg=y/Math.max(1,document.documentElement.scrollHeight-vh);root.style.setProperty('--sp',scrollProg.toFixed(4));
      var ang=scrollProg*Math.PI*2;
      if(gm.on){root.style.setProperty('--o2x',gm.px+'px');root.style.setProperty('--o2y',gm.py+'px')}
      else{root.style.setProperty('--o2x',(28+Math.cos(ang*1.3)*30).toFixed(2)+'vw');root.style.setProperty('--o2y',(64+Math.sin(ang*1.8)*22).toFixed(2)+'vh')}
      scrubs.forEach(function(el){var r=el.getBoundingClientRect();el.style.setProperty('--p',clamp((vh*0.95-r.top)/(vh*0.65)).toFixed(3))});
      lines.forEach(function(el){var r=el.getBoundingClientRect();el.style.setProperty('--p',clamp((vh*0.62-r.top)/r.height).toFixed(3))});
      if(lime){var lr=lime.getBoundingClientRect();lime.style.setProperty('--p',clamp((vh*0.85-lr.top)/(lr.height*0.75)).toFixed(3));}
    }
    var on=0;auroraSecs.forEach(function(s){var r=s.getBoundingClientRect();if(s.dataset.aurora==='1'&&r.top<vh*0.6&&r.bottom>vh*0.3) on=1});
    root.style.setProperty('--ao',on?1:0.5);
    if(heroEl){var hr=heroEl.getBoundingClientRect();heroEl.style.setProperty('--hp',clamp(-hr.top/(hr.height*0.8)).toFixed(3));}
    mbar.classList.toggle('show',y>vh*0.85&&(!fin||fin.getBoundingClientRect().top>vh*0.5));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
