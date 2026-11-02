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

  // when the splash is showing, hold the page's own entrance until it lifts
  var introDelay=root.classList.contains('has-splash')?1750:0;
  function afterIntro(fn){introDelay?setTimeout(fn,introDelay):fn()}
  if(introDelay) setTimeout(function(){var s=document.getElementById('splash');s&&s.remove()},3000);
  // logo animations play when each mark comes into view
  var marks=document.querySelectorAll('.lte-mark');
  if('IntersectionObserver' in window && !reduce){var mio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('go');mio.unobserve(e.target)}})},{threshold:.3});afterIntro(function(){marks.forEach(function(m){mio.observe(m)})})}
  // reveals
  var targets=document.querySelectorAll('[data-rise]');
  if('IntersectionObserver' in window && !reduce){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.15,rootMargin:'0px 0px -6% 0px'});
    afterIntro(function(){targets.forEach(function(t){io.observe(t)})});
  } else targets.forEach(function(t){t.classList.add('in')});



  // footer marquee
  (function(){
    var tr=document.getElementById('mqTrack');if(!tr||reduce) return;
    var x=0,dir=-1,boost=0,last=scrollY,w=0,vis=false,raf=0;
    function measure(){w=tr.scrollWidth/4}
    measure();addEventListener('resize',measure);
    if('IntersectionObserver' in window) new IntersectionObserver(function(es){vis=es[0].isIntersecting;if(vis&&!raf) raf=requestAnimationFrame(loop)}).observe(tr);
    else vis=true;
    addEventListener('scroll',function(){var d=scrollY-last;last=scrollY;if(d) dir=d>0?-1:1;boost=Math.min(14,boost+Math.abs(d)*0.08)},{passive:true});
    function loop(){
      x+=dir*(0.6+boost);boost*=0.92;if(x<=-w) x+=w;if(x>0) x-=w;tr.style.setProperty('--mqx',x.toFixed(1)+'px');
      raf=vis?requestAnimationFrame(loop):0;
    }
    if(vis) raf=requestAnimationFrame(loop);
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


  // background orbs: follow the cursor with an easy lag (the second orb trails further behind).
  // Moves the two elements with transforms only (no :root variables) and sleeps once they settle.
  var scrollPhase=0,scrollProg=0;
  var orbEls=document.querySelectorAll('.orbs i');
  var o1={x:innerWidth*0.62,y:innerHeight*0.32},o2={x:innerWidth*0.2,y:innerHeight*0.7},tgt={x:o1.x,y:o1.y};
  var orbRaf=0;
  function place(el,p){el.style.transform='translate3d('+p.x.toFixed(1)+'px,'+p.y.toFixed(1)+'px,0) translate(-50%,-50%)'}
  function orbStep(){
    o1.x+=(tgt.x-o1.x)*0.08;o1.y+=(tgt.y-o1.y)*0.08;
    o2.x+=(o1.x-o2.x)*0.035;o2.y+=(o1.y-o2.y)*0.035;
    place(orbEls[0],o1);place(orbEls[1],o2);
    var moving=Math.abs(tgt.x-o1.x)+Math.abs(tgt.y-o1.y)+Math.abs(o1.x-o2.x)+Math.abs(o1.y-o2.y)>1.5;
    orbRaf=moving&&!document.hidden?requestAnimationFrame(orbStep):0;
  }
  function wakeOrbs(){if(!orbRaf) orbRaf=requestAnimationFrame(orbStep)}
  if(orbEls.length===2&&!reduce&&window.matchMedia('(hover:hover) and (pointer:fine)').matches){
    addEventListener('pointermove',function(e){tgt.x=e.clientX;tgt.y=e.clientY;wakeOrbs()},{passive:true});
  }

  // scroll: echo headline, aurora visibility, scrubs, mobile bar
  var heroEl=document.getElementById('top'),h1=document.getElementById('h1'),lastY=scrollY,vel=0,scrubs=document.querySelectorAll('[data-scrub]'),lines=document.querySelectorAll('[data-line]'),lime=document.getElementById('limePanel'),mbar=document.getElementById('mbar'),fin=document.getElementById('final-h');
  var hdrEl=document.querySelector('.hdr'),scrollRaf=0,idle=0;
  function frame(){
    var y=scrollY,vh=innerHeight;
    if(!reduce){
      vel+=((y-lastY)-vel)*0.25;lastY=y;
      h1&&h1.style.setProperty('--v',Math.max(-14,Math.min(14,vel)).toFixed(2));
      scrollPhase=y*0.0009;
      scrollProg=y/Math.max(1,document.documentElement.scrollHeight-vh);hdrEl&&hdrEl.style.setProperty('--sp',scrollProg.toFixed(4));
      scrubs.forEach(function(el){var r=el.getBoundingClientRect();el.style.setProperty('--p',clamp((vh*0.95-r.top)/(vh*0.65)).toFixed(3))});
      lines.forEach(function(el){var r=el.getBoundingClientRect();el.style.setProperty('--p',clamp((vh*0.62-r.top)/r.height).toFixed(3))});
      if(lime){var lr=lime.getBoundingClientRect();lime.style.setProperty('--p',clamp((vh*0.85-lr.top)/(lr.height*0.75)).toFixed(3));}
    }
    if(heroEl){var hr=heroEl.getBoundingClientRect();heroEl.style.setProperty('--hp',clamp(-hr.top/(hr.height*0.8)).toFixed(3));}
    mbar.classList.toggle('show',y>vh*0.85&&(!fin||fin.getBoundingClientRect().top>vh*0.5));
    // keep ticking only while the page moves or the headline echo is still settling
    if(y===lastStill&&Math.abs(vel)<0.05){if(++idle>2){scrollRaf=0;return}} else idle=0;
    lastStill=y;scrollRaf=requestAnimationFrame(frame);
  }
  var lastStill=-1;
  function wake(){if(!scrollRaf){idle=0;scrollRaf=requestAnimationFrame(frame)}}
  addEventListener('scroll',wake,{passive:true});addEventListener('resize',wake);
  wake();
})();
