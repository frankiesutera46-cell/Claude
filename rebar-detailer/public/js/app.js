// State
let currentProject = null;
let selectedFiles = [];

// ── Navigation ──────────────────────────────────────────────
function showView(view) {
  document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');
  document.querySelectorAll('.header nav a').forEach(a => a.classList.remove('active'));
  const navLink = document.querySelector(`.header nav a[data-view="${view}"]`);
  if (navLink) navLink.classList.add('active');

  if (view === 'home') loadProjects();
  if (view === 'project' && currentProject) loadProjectDetail();
}

function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');

  if (tab === 'bbs') loadBBS();
  if (tab === 'placing') loadPlacingList();
  if (tab === 'rebar') loadRebarItems();
}

function showLoading(text) {
  document.getElementById('loading-text').textContent = text || 'Processing...';
  document.getElementById('loading').classList.remove('hidden');
}
function hideLoading() { document.getElementById('loading').classList.add('hidden'); }

function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── Projects ────────────────────────────────────────────────
async function loadProjects() {
  try {
    const projects = await API.get('/api/projects');
    const list = document.getElementById('project-list');

    if (projects.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:24px">No projects yet. Upload drawings to get started.</p>';
      document.getElementById('global-stats').innerHTML = '';
      return;
    }

    let totalItems = 0, totalSheets = 0;
    projects.forEach(p => { totalItems += p.item_count || 0; totalSheets += p.sheet_count || 0; });

    document.getElementById('global-stats').innerHTML = `
      <div class="stat-card"><div class="value">${projects.length}</div><div class="label">Projects</div></div>
      <div class="stat-card"><div class="value">${totalSheets}</div><div class="label">Drawing Sheets</div></div>
      <div class="stat-card"><div class="value">${totalItems}</div><div class="label">Rebar Items</div></div>
    `;

    list.innerHTML = projects.map(p => `
      <div class="project-item" onclick="openProject('${p.id}')">
        <div class="project-info">
          <div class="name">${esc(p.name)}</div>
          <div class="meta">${p.sheet_count || 0} sheets &middot; ${p.item_count || 0} rebar items &middot; ${new Date(p.created_at).toLocaleDateString()}</div>
        </div>
        <span style="color:var(--text-muted)">&rarr;</span>
      </div>
    `).join('');
  } catch (err) {
    toast('Failed to load projects', 'error');
  }
}

function openProject(id) {
  currentProject = id;
  showView('project');
}

async function deleteProject() {
  if (!currentProject) return;
  if (!confirm('Delete this project and all its data?')) return;
  try {
    await API.del(`/api/projects/${currentProject}`);
    currentProject = null;
    showView('home');
    toast('Project deleted', 'success');
  } catch { toast('Failed to delete project', 'error'); }
}

// ── Project Detail ──────────────────────────────────────────
async function loadProjectDetail() {
  try {
    const [project, sheets, items] = await Promise.all([
      API.get(`/api/projects/${currentProject}`),
      API.get(`/api/projects/${currentProject}/sheets`),
      API.get(`/api/projects/${currentProject}/rebar`),
    ]);

    document.getElementById('project-title').textContent = project.name;

    // Stats
    const lowConf = items.filter(i => i.confidence < 0.7).length;
    document.getElementById('project-stats').innerHTML = `
      <div class="stat-card"><div class="value">${sheets.length}</div><div class="label">Drawing Sheets</div></div>
      <div class="stat-card"><div class="value">${items.length}</div><div class="label">Rebar Items</div></div>
      <div class="stat-card"><div class="value">${lowConf}</div><div class="label">Needs Review</div></div>
    `;

    // Export links
    document.getElementById('bbs-csv-link').href = `/api/projects/${currentProject}/export/bbs-csv`;
    document.getElementById('bbs-pdf-link').href = `/api/projects/${currentProject}/export/bbs-pdf`;
    document.getElementById('placing-csv-link').href = `/api/projects/${currentProject}/export/placing-csv`;
    document.getElementById('placing-pdf-link').href = `/api/projects/${currentProject}/export/placing-pdf`;

    // Sheets
    renderSheets(sheets);
    renderRebarTable(items);
  } catch (err) {
    toast('Failed to load project', 'error');
  }
}

function renderSheets(sheets) {
  const container = document.getElementById('sheets-list');
  if (sheets.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted)">No sheets processed yet.</p>';
    return;
  }

  container.innerHTML = sheets.map(s => `
    <div class="card" style="display:flex;gap:16px;align-items:start">
      <div style="flex:1">
        <strong>${esc(s.filename)}</strong> — Page ${s.page_number}
        <span class="status status-${s.status}">${s.status}</span>
        ${s.error_message ? `<p style="color:var(--danger);font-size:12px;margin-top:4px">${esc(s.error_message)}</p>` : ''}
      </div>
      ${s.image_path ? `
        <div class="sheet-viewer" style="max-width:400px">
          <img src="/uploads/${currentProject}/${s.image_path.split('/').pop()}" alt="Sheet ${s.page_number}"
               onerror="this.parentElement.innerHTML='<p style=padding:12px;color:var(--text-muted)>Preview not available</p>'">
        </div>
      ` : ''}
    </div>
  `).join('');
}

// ── Rebar Data Table ────────────────────────────────────────
async function loadRebarItems() {
  try {
    const items = await API.get(`/api/projects/${currentProject}/rebar`);
    renderRebarTable(items);
  } catch { toast('Failed to load rebar items', 'error'); }
}

function renderRebarTable(items) {
  const tbody = document.getElementById('rebar-tbody');
  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;color:var(--text-muted);padding:24px">No rebar items. Upload drawings or add manually.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => {
    const confClass = item.confidence >= 0.8 ? 'high' : item.confidence >= 0.6 ? 'medium' : 'low';
    const rowClass = item.confidence < 0.7 ? 'low-confidence' : '';
    return `
      <tr class="${rowClass}" data-id="${item.id}">
        <td><span class="confidence confidence-${confClass}"></span>${(item.confidence * 100).toFixed(0)}%</td>
        <td><input value="${esc(item.bar_mark || '')}" data-field="bar_mark" onchange="updateItem('${item.id}', this)"></td>
        <td><select data-field="bar_size" onchange="updateItem('${item.id}', this)">
          ${[3,4,5,6,7,8,9,10,11,14,18].map(s => `<option value="${s}" ${item.bar_size === s ? 'selected' : ''}>#${s}</option>`).join('')}
        </select></td>
        <td><input value="${esc(item.shape_code || '00')}" data-field="shape_code" size="4" onchange="updateItem('${item.id}', this)"></td>
        <td><input type="number" value="${item.total_length || ''}" data-field="total_length" size="6" onchange="updateItem('${item.id}', this)" placeholder="in"></td>
        <td><input type="number" value="${item.quantity || 1}" data-field="quantity" size="4" onchange="updateItem('${item.id}', this)"></td>
        <td><input type="number" value="${item.spacing || ''}" data-field="spacing" size="5" onchange="updateItem('${item.id}', this)" placeholder="in"></td>
        <td><input value="${esc(item.structural_element || '')}" data-field="structural_element" onchange="updateItem('${item.id}', this)"></td>
        <td><input value="${esc(item.zone || '')}" data-field="zone" size="8" onchange="updateItem('${item.id}', this)"></td>
        <td><input value="${esc(item.notes || '')}" data-field="notes" onchange="updateItem('${item.id}', this)"></td>
        <td style="font-size:11px;color:var(--text-muted)">${item.source}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteItem('${item.id}')">Del</button></td>
      </tr>
    `;
  }).join('');
}

async function updateItem(id, input) {
  const field = input.dataset.field;
  let value = input.value;
  if (['bar_size', 'quantity'].includes(field)) value = parseInt(value) || 0;
  if (['total_length', 'spacing', 'confidence'].includes(field)) value = parseFloat(value) || null;

  try {
    await API.put(`/api/rebar/${id}`, { [field]: value });
    toast('Updated', 'success');
  } catch { toast('Update failed', 'error'); }
}

async function deleteItem(id) {
  if (!confirm('Delete this rebar item?')) return;
  try {
    await API.del(`/api/rebar/${id}`);
    document.querySelector(`tr[data-id="${id}"]`)?.remove();
    toast('Deleted', 'success');
  } catch { toast('Delete failed', 'error'); }
}

function showAddRebarForm() {
  const form = document.getElementById('add-rebar-form');
  form.classList.toggle('hidden');
  if (!form.classList.contains('hidden')) {
    form.innerHTML = `
      <h3>Add Rebar Item</h3>
      <div class="form-row">
        <div class="form-group"><label>Bar Mark</label><input id="new-mark" placeholder="e.g., 1A"></div>
        <div class="form-group"><label>Size</label>
          <select id="new-size">${[3,4,5,6,7,8,9,10,11,14,18].map(s => `<option value="${s}" ${s===5?'selected':''}>#${s}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Shape</label><input id="new-shape" value="00" size="4"></div>
        <div class="form-group"><label>Length (in)</label><input id="new-length" type="number"></div>
        <div class="form-group"><label>Qty</label><input id="new-qty" type="number" value="1"></div>
        <div class="form-group"><label>Spacing (in)</label><input id="new-spacing" type="number"></div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:1"><label>Element</label><input id="new-element" placeholder="e.g., Footing F1"></div>
        <div class="form-group"><label>Zone</label><input id="new-zone" placeholder="e.g., Pour 1"></div>
        <div class="form-group" style="flex:1"><label>Notes</label><input id="new-notes"></div>
        <button class="btn btn-primary" onclick="addRebarItem()" style="margin-top:auto">Add</button>
      </div>
    `;
  }
}

async function addRebarItem() {
  try {
    await API.post(`/api/projects/${currentProject}/rebar`, {
      bar_mark: document.getElementById('new-mark').value,
      bar_size: parseInt(document.getElementById('new-size').value),
      shape_code: document.getElementById('new-shape').value,
      total_length: parseFloat(document.getElementById('new-length').value) || null,
      quantity: parseInt(document.getElementById('new-qty').value) || 1,
      spacing: parseFloat(document.getElementById('new-spacing').value) || null,
      structural_element: document.getElementById('new-element').value,
      zone: document.getElementById('new-zone').value || null,
      notes: document.getElementById('new-notes').value || null,
    });
    document.getElementById('add-rebar-form').classList.add('hidden');
    loadRebarItems();
    toast('Item added', 'success');
  } catch { toast('Failed to add item', 'error'); }
}

// ── BBS ─────────────────────────────────────────────────────
async function loadBBS() {
  try {
    const bbs = await API.get(`/api/projects/${currentProject}/bbs`);

    document.getElementById('bbs-summary').innerHTML = `
      <div class="stat-card"><div class="value">${bbs.rows.length}</div><div class="label">Bar Marks</div></div>
      <div class="stat-card"><div class="value">${bbs.grandTotalLength.toLocaleString()} ft</div><div class="label">Total Length</div></div>
      <div class="stat-card"><div class="value">${bbs.grandTotalWeight.toLocaleString()} lbs</div><div class="label">Total Weight</div></div>
      <div class="stat-card"><div class="value">${(bbs.grandTotalWeight / 2000).toFixed(2)} T</div><div class="label">Tons</div></div>
    `;

    const tbody = document.getElementById('bbs-tbody');
    tbody.innerHTML = bbs.rows.map(r => `
      <tr>
        <td><strong>${esc(r.barMark)}</strong></td>
        <td>#${r.barSize}</td>
        <td>${esc(r.shapeDescription)}</td>
        <td>${inchesToFtIn(r.cutLength)}</td>
        <td>${r.quantity}</td>
        <td>${r.totalLength.toFixed(1)}</td>
        <td>${r.unitWeight.toFixed(3)}</td>
        <td><strong>${r.totalWeight.toFixed(1)}</strong></td>
        <td>${r.grade}</td>
        <td>${esc(r.notes || '')}</td>
      </tr>
    `).join('');

    const tfoot = document.getElementById('bbs-tfoot');
    tfoot.innerHTML = `
      ${bbs.totalsBySize.map(s => `
        <tr style="background:#f1f5f9">
          <td colspan="5" style="text-align:right;font-weight:600">#${s.barSize} Subtotal:</td>
          <td>${s.totalLength.toFixed(1)}</td>
          <td></td>
          <td><strong>${s.totalWeight.toFixed(1)}</strong></td>
          <td colspan="2"></td>
        </tr>
      `).join('')}
      <tr style="background:#e2e8f0;font-weight:700">
        <td colspan="5" style="text-align:right">GRAND TOTAL:</td>
        <td>${bbs.grandTotalLength.toFixed(1)} ft</td>
        <td></td>
        <td>${bbs.grandTotalWeight.toFixed(1)} lbs</td>
        <td colspan="2">(${(bbs.grandTotalWeight / 2000).toFixed(2)} tons)</td>
      </tr>
    `;
  } catch { toast('Failed to load BBS', 'error'); }
}

// ── Placing List ────────────────────────────────────────────
async function loadPlacingList() {
  try {
    const pl = await API.get(`/api/projects/${currentProject}/placing-list`);
    const container = document.getElementById('placing-content');

    if (pl.zones.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">No rebar data to generate placing list.</p>';
      return;
    }

    container.innerHTML = `
      <div class="stats" style="margin-bottom:16px">
        <div class="stat-card"><div class="value">${pl.grandTotalBars}</div><div class="label">Total Bars</div></div>
        <div class="stat-card"><div class="value">${pl.grandTotalWeight.toLocaleString()} lbs</div><div class="label">Total Weight</div></div>
      </div>
      ${pl.zones.map(zone => `
        <div class="zone-group">
          <div class="zone-header">
            ${esc(zone.zone)} — ${zone.totalBars} bars, ${zone.totalWeight} lbs
          </div>
          ${zone.elements.map(el => `
            <div class="element-group">
              <div class="element-header">${esc(el.structuralElement)}</div>
              <table>
                <thead>
                  <tr><th>Mark</th><th>Size</th><th>Shape</th><th>Length</th><th>Qty</th><th>Spacing</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  ${el.items.map(item => `
                    <tr class="${item.confidence < 0.7 ? 'low-confidence' : ''}">
                      <td>${esc(item.barMark)}</td>
                      <td>${item.sizeLabel}</td>
                      <td>${esc(item.shapeDescription)}</td>
                      <td>${esc(item.cutLengthDisplay)}</td>
                      <td>${item.quantity}</td>
                      <td>${item.spacingDisplay || '—'}</td>
                      <td>${esc(item.notes || '')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}
        </div>
      `).join('')}
    `;
  } catch { toast('Failed to load placing list', 'error'); }
}

// ── File Upload ─────────────────────────────────────────────
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');

uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', () => handleFiles(fileInput.files));

function handleFiles(files) {
  selectedFiles = Array.from(files);
  const list = document.getElementById('file-list');
  list.innerHTML = selectedFiles.map(f =>
    `<div style="padding:4px 0;font-size:13px">${esc(f.name)} <span style="color:var(--text-muted)">(${(f.size/1024/1024).toFixed(1)} MB)</span></div>`
  ).join('');
  document.getElementById('upload-btn').style.display = selectedFiles.length > 0 ? 'inline-flex' : 'none';
}

async function startUpload() {
  if (selectedFiles.length === 0) return;

  const projectName = document.getElementById('project-name').value || `Project ${new Date().toLocaleDateString()}`;
  const formData = new FormData();
  formData.append('projectName', projectName);
  selectedFiles.forEach(f => formData.append('files', f));

  showLoading('Uploading and extracting rebar data... This may take a minute.');

  try {
    const result = await API.postForm('/api/upload', formData);
    hideLoading();
    currentProject = result.projectId;
    toast(`Extracted ${result.totalItems} rebar items from ${result.totalSheets} sheets`, 'success');

    // Reset upload form
    selectedFiles = [];
    document.getElementById('file-list').innerHTML = '';
    document.getElementById('upload-btn').style.display = 'none';
    document.getElementById('project-name').value = '';
    fileInput.value = '';

    showView('project');
  } catch (err) {
    hideLoading();
    toast('Upload failed: ' + err.message, 'error');
  }
}

// ── Helpers ─────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function inchesToFtIn(inches) {
  if (!inches || inches <= 0) return '0"';
  const ft = Math.floor(inches / 12);
  const rem = Math.round(inches % 12);
  if (ft === 0) return rem + '"';
  return ft + "'-" + rem + '"';
}

// ── Estimating ──────────────────────────────────────────────

const ELEMENT_TYPES = {
  spread_footing: 'Spread Footing',
  continuous_footing: 'Continuous Footing',
  mat_foundation: 'Mat Foundation',
  pile_cap: 'Pile Cap',
  grade_beam: 'Grade Beam',
  column_tied: 'Column (Tied)',
  column_spiral: 'Column (Spiral)',
  beam_regular: 'Beam',
  beam_transfer: 'Transfer Beam',
  slab_on_grade: 'Slab on Grade',
  elevated_slab: 'Elevated Slab',
  post_tension_slab: 'PT Slab',
  shear_wall: 'Shear Wall',
  retaining_wall: 'Retaining Wall',
  basement_wall: 'Basement Wall',
  stairs: 'Stairs',
};

let estElements = [];
let currentEstimateId = null;
let densityData = null;

async function loadDensityData() {
  if (!densityData) {
    densityData = await API.get('/api/estimating/densities');
  }
  return densityData;
}

function addEstElement(preset) {
  const el = {
    _uid: Date.now() + Math.random(),
    name: preset?.name || '',
    elementType: preset?.elementType || 'spread_footing',
    inputMethod: preset?.inputMethod || 'dimensions',
    densityLevel: preset?.densityLevel || 'medium',
    length: preset?.length || '',
    width: preset?.width || '',
    depth: preset?.depth || '',
    count: preset?.count || 1,
    cubicYards: preset?.cubicYards || '',
    squareFeet: preset?.squareFeet || '',
    thickness: preset?.thickness || '',
    customDensity: preset?.customDensity || '',
    notes: preset?.notes || '',
  };
  estElements.push(el);
  renderEstElements();
}

function removeEstElement(uid) {
  estElements = estElements.filter(e => e._uid !== uid);
  renderEstElements();
  recalcEstimate();
}

function renderEstElements() {
  const tbody = document.getElementById('est-elements-tbody');
  if (estElements.length === 0) {
    tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;color:var(--text-muted);padding:20px">Add building elements above or select a template to get started.</td></tr>';
    document.getElementById('est-totals').classList.add('hidden');
    return;
  }

  tbody.innerHTML = estElements.map((el, i) => {
    const typeOptions = Object.entries(ELEMENT_TYPES).map(([k,v]) =>
      `<option value="${k}" ${el.elementType===k?'selected':''}>${v}</option>`
    ).join('');

    const isArea = el.inputMethod === 'area';
    const isVol = el.inputMethod === 'volume';
    const isDim = el.inputMethod === 'dimensions';

    return `
      <tr data-uid="${el._uid}">
        <td><input value="${esc(el.name)}" placeholder="Label" onchange="estField(${el._uid},'name',this.value)"></td>
        <td><select onchange="estField(${el._uid},'elementType',this.value)">${typeOptions}</select></td>
        <td><select onchange="estField(${el._uid},'inputMethod',this.value);renderEstElements()">
          <option value="dimensions" ${isDim?'selected':''}>L×W×D</option>
          <option value="volume" ${isVol?'selected':''}>CY</option>
          <option value="area" ${isArea?'selected':''}>SF</option>
        </select></td>
        <td>${isDim ? `<input type="number" value="${el.length}" placeholder="0" onchange="estField(${el._uid},'length',this.value);recalcEstimate()">` : '—'}</td>
        <td>${isDim ? `<input type="number" value="${el.width}" placeholder="0" onchange="estField(${el._uid},'width',this.value);recalcEstimate()">` : '—'}</td>
        <td>${isDim ? `<input type="number" value="${el.depth}" placeholder="0" onchange="estField(${el._uid},'depth',this.value);recalcEstimate()">` : '—'}</td>
        <td>${isDim ? `<input type="number" value="${el.count}" min="1" onchange="estField(${el._uid},'count',this.value);recalcEstimate()">` : '—'}</td>
        <td>${isVol ? `<input type="number" value="${el.cubicYards}" placeholder="CY" onchange="estField(${el._uid},'cubicYards',this.value);recalcEstimate()">` :
             isArea ? `<input type="number" value="${el.squareFeet}" placeholder="SF" onchange="estField(${el._uid},'squareFeet',this.value);recalcEstimate()">` : '—'}</td>
        <td><select onchange="estField(${el._uid},'densityLevel',this.value);recalcEstimate()">
          <option value="light" ${el.densityLevel==='light'?'selected':''}>Light</option>
          <option value="medium" ${el.densityLevel==='medium'?'selected':''}>Medium</option>
          <option value="heavy" ${el.densityLevel==='heavy'?'selected':''}>Heavy</option>
          <option value="custom" ${el.densityLevel==='custom'?'selected':''}>Custom</option>
        </select></td>
        <td class="est-density-${el._uid}">—</td>
        <td class="est-cy-${el._uid}">—</td>
        <td class="est-lbs-${el._uid}">—</td>
        <td class="est-tons-${el._uid}">—</td>
        <td><button class="btn btn-danger btn-sm" onclick="removeEstElement(${el._uid})">×</button></td>
      </tr>
    `;
  }).join('');

  recalcEstimate();
}

function estField(uid, field, value) {
  const el = estElements.find(e => e._uid === uid);
  if (el) el[field] = value;
}

async function recalcEstimate() {
  if (estElements.length === 0) return;

  const apiElements = estElements.map(el => ({
    name: el.name,
    elementType: el.elementType,
    inputMethod: el.inputMethod,
    length: parseFloat(el.length) || 0,
    width: parseFloat(el.width) || 0,
    depth: parseFloat(el.depth) || 0,
    count: parseInt(el.count) || 1,
    cubicYards: parseFloat(el.cubicYards) || 0,
    squareFeet: parseFloat(el.squareFeet) || 0,
    thickness: parseFloat(el.thickness) || 0,
    densityLevel: el.densityLevel,
    customDensity: parseFloat(el.customDensity) || 0,
  }));

  try {
    const result = await API.post('/api/estimating/calculate', {
      elements: apiElements,
      wasteFactor: parseFloat(document.getElementById('est-waste').value) || 5,
      lapSpliceFactor: parseFloat(document.getElementById('est-lap').value) || 10,
      accessoriesFactor: parseFloat(document.getElementById('est-accessories').value) || 3,
    });

    // Update per-row calculated values
    result.elements.forEach((calc, i) => {
      const el = estElements[i];
      if (!el) return;
      const uid = el._uid;
      const densityCell = document.querySelector(`.est-density-${uid}`);
      const cyCell = document.querySelector(`.est-cy-${uid}`);
      const lbsCell = document.querySelector(`.est-lbs-${uid}`);
      const tonsCell = document.querySelector(`.est-tons-${uid}`);
      if (densityCell) densityCell.textContent = calc.rebarDensityUsed ? calc.rebarDensityUsed.toFixed(0) : '—';
      if (cyCell) cyCell.textContent = calc.concreteVolumeCY ? calc.concreteVolumeCY.toFixed(1) : '—';
      if (lbsCell) lbsCell.textContent = calc.rebarWeightLbs ? Math.round(calc.rebarWeightLbs).toLocaleString() : '—';
      if (tonsCell) tonsCell.textContent = calc.rebarWeightTons ? calc.rebarWeightTons.toFixed(2) : '—';
    });

    // Update totals
    const totalsDiv = document.getElementById('est-totals');
    totalsDiv.classList.remove('hidden');

    document.getElementById('est-stats').innerHTML = `
      <div class="stat-card"><div class="value">${result.totalConcreteCY.toLocaleString()}</div><div class="label">Concrete (CY)</div></div>
      <div class="stat-card"><div class="value">${result.subtotalRebarLbs.toLocaleString()}</div><div class="label">Rebar Subtotal (lbs)</div></div>
      <div class="stat-card"><div class="value">${result.grandTotalRebarLbs.toLocaleString()}</div><div class="label">Grand Total (lbs)</div></div>
      <div class="stat-card"><div class="value">${result.grandTotalRebarTons.toFixed(2)}</div><div class="label">Grand Total (Tons)</div></div>
      <div class="stat-card"><div class="value">${result.avgDensityLbsCY}</div><div class="label">Avg Density (lbs/CY)</div></div>
    `;

    const waste = parseFloat(document.getElementById('est-waste').value) || 5;
    const lap = parseFloat(document.getElementById('est-lap').value) || 10;
    const acc = parseFloat(document.getElementById('est-accessories').value) || 3;

    document.getElementById('est-breakdown-tbody').innerHTML = `
      <tr><td style="font-weight:600;width:250px">Rebar Subtotal</td><td style="text-align:right">${result.subtotalRebarLbs.toLocaleString()} lbs</td></tr>
      <tr><td>Waste (${waste}%)</td><td style="text-align:right">+ ${result.wasteRebarLbs.toLocaleString()} lbs</td></tr>
      <tr><td>Lap Splices (${lap}%)</td><td style="text-align:right">+ ${result.lapSpliceRebarLbs.toLocaleString()} lbs</td></tr>
      <tr><td>Accessories (${acc}%)</td><td style="text-align:right">+ ${result.accessoriesLbs.toLocaleString()} lbs</td></tr>
      <tr style="font-weight:700;font-size:15px;border-top:2px solid var(--text)">
        <td>GRAND TOTAL</td>
        <td style="text-align:right">${result.grandTotalRebarLbs.toLocaleString()} lbs (${result.grandTotalRebarTons.toFixed(2)} tons)</td>
      </tr>
    `;

    // Update footer totals in table
    document.getElementById('est-elements-tfoot').innerHTML = `
      <tr style="font-weight:600;background:var(--bg)">
        <td colspan="10" style="text-align:right">TOTALS:</td>
        <td>${result.totalConcreteCY.toFixed(1)} CY</td>
        <td>${result.subtotalRebarLbs.toLocaleString()} lbs</td>
        <td>${(result.subtotalRebarLbs / 2000).toFixed(2)} T</td>
        <td></td>
      </tr>
    `;
  } catch (err) {
    console.error('Calc error:', err);
  }
}

async function applyTemplate() {
  const tmplKey = document.getElementById('est-template').value;
  if (!tmplKey) return;

  try {
    const templates = await API.get('/api/estimating/templates');
    const tmpl = templates[tmplKey];
    if (!tmpl) return;

    estElements = [];
    for (const el of tmpl.elements) {
      addEstElement(el);
    }
    toast(`Loaded "${tmpl.name}" template with ${tmpl.elements.length} elements`, 'success');
  } catch { toast('Failed to load template', 'error'); }
}

async function saveCurrentEstimate() {
  const projectName = document.getElementById('est-project-name').value || `Estimate ${new Date().toLocaleDateString()}`;

  const apiElements = estElements.map(el => ({
    name: el.name,
    elementType: el.elementType,
    inputMethod: el.inputMethod,
    length: parseFloat(el.length) || 0,
    width: parseFloat(el.width) || 0,
    depth: parseFloat(el.depth) || 0,
    count: parseInt(el.count) || 1,
    cubicYards: parseFloat(el.cubicYards) || 0,
    squareFeet: parseFloat(el.squareFeet) || 0,
    thickness: parseFloat(el.thickness) || 0,
    densityLevel: el.densityLevel,
    customDensity: parseFloat(el.customDensity) || 0,
  }));

  try {
    const method = currentEstimateId ? 'put' : 'post';
    const url = currentEstimateId ? `/api/estimating/${currentEstimateId}` : '/api/estimating';

    const result = await API[method](url, {
      projectName,
      buildingType: document.getElementById('est-template').value || undefined,
      elements: apiElements,
      wasteFactor: parseFloat(document.getElementById('est-waste').value) || 5,
      lapSpliceFactor: parseFloat(document.getElementById('est-lap').value) || 10,
      accessoriesFactor: parseFloat(document.getElementById('est-accessories').value) || 3,
    });

    currentEstimateId = result.id;
    toast('Estimate saved', 'success');
  } catch { toast('Failed to save estimate', 'error'); }
}

async function loadEstimatesList() {
  const container = document.getElementById('est-saved-list');
  container.classList.toggle('hidden');
  if (container.classList.contains('hidden')) return;

  try {
    const estimates = await API.get('/api/estimating');
    if (estimates.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);padding:8px">No saved estimates.</p>';
      return;
    }

    container.innerHTML = estimates.map(est => `
      <div class="project-item" style="margin-bottom:4px">
        <div class="project-info" onclick="loadEstimate('${est.id}')" style="cursor:pointer">
          <div class="name">${esc(est.projectName)}</div>
          <div class="meta">${est.elements.length} elements &middot; ${est.grandTotalRebarTons.toFixed(2)} tons &middot; ${new Date(est.createdAt).toLocaleDateString()}</div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteEstimateById('${est.id}')">Del</button>
      </div>
    `).join('');
  } catch { toast('Failed to load estimates', 'error'); }
}

async function loadEstimate(id) {
  try {
    const est = await API.get(`/api/estimating/${id}`);
    currentEstimateId = est.id;
    document.getElementById('est-project-name').value = est.projectName;
    document.getElementById('est-waste').value = est.wasteFactor;
    document.getElementById('est-lap').value = est.lapSpliceFactor;
    document.getElementById('est-accessories').value = est.accessoriesFactor;
    if (est.buildingType) document.getElementById('est-template').value = est.buildingType;

    estElements = est.elements.map(el => ({
      _uid: Date.now() + Math.random(),
      name: el.name || '',
      elementType: el.elementType,
      inputMethod: el.inputMethod || 'dimensions',
      densityLevel: el.densityLevel || 'medium',
      length: el.length || '',
      width: el.width || '',
      depth: el.depth || '',
      count: el.count || 1,
      cubicYards: el.cubicYards || '',
      squareFeet: el.squareFeet || '',
      thickness: el.thickness || '',
      customDensity: el.customDensity || '',
    }));

    renderEstElements();
    document.getElementById('est-saved-list').classList.add('hidden');
    toast('Estimate loaded', 'success');
  } catch { toast('Failed to load estimate', 'error'); }
}

async function deleteEstimateById(id) {
  if (!confirm('Delete this estimate?')) return;
  try {
    await API.del(`/api/estimating/${id}`);
    if (currentEstimateId === id) currentEstimateId = null;
    loadEstimatesList();
    toast('Deleted', 'success');
  } catch { toast('Failed to delete', 'error'); }
}

function exportEstimateCSV() {
  const rows = [['Element', 'Type', 'Concrete (CY)', 'Density (lbs/CY)', 'Rebar (lbs)', 'Rebar (tons)']];
  document.querySelectorAll('#est-elements-tbody tr').forEach(tr => {
    const cells = tr.querySelectorAll('td');
    if (cells.length < 13) return;
    const name = cells[0]?.querySelector('input')?.value || '';
    const type = cells[1]?.querySelector('select')?.value || '';
    rows.push([
      name,
      ELEMENT_TYPES[type] || type,
      cells[10]?.textContent?.trim() || '',
      cells[9]?.textContent?.trim() || '',
      cells[11]?.textContent?.trim() || '',
      cells[12]?.textContent?.trim() || '',
    ]);
  });

  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `rebar-estimate-${Date.now()}.csv`;
  a.click();
}

// ── Estimating Upload ───────────────────────────────────────

let estSelectedFiles = [];

// Set up estimating upload zone (deferred until DOM ready)
document.addEventListener('DOMContentLoaded', () => {
  setupEstUpload();
});
// Also try immediately in case DOM is already loaded
if (document.readyState !== 'loading') setupEstUpload();

function setupEstUpload() {
  const estUploadZone = document.getElementById('est-upload-zone');
  const estFileInput = document.getElementById('est-file-input');
  if (!estUploadZone || !estFileInput || estUploadZone._bound) return;
  estUploadZone._bound = true;

  estUploadZone.addEventListener('click', () => estFileInput.click());
  estUploadZone.addEventListener('dragover', e => { e.preventDefault(); estUploadZone.classList.add('dragover'); });
  estUploadZone.addEventListener('dragleave', () => estUploadZone.classList.remove('dragover'));
  estUploadZone.addEventListener('drop', e => {
    e.preventDefault();
    estUploadZone.classList.remove('dragover');
    handleEstFiles(e.dataTransfer.files);
  });
  estFileInput.addEventListener('change', () => handleEstFiles(estFileInput.files));
}

function handleEstFiles(files) {
  estSelectedFiles = Array.from(files);
  const list = document.getElementById('est-file-list');
  list.innerHTML = estSelectedFiles.map(f =>
    `<div style="padding:4px 0;font-size:13px">${esc(f.name)} <span style="color:var(--text-muted)">(${(f.size/1024/1024).toFixed(1)} MB)</span></div>`
  ).join('');
  document.getElementById('est-upload-btn').style.display = estSelectedFiles.length > 0 ? 'inline-flex' : 'none';
}

async function startEstimatingUpload() {
  if (estSelectedFiles.length === 0) return;

  const formData = new FormData();
  estSelectedFiles.forEach(f => formData.append('files', f));

  showLoading('Analyzing drawings for structural elements... This may take a minute per page.');

  try {
    const result = await API.postForm('/api/estimating/upload', formData);
    hideLoading();

    if (!result.elements || result.elements.length === 0) {
      toast('No structural elements found in the drawings. Try adding manually.', 'error');
      return;
    }

    // Populate the elements table with extracted data
    estElements = [];
    for (const el of result.elements) {
      estElements.push({
        _uid: Date.now() + Math.random(),
        name: el.name || '',
        elementType: el.elementType || 'spread_footing',
        inputMethod: el.inputMethod || 'dimensions',
        densityLevel: el.densityLevel || 'medium',
        length: el.length || '',
        width: el.width || '',
        depth: el.depth || '',
        count: el.count || 1,
        cubicYards: el.cubicYards || '',
        squareFeet: el.squareFeet || '',
        thickness: el.thickness || '',
        customDensity: '',
        notes: el.notes || '',
      });
    }

    renderEstElements();

    // Show file processing results
    const successFiles = result.files?.filter(f => f.status === 'success').length || 0;
    const totalPages = result.pagesProcessed || 0;
    toast(`Found ${result.elements.length} elements from ${successFiles} file(s) (${totalPages} pages). Review and adjust dimensions below.`, 'success');

    // Reset upload form
    estSelectedFiles = [];
    document.getElementById('est-file-list').innerHTML = '';
    document.getElementById('est-upload-btn').style.display = 'none';
    document.getElementById('est-file-input').value = '';
  } catch (err) {
    hideLoading();
    toast('Upload failed: ' + err.message, 'error');
  }
}

// ── Tools ────────────────────────────────────────────────────

let bidElements = [];
let stockReqs = [];
let laborElements = [];
let compareEst = [];
let compareAct = [];
let lastStockOptResult = null;

function showTool(tool) {
  document.querySelectorAll('.tool-panel').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tool-${tool}`).classList.remove('hidden');
  document.querySelectorAll('.tools-nav button').forEach(b => {
    b.className = b.textContent.trim().toLowerCase().includes(tool) || b.onclick.toString().includes(`'${tool}'`)
      ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
  });
  // Load project lists for selectors
  if (['bid', 'stock', 'po'].includes(tool)) loadProjectSelectors();
}

async function loadProjectSelectors() {
  try {
    const projects = await API.get('/api/projects');
    const opts = projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    ['bid-project-id', 'stock-project-id', 'po-project-id', 'charts-project-id', 'markup-project-id'].forEach(id => {
      const sel = document.getElementById(id);
      if (sel) sel.innerHTML = opts || '<option>No projects</option>';
    });
  } catch {}
}

// ── Bid Generator ──

function toggleBidSource() {
  const isProject = document.getElementById('bid-source').value === 'project';
  document.getElementById('bid-project-group').style.display = isProject ? '' : 'none';
  document.getElementById('bid-manual-elements').style.display = isProject ? 'none' : '';
}

function addBidElement() {
  bidElements.push({ name: '', elementType: 'beam_regular', barSize: 5, tons: 0, coating: 'none' });
  renderBidElements();
}

function renderBidElements() {
  const tbody = document.getElementById('bid-elements-tbody');
  if (bidElements.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:12px">Add elements to generate a bid.</td></tr>';
    return;
  }
  tbody.innerHTML = bidElements.map((el, i) => `
    <tr>
      <td><input value="${esc(el.name)}" placeholder="Label" onchange="bidElements[${i}].name=this.value"></td>
      <td><select onchange="bidElements[${i}].elementType=this.value">
        ${Object.entries(ELEMENT_TYPES).map(([k,v]) => `<option value="${k}" ${el.elementType===k?'selected':''}>${v}</option>`).join('')}
      </select></td>
      <td><select onchange="bidElements[${i}].barSize=parseInt(this.value)">
        ${[3,4,5,6,7,8,9,10,11,14,18].map(s => `<option value="${s}" ${el.barSize===s?'selected':''}>#${s}</option>`).join('')}
      </select></td>
      <td><input type="number" value="${el.tons}" step="0.1" min="0" onchange="bidElements[${i}].tons=parseFloat(this.value)||0" style="width:80px"></td>
      <td><select onchange="bidElements[${i}].coating=this.value">
        <option value="none" ${el.coating==='none'?'selected':''}>None</option>
        <option value="epoxy" ${el.coating==='epoxy'?'selected':''}>Epoxy</option>
        <option value="galvanized" ${el.coating==='galvanized'?'selected':''}>Galvanized</option>
      </select></td>
      <td><button class="btn btn-danger btn-sm" onclick="bidElements.splice(${i},1);renderBidElements()">×</button></td>
    </tr>
  `).join('');
}

async function generateBid() {
  try {
    const body = {};
    if (document.getElementById('bid-source').value === 'project') {
      body.projectId = document.getElementById('bid-project-id').value;
    } else {
      body.elements = bidElements;
    }
    body.pricing = {
      overheadPercent: parseFloat(document.getElementById('bid-overhead').value) || 10,
      profitPercent: parseFloat(document.getElementById('bid-profit').value) || 10,
      bondPercent: parseFloat(document.getElementById('bid-bond').value) || 2,
      salesTaxPercent: parseFloat(document.getElementById('bid-tax').value) || 0,
    };

    showLoading('Generating bid...');
    const bid = await API.post('/api/tools/generate-bid', body);
    hideLoading();

    const container = document.getElementById('bid-result');
    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="card">
        <h3>Bid Summary</h3>
        <div class="stats">
          <div class="stat-card"><div class="value">${bid.totalTons.toFixed(2)}</div><div class="label">Total Tons</div></div>
          <div class="stat-card"><div class="value">$${bid.totalMaterialCost.toLocaleString()}</div><div class="label">Material Cost</div></div>
          <div class="stat-card"><div class="value">$${bid.totalLaborCost.toLocaleString()}</div><div class="label">Labor Cost</div></div>
          <div class="stat-card"><div class="value">$${bid.grandTotal.toLocaleString()}</div><div class="label">Grand Total</div></div>
          <div class="stat-card"><div class="value">$${bid.pricePerTon.toLocaleString()}</div><div class="label">$/Ton</div></div>
        </div>

        <h4 style="margin-top:16px">Material by Bar Size</h4>
        <table><thead><tr><th>Size</th><th>Tons</th><th>$/Ton</th><th>Total</th></tr></thead>
        <tbody>${bid.materialBySize.map(m => `
          <tr><td>#${m.barSize}</td><td>${m.tons}</td><td>$${m.pricePerTon.toLocaleString()}</td><td>$${m.total.toLocaleString()}</td></tr>
        `).join('')}</tbody></table>

        ${bid.laborDetails.length > 0 ? `
        <h4 style="margin-top:16px">Labor Detail</h4>
        <table><thead><tr><th>Element</th><th>Tons</th><th>Crew</th><th>Crew Days</th><th>Hours</th><th>Cost</th></tr></thead>
        <tbody>${bid.laborDetails.map(l => `
          <tr><td>${esc(l.elementName)}</td><td>${l.tons}</td><td>${l.crewSize}</td><td>${l.crewDays}</td><td>${l.laborHours}</td><td>$${l.laborCost.toLocaleString()}</td></tr>
        `).join('')}</tbody></table>` : ''}

        <h4 style="margin-top:16px">Bid Line Items</h4>
        <table><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Total</th></tr></thead>
        <tbody>${bid.lineItems.map(li => `
          <tr><td>${esc(li.description)}</td><td>${li.quantity}</td><td>${li.unit}</td><td>$${li.unitPrice.toLocaleString()}</td><td><strong>$${li.total.toLocaleString()}</strong></td></tr>
        `).join('')}
        <tr style="font-weight:700;font-size:15px;border-top:2px solid var(--text)">
          <td colspan="4" style="text-align:right">GRAND TOTAL</td><td>$${bid.grandTotal.toLocaleString()}</td>
        </tr></tbody></table>
      </div>
    `;
  } catch (err) {
    hideLoading();
    toast('Bid generation failed: ' + err.message, 'error');
  }
}

// ── Stock Optimizer ──

function toggleStockSource() {
  const isProject = document.getElementById('stock-source').value === 'project';
  document.getElementById('stock-project-group').style.display = isProject ? '' : 'none';
  document.getElementById('stock-manual-reqs').style.display = isProject ? 'none' : '';
}

function addStockReq() {
  stockReqs.push({ barMark: '', barSize: 5, cutLengthFt: 0, quantity: 1 });
  renderStockReqs();
}

function renderStockReqs() {
  const tbody = document.getElementById('stock-reqs-tbody');
  if (stockReqs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:12px">Add cut requirements.</td></tr>';
    return;
  }
  tbody.innerHTML = stockReqs.map((r, i) => `
    <tr>
      <td><input value="${esc(r.barMark)}" placeholder="Mark" onchange="stockReqs[${i}].barMark=this.value"></td>
      <td><select onchange="stockReqs[${i}].barSize=parseInt(this.value)">
        ${[3,4,5,6,7,8,9,10,11,14,18].map(s => `<option value="${s}" ${r.barSize===s?'selected':''}>#${s}</option>`).join('')}
      </select></td>
      <td><input type="number" value="${r.cutLengthFt}" step="0.5" min="0" onchange="stockReqs[${i}].cutLengthFt=parseFloat(this.value)||0" style="width:80px"></td>
      <td><input type="number" value="${r.quantity}" min="1" onchange="stockReqs[${i}].quantity=parseInt(this.value)||1" style="width:60px"></td>
      <td><button class="btn btn-danger btn-sm" onclick="stockReqs.splice(${i},1);renderStockReqs()">×</button></td>
    </tr>
  `).join('');
}

async function runStockOptimizer() {
  try {
    const body = {};
    if (document.getElementById('stock-source').value === 'project') {
      body.projectId = document.getElementById('stock-project-id').value;
    } else {
      body.requirements = stockReqs;
    }
    const lengths = document.getElementById('stock-lengths').value.split(',').map(s => parseFloat(s.trim())).filter(n => n > 0);
    if (lengths.length > 0) body.stockLengths = lengths;

    showLoading('Optimizing stock lengths...');
    const result = await API.post('/api/tools/optimize-stock', body);
    hideLoading();
    lastStockOptResult = result;

    const container = document.getElementById('stock-result');
    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="card">
        <h3>Optimization Results</h3>
        <div class="stats">
          <div class="stat-card"><div class="value">${result.grandTotalStockBars}</div><div class="label">Stock Bars</div></div>
          <div class="stat-card"><div class="value">${result.grandTotalStockLengthFt} ft</div><div class="label">Total Stock</div></div>
          <div class="stat-card"><div class="value">${result.grandTotalWasteFt} ft</div><div class="label">Total Waste</div></div>
          <div class="stat-card"><div class="value">${result.overallWastePercent}%</div><div class="label">Waste %</div></div>
          <div class="stat-card"><div class="value">${result.estimatedSavingsVsWorstCase} ft</div><div class="label">Savings vs Worst</div></div>
        </div>

        ${result.results.map(r => `
          <h4 style="margin-top:16px">#${r.barSize} — ${r.totalStockBars} bars, ${r.wastePercent}% waste</h4>
          <table><thead><tr><th>Stock Length</th><th>Count</th></tr></thead>
          <tbody>${r.stockBreakdown.map(s => `<tr><td>${s.stockLength}'-0"</td><td>${s.count}</td></tr>`).join('')}</tbody></table>

          <details style="margin-top:8px"><summary style="cursor:pointer;color:var(--primary);font-size:13px">Show ${r.patterns.length} cutting patterns</summary>
          <table style="margin-top:8px"><thead><tr><th>Stock</th><th>Cuts</th><th>Used</th><th>Waste</th><th>Waste %</th></tr></thead>
          <tbody>${r.patterns.map(p => `
            <tr>
              <td>${p.stockLength}'</td>
              <td>${p.cuts.map(c => `${c.barMark || '?'}@${c.lengthFt}'`).join(', ')}</td>
              <td>${p.usedLength}'</td>
              <td>${p.wasteLength}'</td>
              <td><span style="color:${p.wastePercent > 20 ? 'var(--danger)' : p.wastePercent > 10 ? '#f59e0b' : 'var(--success)'}">${p.wastePercent}%</span></td>
            </tr>
          `).join('')}</tbody></table></details>
        `).join('')}
      </div>
    `;
  } catch (err) {
    hideLoading();
    toast('Optimization failed: ' + err.message, 'error');
  }
}

// ── Labor Calculator ──

function addLaborElement() {
  laborElements.push({ name: '', elementType: 'beam_regular', tons: 0 });
  renderLaborElements();
}

function renderLaborElements() {
  const tbody = document.getElementById('labor-elements-tbody');
  if (laborElements.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:12px">Add elements to calculate labor.</td></tr>';
    return;
  }
  tbody.innerHTML = laborElements.map((el, i) => `
    <tr>
      <td><input value="${esc(el.name)}" placeholder="Label" onchange="laborElements[${i}].name=this.value"></td>
      <td><select onchange="laborElements[${i}].elementType=this.value">
        ${Object.entries(ELEMENT_TYPES).map(([k,v]) => `<option value="${k}" ${el.elementType===k?'selected':''}>${v}</option>`).join('')}
      </select></td>
      <td><input type="number" value="${el.tons}" step="0.1" min="0" onchange="laborElements[${i}].tons=parseFloat(this.value)||0" style="width:80px"></td>
      <td><button class="btn btn-danger btn-sm" onclick="laborElements.splice(${i},1);renderLaborElements()">×</button></td>
    </tr>
  `).join('');
}

async function runLaborCalc() {
  try {
    const rate = parseFloat(document.getElementById('labor-rate').value) || 85;
    showLoading('Calculating labor...');
    const result = await API.post('/api/tools/labor-estimate', { elements: laborElements, hourlyRate: rate });
    hideLoading();

    const container = document.getElementById('labor-result');
    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="card">
        <h3>Labor Estimate</h3>
        <div class="stats">
          <div class="stat-card"><div class="value">${result.totalLaborHours}</div><div class="label">Total Hours</div></div>
          <div class="stat-card"><div class="value">${result.totalCrewDays}</div><div class="label">Crew Days</div></div>
          <div class="stat-card"><div class="value">${result.calendarDays}</div><div class="label">Calendar Days</div></div>
          <div class="stat-card"><div class="value">${result.avgCrewSize}</div><div class="label">Avg Crew Size</div></div>
          <div class="stat-card"><div class="value">$${result.totalLaborCost.toLocaleString()}</div><div class="label">Total Cost</div></div>
        </div>
        <table style="margin-top:16px"><thead><tr><th>Element</th><th>Type</th><th>Tons</th><th>Crew</th><th>T/Crew-Day</th><th>Crew Days</th><th>Hours</th><th>Cost</th></tr></thead>
        <tbody>${result.elements.map(el => `
          <tr>
            <td>${esc(el.name)}</td><td>${esc(el.description)}</td><td>${el.tons}</td><td>${el.crewSize}</td>
            <td>${el.tonsPerCrewDay}</td><td>${el.crewDays}</td><td>${el.laborHours}</td><td>$${el.laborCost.toLocaleString()}</td>
          </tr>
        `).join('')}</tbody></table>
      </div>
    `;
  } catch (err) {
    hideLoading();
    toast('Labor calc failed: ' + err.message, 'error');
  }
}

// ── Material PO ──

function togglePOSource() {
  const isProject = document.getElementById('po-source').value === 'project';
  document.getElementById('po-project-group').style.display = isProject ? '' : 'none';
}

async function generatePO() {
  try {
    const body = {
      projectName: document.getElementById('po-project-name').value || 'Project',
      supplier: document.getElementById('po-supplier').value || '',
    };
    if (document.getElementById('po-source').value === 'stock' && lastStockOptResult) {
      body.stockOptResult = lastStockOptResult;
    } else {
      body.projectId = document.getElementById('po-project-id').value;
    }

    showLoading('Generating PO...');
    const po = await API.post('/api/tools/generate-po', body);
    hideLoading();

    const container = document.getElementById('po-result');
    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="card">
        <h3>Purchase Order — ${esc(po.projectName)}</h3>
        ${po.supplier ? `<p>Supplier: <strong>${esc(po.supplier)}</strong></p>` : ''}
        <p style="font-size:13px;color:var(--text-muted)">Date: ${new Date(po.date).toLocaleDateString()}</p>
        <div class="stats" style="margin-top:12px">
          <div class="stat-card"><div class="value">${po.totalBars}</div><div class="label">Total Bars</div></div>
          <div class="stat-card"><div class="value">${po.totalWeightLbs.toLocaleString()} lbs</div><div class="label">Total Weight</div></div>
          <div class="stat-card"><div class="value">${po.totalWeightTons} T</div><div class="label">Tons</div></div>
        </div>
        <table style="margin-top:16px"><thead><tr><th>Size</th><th>Stock Length</th><th>Qty</th><th>Grade</th><th>Coating</th><th>Unit Wt (lbs/ft)</th><th>Total Wt (lbs)</th></tr></thead>
        <tbody>${po.lines.map(l => `
          <tr><td>${l.sizeLabel}</td><td>${l.stockLengthLabel}</td><td>${l.quantity}</td><td>${l.grade}</td><td>${l.coating}</td><td>${l.unitWeight.toFixed(3)}</td><td>${l.totalWeight.toLocaleString()}</td></tr>
        `).join('')}
        <tr style="font-weight:700;border-top:2px solid var(--text)">
          <td colspan="2">TOTAL</td><td>${po.totalBars}</td><td colspan="3"></td><td>${po.totalWeightLbs.toLocaleString()} lbs</td>
        </tr></tbody></table>
      </div>
    `;
  } catch (err) {
    hideLoading();
    toast('PO generation failed: ' + err.message, 'error');
  }
}

// ── Estimate vs Actual ──

function addCompareRow(side) {
  const arr = side === 'est' ? compareEst : compareAct;
  arr.push({ name: '', elementType: 'beam_regular', tons: 0 });
  renderCompareRows(side);
}

function renderCompareRows(side) {
  const arr = side === 'est' ? compareEst : compareAct;
  const tbody = document.getElementById(`compare-${side}-tbody`);
  if (arr.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:8px">Add rows</td></tr>';
    return;
  }
  const varName = side === 'est' ? 'compareEst' : 'compareAct';
  tbody.innerHTML = arr.map((el, i) => `
    <tr>
      <td><input value="${esc(el.name)}" placeholder="Name" onchange="${varName}[${i}].name=this.value" style="width:100px"></td>
      <td><select onchange="${varName}[${i}].elementType=this.value">
        ${Object.entries(ELEMENT_TYPES).map(([k,v]) => `<option value="${k}" ${el.elementType===k?'selected':''}>${v}</option>`).join('')}
      </select></td>
      <td><input type="number" value="${el.tons}" step="0.1" min="0" onchange="${varName}[${i}].tons=parseFloat(this.value)||0" style="width:70px"></td>
      <td><button class="btn btn-danger btn-sm" onclick="${varName}.splice(${i},1);renderCompareRows('${side}')">×</button></td>
    </tr>
  `).join('');
}

async function runComparison() {
  try {
    showLoading('Comparing...');
    const result = await API.post('/api/tools/compare', { estimate: compareEst, actual: compareAct });
    hideLoading();

    const container = document.getElementById('compare-result');
    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="card">
        <h3>Variance Report</h3>
        <div class="stats">
          <div class="stat-card"><div class="value">${result.totalEstimated} T</div><div class="label">Estimated</div></div>
          <div class="stat-card"><div class="value">${result.totalActual} T</div><div class="label">Actual</div></div>
          <div class="stat-card"><div class="value" style="color:${result.totalVarianceTons > 0 ? 'var(--danger)' : 'var(--success)'}">${result.totalVarianceTons > 0 ? '+' : ''}${result.totalVarianceTons} T</div><div class="label">Variance</div></div>
          <div class="stat-card"><div class="value" style="color:${Math.abs(result.totalVariancePercent) > 10 ? 'var(--danger)' : 'var(--success)'}">${result.totalVariancePercent > 0 ? '+' : ''}${result.totalVariancePercent}%</div><div class="label">Variance %</div></div>
        </div>
        <table style="margin-top:16px"><thead><tr><th>Element</th><th>Estimated (T)</th><th>Actual (T)</th><th>Variance (T)</th><th>Variance %</th><th>Status</th></tr></thead>
        <tbody>${result.comparisons.map(c => {
          const color = c.status === 'good' ? 'var(--success)' : c.status === 'warning' ? '#f59e0b' : c.status === 'new' ? 'var(--primary)' : 'var(--danger)';
          return `<tr>
            <td>${esc(c.name)}</td><td>${c.estimatedTons}</td><td>${c.actualTons}</td>
            <td style="color:${color};font-weight:600">${c.varianceTons > 0 ? '+' : ''}${c.varianceTons}</td>
            <td style="color:${color}">${c.variancePercent > 0 ? '+' : ''}${c.variancePercent}%</td>
            <td><span style="background:${color};color:white;padding:2px 8px;border-radius:4px;font-size:11px">${c.status.toUpperCase()}</span></td>
          </tr>`;
        }).join('')}</tbody></table>
      </div>
    `;
  } catch (err) {
    hideLoading();
    toast('Comparison failed: ' + err.message, 'error');
  }
}

// ── Dashboard Charts (inline SVG) ────────────────────────────

async function loadCharts() {
  const projectId = document.getElementById('charts-project-id').value;
  if (!projectId) { toast('Select a project', 'error'); return; }

  try {
    showLoading('Loading chart data...');
    const data = await API.get(`/api/tools/chart-data/${projectId}`);
    hideLoading();

    document.getElementById('charts-result').classList.remove('hidden');

    document.getElementById('charts-stats').innerHTML = `
      <div class="stat-card"><div class="value">${data.totalMarks}</div><div class="label">Bar Marks</div></div>
      <div class="stat-card"><div class="value">${data.totalItems}</div><div class="label">Rebar Items</div></div>
      <div class="stat-card"><div class="value">${Math.round(data.totalWeight).toLocaleString()} lbs</div><div class="label">Total Weight</div></div>
      <div class="stat-card"><div class="value">${(data.totalWeight / 2000).toFixed(2)} T</div><div class="label">Tons</div></div>
    `;

    renderBarChart('chart-weight-size', data.weightBySize, 'lbs');
    renderBarChart('chart-qty-size', data.qtyBySize, 'pcs');
    renderBarChart('chart-weight-element', data.weightByElement, 'lbs');
    renderDonutChart('chart-confidence', data.confidenceDistribution);
  } catch (err) {
    hideLoading();
    toast('Failed to load charts: ' + err.message, 'error');
  }
}

function renderBarChart(containerId, dataObj, unit) {
  const container = document.getElementById(containerId);
  const entries = Object.entries(dataObj).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) { container.innerHTML = '<p style="color:var(--text-muted);padding:12px">No data</p>'; return; }

  const maxVal = Math.max(...entries.map(([, v]) => v));
  const barH = 28;
  const gap = 6;
  const labelW = 120;
  const valueW = 80;
  const chartW = 400;
  const svgW = labelW + chartW + valueW + 20;
  const svgH = entries.length * (barH + gap) + 10;
  const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

  let svg = `<svg width="100%" viewBox="0 0 ${svgW} ${svgH}" style="font-family:system-ui;font-size:12px">`;
  entries.forEach(([label, value], i) => {
    const y = i * (barH + gap) + 5;
    const w = maxVal > 0 ? (value / maxVal) * chartW : 0;
    const color = colors[i % colors.length];
    svg += `<text x="${labelW - 8}" y="${y + barH / 2 + 4}" text-anchor="end" fill="#475569" font-size="11">${label}</text>`;
    svg += `<rect x="${labelW}" y="${y}" width="${Math.max(w, 2)}" height="${barH}" rx="4" fill="${color}" opacity="0.85"/>`;
    svg += `<text x="${labelW + w + 8}" y="${y + barH / 2 + 4}" fill="#1e293b" font-size="11" font-weight="600">${Math.round(value).toLocaleString()} ${unit}</text>`;
  });
  svg += '</svg>';
  container.innerHTML = svg;
}

function renderDonutChart(containerId, data) {
  const container = document.getElementById(containerId);
  const total = data.high + data.medium + data.low;
  if (total === 0) { container.innerHTML = '<p style="color:var(--text-muted);padding:12px">No data</p>'; return; }

  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 65;
  const strokeW = 28;
  const slices = [
    { label: 'High', value: data.high, color: '#22c55e' },
    { label: 'Medium', value: data.medium, color: '#f59e0b' },
    { label: 'Low', value: data.low, color: '#ef4444' },
  ].filter(s => s.value > 0);

  const circumference = 2 * Math.PI * r;
  let offset = 0;

  let svg = `<div style="display:flex;align-items:center;gap:24px">`;
  svg += `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="${strokeW}"/>`;

  for (const slice of slices) {
    const pct = slice.value / total;
    const dashLen = pct * circumference;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${slice.color}" stroke-width="${strokeW}" stroke-dasharray="${dashLen} ${circumference - dashLen}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += dashLen;
  }

  svg += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="22" font-weight="700" fill="#1e293b">${total}</text>`;
  svg += `<text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="11" fill="#64748b">items</text>`;
  svg += '</svg>';

  svg += '<div>';
  for (const slice of slices) {
    const pct = ((slice.value / total) * 100).toFixed(0);
    svg += `<div style="display:flex;align-items:center;gap:8px;margin:4px 0"><span style="width:12px;height:12px;border-radius:50%;background:${slice.color};display:inline-block"></span><span style="font-size:13px">${slice.label}: <strong>${slice.value}</strong> (${pct}%)</span></div>`;
  }
  svg += '</div></div>';
  container.innerHTML = svg;
}

// ── Shop Drawing Markup ──────────────────────────────────────

let markupAnnotations = [];
let markupTool = 'text';
let markupSheetId = null;
let markupCanvas = null;
let markupCtx = null;
let markupImg = null;
let markupDrawing = false;
let markupStartX = 0;
let markupStartY = 0;

async function loadMarkupSheets() {
  const projectId = document.getElementById('markup-project-id').value;
  if (!projectId) return;
  try {
    const sheets = await API.get(`/api/projects/${projectId}/sheets`);
    const sel = document.getElementById('markup-sheet-id');
    sel.innerHTML = sheets.map(s => `<option value="${s.id}">${esc(s.filename)} — Page ${s.page_number}</option>`).join('');
  } catch {}
}

function setMarkupTool(tool) {
  markupTool = tool;
  document.querySelectorAll('.markup-tool-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.markup-tool-btn[data-tool="${tool}"]`).classList.add('active');
}

async function openMarkupEditor() {
  markupSheetId = document.getElementById('markup-sheet-id').value;
  const projectId = document.getElementById('markup-project-id').value;
  if (!markupSheetId || !projectId) { toast('Select a project and sheet', 'error'); return; }

  document.getElementById('markup-editor').classList.remove('hidden');

  // Load sheet image
  const sheets = await API.get(`/api/projects/${projectId}/sheets`);
  const sheet = sheets.find(s => s.id === markupSheetId);

  markupCanvas = document.getElementById('markup-canvas');
  markupCtx = markupCanvas.getContext('2d');

  if (sheet?.image_path) {
    markupImg = new Image();
    markupImg.crossOrigin = 'anonymous';
    markupImg.onload = () => {
      markupCanvas.width = markupImg.width;
      markupCanvas.height = markupImg.height;
      redrawMarkup();
    };
    markupImg.src = `/uploads/${projectId}/${sheet.image_path.split('/').pop()}`;
  } else {
    // No image — use a blank canvas
    markupCanvas.width = 1200;
    markupCanvas.height = 800;
    markupCtx.fillStyle = '#fff';
    markupCtx.fillRect(0, 0, 1200, 800);
    markupCtx.fillStyle = '#94a3b8';
    markupCtx.font = '18px system-ui';
    markupCtx.textAlign = 'center';
    markupCtx.fillText('No drawing image available — markup on blank canvas', 600, 400);
  }

  // Load existing annotations
  try {
    const data = await API.get(`/api/tools/markup/${markupSheetId}`);
    markupAnnotations = data.annotations || [];
  } catch {
    markupAnnotations = [];
  }

  // Set up canvas events
  markupCanvas.onmousedown = markupMouseDown;
  markupCanvas.onmousemove = markupMouseMove;
  markupCanvas.onmouseup = markupMouseUp;

  redrawMarkup();
}

function getMarkupPos(e) {
  const rect = markupCanvas.getBoundingClientRect();
  const scaleX = markupCanvas.width / rect.width;
  const scaleY = markupCanvas.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

function markupMouseDown(e) {
  const pos = getMarkupPos(e);
  markupStartX = pos.x;
  markupStartY = pos.y;

  if (markupTool === 'text') {
    const text = prompt('Enter annotation text:');
    if (text) {
      markupAnnotations.push({
        type: 'text', x: pos.x, y: pos.y, text,
        color: document.getElementById('markup-color').value,
        size: parseInt(document.getElementById('markup-size').value) * 5 + 10,
      });
      redrawMarkup();
    }
  } else {
    markupDrawing = true;
  }
}

function markupMouseMove(e) {
  if (!markupDrawing) return;
  const pos = getMarkupPos(e);
  redrawMarkup();

  // Draw preview
  const color = document.getElementById('markup-color').value;
  const lineW = parseInt(document.getElementById('markup-size').value);
  markupCtx.strokeStyle = color;
  markupCtx.lineWidth = lineW;
  markupCtx.setLineDash([6, 4]);

  if (markupTool === 'circle') {
    const rx = Math.abs(pos.x - markupStartX);
    const ry = Math.abs(pos.y - markupStartY);
    markupCtx.beginPath();
    markupCtx.ellipse((markupStartX + pos.x) / 2, (markupStartY + pos.y) / 2, rx / 2, ry / 2, 0, 0, Math.PI * 2);
    markupCtx.stroke();
  } else if (markupTool === 'rect') {
    markupCtx.strokeRect(markupStartX, markupStartY, pos.x - markupStartX, pos.y - markupStartY);
  } else if (markupTool === 'arrow') {
    markupCtx.beginPath();
    markupCtx.moveTo(markupStartX, markupStartY);
    markupCtx.lineTo(pos.x, pos.y);
    markupCtx.stroke();
  }
  markupCtx.setLineDash([]);
}

function markupMouseUp(e) {
  if (!markupDrawing) return;
  markupDrawing = false;
  const pos = getMarkupPos(e);
  const color = document.getElementById('markup-color').value;
  const lineW = parseInt(document.getElementById('markup-size').value);

  if (markupTool === 'circle') {
    markupAnnotations.push({
      type: 'circle',
      cx: (markupStartX + pos.x) / 2, cy: (markupStartY + pos.y) / 2,
      rx: Math.abs(pos.x - markupStartX) / 2, ry: Math.abs(pos.y - markupStartY) / 2,
      color, lineWidth: lineW,
    });
  } else if (markupTool === 'rect') {
    markupAnnotations.push({
      type: 'rect',
      x: markupStartX, y: markupStartY,
      w: pos.x - markupStartX, h: pos.y - markupStartY,
      color, lineWidth: lineW,
    });
  } else if (markupTool === 'arrow') {
    markupAnnotations.push({
      type: 'arrow',
      x1: markupStartX, y1: markupStartY, x2: pos.x, y2: pos.y,
      color, lineWidth: lineW,
    });
  }
  redrawMarkup();
}

function redrawMarkup() {
  if (!markupCtx) return;
  markupCtx.clearRect(0, 0, markupCanvas.width, markupCanvas.height);

  // Draw background image
  if (markupImg && markupImg.complete) {
    markupCtx.drawImage(markupImg, 0, 0);
  } else {
    markupCtx.fillStyle = '#fff';
    markupCtx.fillRect(0, 0, markupCanvas.width, markupCanvas.height);
  }

  // Draw annotations
  for (const a of markupAnnotations) {
    markupCtx.strokeStyle = a.color || '#ff0000';
    markupCtx.fillStyle = a.color || '#ff0000';
    markupCtx.lineWidth = a.lineWidth || 2;

    if (a.type === 'text') {
      markupCtx.font = `bold ${a.size || 16}px system-ui`;
      // Draw text background
      const metrics = markupCtx.measureText(a.text);
      const pad = 4;
      markupCtx.fillStyle = 'rgba(255,255,255,0.85)';
      markupCtx.fillRect(a.x - pad, a.y - (a.size || 16) + pad, metrics.width + pad * 2, (a.size || 16) + pad);
      markupCtx.fillStyle = a.color || '#ff0000';
      markupCtx.fillText(a.text, a.x, a.y);
    } else if (a.type === 'circle') {
      markupCtx.beginPath();
      markupCtx.ellipse(a.cx, a.cy, Math.abs(a.rx), Math.abs(a.ry), 0, 0, Math.PI * 2);
      markupCtx.stroke();
    } else if (a.type === 'rect') {
      markupCtx.strokeRect(a.x, a.y, a.w, a.h);
    } else if (a.type === 'arrow') {
      // Draw line
      markupCtx.beginPath();
      markupCtx.moveTo(a.x1, a.y1);
      markupCtx.lineTo(a.x2, a.y2);
      markupCtx.stroke();
      // Draw arrowhead
      const angle = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
      const headLen = 15 + (a.lineWidth || 2) * 2;
      markupCtx.beginPath();
      markupCtx.moveTo(a.x2, a.y2);
      markupCtx.lineTo(a.x2 - headLen * Math.cos(angle - 0.4), a.y2 - headLen * Math.sin(angle - 0.4));
      markupCtx.lineTo(a.x2 - headLen * Math.cos(angle + 0.4), a.y2 - headLen * Math.sin(angle + 0.4));
      markupCtx.closePath();
      markupCtx.fill();
    }
  }
}

function undoMarkup() {
  markupAnnotations.pop();
  redrawMarkup();
}

function clearMarkup() {
  if (!confirm('Clear all annotations?')) return;
  markupAnnotations = [];
  redrawMarkup();
}

async function saveMarkup() {
  if (!markupSheetId) return;
  try {
    await API.post(`/api/tools/markup/${markupSheetId}`, { annotations: markupAnnotations });
    toast('Markup saved', 'success');
  } catch { toast('Failed to save markup', 'error'); }
}

// ── Init ────────────────────────────────────────────────────
loadProjects();
