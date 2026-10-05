'use strict';
// Native scrolling, event-driven frames, and no animation dependencies.
(() => {
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const fine = matchMedia('(hover: hover) and (pointer: fine)');
 const ease = 'cubic-bezier(.22,1,.36,1)';
 const active = new Set();
 function animate(el, frames, options = {}) {
  if (!el || reduced.matches || typeof el.animate !== 'function') return null;
  const animation = el.animate(frames, {duration:480, easing:ease, ...options});
  active.add(animation);
  animation.finished.then(() => active.delete(animation), () => active.delete(animation));
  return animation;
 }
 window.BoccaMotion = {
  animate,
  reduced: () => reduced.matches,
  menu(grid, oldHeight) {
   grid.getAnimations?.().forEach(a => a.cancel());
   const nextHeight = grid.getBoundingClientRect().height;
   if (oldHeight && Math.abs(nextHeight-oldHeight)>2) animate(grid,[{height:`${oldHeight}px`},{height:`${nextHeight}px`}],{duration:360});
   [...grid.children].forEach((el,i) => animate(el,[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:430,delay:Math.min(i,5)*35,fill:'backwards'}));
  },
  pulse(el) { animate(el,[{transform:'scale(1)'},{transform:'scale(1.22)',offset:.4},{transform:'scale(1)'}],{duration:340}); }
 };
 const header=document.querySelector('.header');
 const hero=document.querySelector('.hero');
 const photo=document.querySelector('.hero-photo');
 const image=photo.querySelector('img');
 const links=[...document.querySelectorAll('#navigation a')];
 const sections=links.map(a=>document.querySelector(a.getAttribute('href')));
 const progress=document.createElement('div');progress.className='reading-progress';progress.setAttribute('aria-hidden','true');header.append(progress);
 const heroItems=[...document.querySelectorAll('.hero-copy>.eyebrow,.hero h1,.hero-description,.hero-copy>.button,.hero-contact')];
 heroItems.forEach((el,i)=>animate(el,[{opacity:0,transform:'translateY(20px)'},{opacity:1,transform:'translateY(0)'}],{duration:800,delay:80+i*90,fill:'backwards'}));
 const reveals=[...document.querySelectorAll('.section-heading,.menu-toolbar,.menu-group-heading,.menu-end,.location-heading,.contact-panel,.bocca-invite-copy,.bocca-invite-action,footer>*')];
 let observer;
 if ('IntersectionObserver' in window) {
  observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if (!entry.isIntersecting) return;
   entry.target.classList.remove('reveal-pending');observer.unobserve(entry.target);
  }),{threshold:0.08,rootMargin:'0px 0px -24px 0px'});
  if(!reduced.matches) reveals.forEach(el=>{
   if(el.getBoundingClientRect().top < innerHeight-20) return;
   el.classList.add('reveal-pending');observer.observe(el);
  });
 }
 // Unhide immediately if keyboard navigation reaches a section before scrolling.
 document.addEventListener('focusin',e=>{ const el=e.target.closest('.reveal-pending');if(el){el.classList.remove('reveal-pending');observer?.unobserve(el);} });
 let frame=0,lastTime=0,dirty=true,tx=0,ty=0,x=0,y=0,scrollTarget=0,scrollOffset=0,heroVisible=true;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function requestFrame(){if(!frame && !document.hidden)frame=requestAnimationFrame(update);}
 function update(time){
  frame=0;
  const dt=Math.min(48,lastTime?time-lastTime:16);lastTime=time;
  if(dirty){
   dirty=false;
   const rect=hero.getBoundingClientRect();
   heroVisible=rect.bottom>0 && rect.top<innerHeight;
   scrollTarget=heroVisible ? clamp(-rect.top*.045,-14,20) : 0;
   const distance=document.documentElement.scrollHeight-innerHeight;
   progress.style.transform=`scaleX(${distance>0?clamp(scrollY/distance,0,1):0})`;
   header.classList.toggle('scrolled',scrollY>35);
   let current=-1;sections.forEach((section,i)=>{if(section.getBoundingClientRect().top<innerHeight*.45)current=i;});
   links.forEach((link,i)=>{if(i===current)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
  }
  if(reduced.matches){image.style.removeProperty('transform');return;}
  const mix=1-Math.exp(-dt/105);
  x+=(tx-x)*mix;y+=(ty-y)*mix;scrollOffset+=(scrollTarget-scrollOffset)*mix;
  if(heroVisible){image.style.transform=`translate3d(${x.toFixed(2)}px,${(y+scrollOffset).toFixed(2)}px,0) scale(1.1)`;}
  if(heroVisible&&(Math.abs(tx-x)>.08||Math.abs(ty-y)>.08||Math.abs(scrollTarget-scrollOffset)>.08))requestFrame();
 }
 photo.addEventListener('pointermove',event=>{if(!fine.matches||reduced.matches)return;const rect=photo.getBoundingClientRect();tx=(event.clientX-rect.left-rect.width/2)/rect.width*12;ty=(event.clientY-rect.top-rect.height/2)/rect.height*10;requestFrame();},{passive:true});
 photo.addEventListener('pointerleave',()=>{tx=ty=0;requestFrame();});
 addEventListener('scroll',()=>{dirty=true;requestFrame();},{passive:true});
 addEventListener('resize',()=>{dirty=true;requestFrame();},{passive:true});
 document.fonts?.ready.then(()=>{dirty=true;requestFrame();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;lastTime=0;}else{dirty=true;requestFrame();}});
 reduced.addEventListener('change',()=>{
  if(reduced.matches){active.forEach(a=>a.cancel());reveals.forEach(el=>el.classList.remove('reveal-pending'));observer?.disconnect();}
  dirty=true;requestFrame();
 });
 requestFrame();
})();
