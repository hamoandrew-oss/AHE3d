const STORAGE_KEY = 'ah-terra-projects-v1';
const SETTINGS_KEY = 'ah-terra-settings-v1';
let viewer = null;
let currentTileset = null;
let currentProject = null;
let wireframeEnabled = false;

const $ = (s) => document.querySelector(s);
const homeView = $('#homeView');
const viewerView = $('#viewerView');
const projectDialog = $('#projectDialog');
const settingsDialog = $('#settingsDialog');

const readProjects = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const writeProjects = (projects) => localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
const readSettings = () => ({theme:'system', quality:true, fps:false, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')});
const writeSettings = (s) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));

function applyTheme(theme){
  const isDark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.body.classList.toggle('dark', isDark);
  document.querySelector('meta[name="theme-color"]').content = isDark ? '#071020' : '#0c245b';
}

function renderProjects(){
  const projects = readProjects();
  const grid = $('#projectGrid');
  grid.innerHTML = '';
  $('#projectCount').textContent = `${projects.length} project${projects.length === 1 ? '' : 's'}`;
  $('#emptyState').hidden = projects.length > 0;
  projects.forEach(project => {
    const frag = $('#projectCardTemplate').content.cloneNode(true);
    const card = frag.querySelector('.project-card');
    frag.querySelector('h3').textContent = project.name;
    frag.querySelector('.project-info p').textContent = project.note || 'DJI Terra 3D model';
    frag.querySelector('.card-actions small').textContent = new Date(project.created).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
    frag.querySelector('.project-open').addEventListener('click',()=>openProject(project));
    frag.querySelector('.delete-btn').addEventListener('click',()=>{
      if(confirm(`Delete “${project.name}”?`)){
        writeProjects(readProjects().filter(p=>p.id!==project.id)); renderProjects();
      }
    });
    grid.appendChild(frag);
  });
}

function openAddProject(){
  $('#projectForm').reset();
  projectDialog.showModal();
  setTimeout(()=>$('#projectName').focus(),150);
}

function initViewer(){
  if(viewer) return;
  viewer = new Cesium.Viewer('cesiumContainer', {
    animation:false, timeline:false, baseLayerPicker:false, geocoder:false,
    homeButton:false, sceneModePicker:false, navigationHelpButton:false,
    infoBox:false, selectionIndicator:false, fullscreenButton:false,
    baseLayer:false, globe:false, skyBox:false, skyAtmosphere:false,
    scene3DOnly:true, requestRenderMode:true, maximumRenderTimeChange:Infinity
  });
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#070d17');
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 0.1;
}

async function openProject(project){
  currentProject = project;
  homeView.classList.remove('active');
  viewerView.classList.add('active');
  $('#bottomNav').classList.add('viewer-open');
  $('#backBtn').hidden = false;
  $('#viewerProjectName').textContent = project.name;
  $('#viewerProjectMeta').textContent = project.note || 'DJI Terra 3D Tiles';
  $('#loadingModel').hidden = false;
  $('#modelError').hidden = true;
  initViewer();
  if(currentTileset){ viewer.scene.primitives.remove(currentTileset); currentTileset = null; }
  try{
    const settings = readSettings();
    currentTileset = await Cesium.Cesium3DTileset.fromUrl(project.url, {
      maximumScreenSpaceError: settings.quality ? 8 : 20,
      skipLevelOfDetail: true,
      dynamicScreenSpaceError: true,
      preferLeaves: false
    });
    viewer.scene.primitives.add(currentTileset);
    await viewer.zoomTo(currentTileset);
    viewer.scene.debugShowFramesPerSecond = !!settings.fps;
    $('#loadingModel').hidden = true;
    viewer.scene.requestRender();
  }catch(err){
    console.error(err);
    $('#loadingModel').hidden = true;
    const e = $('#modelError');
    e.hidden = false;
    e.innerHTML = `<strong>Couldn’t load this model.</strong><br>Check that the tileset URL is public HTTPS, the complete DJI Terra export is online, and your host allows CORS requests.<br><br><small>${escapeHtml(err?.message || String(err))}</small>`;
  }
}

function closeViewer(){
  viewerView.classList.remove('active'); homeView.classList.add('active');
  $('#bottomNav').classList.remove('viewer-open'); $('#backBtn').hidden = true;
  if(viewer){ viewer.scene.debugShowFramesPerSecond = false; }
}

function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

$('#projectForm').addEventListener('submit',(e)=>{
  e.preventDefault();
  const project = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: $('#projectName').value.trim(),
    url: $('#tilesetUrl').value.trim(),
    note: $('#projectNote').value.trim(),
    created: new Date().toISOString()
  };
  const projects = readProjects(); projects.unshift(project); writeProjects(projects);
  projectDialog.close(); renderProjects();
});

$('#addProjectBtn').onclick = openAddProject;
$('#emptyAddBtn').onclick = openAddProject;
$('#navAdd').onclick = openAddProject;
$('#settingsBtn').onclick = ()=>settingsDialog.showModal();
$('#backBtn').onclick = closeViewer;
document.querySelectorAll('[data-close]').forEach(btn=>btn.onclick=()=>document.getElementById(btn.dataset.close).close());
document.querySelectorAll('[data-view="settings"]').forEach(btn=>btn.onclick=()=>settingsDialog.showModal());

$('#themeSelect').addEventListener('change',e=>{const s=readSettings();s.theme=e.target.value;writeSettings(s);applyTheme(s.theme)});
$('#qualityToggle').addEventListener('change',e=>{const s=readSettings();s.quality=e.target.checked;writeSettings(s);if(currentTileset)currentTileset.maximumScreenSpaceError=s.quality?8:20});
$('#fpsToggle').addEventListener('change',e=>{const s=readSettings();s.fps=e.target.checked;writeSettings(s);if(viewer)viewer.scene.debugShowFramesPerSecond=s.fps});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(readSettings().theme==='system')applyTheme('system')});

$('#homeModelBtn').onclick = ()=>currentTileset && viewer?.zoomTo(currentTileset);
$('#wireframeBtn').onclick = ()=>{
  if(!viewer) return;
  wireframeEnabled = !wireframeEnabled;
  viewer.scene.globe && (viewer.scene.globe.show = !wireframeEnabled);
  // Cesium's 3D Tiles wireframe requires enableDebugWireframe at load time in newer builds.
  // Use bounding-volume debug as a lightweight mobile-friendly 'edges' inspection mode.
  if(currentTileset) currentTileset.debugShowBoundingVolume = wireframeEnabled;
  viewer.scene.requestRender();
};
$('#fullscreenBtn').onclick = async()=>{
  const el = document.documentElement;
  if(!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen(); else if(document.exitFullscreen) await document.exitFullscreen();
};

const settings=readSettings();
$('#themeSelect').value=settings.theme; $('#qualityToggle').checked=settings.quality; $('#fpsToggle').checked=settings.fps; applyTheme(settings.theme); renderProjects();

if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
