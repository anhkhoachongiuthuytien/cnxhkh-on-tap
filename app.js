/* CNXHKH local study app. No network, analytics, or external runtime. */
(() => {
  'use strict';
  const D = window.STUDY_DATA;
  const KEY = 'cnxhkh-study-v1';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const letters = 'ABCD';
  const Q = new Map(D.questions.map(q => [q.id, q]));
  const CH = new Map(D.chapters.map(c => [c.id, c]));
  const fresh = () => ({schemaVersion:1, dataVersion:D.version, stats:{}, bookmarks:[], history:[], session:null, preferredChapter:1});
  let store = fresh(), view = 'home', chapter = 1, mode = 'practice', scope = 'all', level = 'all', count = 50, random = true;
  let resultFilter = 'all', reviewResult = null, confirmFinish = false, confirmReset = false, toastTimer;
  function safeAnswers(input, ids) {
    const out = {};
    if (!input || typeof input !== 'object') return out;
    ids.forEach(id => { if (Number.isInteger(input[id]) && input[id] >= 0 && input[id] < 4) out[id] = input[id]; });
    return out;
  }
  function cleanRecord(r) {
    if (!r || !Array.isArray(r.ids)) return null;
    const ids = [...new Set(r.ids.filter(id => Q.has(id)))].slice(0, 250);
    if (!ids.length) return null;
    return {id:typeof r.id === 'string' ? r.id.slice(0,80) : String(Date.now()), ids,
      chapter:CH.has(Number(r.chapter)) ? Number(r.chapter) : 0,
      mode:r.mode === 'exam' ? 'exam' : 'practice', answers:safeAnswers(r.answers, ids),
      checked:Array.isArray(r.checked) ? [...new Set(r.checked.filter(id => ids.includes(id)))] : [],
      index:Math.min(Math.max(Number.isInteger(r.index) ? r.index : 0,0),ids.length - 1),
      startedAt:Number.isFinite(r.startedAt) ? r.startedAt : Date.now(),
      endedAt:Number.isFinite(r.endedAt) ? r.endedAt : null, finished:!!r.finished};
  }
  function cleanStore(raw) {
    if (!raw || raw.schemaVersion !== 1 || raw.dataVersion !== D.version) throw new Error('version');
    const out = fresh();
    if (raw.stats && typeof raw.stats === 'object') Object.entries(raw.stats).forEach(([id,s]) => {
      if (!Q.has(id) || !s || typeof s !== 'object') return;
      const tries = Math.min(Math.max(Number.isInteger(s.tries) ? s.tries : 0,0),100000);
      out.stats[id] = {tries, correct:Math.min(Math.max(Number.isInteger(s.correct) ? s.correct : 0,0),tries),
        lastCorrect:!!s.lastCorrect, lastAnswered:Number.isFinite(s.lastAnswered) ? s.lastAnswered : 0,
        lastAnswer:Number.isInteger(s.lastAnswer) && s.lastAnswer >= 0 && s.lastAnswer < 4 ? s.lastAnswer : null,
        needsReview:!!s.needsReview};
    });
    out.bookmarks = Array.isArray(raw.bookmarks) ? [...new Set(raw.bookmarks.filter(id => Q.has(id)))] : [];
    out.history = Array.isArray(raw.history) ? raw.history.map(cleanRecord).filter(r => r && r.finished).slice(0,60) : [];
    out.session = cleanRecord(raw.session);
    if (out.session?.finished) out.session = null;
    out.preferredChapter = CH.has(Number(raw.preferredChapter)) ? Number(raw.preferredChapter) : 1;
    return out;
  }
  try { const raw = localStorage.getItem(KEY); if (raw) store = cleanStore(JSON.parse(raw)); }
  catch (e) { if (e.message === 'version') setTimeout(() => toast('Ngân hàng câu hỏi đã cập nhật. Một phiên học mới đã được tạo.'),100); else $('#storage-warning').hidden = false; }
  chapter = store.preferredChapter;
  function save() { try { localStorage.setItem(KEY,JSON.stringify(store)); } catch (_) { $('#storage-warning').hidden = false; } }
  function toast(text) { const el = $('#toast'); el.textContent = text; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true,4200); }
  function bookmarkIcon(saved) { return `<svg viewBox="0 0 24 24" fill="${saved?'currentColor':'none'}" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 4h12v17l-6-4-6 4z"/></svg>`; }
  function arrow(right) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="17" height="17" aria-hidden="true"><path d="M${right?'5 12h14m-6-6 6 6-6 6':'19 12H5m6-6-6 6 6 6'}"/></svg>`; }
  function chapterQuestions(id) { return D.questions.filter(q => !id || q.chapter === id); }
  function needsReview(id) { const s = store.stats[id]; return !!s && (s.needsReview || (s.tries > 0 && !s.lastCorrect)); }
  function chapterStats(id) {
    const qs = chapterQuestions(id), answered = qs.filter(q => store.stats[q.id]?.tries > 0).length;
    return {total:qs.length, answered, correct:qs.filter(q => store.stats[q.id]?.tries > 0 && store.stats[q.id].lastCorrect).length,
      wrong:qs.filter(q => needsReview(q.id)).length, bookmarks:qs.filter(q => store.bookmarks.includes(q.id)).length};
  }
  function selectChapter(id) { chapter = Number(id); store.preferredChapter = chapter; save(); render(); }
  function chapterSelect() { return `<label class="field mobile-chapter">Chọn chương<select id="mobile-chapter">${D.chapters.map(c => `<option value="${c.id}" ${chapter===c.id?'selected':''}>Chương ${c.id}. ${esc(c.shortTitle)}</option>`).join('')}</select></label>`; }
  function chapterNav() { return `<aside class="desktop-chapters"><nav class="chapter-nav" aria-label="Các chương">${D.chapters.map(c => {
    const s = chapterStats(c.id);
    return `<button class="chapter-button ${chapter===c.id?'selected':''}" data-chapter="${c.id}" ${chapter===c.id?'aria-current="true"':''}><span class="chapter-no">${c.id}</span><span><span class="chapter-name">${esc(c.shortTitle)}</span><span class="chapter-meta">${s.answered} / 50 câu đã làm${s.wrong?` · ${s.wrong} cần ôn`:''}</span><span class="chapter-bar"><span style="width:${s.answered*2}%"></span></span></span></button>`;
  }).join('')}</nav><p class="side-note">Mỗi chương có 12 câu nhận biết, 23 câu thông hiểu và 15 câu vận dụng.</p></aside>`; }
  function pool() {
    return chapterQuestions(chapter).filter(q => (level === 'all' || q.level === level) &&
      (scope === 'all' || scope === 'wrong' && needsReview(q.id) || scope === 'saved' && store.bookmarks.includes(q.id) || scope === 'unseen' && !store.stats[q.id]?.tries));
  }
  function home() {
    const c = CH.get(chapter), s = chapterStats(chapter), current = store.session;
    const resume = current ? `<div class="resume-banner"><p><strong>Bạn có một lượt học đang dở</strong>${current.chapter?`Chương ${current.chapter}`:'Nhiều chương'} · ${current.mode==='practice'?'Luyện tập':'Kiểm tra'} · đã chọn ${Object.keys(current.answers).length}/${current.ids.length} câu.</p><div class="actions"><button class="btn" id="resume">Tiếp tục học ${arrow(true)}</button><button class="textbtn" id="discard-session">Bỏ lượt đang dở</button></div></div>` : '';
    return `<div class="page-heading"><div><h1>Hiểu từng ý. Vững từng chương.</h1><p class="lede">Luyện câu hỏi, đọc lời giải và quay lại những phần còn chưa chắc.</p></div><button class="btn outline" id="mixed">Trộn cả 5 chương</button></div>${resume}<div class="layout">${chapterNav()}<section>${chapterSelect()}<div class="work-panel"><h2 class="chapter-heading">Chương ${c.id}. ${esc(c.title)}</h2><p class="lede">${esc(c.description)}</p><ul class="scope-list">${c.scope.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><button class="textbtn" id="read-chapter">Đọc tài liệu chương ${c.id}</button><hr class="divider"><h3>Chọn cách học</h3><div class="mode-picker" role="group" aria-label="Chế độ làm bài"><button class="mode-btn ${mode==='practice'?'active':''}" data-mode="practice" aria-pressed="${mode==='practice'}">Luyện tập</button><button class="mode-btn ${mode==='exam'?'active':''}" data-mode="exam" aria-pressed="${mode==='exam'}">Kiểm tra</button></div><p class="small muted" id="mode-help" style="margin:12px 0 0">${mode==='practice'?'Chọn một đáp án để xem ngay kết quả và lời giải.':'Làm hết bài rồi nộp. Bạn có thể đổi đáp án trước khi nộp.'}</p><div class="field-row"><label class="field">Phạm vi câu hỏi<select id="scope"><option value="all">Toàn bộ chương</option><option value="wrong">Câu cần ôn (${s.wrong})</option><option value="saved">Câu đã lưu (${s.bookmarks})</option><option value="unseen">Câu chưa làm (${s.total-s.answered})</option></select></label><label class="field">Mức độ<select id="level"><option value="all">Tất cả mức độ</option><option>Nhận biết</option><option>Thông hiểu</option><option>Vận dụng</option></select></label></div><div class="field-row"><label class="field">Số câu mỗi lượt<select id="count"><option value="10">10 câu</option><option value="25">25 câu</option><option value="50">50 câu</option></select></label><label class="check-field"><input type="checkbox" id="random" ${random?'checked':''}>Trộn thứ tự câu hỏi</label></div><div id="pool-status" class="small muted" style="margin-top:16px" role="status"></div><div class="actions"><button class="btn" id="start">Bắt đầu luyện tập ${arrow(true)}</button></div><p class="small muted" style="margin:18px 0 0">Lượt học được lưu tự động. Đáp án bám nội dung giáo trình năm 2021.</p></div></section></div>`;
  }
  function refreshPool() {
    const n = pool().length, actual = Math.min(n,count);
    $('#pool-status').textContent = n ? `${n} câu phù hợp · lượt này gồm ${actual} câu.` : 'Chưa có câu phù hợp. Hãy đổi phạm vi hoặc mức độ.';
    $('#start').disabled = n === 0;
    $('#start').innerHTML = `${mode==='practice'?'Bắt đầu luyện tập':'Bắt đầu kiểm tra'} · ${actual} câu ${arrow(true)}`;
  }
  function shuffled(xs) { const a = [...xs]; for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function startSession(ids, chap = chapter) {
    if (!ids.length) return toast('Chưa có câu phù hợp để bắt đầu.');
    if (store.session && !confirmReset) {
      toast('Hãy tiếp tục hoặc bỏ lượt đang dở trước khi bắt đầu lượt mới.');
      view='home';render();return;
    }
    store.session = {id:`s${Date.now()}`,ids,chapter:chap,mode,answers:{},checked:[],index:0,startedAt:Date.now(),endedAt:null,finished:false};
    reviewResult=null;confirmFinish=false;confirmReset=false;save();view='quiz';render(true);
  }
  function currentQuestion() { return store.session ? Q.get(store.session.ids[store.session.index]) : null; }
  function record(q, answer) {
    const old = store.stats[q.id] || {tries:0,correct:0,lastCorrect:false,lastAnswered:0,lastAnswer:null,needsReview:false};
    if (answer === undefined) { store.stats[q.id] = {...old,lastCorrect:false,lastAnswer:null,lastAnswered:Date.now(),needsReview:true}; return; }
    const good = answer === q.answer;
    store.stats[q.id] = {tries:old.tries+1,correct:old.correct+(good?1:0),lastCorrect:good,lastAnswered:Date.now(),lastAnswer:answer,needsReview:!good};
  }
  function choose(answer) {
    const s = store.session, q = currentQuestion();
    if (!s || !q || s.finished || s.mode==='practice' && s.checked.includes(q.id)) return;
    s.answers[q.id] = answer;
    if (s.mode==='practice') { s.checked.push(q.id); record(q,answer); }
    confirmFinish=false;save();render();
    if (s.mode==='practice') {
      const explanation=$('#explanation');
      explanation?.setAttribute('tabindex','-1');
      explanation?.focus({preventScroll:true});
      explanation?.scrollIntoView({block:'nearest',behavior:'smooth'});
    }
  }
  function navigate(index) { const s=store.session;if(!s)return;s.index=Math.min(Math.max(index,0),s.ids.length-1);confirmFinish=false;save();render(true); }
  function quiz() {
    const s=store.session;if(!s){view='home';return home();}
    const q=currentQuestion(), selected=s.answers[q.id], checked=s.mode==='practice'&&s.checked.includes(q.id), good=checked&&selected===q.answer;
    const title=s.chapter?`Chương ${s.chapter}. ${CH.get(s.chapter).shortTitle}`:'Ôn tập kết hợp 5 chương';
    const completed=Object.keys(s.answers).length;
    const opts=q.options.map((o,i)=>`<button class="option ${selected===i?'chosen':''} ${checked&&i===q.answer?'correct':''} ${checked&&selected===i&&i!==q.answer?'incorrect':''}" data-answer="${i}" ${checked?'disabled':''} aria-pressed="${selected===i}"><span class="option-letter">${letters[i]}</span><span>${esc(o)}</span>${checked&&(i===q.answer||i===selected)?`<span class="choice-mark">${i===q.answer?'Đáp án đúng':'Bạn đã chọn'}</span>`:''}</button>`).join('');
    const explanation=checked?`<section class="answer-explanation ${good?'':'incorrect'}" id="explanation" aria-live="polite"><h3>${good?'Đúng rồi.':`Chưa đúng. Đáp án là ${letters[q.answer]}.`}</h3><p>${esc(q.explanation)}</p><span class="source-line">${esc(q.source)}</span><button class="textbtn" id="read-question-source">Đọc lại tài liệu chương ${q.chapter}</button></section>`:'';
    const grid=s.ids.map((id,i)=>{const ans=s.answers[id],cq=Q.get(id),state=s.mode==='practice'&&s.checked.includes(id)?(ans===cq.answer?'good':'bad'):(ans!==undefined?'answered':'');const label=`Câu ${i+1}, ${state==='good'?'đúng':state==='bad'?'sai':ans!==undefined?'đã chọn':'chưa trả lời'}${store.bookmarks.includes(id)?', đã lưu':''}`;return `<button class="q-cell ${state} ${i===s.index?'current':''} ${store.bookmarks.includes(id)?'flagged':''}" data-index="${i}" aria-label="${label}" title="${label}" ${i===s.index?'aria-current="step"':''}>${i+1}</button>`;}).join('');
    return `<div class="quiz-topline"><p class="quiz-title">${esc(title)} <span class="tag outlined">${s.mode==='practice'?'Luyện tập':'Kiểm tra'}</span></p><button class="textbtn" id="back-home">Lưu & về danh sách</button></div>${confirmFinish?finishConfirm():''}<div class="quiz-layout"><section class="quiz-main"><div class="question-paper"><div class="question-meta"><span>Câu ${s.index+1} / ${s.ids.length}</span><span class="tag">${esc(q.level)}</span><button class="bookmark ${store.bookmarks.includes(q.id)?'saved':''}" id="bookmark" aria-pressed="${store.bookmarks.includes(q.id)}">${bookmarkIcon(store.bookmarks.includes(q.id))}${store.bookmarks.includes(q.id)?'Đã lưu':'Lưu câu'}</button></div><p class="small muted" style="margin-bottom:12px">${esc(q.topic)}</p><h1 class="question-text" id="question-title">${esc(q.question)}</h1><div class="options" role="group" aria-labelledby="question-title">${opts}</div>${explanation}</div><div class="question-foot"><button class="btn outline" id="previous" ${s.index===0?'disabled':''}>${arrow(false)}Câu trước</button>${s.index<s.ids.length-1?`<button class="btn" id="next">${selected===undefined?'Bỏ qua & tiếp tục':'Câu tiếp theo'}${arrow(true)}</button>`:'<button class="btn" id="finish">Xem kết quả</button>'}</div><p class="question-hint">Phím 1–4 chọn đáp án · ← → chuyển câu · tiến độ tự động lưu.</p></section><aside class="quiz-aside"><div class="index-panel"><details id="question-index" ${innerWidth>750?'open':''}><summary>Danh sách câu hỏi</summary><div class="question-grid">${grid}</div><div class="legend">${s.mode==='practice'?'<span><i></i>Đúng</span><span><i class="bad"></i>Sai</span>':'<span><i></i>Đã chọn</span>'}<span><i class="empty"></i>Chưa làm</span></div></details><div class="progress-track" aria-hidden="true"><span style="width:${completed/s.ids.length*100}%"></span></div><p class="session-count">Đã trả lời ${completed}/${s.ids.length} câu</p><div class="aside-actions"><button class="btn secondary" id="finish-aside">${s.mode==='exam'?'Nộp bài kiểm tra':'Kết thúc lượt học'}</button></div><p class="side-note">${s.mode==='practice'?'Câu đã trả lời sẽ giữ đáp án để phản ánh đúng kết quả lần học này. Bạn có thể luyện lại ở lượt sau.':'Chưa hiển thị đáp án. Bạn có thể quay lại thay đổi lựa chọn trước khi nộp bài.'}</p></div></aside></div>`;
  }
  function finishConfirm() { const s=store.session,n=s.ids.length-Object.keys(s.answers).length;return `<div class="inline-confirm" role="alert"><p><strong>${n?`Còn ${n} câu chưa trả lời.`:'Bạn đã chọn đáp án cho tất cả các câu.'}</strong> ${n?'Câu bỏ trống được tính chưa đúng trong điểm lượt này. ':''}Kết thúc để xem điểm và lời giải đầy đủ?</p><div class="actions"><button class="btn" id="confirm-finish">Nộp & xem kết quả</button><button class="btn outline" id="cancel-finish">Tiếp tục làm bài</button>${n?'<button class="textbtn" id="first-unanswered">Đến câu chưa làm</button>':''}</div></div>`; }
  function askFinish() { confirmFinish=true;render();$('.inline-confirm')?.scrollIntoView({block:'start',behavior:'smooth'}); }
  function finish() {
    const s=store.session;if(!s)return;
    if(s.mode==='exam')s.ids.forEach(id=>record(Q.get(id),s.answers[id]));
    else s.ids.filter(id=>s.answers[id]===undefined).forEach(id=>record(Q.get(id),undefined));
    s.finished=true;s.endedAt=Date.now();s.checked=[...s.ids];
    store.history.unshift(s);store.history=store.history.slice(0,60);reviewResult=s;store.session=null;confirmFinish=false;resultFilter='all';save();view='results';render(true);
  }
  function tally(r) { const good=r.ids.filter(id=>r.answers[id]===Q.get(id).answer).length,blank=r.ids.filter(id=>r.answers[id]===undefined).length;return {good,blank,bad:r.ids.length-good-blank,total:r.ids.length}; }
  function duration(r) { const mins=Math.max(1,Math.round(((r.endedAt||Date.now())-r.startedAt)/60000));return `${mins} phút`; }
  function results() {
    const r=reviewResult;if(!r){view='progress';return progress();}
    const t=tally(r),weak={};r.ids.forEach(id=>{const q=Q.get(id);if(r.answers[id]!==q.answer)weak[q.topic]=(weak[q.topic]||0)+1;});
    const title=r.chapter?`Chương ${r.chapter}. ${CH.get(r.chapter).shortTitle}`:'Bài kết hợp 5 chương';
    const filtered=r.ids.filter(id=>resultFilter==='all'||resultFilter==='wrong'&&r.answers[id]!==Q.get(id).answer||resultFilter==='saved'&&store.bookmarks.includes(id));
    return `<div class="page-heading"><div><h1>Mỗi câu sai là một chỗ để hiểu sâu hơn.</h1><p class="lede">${esc(title)} · ${r.mode==='practice'?'Luyện tập':'Kiểm tra'} · ${duration(r)}</p></div><button class="btn outline" id="back-home">Về danh sách chương</button></div><div class="layout"><aside><h2>Kết quả lượt học</h2><div class="result-score"><span class="score-number">${t.good}<small>/${t.total}</small></span><div class="result-facts">${Math.round(t.good/t.total*100)}% chính xác<br>${t.bad} câu sai · ${t.blank} bỏ trống</div></div><div class="scorebar" aria-hidden="true"><span class="good" style="width:${t.good/t.total*100}%"></span><span class="bad" style="width:${t.bad/t.total*100}%"></span><span class="blank" style="width:${t.blank/t.total*100}%"></span></div><div class="actions"><button class="btn" id="retry-wrong" ${t.good===t.total?'disabled':''}>Ôn ${t.total-t.good} câu chưa đúng</button><button class="btn secondary" id="retry-all">Làm lại lượt này</button></div><hr class="divider"><h3>Phần cần đọc lại</h3>${Object.keys(weak).length?Object.entries(weak).sort((a,b)=>b[1]-a[1]).map(([topic,n])=>`<div class="weak-topic"><span>${esc(topic)}</span><strong>${n}</strong></div>`).join(''):'<p class="small muted">Bạn đã trả lời đúng tất cả câu trong lượt này. Hãy thử một mức độ khác hoặc kiểm tra tổng hợp.</p>'}<button class="textbtn" id="export-result" style="margin-top:24px">Xuất kết quả lượt học</button></aside><section><h2>Đáp án & giải thích</h2><div class="review-filter" role="group" aria-label="Lọc lời giải">${[['all','Tất cả'],['wrong','Chưa đúng'],['saved','Đã lưu']].map(([value,label])=>`<button class="mode-btn ${resultFilter===value?'active':''}" data-review-filter="${value}" aria-pressed="${resultFilter===value}">${label}</button>`).join('')}</div>${filtered.length?filtered.map(id=>reviewItem(id,r)).join(''):'<p class="empty">Không có câu hỏi trong nhóm này.</p>'}</section></div>`;
  }
  function reviewItem(id,r) {
    const q=Q.get(id),ans=r.answers[id],good=ans===q.answer,index=r.ids.indexOf(id);
    return `<details class="review-item"><summary><span class="tag ${good?'':'outlined'}">${good?'Đúng':ans===undefined?'Bỏ trống':'Sai'}</span><span>${index+1}. ${esc(q.question)}</span></summary><div class="review-answer"><ul class="answer-list">${q.options.map((o,i)=>`<li class="${i===q.answer?'correct':i===ans?'incorrect':''}">${letters[i]}. ${esc(o)}${i===q.answer?' · Đáp án đúng':i===ans?' · Bạn đã chọn':''}</li>`).join('')}</ul><p>${esc(q.explanation)}</p><span class="source-line">${esc(q.source)}</span><div class="actions"><button class="textbtn" data-read-source="${q.chapter}">Đọc lại chương ${q.chapter}</button><button class="textbtn" data-save-question="${id}" aria-pressed="${store.bookmarks.includes(id)}">${store.bookmarks.includes(id)?'Bỏ lưu câu':'Lưu câu để ôn lại'}</button></div></div></details>`;
  }
  function guide() {
    const c=CH.get(chapter);
    return `<div class="page-heading"><div><h1>Tài liệu ôn tập</h1><p class="lede">Đọc theo từng mục, chú ý lập luận và các điểm dễ nhầm trước khi luyện câu hỏi.</p></div></div><div class="guide-selector"><label class="field">Chương đang đọc<select id="guide-chapter">${D.chapters.map(x=>`<option value="${x.id}" ${x.id===chapter?'selected':''}>Chương ${x.id}. ${esc(x.shortTitle)}</option>`).join('')}</select></label><div class="screen-actions">${D.docsUrl?`<a class="btn outline" href="${esc(D.docsUrl)}" target="_blank" rel="noopener">Mở Google Docs</a>`:''}<button class="btn secondary" id="guide-practice">Luyện chương ${chapter}</button></div></div><div class="guide-layout"><nav class="guide-nav" aria-label="Mục lục chương"><h3>Nội dung chương ${chapter}</h3>${c.headings.map(h=>`<a href="#${h.id}">${esc(h.text)}</a>`).join('')}<hr class="divider"><p class="small muted">Tài liệu này là bản diễn giải để ôn tập, có ví dụ và phân biệt khái niệm. Bối cảnh nội dung: giáo trình năm 2021.</p></nav><article class="guide-text">${c.html}</article></div>`;
  }
  function progress() {
    const s=chapterStats(0),attempts=Object.values(store.stats).reduce((a,b)=>a+b.tries,0);
    return `<div class="page-heading"><div><h1>Biết mình đã vững đến đâu.</h1><p class="lede">Bạn đã làm ${s.answered}/250 câu khác nhau; ${s.correct} câu đúng ở lần làm gần nhất. ${s.wrong} câu cần ôn lại.</p></div></div><div class="table-wrap"><table class="progress-table"><thead><tr><th>Chương</th><th>Đã làm</th><th>Đúng gần nhất</th><th>Cần ôn</th><th>Đã lưu</th><th></th></tr></thead><tbody>${D.chapters.map(c=>{const st=chapterStats(c.id);return `<tr><td><strong>${c.id}. ${esc(c.shortTitle)}</strong></td><td>${st.answered}/50</td><td>${st.correct}</td><td>${st.wrong}</td><td>${st.bookmarks}</td><td><button class="textbtn" data-practice-chapter="${c.id}">Ôn chương</button></td></tr>`;}).join('')}</tbody></table></div><p class="backup-help">“Đúng gần nhất” phản ánh lần trả lời sau cùng của mỗi câu. “Cần ôn” gồm câu sai và câu bỏ trống trong lượt học đã kết thúc. Tổng lượt trả lời: ${attempts}.</p><section class="history"><h2>Các lượt học đã hoàn thành</h2>${store.history.length?store.history.map((r,i)=>{const t=tally(r);return `<div class="history-line"><span><strong>${r.chapter?`Chương ${r.chapter}`:'Kết hợp 5 chương'}</strong> · ${r.mode==='exam'?'Kiểm tra':'Luyện tập'}<br><span class="muted">${new Date(r.endedAt).toLocaleString('vi-VN')} · ${duration(r)}</span></span><strong>${t.good}/${t.total}</strong><button class="textbtn" data-history="${i}">Xem lời giải</button></div>`;}).join(''):'<p class="empty">Chưa có lượt học hoàn thành. Bạn có thể bắt đầu từ bất kỳ chương nào.</p>'}</section><section class="history"><h2>Bản sao tiến độ</h2><div class="data-tools"><button class="btn outline" id="export-backup">Xuất bản sao</button><label class="btn outline" for="import-backup" tabindex="0" id="import-label">Nhập bản sao</label><input class="file-input" type="file" id="import-backup" accept="application/json,.json"><button class="textbtn" id="reset-data">Xóa tiến độ trên trình duyệt này</button></div><p class="backup-help">Dữ liệu nằm trong trình duyệt đang dùng. Đổi trình duyệt, đổi địa chỉ trang web hoặc xóa dữ liệu trình duyệt có thể làm mất tiến độ. Hãy xuất bản sao để chuyển máy hoặc lưu lại. Lịch sử giữ 60 lượt gần nhất.</p>${confirmReset?'<div class="inline-confirm" role="alert"><p><strong>Xóa toàn bộ tiến độ trên trình duyệt này?</strong> Câu đã lưu, lịch sử và lượt học đang dở sẽ bị xóa. Bạn nên xuất bản sao trước.</p><div class="actions"><button class="btn danger" id="confirm-reset">Xóa toàn bộ tiến độ</button><button class="btn outline" id="cancel-reset">Giữ lại</button></div></div>':''}</section>`;
  }
  function sources() { return `<div class="source-details"><h1>Nguồn & cách sử dụng</h1><h2>Phạm vi kiến thức</h2><p>Bộ tài liệu và 250 câu hỏi được biên soạn cho chương 1–5 của <strong>Giáo trình Chủ nghĩa xã hội khoa học (dành cho bậc đại học hệ không chuyên lý luận chính trị)</strong>, Bộ Giáo dục và Đào tạo, Nhà xuất bản Chính trị quốc gia Sự thật, 2021.</p><p><a href="${esc(D.publisherUrl)}" target="_blank" rel="noopener">Thông tin sách trên trang Nhà xuất bản Chính trị quốc gia Sự thật</a> · <a href="${esc(D.readingUrl)}" target="_blank" rel="noopener">Bản đọc tham khảo K-2021</a></p><p>Nội dung là phần biên soạn diễn giải và câu hỏi mới để ôn tập; các luận điểm được đặt trong khung lý luận của giáo trình. Ví dụ tình huống do người biên soạn xây dựng, không phải trích dẫn hay mô tả một vụ việc có thật. Các mốc, phương hướng chính trị và nội dung liên hệ Việt Nam giữ bối cảnh bản 2021; không tự coi là cập nhật chính sách năm 2026.</p><h2>Đối chiếu vở ghi</h2><p>22 ảnh ghi chép được đọc theo mạch nội dung: chương 2 gồm ảnh 1–6; chương 3 theo thứ tự 8, 7, 9, 12, 11, 10, 17; chương 4 theo thứ tự 16, 20, 13, 15, 19, 14, 21, 18; chương 5 là ảnh 22. Tập ảnh không có chương 1, và chương 5 mới có phần đầu. Các phần còn thiếu được bổ sung theo giáo trình.</p><h2>Cách học</h2><ol><li>Đọc khái niệm và quan hệ lập luận trong tài liệu chương.</li><li>Luyện từng chương; chọn đáp án để xem giải thích ngay.</li><li>Lưu câu chưa chắc. Khi hoàn thành, ôn lại các câu sai và mục kiến thức yếu.</li><li>Dùng kiểm tra để tự đánh giá: chỉ xem đáp án sau khi nộp bài.</li></ol><h2>Dữ liệu cục bộ</h2><p>Ứng dụng không gửi câu trả lời đi đâu. Bản web cần mạng để mở trang. Khi trang đã tải xong, bạn có thể tiếp tục lượt học nếu mất kết nối. Bản tải về chứa sẵn câu hỏi, tài liệu và phông chữ để mở offline. Liên kết Google Docs và nguồn sách cần mạng. Tiến độ lưu riêng trên từng trình duyệt; dùng Xuất bản sao / Nhập bản sao trong tab Tiến độ để chuyển thiết bị.</p><button class="btn" id="back-home">Về luyện tập</button></div>`; }
  function render(focus=false) {
    $$('.navbtn').forEach(b=>{const active=b.dataset.view===view||(view==='quiz'||view==='results')&&b.dataset.view==='home';b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false');});
    $('#main').innerHTML = view==='quiz'?quiz():view==='results'?results():view==='guide'?guide():view==='progress'?progress():view==='sources'?sources():home();
    bind();
    if(focus){window.scrollTo({top:0,behavior:'instant'});$('#main').focus({preventScroll:true});}
  }
  function on(id,fn,event='click'){const el=$(`#${id}`);if(el)el.addEventListener(event,fn);}
  function openGuide(id){chapter=Number(id);view='guide';save();render(true);}
  function toggleBookmark(id){const i=store.bookmarks.indexOf(id);if(i<0)store.bookmarks.push(id);else store.bookmarks.splice(i,1);save();}
  function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function bind() {
    $$('[data-chapter]').forEach(b=>b.addEventListener('click',()=>selectChapter(b.dataset.chapter)));
    $$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;render();}));
    on('mobile-chapter',e=>selectChapter(e.target.value),'change');
    if($('#scope')){$('#scope').value=scope;$('#level').value=level;$('#count').value=String(count);refreshPool();}
    on('scope',e=>{scope=e.target.value;refreshPool();},'change');on('level',e=>{level=e.target.value;refreshPool();},'change');on('count',e=>{count=Number(e.target.value);refreshPool();},'change');on('random',e=>random=e.target.checked,'change');
    on('start',()=>{let ids=pool().map(q=>q.id);if(random)ids=shuffled(ids);startSession(ids.slice(0,count));});
    on('mixed',()=>{mode='practice';const perChapter=D.chapters.flatMap(c=>shuffled(chapterQuestions(c.id)).slice(0,10).map(q=>q.id));startSession(shuffled(perChapter),0);});
    on('resume',()=>{view='quiz';render(true);});
    on('discard-session',()=>{store.session=null;save();render();toast('Đã bỏ lượt đang dở. Các câu đã luyện vẫn được lưu vào tiến độ.');});
    on('read-chapter',()=>openGuide(chapter));on('back-home',()=>{view='home';confirmFinish=false;render(true);});
    $$('[data-answer]').forEach(b=>b.addEventListener('click',()=>choose(Number(b.dataset.answer))));
    $$('[data-index]').forEach(b=>b.addEventListener('click',()=>navigate(Number(b.dataset.index))));
    on('previous',()=>navigate(store.session.index-1));on('next',()=>navigate(store.session.index+1));
    on('finish',askFinish);on('finish-aside',askFinish);on('confirm-finish',finish);on('cancel-finish',()=>{confirmFinish=false;render();});
    on('first-unanswered',()=>{const i=store.session.ids.findIndex(id=>store.session.answers[id]===undefined);if(i>=0)navigate(i);});
    on('bookmark',()=>{toggleBookmark(currentQuestion().id);render();});on('read-question-source',()=>openGuide(currentQuestion().chapter));
    $$('[data-review-filter]').forEach(b=>b.addEventListener('click',()=>{resultFilter=b.dataset.reviewFilter;render();}));
    $$('[data-read-source]').forEach(b=>b.addEventListener('click',()=>openGuide(b.dataset.readSource)));
    $$('[data-save-question]').forEach(b=>b.addEventListener('click',()=>{toggleBookmark(b.dataset.saveQuestion);b.textContent=store.bookmarks.includes(b.dataset.saveQuestion)?'Bỏ lưu câu':'Lưu câu để ôn lại';b.setAttribute('aria-pressed',String(store.bookmarks.includes(b.dataset.saveQuestion)));}));
    on('retry-wrong',()=>{mode='practice';startSession(reviewResult.ids.filter(id=>reviewResult.answers[id]!==Q.get(id).answer),reviewResult.chapter);});
    on('retry-all',()=>{mode='practice';startSession(shuffled(reviewResult.ids),reviewResult.chapter);});
    on('export-result',()=>download({dataVersion:D.version,result:reviewResult,summary:tally(reviewResult)},`cnxhkh-ket-qua-${reviewResult.id}.json`));
    on('guide-chapter',e=>{chapter=Number(e.target.value);render(true);},'change');
    on('guide-practice',()=>{view='home';scope='all';level='all';render(true);});
    $$('[data-practice-chapter]').forEach(b=>b.addEventListener('click',()=>{chapter=Number(b.dataset.practiceChapter);view='home';scope='all';level='all';render(true);}));
    $$('[data-history]').forEach(b=>b.addEventListener('click',()=>{reviewResult=store.history[Number(b.dataset.history)];resultFilter='all';view='results';render(true);}));
    on('export-backup',()=>download(store,`cnxhkh-tien-do-${new Date().toISOString().slice(0,10)}.json`));
    on('import-backup',async e=>{
      const f=e.target.files[0];if(!f)return;
      if(f.size>5*1024*1024){toast('Tệp quá lớn. Hãy chọn bản sao JSON dưới 5 MB.');return;}
      try{const raw=JSON.parse(await f.text());const incoming=cleanStore(raw);store=incoming;chapter=store.preferredChapter;save();render();toast('Đã nhập bản sao và thay thế tiến độ hiện tại.');}
      catch(_){toast('Không nhập được: tệp không đúng định dạng hoặc khác phiên bản ngân hàng câu hỏi.');e.target.value='';}
    },'change');
    on('import-label',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#import-backup').click();}},'keydown');
    on('reset-data',()=>{confirmReset=true;render();$('.inline-confirm')?.scrollIntoView({block:'nearest'});});
    on('cancel-reset',()=>{confirmReset=false;render();});
    on('confirm-reset',()=>{store=fresh();confirmReset=false;reviewResult=null;save();render();toast('Đã xóa tiến độ. Ngân hàng câu hỏi vẫn được giữ nguyên.');});
  }
  $$('.navbtn').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;confirmFinish=false;render(true);}));
  $('.brand').addEventListener('click',e=>{e.preventDefault();view='home';render(true);});
  $('#sources-open').addEventListener('click',()=>{view='sources';render(true);});
  document.addEventListener('keydown',e=>{
    if(view!=='quiz'||e.altKey||e.ctrlKey||e.metaKey||e.target.matches('input,select,textarea,summary'))return;
    if(/^[1-4]$/.test(e.key)){e.preventDefault();choose(Number(e.key)-1);}
    else if(e.key==='ArrowRight'){e.preventDefault();navigate(store.session.index+1);}
    else if(e.key==='ArrowLeft'){e.preventDefault();navigate(store.session.index-1);}
  });
  render();
})();
