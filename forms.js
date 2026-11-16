'use strict';
(()=>{
 const kind=new URLSearchParams(location.search).get('kind')==='seller'?'seller':'buyer';
 const form=document.querySelector(`[name="${kind}-inquiry"]`);if(!form)return;
 form.classList.add('is-selected');
 const status=form.querySelector('.form-status'),button=form.querySelector('[type=submit]');
 const originalButton=button.innerHTML;let pending=null;
 const errors={VALIDATION:'請確認必填欄位、電話格式與個資使用同意。',BUSY:'收件忙碌中，請稍後使用相同內容重試。',ID_CONFLICT:'這個需求編號的資料已存在且內容不同，請聯絡門市核對。'};
 form.addEventListener('submit',async event=>{
  event.preventDefault();status.textContent='';
  if(!form.reportValidity() || button.disabled)return;
  const values=Object.fromEntries(new FormData(form));
  const fields=kind==='buyer'?['name','phone','preferred-area','budget','property-type','rooms','requirements']:['name','phone','property-area','property-type','selling-timeline','seller-notes'];
  const data={kind,source:location.origin,consent:values['privacy-consent']==='同意',noticeVersion:'2026-11-06-v1',website:values['bot-field']||''};
  for(const name of fields)data[name]=String(values[name]||'').trim();
  const snapshot=JSON.stringify(data);
  if(pending && pending.snapshot!==snapshot){status.textContent='上一筆需求的保存結果尚未確認。請恢復原內容重試，或聯絡門市核對需求編號：'+pending.payload.id;return;}
  if(!pending)pending={snapshot,payload:{...data,id:crypto.randomUUID()}};
  button.disabled=true;button.textContent='正在確認保存…';
  try {
   const response=await fetch('/house/api/leads',{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(pending.payload),credentials:'omit',signal:AbortSignal.timeout(45000)});
   if(!response.ok)throw new Error('NETWORK');
   const result=await response.json();
   if(!result?.ok){
    status.textContent=(errors[result?.error]||'尚未確認保存成功，請保留原內容重試。')+' 需求編號：'+pending.payload.id;
    if(['VALIDATION','BUSY'].includes(result?.error))pending=null;
    return;
   }
   if(result.id!==pending.payload.id || result.kind!==kind)throw new Error('RECEIPT');
   status.textContent=(kind==='buyer'?'找房需求':'售屋評估需求')+'已收到並保存。需求編號：'+result.id+'，我們會依你留下的方式聯繫。';
   pending=null;form.reset();
  } catch(e){status.textContent='尚未確認保存結果，已填內容保留。請使用相同內容重試，或聯絡門市核對需求編號：'+pending.payload.id;}
  finally {button.disabled=false;button.innerHTML=originalButton;}
 });
 button.disabled=false;
})();
