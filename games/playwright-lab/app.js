const $ = selector => document.querySelector(selector);

const users = [
  {name:'Ada Lovelace',role:'Developer',team:'Platform',status:'Active'},
  {name:'Grace Hopper',role:'Engineer',team:'Platform',status:'Away'},
  {name:'Katherine Johnson',role:'Analyst',team:'Quality',status:'Active'},
  {name:'Margaret Hamilton',role:'Lead developer',team:'Quality',status:'Active'},
  {name:'Hedy Lamarr',role:'Product inventor',team:'Product',status:'Away'},
  {name:'Radia Perlman',role:'Network engineer',team:'Platform',status:'Active'},
  {name:'Annie Easley',role:'Software engineer',team:'Product',status:'Active'},
  {name:'Mary Jackson',role:'Engineer',team:'Quality',status:'Away'}
];
let tableUsers = [], page = 1, sortKey = 'name', sortDirection = 1, loadingTimer;
const pageSize = 4;

function toast(message){
  const node = document.createElement('div'); node.className='toast'; node.setAttribute('role','status'); node.textContent=message;
  $('#toast-region').append(node); setTimeout(()=>node.remove(),2600);
}

const validators = {
  fullName:v=>v.trim().length<2?'Enter at least 2 characters.':'',
  email:v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?'':'Enter a valid email address.',
  password:v=>v.length<8?'Use at least 8 characters.':!/[A-Z]/.test(v)?'Add an uppercase letter.':!/[0-9]/.test(v)?'Add a number.':'',
  confirmPassword:v=>v!==$('#password').value?'Passwords do not match.':'',
  role:v=>v?'':'Choose a role.', terms:v=>v?'':'You must accept the terms.'
};
function validateField(name){
  const input = name==='terms'?$('#terms'):$(`[name="${name}"]`); const value=input.type==='checkbox'?input.checked:input.value;
  const error=validators[name](value); const output=$(`#${name.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}-error`);
  input.setAttribute('aria-invalid',String(Boolean(error))); if(output)output.textContent=error; return !error;
}
['fullName','email','password','confirmPassword','role','terms'].forEach(name=>{const input=name==='terms'?$('#terms'):$(`[name="${name}"]`);input.addEventListener('blur',()=>validateField(name));input.addEventListener('input',()=>{if(input.getAttribute('aria-invalid')==='true')validateField(name)})});
$('#registration-form').addEventListener('submit',event=>{
  event.preventDefault(); const valid=['fullName','email','password','confirmPassword','role','terms'].map(validateField).every(Boolean); if(!valid){$('#form-result-title').textContent='Validation failed';$('#form-result').textContent='Correct the highlighted fields and try again.';return}
  const data=new FormData(event.currentTarget); $('#form-result-title').textContent='Account created'; $('#form-result').textContent=`${data.get('fullName')} joined as ${data.get('role')} with ${data.get('experience')} years of experience.`; toast('Test account created successfully.');
});
$('#registration-form').addEventListener('reset',()=>setTimeout(()=>{document.querySelectorAll('.error').forEach(x=>x.textContent='');document.querySelectorAll('[aria-invalid]').forEach(x=>x.removeAttribute('aria-invalid'));$('#experience-output').textContent='2';$('#form-result-title').textContent='Waiting for input';$('#form-result').textContent='Submit a valid form to see a generated account summary.'},0));
$('#experience').addEventListener('input',e=>$('#experience-output').textContent=e.target.value);
$('#toggle-password').addEventListener('click',()=>{const field=$('#password'),show=field.type==='password';field.type=show?'text':'password';$('#toggle-password').textContent=show?'Hide':'Show';$('#toggle-password').setAttribute('aria-label',show?'Hide password':'Show password')});

function filteredUsers(){const query=$('#user-search').value.trim().toLowerCase(),team=$('#team-filter').value;return tableUsers.filter(user=>(team==='all'||user.team===team)&&(`${user.name} ${user.role}`.toLowerCase().includes(query))).sort((a,b)=>a[sortKey].localeCompare(b[sortKey])*sortDirection)}
function renderUsers(){
  const list=filteredUsers(),pages=Math.max(1,Math.ceil(list.length/pageSize));page=Math.min(page,pages);const shown=list.slice((page-1)*pageSize,page*pageSize);
  $('#user-rows').innerHTML=shown.length?shown.map((u,i)=>`<tr data-testid="user-row"><td><strong>${u.name}</strong></td><td>${u.role}</td><td>${u.team}</td><td><span class="badge ${u.status.toLowerCase()}">${u.status}</span></td><td><button class="row-action" type="button" data-user-index="${users.indexOf(u)}" aria-label="View ${u.name}">View</button></td></tr>`).join(''):'<tr><td colspan="5">No users match the current filters.</td></tr>';
  $('#page-status').textContent=`Page ${page} of ${pages}`;$('#previous-page').disabled=page===1;$('#next-page').disabled=page===pages;$('#table-state').textContent=`Showing ${shown.length} of ${list.length} users.`;
}
function loadUsers(fail=false){clearTimeout(loadingTimer);$('#table-state').className='table-state loading';$('#table-state').textContent='Loading users';$('#user-rows').innerHTML='';loadingTimer=setTimeout(()=>{if(fail){tableUsers=[];$('#table-state').className='table-state';$('#table-state').innerHTML='Could not load users. <button class="row-action" id="retry-users" type="button">Retry</button>';$('#retry-users').addEventListener('click',()=>loadUsers());return}tableUsers=[...users];page=1;$('#table-state').className='table-state';renderUsers()},900)}
$('#load-users').addEventListener('click',()=>loadUsers());$('#simulate-error').addEventListener('click',()=>loadUsers(true));$('#user-search').addEventListener('input',()=>{page=1;renderUsers()});$('#team-filter').addEventListener('change',()=>{page=1;renderUsers()});
document.querySelectorAll('[data-sort]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.sort;if(sortKey===key)sortDirection*=-1;else{sortKey=key;sortDirection=1}renderUsers()}));
$('#previous-page').addEventListener('click',()=>{page--;renderUsers()});$('#next-page').addEventListener('click',()=>{page++;renderUsers()});$('#user-rows').addEventListener('click',e=>{const button=e.target.closest('[data-user-index]');if(button)toast(`Opened profile for ${users[button.dataset.userIndex].name}.`)});

const dialog=$('#confirm-dialog');$('#open-dialog').addEventListener('click',()=>{dialog.showModal();$('#confirmation-text').value='';$('#confirm-action').disabled=true;$('#confirmation-text').focus()});$('#confirmation-text').addEventListener('input',e=>$('#confirm-action').disabled=e.target.value!=='CONFIRM');dialog.addEventListener('close',()=>{if(dialog.returnValue==='confirm')toast('Test action confirmed.')});
let jobTimer;$('#start-job').addEventListener('click',()=>{clearInterval(jobTimer);const button=$('#start-job'),progress=$('#job-progress');let value=0;button.disabled=true;progress.value=0;$('#job-status').textContent='Job running…';jobTimer=setInterval(()=>{value+=10;progress.value=value;if(value>=100){clearInterval(jobTimer);button.disabled=false;$('#job-status').textContent='Job completed successfully.';toast('Async job completed.')}},300)});
function setQuantity(value){value=Math.max(0,Math.min(5,value));$('#quantity').textContent=String(value);$('#decrease').disabled=value===0;$('#increase').disabled=value===5}$('#decrease').addEventListener('click',()=>setQuantity(Number($('#quantity').textContent)-1));$('#increase').addEventListener('click',()=>setQuantity(Number($('#quantity').textContent)+1));

const tabs=[...document.querySelectorAll('[role=tab]')];function activateTab(tab){tabs.forEach(item=>{const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;$(`#${item.getAttribute('aria-controls')}`).hidden=!selected});tab.focus()}tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activateTab(tab));tab.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const direction=e.key==='ArrowRight'?1:-1;activateTab(tabs[(index+direction+tabs.length)%tabs.length])})});

let todos=[{text:'Verify the login flow',done:false},{text:'Check the empty state',done:true}];function renderTodos(){$('#todo-list').innerHTML=todos.map((todo,i)=>`<li class="todo-item ${todo.done?'completed':''}" draggable="true" data-index="${i}" data-testid="todo-item"><input type="checkbox" ${todo.done?'checked':''} aria-label="Complete ${todo.text}"><span class="todo-text">${todo.text}</span><button type="button" aria-label="Delete ${todo.text}">Delete</button></li>`).join('')}
$('#todo-form').addEventListener('submit',e=>{e.preventDefault();const input=$('#todo-input'),text=input.value.trim();if(!text)return;todos.push({text,done:false});input.value='';renderTodos();toast('Checklist item added.')});$('#todo-list').addEventListener('change',e=>{const row=e.target.closest('li');if(row){todos[row.dataset.index].done=e.target.checked;renderTodos()}});$('#todo-list').addEventListener('click',e=>{if(e.target.tagName!=='BUTTON')return;todos.splice(e.target.closest('li').dataset.index,1);renderTodos();toast('Checklist item deleted.')});let draggedIndex=null;$('#todo-list').addEventListener('dragstart',e=>{const row=e.target.closest('li');if(row)draggedIndex=Number(row.dataset.index)});$('#todo-list').addEventListener('dragover',e=>e.preventDefault());$('#todo-list').addEventListener('drop',e=>{e.preventDefault();const row=e.target.closest('li');if(!row||draggedIndex===null)return;const [moved]=todos.splice(draggedIndex,1);todos.splice(Number(row.dataset.index),0,moved);draggedIndex=null;renderTodos()});

function inspectFile(file){if(!file)return $('#file-result').textContent='No file selected.';if(file.size>102400){$('#file-result').textContent='File is too large. Maximum size is 100 KB.';return}if(!/\.(json|txt)$/i.test(file.name)){ $('#file-result').textContent='Unsupported file type. Choose a JSON or TXT file.';return}$('#file-result').textContent=`Selected: ${file.name} (${file.size} bytes)`;toast('Fixture selected successfully.')}
$('#fixture-file').addEventListener('change',e=>inspectFile(e.target.files[0]));const zone=$('#drop-zone');['dragenter','dragover'].forEach(type=>zone.addEventListener(type,e=>{e.preventDefault();zone.classList.add('dragging')}));['dragleave','drop'].forEach(type=>zone.addEventListener(type,e=>{e.preventDefault();zone.classList.remove('dragging')}));zone.addEventListener('drop',e=>inspectFile(e.dataTransfer.files[0]));

$('#reset-lab').addEventListener('click',()=>{clearInterval(jobTimer);$('#registration-form').reset();$('#user-search').value='';$('#team-filter').value='all';sortKey='name';sortDirection=1;tableUsers=[...users];page=1;renderUsers();todos=[{text:'Verify the login flow',done:false},{text:'Check the empty state',done:true}];renderTodos();setQuantity(1);$('#job-progress').value=0;$('#job-status').textContent='No job started.';$('#start-job').disabled=false;$('#file-result').textContent='No file selected.';$('#fixture-file').value='';activateTab(tabs[0]);toast('Lab data reset.')});

renderTodos();setQuantity(1);loadUsers();
