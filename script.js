// script.js
// Leaflet + localStorage app. UI behavior matches the requested design.
// double-checked for race conditions and event wiring.

const STORAGE_KEY = 'citizen_reports_v1';
let map = null;
let isAuthority = false;
let tmpPickHandler = null; // temporary pick handler
let markers = {}; // id -> leaflet layer

/***** storage helpers *****/
function loadReports(){
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}
function saveReports(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function uid(){ return 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }

/***** escape helper to avoid XSS when building popup html *****/
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/***** add a marker for an issue object to map (and store in markers map) *****/
function addMarkerToMap(issue){
  // color by status
  const color = issue.status === 'Resolved' ? '#10b981' : (issue.status === 'In Progress' ? '#f59e0b' : '#c30000');

  // use circleMarker for consistent small pin
  const layer = L.circleMarker([issue.lat, issue.lng], {
    radius: 8, fillColor: color, color: '#fff', weight: 1, fillOpacity: 0.95
  }).addTo(map);

  // build popup content
  const img = issue.photo ? `<img class="issue-photo" src="${escapeHtml(issue.photo)}" alt="photo">` : '';
  // Authority controls are only interactive when popup is opened and isAuthority true
  const authControls = isAuthority ? `
    <div style="margin-top:8px">
      <label style="font-weight:600">Update Status</label>
      <select id="status-select-${issue.id}" style="width:100%;padding:6px;border-radius:6px;border:1px solid #ddd">
        <option ${issue.status==='Received'?'selected':''}>Received</option>
        <option ${issue.status==='In Progress'?'selected':''}>In Progress</option>
        <option ${issue.status==='Resolved'?'selected':''}>Resolved</option>
      </select>
      <button id="update-btn-${issue.id}" style="margin-top:8px;padding:8px 10px;background:#16a34a;color:white;border:0;border-radius:6px;cursor:pointer">Update</button>
    </div>` : '';

  const html = `
    <div style="min-width:220px">
      <div style="font-weight:700;margin-bottom:6px">${escapeHtml(issue.type)}</div>
      <div style="font-size:13px;color:#333">${escapeHtml(issue.desc || '')}</div>
      <div style="font-size:12px;color:#666;margin-top:8px">By: ${escapeHtml(issue.reportedBy || 'Anonymous')}</div>
      <div style="font-size:12px;color:#666">Status: <strong>${escapeHtml(issue.status)}</strong></div>
      ${img}
      ${authControls}
    </div>`;

  layer.bindPopup(html, { maxWidth: 320 });

  // When popup opens, wire the update button if authority mode
  layer.on('popupopen', () => {
    if(isAuthority){
      const sel = document.getElementById(`status-select-${issue.id}`);
      const btn = document.getElementById(`update-btn-${issue.id}`);
      if(btn && sel){
        btn.onclick = () => {
          const newStatus = sel.value;
          updateIssueStatus(issue.id, newStatus);
          layer.closePopup();
        };
      }
    }
  });

  markers[issue.id] = layer;
}

/***** redraw markers from storage (clear then add) *****/
function redrawMarkers(){
  // remove existing layers
  Object.values(markers).forEach(m => { try { map.removeLayer(m); } catch(e){} });
  markers = {};
  const reports = loadReports();
  reports.forEach(addMarkerToMap);
}

/***** update status for issue in storage, then refresh markers *****/
function updateIssueStatus(id, newStatus){
  const arr = loadReports();
  const idx = arr.findIndex(r => r.id === id);
  if(idx !== -1){
    arr[idx].status = newStatus;
    saveReports(arr);
    redrawMarkers();
  }
}

/***** add new issue to storage and add marker immediately *****/
async function addNewIssue({type, desc, lat, lng, photoDataURL}){
  const list = loadReports();
  const item = {
    id: uid(),
    type, desc, lat, lng,
    photo: photoDataURL || null,
    status: 'Received',
    reportedBy: 'Anonymous',
    createdAt: Date.now()
  };
  list.push(item);
  saveReports(list);
  addMarkerToMap(item);
}

/***** convert file to dataURL (for storing small images in localStorage) *****/
function fileToDataURL(file){
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/***** initialize map and UI wiring (called when DOM loaded) *****/
function initApp(){
  // create map centered like your screenshot (Mumbai area)
  map = L.map('map', { zoomControl: true }).setView([19.0896, 72.8656], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // load existing markers
  redrawMarkers();

  // UI elements
  const authBtn = document.getElementById('toggleAuthorityBtn');
  const raiseBtn = document.getElementById('raiseIssueBtn');
  const reportModal = document.getElementById('reportModal');
  const closeReportBtn = document.getElementById('closeReportModal');
  const cancelReportBtn = document.getElementById('cancelReport');
  const pickLocBtn = document.getElementById('pickLocBtn');
  const latLngInput = document.getElementById('issueLatLng');
  const photoInput = document.getElementById('issuePhoto');
  const reportForm = document.getElementById('reportForm');

  // toggle authority/citizen
  authBtn.addEventListener('click', () => {
    isAuthority = !isAuthority;
    authBtn.textContent = isAuthority ? 'Switch to Citizen View' : 'Switch to Authority View';
    // re-render popups to reflect controls
    redrawMarkers();
  });

  // open report modal, prefilling location with map center
  raiseBtn.addEventListener('click', () => {
    const c = map.getCenter();
    latLngInput.value = `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`;
    document.getElementById('issueType').value = 'Accident';
    document.getElementById('issueDesc').value = '';
    photoInput.value = '';
    reportModal.classList.remove('hidden');
  });

  // close modal actions
  closeReportBtn.addEventListener('click', () => {
    reportModal.classList.add('hidden');
    if(tmpPickHandler){ map.off('click', tmpPickHandler); tmpPickHandler = null; document.getElementById('pickLocBtn').textContent = 'Pick on map'; }
  });
  cancelReportBtn.addEventListener('click', () => {
    reportModal.classList.add('hidden');
    if(tmpPickHandler){ map.off('click', tmpPickHandler); tmpPickHandler = null; document.getElementById('pickLocBtn').textContent = 'Pick on map'; }
  });

  // pick location on map
  pickLocBtn.addEventListener('click', () => {
    // indicate to user
    pickLocBtn.textContent = 'Click on map...';
    // remove any existing temporary handler
    if(tmpPickHandler){ map.off('click', tmpPickHandler); tmpPickHandler = null; }
    tmpPickHandler = function(e){
      latLngInput.value = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
      pickLocBtn.textContent = 'Pick on map';
      map.off('click', tmpPickHandler);
      tmpPickHandler = null;
    };
    map.on('click', tmpPickHandler);
  });

  // submit report
  reportForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const type = document.getElementById('issueType').value;
    const desc = document.getElementById('issueDesc').value.trim();
    const latlng = latLngInput.value.trim();
    if(!latlng){
      alert('Please pick a location first.');
      return;
    }
    const parts = latlng.split(',').map(s => s.trim());
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if(Number.isNaN(lat) || Number.isNaN(lng)){
      alert('Invalid coordinates.');
      return;
    }
    // handle photo
    let dataURL = null;
    const file = photoInput.files[0];
    if(file){
      try { dataURL = await fileToDataURL(file); } catch(e){ console.error(e); alert('Failed to read photo.'); }
    }
    await addNewIssue({ type, desc, lat, lng, photoDataURL: dataURL });
    reportModal.classList.add('hidden');
  });

  // view modal close wiring (if you plan to open view modal manually later)
  document.getElementById('closeViewModal').addEventListener('click', () => {
    document.getElementById('viewModal').classList.add('hidden');
  });
  document.getElementById('closeViewBtn').addEventListener('click', () => {
    document.getElementById('viewModal').classList.add('hidden');
  });
}

/***** start when DOM is ready *****/
window.addEventListener('DOMContentLoaded', initApp);
