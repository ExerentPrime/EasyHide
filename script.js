lucide.createIcons();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let drawCallData = {}; let idList = []; let currentIndex = 0;
const fileInput = document.getElementById('fileInput');
const galleryBox = document.getElementById('galleryBox');
const currentImg = document.getElementById('currentImg');
const prevImg = document.getElementById('prevImg');
const counterDisplay = document.getElementById('counterDisplay');
const currentCheckbox = document.getElementById('currentCheckbox');
const selectionStatus = document.getElementById('selectionStatus');
const generateBtn = document.getElementById('generateBtn');
const resultArea = document.getElementById('resultArea');

document.getElementById('pickerArea').addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
	const pickerText = document.getElementById('pickerText');
	pickerText.innerText = "Loading...";
	const iconElement = document.getElementById('pickerIcon');
	iconElement.setAttribute('data-lucide', 'loader-circle');
	iconElement.classList.add('animate-spin');
	lucide.createIcons();
	
	await sleep(1000);
	
	const files = Array.from(e.target.files);
	drawCallData = {}; idList = [];
	const txtFiles = files.filter(f => /^\d+.*-ib=.*-ps=.*\.txt$/i.test(f.name));
	const txtMap = {};
	txtFiles.forEach(f => { const id = f.name.match(/^(\d+)/)[1]; txtMap[id] = f; });

	for (let f of files) {
		const name = f.name.toLowerCase();
		if (name.endsWith('.jpg') && name.includes('o0') && f.size >= 100 * 1024) {
			const idMatch = name.match(/^(\d+)/);
			if (idMatch && txtMap[idMatch[1]]) {
				const id = idMatch[1];
				drawCallData[id] = { txtFile: txtMap[id], imgFile: f, selected: false };
				idList.push(id);
			}
		}
	}
	idList.sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
	if (idList.length > 0) {
		document.getElementById('viewer').classList.remove('hidden');
		document.getElementById('pickerArea').classList.add('hidden');
		document.getElementById('selectionStatus').classList.remove('hidden')
		showImage(0);
	}
	else {
		const currentIcon = document.getElementById('pickerIcon');
		currentIcon.classList.remove('animate-spin');
		pickerText.innerText = "Open FrameAnalysis Folder";
		currentIcon.setAttribute('data-lucide', 'folder-search');
		lucide.createIcons();
		e.target.value = '';
		showAlert();
	}
});

function showImage(index) {
	currentIndex = index;
	const data = drawCallData[idList[currentIndex]];
	currentImg.src = URL.createObjectURL(data.imgFile);
	if (currentIndex > 0) {
		prevImg.src = URL.createObjectURL(drawCallData[idList[currentIndex-1]].imgFile);
		prevImg.style.display = 'block';
	} else {
		prevImg.style.display = 'none';
	}
	counterDisplay.innerText = `IMAGE ${currentIndex + 1} OF ${idList.length}`;
	currentCheckbox.checked = data.selected;
	updateGlobalSelectionCount();
	updateView();
}

<!-- function updateView() { -->
	<!-- const isDiff = document.getElementById('blendToggle').checked; -->
	<!-- document.getElementById('modeText').innerText = isDiff ? "Diff" : "Norm"; -->
	<!-- isDiff ? galleryBox.classList.add('diff-active') : galleryBox.classList.remove('diff-active'); -->
<!-- } -->

function updateView() {
	const slider = document.getElementById('blendSlider');
	const labelNormal = document.getElementById('labelNormal');
	const labelDiff = document.getElementById('labelDiff');
	const val = parseInt(slider.value); // 0 atau 1
	
	if (val === 1) {
		// Aktifkan DIFFERENCE
		labelDiff.classList.replace('text-purple-200/20', 'text-blue-400');
		labelNormal.classList.replace('text-purple-400', 'text-purple-200/20');
		galleryBox.classList.add('diff-active');
	} else {
		// Aktifkan NORMAL
		labelNormal.classList.replace('text-purple-200/20', 'text-purple-400');
		labelDiff.classList.replace('text-blue-400', 'text-purple-200/20');
		galleryBox.classList.remove('diff-active');
	}
}

function applyFilters() {
	const br = document.getElementById('brSlider').value;
	const ct = document.getElementById('ctSlider').value;
	document.getElementById('brVal').innerText = Math.round(br * 100) + "%";
	document.getElementById('ctVal').innerText = Math.round(ct * 100) + "%";
	document.documentElement.style.setProperty('--br', br);
	document.documentElement.style.setProperty('--ct', ct);
}

function resetFilters() {
	document.getElementById('brSlider').value = 1;
	document.getElementById('ctSlider').value = 1;
	applyFilters();
}

function changeImage(step) { let ni = currentIndex + step; if (ni >= 0 && ni < idList.length) showImage(ni); }
function resetAll() { if (!confirm("Clear selections?")) return; Object.keys(drawCallData).forEach(id => drawCallData[id].selected = false); updateGlobalSelectionCount(); currentCheckbox.checked = false; }
function closeModal() { document.getElementById('modalOverlay').style.display = 'none'; }

currentCheckbox.addEventListener('change', (e) => { drawCallData[idList[currentIndex]].selected = e.target.checked; updateGlobalSelectionCount(); });

window.addEventListener('keydown', (e) => {
	// Tukar gambar ke belakang (Left atau A)
	if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
		e.preventDefault(); 
		changeImage(-1);
	}
	
	// Tukar gambar ke depan (Right atau D)
	if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
		e.preventDefault(); 
		changeImage(1);
	}
	
	// Spacebar untuk tick/untick checkbox
	if (e.key === " ") { 
		e.preventDefault(); 
		currentCheckbox.click(); 
	}
});

function updateGlobalSelectionCount() {
	const count = Object.values(drawCallData).filter(d => d.selected).length;
	selectionStatus.innerText = `SELECTED: ${count}`;
	generateBtn.disabled = count === 0;
}

generateBtn.addEventListener('click', async () => {
	const selectedIds = idList.filter(id => drawCallData[id].selected);
	const scriptMap = {};
	for (let id of selectedIds) {
		const data = drawCallData[id];
		const content = await data.txtFile.text();
		const hash = (data.txtFile.name.match(/-ps=([a-f0-9]+)/i) || [])[1];
		const ic = (content.match(/index\s*count\s*:\s*(\d+)/i) || [])[1];
		const fi = (content.match(/first\s*index\s*:\s*(\d+)/i) || [])[1];
		if (hash && ic && fi) {
			if (!scriptMap[hash]) scriptMap[hash] = new Set();
			scriptMap[hash].add(`${ic}-${fi}`);
		}
	}
	let script = `[Constants]\nglobal $WallpaperMode = 0\n\n[KeyToggle]\nKey = F4\ntype = cycle\n$WallpaperMode = 0, 1\n\n`;
	Object.keys(scriptMap).forEach((hash, i) => {
		script += `[ShaderOverride_${i+1}]\nhash = ${hash}\nif $WallpaperMode\n`;
		scriptMap[hash].forEach(v => {
			const [ic, fi] = v.split('-');
			script += `    if index_count == ${ic} && first_index == ${fi}\n        handling = skip\n    endif\n`;
		});
		script += `endif\n\n`;
	});
	resultArea.value = script.trim();
	document.getElementById('modalOverlay').style.display = 'flex';
});

document.getElementById('copyBtn').addEventListener('click', () => {
	resultArea.select(); document.execCommand('copy');
	copyBtn.innerText = "COPIED!"; setTimeout(() => copyBtn.innerText = "Copy Text", 2000);
});

document.getElementById('downloadBtn').addEventListener('click', () => {
	const blob = new Blob([resultArea.value], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a'); a.href = url; a.download = 'EasyHide.ini'; a.click();
});

function showAlert() {
	const modal = document.getElementById('alertModal');
	const box = document.getElementById('modalBox');
	
	modal.classList.remove('hidden');
	// Beri delay sikit untuk animation transition
	setTimeout(() => {
		box.classList.remove('scale-95', 'opacity-0');
		box.classList.add('scale-100', 'opacity-100');
	}, 10);
	lucide.createIcons();
}

function closeAlert() {
	const modal = document.getElementById('alertModal');
	const box = document.getElementById('modalBox');
	
	box.classList.remove('scale-100', 'opacity-100');
	box.classList.add('scale-95', 'opacity-0');
	
	setTimeout(() => {
		modal.classList.add('hidden');
	}, 200);
}

function moveBlobs() {
	const blobs = document.querySelectorAll('.blob');
	
	blobs.forEach(blob => {
		// Kira saiz viewport supaya tak lari keluar jauh sangat
		const maxX = window.innerWidth * 0.8; 
		const maxY = window.innerHeight * 0.8;
		
		// Jana koordinat rawak
		const randomX = Math.random() * maxX;
		const randomY = Math.random() * maxY;
		
		// Jana durasi rawak supaya setiap satu gerak speed beza
		const randomDuration = 15 + Math.random() * 10; // Antara 15s - 25s
		
		blob.style.transitionDuration = `${randomDuration}s`;
		blob.style.transform = `translate(${randomX}px, ${randomY}px)`;
	});
}

// Jalankan sekali bila page load
window.addEventListener('DOMContentLoaded', () => {
	// 1. Set kedudukan awal secara random tanpa delay
	const blobs = document.querySelectorAll('.blob');
	blobs.forEach(blob => {
		blob.style.transition = 'none'; // Matikan transition jap supaya dia tak meluncur masa baru buka
		
		const startX = Math.random() * window.innerWidth * 0.8;
		const startY = Math.random() * window.innerHeight * 0.8;
		blob.style.transform = `translate(${startX}px, ${startY}px)`;
		
		// Paksa browser apply kedudukan tu sebelum pasang balik transition
		blob.offsetHeight; 
		blob.style.transition = 'transform 15s ease-in-out';
	});

	// 2. Jalankan pergerakan seterusnya
	setTimeout(moveBlobs, 100); 
	setInterval(moveBlobs, 15000); 
});

// Set Text untuk Fasa Berbeza
const tipsPickerVisible = [
	"FrameAnalysis is located\ninside the XXMI Launcher folder",
	"The folder looks like this:\nFrameAnalysis-2026-04-28-163142",
	"(￣^￣)ゞ"
];

const tipsViewerVisible = [
	"Use A/D keys to navigate images",
	"Press Space to toggle selection!",
	"Press F5 to start over",
	"Change the blend mode to different\nif you prefer",
	"Use the visual Enhancer if\nsome of the UI is hard to see",
	"(￣^￣)ゞ"
];

let helperIndex = 0;
let idleTimeout;
let autoCycleInterval;

// Function untuk tahu Lumi kena guna list mana
function getCurrentTips() {
	const pickerArea = document.getElementById('pickerArea');
	// Kalau pickerArea tak ada class 'hidden', maksudnya dia tengah visible
	return pickerArea.classList.contains('hidden') ? tipsViewerVisible : tipsPickerVisible;
}

function startAutoCycle() {
	clearInterval(autoCycleInterval);
	autoCycleInterval = setInterval(() => {
		showNextTip();
	}, 5000); 
}

function showNextTip() {
	const tooltip = document.getElementById('helperTooltip');
	const currentTips = getCurrentTips();
	
	// Elakkan index out of bounds kalau saiz array beza
	helperIndex = (helperIndex + 1) % currentTips.length;

	tooltip.style.opacity = '0';
	tooltip.style.transform = 'translateY(5px)';
	
	setTimeout(() => {
		tooltip.innerText = currentTips[helperIndex];
		tooltip.style.opacity = '1';
		tooltip.style.transform = 'translateY(0)';
	}, 200);
}

function cycleHelperText() {
	showNextTip();
	clearInterval(autoCycleInterval);
	clearTimeout(idleTimeout);

	idleTimeout = setTimeout(() => {
		startAutoCycle();
	}, 10000);
}

window.addEventListener('DOMContentLoaded', () => {
	// Start dengan tip pertama dari list picker
	document.getElementById('helperTooltip').innerText = tipsPickerVisible[0];
	startAutoCycle();
});