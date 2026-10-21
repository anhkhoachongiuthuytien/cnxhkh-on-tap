/* Theme preference is separate from quiz progress and applied before first paint. */
(() => {
  const key='cnxhkh-theme';
  let theme='dark';
  try{if(localStorage.getItem(key)==='light')theme='light';}catch(_){}
  function apply(){
    document.documentElement.dataset.theme=theme;
    document.documentElement.style.colorScheme=theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#141b18':'#164b3e');
    const button=document.querySelector('#theme-toggle');
    if(button){
      const label=theme==='dark'?'Chế độ sáng':'Chế độ tối';
      button.querySelector('span').textContent=label;
      button.setAttribute('aria-label',`Chuyển sang ${label.toLocaleLowerCase('vi-VN')}`);
      button.title=label;
    }
  }
  apply();
  document.addEventListener('DOMContentLoaded',()=>{
    apply();
    document.querySelector('#theme-toggle')?.addEventListener('click',()=>{
      theme=theme==='dark'?'light':'dark';apply();
      try{localStorage.setItem(key,theme);}catch(_){}
    });
  });
})();
