'use strict';
// Edite o cardápio aqui depois da confirmação com o estabelecimento.
// Estes sabores vieram do material enviado e são demonstrativos.
const MENU = [
 {id:'chulapa', name:'Pizza Di Chulapa', category:'especiais', label:'Especial', description:'Molho pomodoro, mussarela, requeijão cremoso, presunto, bacon e orégano.'},
 {id:'calabresa', name:'Calabresa da Casa', category:'classicas', label:'Clássica', description:'Calabresa fatiada, cebola roxa, mussarela e um toque de orégano.'},
 {id:'margherita', name:'Margherita', category:'classicas', label:'Clássica', description:'Molho pomodoro, mussarela, tomate fresco e manjericão.'},
 {id:'frango', name:'Frango Cremoso', category:'especiais', label:'Especial', description:'Frango temperado, milho, requeijão cremoso e mussarela derretida.'},
 {id:'chocolate', name:'Chocolate & Morango', category:'doces', label:'Para fechar a noite', description:'Chocolate e morangos.'},
 {id:'refri2', name:'Refrigerante 2 L', category:'bebidas', label:'Para compartilhar', description:'Garrafa de 2 litros. Consulte os sabores disponíveis.'},
 {id:'lata', name:'Refrigerante em lata', category:'bebidas', label:'Individual', description:'Consulte os sabores disponíveis.'},
 {id:'agua', name:'Água mineral', category:'bebidas', label:'Para acompanhar', description:'Garrafa individual. Consulte as opções disponíveis.'}
];
const PHONE = '5545991033399';
const STORAGE_KEY = 'bocca-selection-v1';
const MAX_QTY = 20;
const esc = (v) => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function sanitizeCart(data) {
 if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
 return Object.fromEntries(MENU.filter(m => Number.isInteger(data[m.id]) && data[m.id] > 0).map(m => [m.id, Math.min(MAX_QTY, data[m.id])]));
}
function buildMessage(cart, notes = '') {
 const lines = MENU.filter(m => cart[m.id]).map(m => `${cart[m.id]}x ${m.name}`);
 return `Oi, Pizza di Bocca! Gostaria de consultar esta seleção:\n\n${lines.join('\n')}\n\nPodem confirmar disponibilidade, tamanhos, valores e entrega?${notes.trim() ? '\n\nObservação: '+notes.trim().slice(0,500) : ''}`;
}
function whatsappLink(text) { return `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`; }
let cart = {};
try { cart = sanitizeCart(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); } catch (_) {}
const grid = document.querySelector('#menu-grid');
const dialog = document.querySelector('#order-dialog');
const notes = document.querySelector('#order-notes');
const toast = document.querySelector('.toast');
let toastTimer;
function announce(text) { clearTimeout(toastTimer); toast.textContent = text; toast.classList.add('visible'); toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600); }
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (_) {} }
function renderMenu() {
 const groups = [
  {id:'pizzas-salgadas', categories:['classicas','especiais']},
  {id:'pizzas-doces', categories:['doces']},
  {id:'bebidas', categories:['bebidas']}
 ];
 groups.forEach(group => {
  const items = MENU.filter(m => group.categories.includes(m.category));
  const list = document.querySelector(`#items-${group.id}`);
  list.innerHTML = items.map((m,i) => `<article class="menu-item"><div><h4>${esc(m.name)}</h4><p>${esc(m.description)}</p></div><button class="add-item" data-add="${m.id}" aria-label="Adicionar ${esc(m.name)} à seleção">+</button></article>`).join('');
 });
}
function updateLink() { document.querySelector('#send-order').href = whatsappLink(buildMessage(cart, notes.value)); }
function renderOrder() {
 const count = Object.values(cart).reduce((sum, n) => sum + n, 0);
 document.querySelectorAll('.count').forEach(el => { const changed=el.textContent !== String(count); el.textContent=count; if(changed)window.BoccaMotion?.pulse(el); });
 const selected = MENU.filter(m => cart[m.id]);
 document.querySelector('#order-items').innerHTML = selected.length ? selected.map(m => `<div class="order-line"><div><h3>${esc(m.name)}</h3><button class="remove-item" data-remove="${m.id}" aria-label="Remover ${esc(m.name)}">Remover</button></div><div class="quantity"><button data-change="${m.id}" data-delta="-1" aria-label="Diminuir quantidade de ${esc(m.name)}">−</button><span aria-label="Quantidade">${cart[m.id]}</span><button data-change="${m.id}" data-delta="1" ${cart[m.id]>=MAX_QTY?'disabled':''} aria-label="Aumentar quantidade de ${esc(m.name)}">+</button></div></div>`).join('') : '<div class="empty"><p>Seu pedido está vazio.</p><button class="button red" data-choose>Ver cardápio</button></div>';
 document.querySelector('#order-details').hidden = !selected.length;
 document.querySelector('.dialog-footer').hidden = !selected.length;
 updateLink();
}
function changeItem(id, delta) {
 const item = MENU.find(m => m.id === id); if (!item) return;
 if (delta > 0 && cart[id] >= MAX_QTY) { announce('Limite de 20 unidades por item. Combine pedidos maiores no atendimento.'); return; }
 const qty = (cart[id] || 0) + delta;
 if (qty <= 0) delete cart[id]; else cart[id] = Math.min(qty, MAX_QTY);
 save(); renderOrder();
}
let dialogClosing = false;
async function closeOrder() {
 if (!dialog.open || dialogClosing) return;
 dialogClosing = true;
 dialog.getAnimations?.().forEach(a => a.cancel());
 dialog.classList.add('closing-dialog');
 const exit = window.BoccaMotion?.animate(dialog,[{transform:'translateX(0)',opacity:1},{transform:'translateX(50px)',opacity:0}],{duration:230,easing:'cubic-bezier(.4,0,1,1)'});
 if(exit) { try { await exit.finished; } catch (_) {} }
 dialog.close(); dialog.classList.remove('closing-dialog'); dialogClosing=false;
}
function openOrder() {
 if(dialog.open || dialogClosing) return;
 renderOrder(); dialog.showModal(); document.body.classList.add('locked');
 window.BoccaMotion?.animate(dialog,[{transform:'translateX(60px)',opacity:0},{transform:'translateX(0)',opacity:1}],{duration:500});
}
dialog.addEventListener('cancel', e => {e.preventDefault();closeOrder();});
document.querySelectorAll('[data-whatsapp]').forEach(a => a.href = whatsappLink(a.dataset.whatsapp));
document.querySelectorAll('[data-open-order]').forEach(b => b.addEventListener('click', openOrder));
document.querySelector('.close-dialog').addEventListener('click', closeOrder);
dialog.addEventListener('close', () => document.body.classList.remove('locked'));
dialog.addEventListener('click', e => { if (e.target === dialog) { const rect = dialog.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) closeOrder(); } });
grid.addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (!b) return; const item=MENU.find(m=>m.id===b.dataset.add); if ((cart[item.id]||0) >= MAX_QTY) { changeItem(item.id,1); return; } changeItem(item.id,1); b.classList.add('added'); clearTimeout(b.feedbackTimer); b.feedbackTimer=setTimeout(()=>{b.classList.remove('added');b.textContent='+';},1000); announce(`${item.name} adicionada à seleção`); });
document.querySelector('#order-items').addEventListener('click', async e => {
 const choose = e.target.closest('[data-choose]'); if (choose) { await closeOrder(); document.querySelector('#sabores').scrollIntoView(); return; }
 const remove = e.target.closest('[data-remove]'); if (remove) { delete cart[remove.dataset.remove]; save(); renderOrder(); document.querySelector('.close-dialog').focus(); return; }
 const change = e.target.closest('[data-change]'); if (change) { const id=change.dataset.change, delta=Number(change.dataset.delta); changeItem(id,delta); const next=dialog.querySelector(`[data-change="${id}"][data-delta="${delta}"]:not([disabled])`) || dialog.querySelector('.close-dialog'); next.focus(); }
});
document.querySelector('.clear-order').addEventListener('click', () => { cart={}; notes.value=''; save(); renderOrder(); document.querySelector('.close-dialog').focus(); });
notes.addEventListener('input', updateLink);
const navToggle = document.querySelector('.nav-toggle');
const navigation = document.querySelector('#navigation');
function closeNav() { navToggle.setAttribute('aria-expanded','false'); navigation.classList.remove('open'); }
navToggle.addEventListener('click', () => { const isOpen=navToggle.getAttribute('aria-expanded')==='true'; navToggle.setAttribute('aria-expanded',String(!isOpen)); navigation.classList.toggle('open',!isOpen); });
navigation.querySelectorAll('a').forEach(a => a.addEventListener('click',closeNav));
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeNav(); });
document.addEventListener('click', e => { if(!e.target.closest('.header')) closeNav(); });
document.querySelector('#year').textContent = new Date().getFullYear();
renderMenu(); renderOrder();
