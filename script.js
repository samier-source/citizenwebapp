// Citizen Road Reporting App (Leaflet + LocalStorage)
const STORAGE_KEY = 'citizen_reports_v1';
let map = null;
let isAuthority = false;
let tmpPickHandler = null;
let markers = {};

function loadReports(){ const r=localStorage.getItem(STORAGE_KEY); return r?JSON.parse(r):[]; }
function saveReports(a){ localStorage.setItem(STORAGE_KEY,JSON.stringify(a)); }
function uid(){ return 'r_'+Date.now()+'_'+Math.random().toString(36).slice(2,8); }
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function addMarkerToMap(issue){
  const color = issue.status==='Resolved'?'#10b981':(issue.status==='In Progress'?'#f59e0b':'#c30000');
  const layer = L.circleMarker([issue.lat,issue.lng],{radius:8,fillColor:color,color:'#fff',weight:1,fillOpacity:0.95}).addTo(map);
  const img = issue.photo?`<img class="issue-photo" src="${escapeHtml(issue.photo)}" alt="photo">`:'';
  const auth = isAuthority?`
    <div style="margin-top:8px">
      <label style="font-weight:600">Update Status</label>
      <select id="status-${issue.id}" style="width:100%;padding:6px;border-radius:6px;border:1px solid #ddd">
        <option ${issue.status==='Received'?'selected':''}>Received</option>
        <option ${issue.status==='In Progress'?'selected':''}>In Progress</option>
        <option ${issue.status==='Resolved'?'selected':''}>Resolved</option>
      </select>
      <button id="update-${issue.id}" style="margin-top:8px;padding:8px 10px;background:#16a34a;color:white;border:0;border-radius:6px;cursor:pointer">Update</button>
    </div>`:'';
  layer.bindPopup(`<div style="min-width:220px"><div style="font-weight:700;margin-bottom:6px">${escapeHtml(issue.type)}</div>
  <div style="font-size:13px;color:#333">${escapeHtml(issue.desc||'')}</div>
  <div style="font-size:12px;color:#666;margin-top:8px">By: ${escapeHtml(issue.reportedBy||'Anonymous')}</div>
  <div style="font-size:12px;color:#666">Status: <strong>${escapeHtml(issue.status)}</strong></div>${img}${auth}</div>`,{maxWidth:320});
  layer.on('popupopen',()=>{
    if(isAuthority){
      const sel=document.getElementById(`status-${issue.id}`);
      const btn=document.getElementById(`update-${issue.id}`);
      if(btn&&sel){
        btn.onclick=()=>{updateIssueStatus(issue.id,sel.value);layer.closePopup();};
      }
    }
  });
  markers[issue.id]=layer;
}

function redrawMarkers(){ Object.values(markers).forEach(m=>map.removeLayer(m)); markers={}; loadReports().forEach(addMarkerToMap); }
function updateIssueStatus(id,newStatus){ const a=loadReports(); const i=a.findIndex(x=>x.id===id); if(i!==-1){a[i].status=newStatus;saveReports(a);redrawMarkers();}}
async function addNewIssue({type,desc,lat,lng,photoDataURL}){ const a=loadReports(); const i={id:uid(),type,desc,lat,lng,photo:photoDataURL||null,status:'Received',reportedBy:'Anonymous',createdAt:Date.now()}; a.push(i); saveReports(a); addMarkerToMap(i); }
function fileToDataURL(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});}

function initApp(){
  map=L.map('map').setView([19.0896,72.8656],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
  redrawMarkers();

  const authBtn=document.getElementById('toggleAuthorityBtn');
  const raiseBtn=document.getElementById('raiseIssueBtn');
  const modal=document.getElementById('reportModal');
  const close=document.getElementById('closeReportModal');
  const cancel=document.getElementById('cancelReport');
  const pick=document.getElementById('pickLocBtn');
  const latlng=document.getElementById('issueLatLng');
  const photo=document.getElementById('issuePhoto');
  const form=document.getElementById('reportForm');

  authBtn.onclick=()=>{isAuthority=!isAuthority;authBtn.textContent=isAuthority?'Switch to Citizen View':'Switch to Authority View';redrawMarkers();};
  raiseBtn.onclick=()=>{const c=map.getCenter();latlng.value=`${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`;modal.classList.remove('hidden');};
  close.onclick=cancel.onclick=()=>{modal.classList.add('hidden');if(tmpPickHandler){map.off('click',tmpPickHandler);tmpPickHandler=null;pick.textContent='Pick on map';}};
  pick.onclick=()=>{pick.textContent='Click on map...';if(tmpPickHandler){map.off('click',tmpPickHandler);tmpPickHandler=null;}tmpPickHandler=e=>{latlng.value=`${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;pick.textContent='Pick on map';map.off('click',tmpPickHandler);tmpPickHandler=null;};map.on('click',tmpPickHandler);};
  form.onsubmit=async e=>{e.preventDefault();const t=document.getElementById('issueType').value;const d=document.getElementById('issueDesc').value.trim();const parts=latlng.value.split(',');const lat=parseFloat(parts[0]);const lng=parseFloat(parts[1]);let data=null;const f=photo.files[0];if(f){data=await fileToDataURL(f);}await addNewIssue({type:t,desc:d,lat,lng,photoDataURL:data});modal.classList.add('hidden');};
}

window.addEventListener('DOMContentLoaded',initApp);
