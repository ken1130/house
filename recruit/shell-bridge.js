// Keep legacy recruitment anchors usable inside the shared, auto-sized shell.
(()=>{
 if(window.parent===window)return;
 document.addEventListener('click',event=>{
  const link=event.target.closest('a');if(!link)return;
  const href=link.getAttribute('href');
  if(href==='/house/'){
   event.preventDefault();parent.document.querySelector('.site-brand').click();
  }else if(href?.startsWith('#')){
   const target=document.getElementById(href.slice(1));if(!target)return;
   event.preventDefault();
   const iframe=parent.document.querySelector('#recruit-frame');
   const header=parseFloat(parent.getComputedStyle(parent.document.documentElement).getPropertyValue('--header-h'));
   parent.scrollTo({top:parent.scrollY+iframe.getBoundingClientRect().top+target.getBoundingClientRect().top-header-20,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
 });
})();
