/* App using Leaflet + localStorage to keep reports persistent.
   UI matches the screenshot: header left title, right blue button,
   map fills page, bottom red Raise Issue button, modal form.
*/

const STORAGE_KEY = 'citizen_reports_v1';
let map, tempPickHandler = null;
let isAuthority = false; // toggled by header button
let markers = {}; // { id: L.marker }

function loadReports(){
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveReports(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/* create unique id */
function uid(){ return 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }

/* add marker to map and store to markers map */
function addMarkerToMap(issue){
  const col = (issue.status==='Resolved') ? '#10b981' : (issue.status==='In Progress') ? '#f59e0b' : '#c30000';
  const circle = L.circleMarker([issue.lat, issue.lng], {
    radius: 8, fillColor: col, color: '#fff', weight: 1, fillOpacity: 0.95
  }).addTo(map);

  const content = buildPopupContent(issue);
  circle.bindPopup(content, {maxWidth: 300});
  circle.on('popupopen', () => {
    // when popup opens wire authority controls
    if(isAuthority){
      const statusSelect = document.querySelector(`#status-select-${issue.id}`);
      const updateBtn = document.querySelector(`#update-btn-${issue.id}`);
      if(updateBtn && statusSelect){
        updateBtn.onclick = () => {
          const newStatus = statusSelect.value;
          updateIssueStatus(issue.id, newStatus);
          circle.closePopup();
        };
      }
    }
  });

  markers[issue.id] = circle;
}

/* build popup HTML; includes photo if present */
function buildPopupContent(issue){
  const imgHtml = issue.photo ? `<img class="issue-photo" src="${issue.photo}" alt="photo">` : '';
  let authControls = '';
  if(isAuthority){
    authControls = `
      <div style="margin-top:8px">
        <label style="font-weight:600">Update Status</label>
        <select id="status-select-${issue.id}" style="width:100%;padding:6px;border-radius:6px;border:1px solid #ddd">
          <option ${issue.status==='Received'?'selected':''}>Received</option>
          <option ${issue.status==='In Progress'?'selected':''}>In Progress</option>
          <option ${issue.status==='Resolved'?'selected':''}>Resolved</option>
        </select>
        <button id="update-btn-${issue.id}" style="margin-top:8px;padding:8px 10px;background:#16a34a;color:white;border:0;border-radius:6px;cursor:pointer">Update</button>
      </div>`;
  }

  return `
    <div style="min-width:200px">
      <div style="font-weight:700;margin-bottom:6px">${escapeHtml(issue.type)}</div>
      <div style="font-size:13px;color:#333">${escapeHtml(issue.desc || '')}</div>
      <div style="font-size:12px;color:#666;margin-top:8px">By: ${escapeHtml(issue.reportedBy||'Anonymous')}</div>
      <div style="font-size:12px;color:#666">Status: <strong>${escapeHtml(issue.status)}</strong></div>
      ${imgHtml}
      ${authControls}
    </div>`;
}

/* simple escape to avoid XSS in stored data */
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* redraw all markers (clear then add) */
function redrawMarkers(){
  Object.values(markers).forEach(m => m.remove());
  markers = {};
  const reports = loadReports();
  reports.forEach(addMarkerToMap);
}

/* update status in storage */
function updateIssueStatus(id, newStatus){
  const arr = loadReports();
  const idx = arr.findIndex(r => r.id === id);
  if(idx !== -1){
    arr[idx].status = newStatus;
    saveReports(arr);
    redrawMarkers();
  }
}

/* add new issue to storage and place marker */
async function addNewIssue({type, desc, lat, lng, photoDataURL}){
  const reports = loadReports();
  const item = {
    id: uid(),
    type, desc, lat, lng,
    photo: photoDataURL || null,
    status: 'Received',
    reportedBy: 'Anonymous',
    createdAt: Date.now()
  };
  reports.push(item);
  saveReports(reports);
  addMarkerToMap(item);
}

/* initialize UI and map */
function init(){
  // Leaflet map centered on Mumbai area like your screenshot
  map = L.map('map', {zoomControl:true}).setView([19.0896, 72.8656], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // load saved markers
  redrawMarkers();

  // wire header authority button
  const authBtn = document.getElementById('toggleAuthorityBtn');
  authBtn.addEventListener('click', () => {
    isAuthority = !isAuthority;
    authBtn.textContent = isAuthority ? 'Switch to Citizen View' : 'Switch to Authority View';
    redrawMarkers();
  });

  // raise issue button opens modal with map center coords by default
  const raiseBtn = document.getElementById('raiseIssueBtn');
  const reportModal = document.getElementById('reportModal');
  const closeReport = document.getElementById('closeReportModal');
  const cancelReport = document.getElementById('cancelReport');
  const pickLocBtn = document.getElementById('pickLocBtn');
  const latlngInput = document.getElementById('issueLatLng');
  const photoInput = document.getElementById('issuePhoto');

  raiseBtn.addEventListener('click', () => {
    // set default location to map center
    const c = map.getCenter();
    latlngInput.value = `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`;
    // clear form
    document.getElementById('issueType').value = 'Accident';
    document.getElementById('issueDesc').value = '';
    photoInput.value = '';
    reportModal.classList.remove('hidden');
  });

  closeReport.addEventListener('click', () => reportModal.classList.add('hidden'));
  cancelReport.addEventListener('click', () => reportModal.classList.add('hidden'));

  // allow picking location from map when modal open
  pickLocBtn.addEventListener('click', () => {
    // brief instruction
    pickLocBtn.textContent = 'Click on map...';
    tempPickHandler = function(e){
      latlngInput.value = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
      pickLocBtn.textContent = 'Pick on map';
      map.off('click', tempPickHandler);
      tempPickHandler = null;
    };
    map.on('click', tempPickHandler);
  });

  // submit form
  const form = document.getElementById('reportForm');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    // get values
    const type = document.getElementById('issueType').value;
    const desc = document.getElementById('issueDesc').value;
    const latlng = document.getElementById('issueLatLng').value.trim();
    if(!latlng){ alert('Pick a location'); return; }
    const [latStr, lngStr] = latlng.split(',').map(s => s.trim());
    const lat = parseFloat(latStr), lng = parseFloat(lngStr);
    if(Number.isNaN(lat) || Number.isNaN(lng)){ alert('Invalid coordinates'); return; }

    // handle photo file -> data URL
    const file = photoInput.files[0];
    let dataURL = null;
    if(file){
      dataURL = await toDataURL(file);
    }

    await addNewIssue({type, desc, lat, lng, photoDataURL: dataURL});
    reportModal.classList.add('hidden');
  });

  // popup view modal handlers
  document.getElementById('closeViewModal').addEventListener('click', () => {
    document.getElementById('viewModal').classList.add('hidden');
  });
  document.getElementById('closeViewBtn').addEventListener('click', () => {
    document.getElementById('viewModal').classList.add('hidden');
  });

  // clicking a marker's popup content update buttons handled in addMarkerToMap
}

/* helper to convert file to dataURL */
function toDataURL(file){
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* start */
window.addEventListener('load', init);
