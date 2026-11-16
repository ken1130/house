'use strict';
(()=>{
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const dialog=$('#site-dialog'),header=$('.site-header'),mascot=$('.tracking-mascot');
let navigation=0,dialogInvoker=null,slide=0,frame=0,mouse={x:innerWidth/2,y:200},homeCache=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),touch=matchMedia('(hover: none)');
const imageSlides=[{title:'讓相遇有光，<br>讓生活向陽。',text:'在台中，找到家的方向。',image:'city'}, {title:'找到適合<br>你的家。',text:'從生活出發，陪你找到下一步。',image:'interior'}, {title:'讓好房子，<br>被好好看見。',text:'先聊行情，再決定怎麼賣。',image:'balcony'}];
function showDialog(title,html){dialogInvoker=document.activeElement;$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=html;if(!dialog.open)dialog.showModal();}
function closeMenu(){const nav=$('#global-nav');nav.classList.remove('is-open');$('.mobile-toggle').setAttribute('aria-expanded','false');document.body.classList.remove('nav-open');$('#knowledge-menu').hidden=true;$('#knowledge-toggle').setAttribute('aria-expanded','false');}
let slides=imageSlides,videoLayer=null,videoState='image',videoConfig=null,heroObserver=null;
let carouselTimer=0,carouselPaused=false,carouselVisible=true;
function syncCarouselPause(){
 const blocked=carouselPaused||document.hidden||!carouselVisible||reduced.matches;
 videoLayer?.setPaused(blocked);
 return blocked;
}
function resetCarousel(){
 clearTimeout(carouselTimer);carouselTimer=0;
 if(syncCarouselPause()||!$('.home-hero')||['loading','playing'].includes(videoState))return;
 carouselTimer=setTimeout(()=>{showSlide(slide+1);resetCarousel();},5000);
}
function showSlide(index){
 const hero=$('.home-hero');if(!hero)return;
 slide=(index+slides.length)%slides.length;
 const s=slides[slide];
 $('.hero-copy h1').innerHTML=s.title;$('.hero-copy p').textContent=s.text;
 $('.hero-scene').style.backgroundImage=`url('${s.video?.poster||'/house/assets/home/'+s.image+'.webp'}')`;
 $('#slide-count').textContent=`${String(slide+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
 $$('[data-slide-index]').forEach((button,i)=>button.setAttribute('aria-current',String(i===slide)));
 videoState=s.video?'loading':'image';
 videoLayer?.show(s.video||null);
 resetCarousel();
}
function loadVideoConfig(){
 if(!videoConfig)videoConfig=fetch('/house/hero-videos.json',{credentials:'same-origin'}).then(response=>{
  if(!response.ok)throw Error('Video manifest unavailable');return response.json();
 }).then(config=>{
  if(!Array.isArray(config.clips)||config.clips.length>4)throw Error('Invalid video manifest');
  const validPath=(value,ext)=>typeof value==='string'&&value.startsWith('/house/assets/hero-videos/')&&!value.includes('..')&&!value.includes('\\')&&ext.test(value);
  return config.clips.filter(clip=>validPath(clip.src,/\.mp4$/i)&&(!clip.mobileSrc||validPath(clip.mobileSrc,/\.mp4$/i))&&(!clip.poster||validPath(clip.poster,/\.(jpg|jpeg|webp|png)$/i)));
 }).catch(()=>[]);
 return videoConfig;
}
function initCarousel(){
 clearTimeout(carouselTimer);heroObserver?.disconnect();videoLayer?.destroy();videoLayer=null;
 slides=imageSlides;videoState='image';carouselVisible=true;
 const hero=$('.home-hero');if(!hero)return;
 const session=hero;
 videoLayer=new window.HeroVideoLayer({container:$('.hero-scene'),onEnded:()=>{
  if($('.home-hero')===session)showSlide(slide+1);
 },onStateChange:state=>{videoState=state;queueMicrotask(resetCarousel);}});
 if('IntersectionObserver' in window){
  heroObserver=new IntersectionObserver(entries=>{if($('.home-hero')!==session)return;carouselVisible=entries[0].isIntersecting;resetCarousel();});
  heroObserver.observe(hero);
 }
 resetCarousel();
 loadVideoConfig().then(clips=>{
  if($('.home-hero')!==session||!clips.length)return;
  slides=clips.map((clip,i)=>({...imageSlides[Number.isInteger(clip.slide)&&clip.slide>=0&&clip.slide<imageSlides.length?clip.slide:i%imageSlides.length],video:clip}));
  const dots=$('.carousel-dots>div');dots.replaceChildren(...slides.map((_,i)=>{
   const button=document.createElement('button');button.dataset.slideIndex=i;
   button.setAttribute('aria-label',`顯示第 ${i+1} 張主視覺`);return button;
  }));
  showSlide(0);
 });
}
document.addEventListener('visibilitychange',resetCarousel);
reduced.addEventListener('change',resetCarousel);
const gazePositions=[{x:0,y:0},{x:0,y:0}];
let pointerActive=false;
function updateMascot(){
 frame=0;if(!mascot)return;
 const mobile=innerWidth<=1100,hero=$('.home-hero'),onHome=!!hero;
 const p=onHome?Math.min(1,Math.max(0,scrollY/(hero.offsetHeight*.75))):1;
 const startWidth=mobile?Math.min(280,innerWidth*.72):Math.min(480,innerWidth*.34);
 const endWidth=mobile?55:105,width=startWidth+(endWidth-startWidth)*p;
 const headerHeight=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h'));
 const startTop=(hero?hero.offsetHeight:700)+headerHeight-startWidth*.60;
 const top=startTop+((mobile?30:32)-startTop)*p;
 mascot.style.width=width+'px';mascot.style.top=top+'px';
 const boundary=onHome&&p<1?Math.max(headerHeight,hero.getBoundingClientRect().bottom):innerHeight;
 mascot.style.clipPath=p===1?'none':`inset(-100px -100px ${Math.max(0,top+width-boundary)}px -100px)`;
 const startX=mobile ? .68 : .66;mascot.style.left=(innerWidth*(startX+(.5-startX)*p))+'px';
 mascot.style.opacity=(mobile&&p>.86)?'0':'1';
 const blend=onHome?Math.min(1,Math.max(0,(p-.72)/.18)):1;
 mascot.style.setProperty('--head-opacity',1-blend);mascot.style.setProperty('--small-opacity',blend);
 let moving=false;
 $$('.eye',mascot).forEach((eye,index)=>{
  const rect=eye.getBoundingClientRect(),dx=mouse.x-(rect.left+rect.width/2),dy=mouse.y-(rect.top+rect.height/2);
  const distance=Math.hypot(dx,dy)||1;
  const strength=pointerActive?Math.min(1,distance/Math.max(innerWidth,innerHeight)*4.2):0;
  // Pupil and eye are concentric, homothetic ellipses. 62% pupil + 28%
  // maximum normalized center displacement leaves 10% clearance at every angle.
  const active=!reduced.matches&&!touch.matches;
  const targetX=active&&pointerActive?dx/distance*.14*strength:0;
  const targetY=active?(pointerActive?dy/distance*.14*strength:-.06):0;
  const position=gazePositions[index];
  position.x=active?position.x+(targetX-position.x)*.18:targetX;position.y=active?position.y+(targetY-position.y)*.18:targetY;
  eye.style.setProperty('--look-x',(position.x*rect.width).toFixed(3)+'px');
  eye.style.setProperty('--look-y',(position.y*rect.height).toFixed(3)+'px');
  if(Math.abs(targetX-position.x)>.00015||Math.abs(targetY-position.y)>.00015)moving=true;
 });
 if(moving)requestMascot();
}
function requestMascot(){if(!frame)frame=requestAnimationFrame(updateMascot);}
function fitIframe(iframe){const resize=()=>{try{const doc=iframe.contentDocument;iframe.style.height=Math.max(doc.body.scrollHeight,doc.documentElement.scrollHeight)+4+'px';}catch{}};iframe.addEventListener('load',()=>{resize();new ResizeObserver(resize).observe(iframe.contentDocument.body);});if(iframe.contentDocument?.readyState==='complete')resize();}
let mascotGlowTimer;
function pulseMascot(){
 const mascot=$('.tracking-mascot');if(!mascot||reduced.matches)return;
 clearTimeout(mascotGlowTimer);mascot.classList.remove('is-glowing');
 requestAnimationFrame(()=>{mascot.classList.add('is-glowing');mascotGlowTimer=setTimeout(()=>mascot.classList.remove('is-glowing'),1050);});
}
function initContent(){slide=0;initCarousel();const recruit=$('#recruit-frame');if(recruit)fitIframe(recruit);$$('[data-route="recruit"]').forEach(a=>{if(location.pathname.startsWith('/house/recruit'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});requestMascot();}
async function navigate(url,{history=true}={}){const current=++navigation;closeMenu();if(dialog.open)dialog.close();const u=new URL(url,location.href);try{if(u.origin!==location.origin||!['/house/','/house/recruit/'].includes(u.pathname)){location.href=u.href;return;}let main,title;if(u.pathname==='/house/'&&homeCache){({main,title}=homeCache);}else{const response=await fetch(u.pathname,{credentials:'same-origin'});if(!response.ok)throw Error('Page unavailable');const doc=new DOMParser().parseFromString(await response.text(),'text/html');const element=doc.querySelector('#site-main');if(!element)throw Error('Page unavailable');main=element.innerHTML;title=doc.title;if(u.pathname==='/house/')homeCache={main,title};}if(current!==navigation)return;$('#site-main').innerHTML=main;document.title=title;if(history)window.history.pushState({},'',u.pathname+u.hash);window.scrollTo(0,0);$('#site-main').focus({preventScroll:true});initContent();if(u.hash)requestAnimationFrame(()=>$(u.hash)?.scrollIntoView());}catch{location.href=u.href;}}
document.addEventListener('click',e=>{const t=e.target.closest('button,a');if(!t)return;
if(t.matches('[data-close]')){dialog.close();return;}
if(t.matches('.mobile-toggle')){const expanded=t.getAttribute('aria-expanded')!=='true';t.setAttribute('aria-expanded',String(expanded));$('#global-nav').classList.toggle('is-open',expanded);document.body.classList.toggle('nav-open',expanded);return;}
if(t.matches('#knowledge-toggle')){const open=t.getAttribute('aria-expanded')!=='true';t.setAttribute('aria-expanded',String(open));$('#knowledge-menu').hidden=!open;return;}
if(t.hasAttribute('data-pending')){closeMenu();showDialog(t.dataset.pending,'<p>內容規劃中。</p><p>這個入口已保留，待功能與連結確認後開放。</p>');return;}
if(t.hasAttribute('data-privacy')){showDialog('隱私權與資料使用','<p>找房及售屋需求透過 Google Apps Script 保存於本公司私人試算表，並寄送通知供授權人員處理。</p><p>請見各表單的個人資料蒐集告知事項；招募資料使用方式請見應徵表單。</p>');return;}
if(t.hasAttribute('data-form')){const buyer=t.dataset.form==='buyer';pulseMascot();const openForm=()=>showDialog(buyer?'填寫找房需求':'預約售屋評估',`<iframe class="form-frame" title="${buyer?'找房':'售屋'}需求表單" src="/house/forms.html?kind=${buyer?'buyer':'seller'}"></iframe>`);if(reduced.matches){openForm();}else{setTimeout(openForm,520);}return;}
if(t.hasAttribute('data-top')){window.scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'});return;}
if(t.hasAttribute('data-carousel-pause')){carouselPaused=!carouselPaused;t.setAttribute('aria-pressed',String(carouselPaused));t.setAttribute('aria-label',carouselPaused?'繼續自動輪播':'暫停自動輪播');t.textContent=carouselPaused?'播放':'暫停';resetCarousel();return;}
if(t.hasAttribute('data-slide')){showSlide(slide+Number(t.dataset.slide));resetCarousel();return;}
if(t.hasAttribute('data-slide-index')){showSlide(Number(t.dataset.slideIndex));resetCarousel();return;}
if(t.tagName==='A'&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey&&e.button===0&&!t.target){const url=new URL(t.href,location.href);if(url.origin===location.origin&&['/house/','/house/recruit/'].includes(url.pathname)){e.preventDefault();if(url.pathname===location.pathname){navigation++;closeMenu();if(url.hash)$(url.hash)?.scrollIntoView();else window.scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'});}else navigate(url.href);}}
});
document.addEventListener('click',e=>{if(!e.target.closest('.knowledge')){$('#knowledge-menu').hidden=true;$('#knowledge-toggle').setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});dialog.addEventListener('close',()=>dialogInvoker?.focus?.());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
window.addEventListener('popstate',()=>navigate(location.href,{history:false}));window.addEventListener('scroll',requestMascot,{passive:true});window.addEventListener('resize',requestMascot);window.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;pointerActive=true;mouse={x:e.clientX,y:e.clientY};requestMascot();},{passive:true});
window.addEventListener('mouseout',e=>{if(!e.relatedTarget){pointerActive=false;requestMascot();}});
window.addEventListener('blur',()=>{pointerActive=false;requestMascot();});
if(location.pathname==='/house/')homeCache={main:$('#site-main').innerHTML,title:document.title};initContent();
})();
