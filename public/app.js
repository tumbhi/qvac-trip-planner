// QVAC Trip Planner — Client Logic

// Destination Presets
const PRESETS = {
  tokyo: {
    destination: 'Tokyo & Kyoto, Japan',
    days: 7,
    vibe: 'Foodie & Culinary Delights',
    season: 'Autumn Foliage',
    group: 'Couple / Romantic',
    budget: 'Moderate ($$) - Boutique & Comfort',
    interests: 'Ramen alley crawl, teamLab Planets, Fushimi Inari dawn hike, vintage cameras in Shinjuku, matcha tea ceremony'
  },
  italy: {
    destination: 'Rome & Amalfi Coast, Italy',
    days: 5,
    vibe: 'Cultural, Historic Temples & Shrines',
    season: 'Spring / Cherry Blossom',
    group: 'Couple / Romantic',
    budget: 'Moderate ($$) - Boutique & Comfort',
    interests: 'Colosseum underground, sunset Aperol in Positano, Path of the Gods hike, handmade pasta workshop'
  },
  swiss: {
    destination: 'Swiss Alps & Lauterbrunnen, Switzerland',
    days: 4,
    vibe: 'Outdoor Adventure, Hiking & Nature',
    season: 'Summer Sunshine',
    group: 'Friends Squad',
    budget: 'Moderate ($$) - Boutique & Comfort',
    interests: 'Jungfraujoch railway, paragliding in Interlaken, valley of 72 waterfalls, alpine cheese fondue'
  },
  iceland: {
    destination: 'Reykjavik & South Coast, Iceland',
    days: 6,
    vibe: 'Outdoor Adventure, Hiking & Nature',
    season: 'Winter Wonderland',
    group: 'Solo Traveler',
    budget: 'Moderate ($$) - Boutique & Comfort',
    interests: 'Northern lights chase, glacier ice cave hike, Black Sand Beach, Blue Lagoon geothermal soak'
  },
  paris: {
    destination: 'Paris & Provence, France',
    days: 5,
    vibe: 'Cultural, Historic Temples & Shrines',
    season: 'Spring / Cherry Blossom',
    group: 'Solo Traveler',
    budget: 'Moderate ($$) - Boutique & Comfort',
    interests: 'Montmartre cafes, Louvre late night, lavender fields, artisanal boulangeries'
  }
};

// DOM Elements
const btnLoadModel = document.getElementById('btnLoadModel');
const btnUnloadModel = document.getElementById('btnUnloadModel');
const modelTitle = document.getElementById('modelTitle');
const modelStatusLine = document.getElementById('modelStatusLine');
const progressTrack = document.getElementById('progressTrack');
const progressFill = document.getElementById('progressFill');

const inputDestination = document.getElementById('inputDestination');
const inputDays = document.getElementById('inputDays');
const daysCountDisplay = document.getElementById('daysCountDisplay');
const inputSeason = document.getElementById('inputSeason');
const inputGroup = document.getElementById('inputGroup');
const inputBudget = document.getElementById('inputBudget');
const inputInterests = document.getElementById('inputInterests');
const vibePills = document.querySelectorAll('.vibe-pill');
const chipItems = document.querySelectorAll('.chip-item');

const btnGenerate = document.getElementById('btnGenerate');
const btnReset = document.getElementById('btnReset');
const streamBanner = document.getElementById('streamBanner');
const itineraryBoard = document.getElementById('itineraryBoard');
const rawMarkdownDisplay = document.getElementById('rawMarkdownDisplay');

const tabBoard = document.getElementById('tabBoard');
const tabRaw = document.getElementById('tabRaw');

const btnCopy = document.getElementById('btnCopy');
const btnDownload = document.getElementById('btnDownload');
const btnPrint = document.getElementById('btnPrint');

const teleSpeed = document.getElementById('teleSpeed');
const teleTtft = document.getElementById('teleTtft');
const teleTokens = document.getElementById('teleTokens');

let modelStatus = 'unloaded';
let isGenerating = false;
let currentMarkdown = '';
let selectedVibe = 'Foodie & Culinary Delights';

// Initialize
function init() {
  setupEventListeners();
  checkStatus();
  setInterval(checkStatus, 3000);

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('demo') === '1') {
    applyDemoData();
  }
}

function setupEventListeners() {
  // Slider days
  inputDays.addEventListener('input', (e) => {
    daysCountDisplay.textContent = e.target.value;
  });

  // Vibe pills
  vibePills.forEach(pill => {
    pill.addEventListener('click', () => {
      vibePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedVibe = pill.getAttribute('data-vibe');
    });
  });

  // Destination presets
  chipItems.forEach(chip => {
    chip.addEventListener('click', () => {
      chipItems.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const key = chip.getAttribute('data-preset');
      const p = PRESETS[key];
      if (p) {
        inputDestination.value = p.destination;
        inputDays.value = p.days;
        daysCountDisplay.textContent = p.days;
        inputSeason.value = p.season;
        inputGroup.value = p.group;
        inputBudget.value = p.budget;
        inputInterests.value = p.interests;

        vibePills.forEach(v => {
          if (v.getAttribute('data-vibe') === p.vibe) {
            vibePills.forEach(item => item.classList.remove('active'));
            v.classList.add('active');
            selectedVibe = p.vibe;
          }
        });
      }
    });
  });

  // Reset form
  btnReset.addEventListener('click', () => {
    inputDestination.value = 'Tokyo & Kyoto, Japan';
    inputDays.value = 7;
    daysCountDisplay.textContent = 7;
    inputInterests.value = '';
    currentMarkdown = '';
    rawMarkdownDisplay.value = '';
    itineraryBoard.innerHTML = '<div class="empty-itinerary-state"><div class="empty-icon">🗺️</div><h3>Your Bespoke Travel Plan Will Render Here</h3><p>Pick a destination and travel vibe on the left, then click <strong>Craft Itinerary</strong> to generate a day-by-day plan, packing checklist, and local survival guide 100% offline.</p></div>';
    resetTelemetry();
  });

  // View tabs
  tabBoard.addEventListener('click', () => {
    tabBoard.classList.add('active');
    tabRaw.classList.remove('active');
    itineraryBoard.style.display = 'block';
    rawMarkdownDisplay.style.display = 'none';
  });

  tabRaw.addEventListener('click', () => {
    tabRaw.classList.add('active');
    tabBoard.classList.remove('active');
    itineraryBoard.style.display = 'none';
    rawMarkdownDisplay.style.display = 'block';
  });

  // Generate Button & Keyboard shortcut
  btnGenerate.addEventListener('click', () => {
    if (!isGenerating) generateTripPlan();
  });

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isGenerating) generateTripPlan();
    }
  });

  // Export Buttons
  btnCopy.addEventListener('click', async () => {
    if (!currentMarkdown) return;
    try {
      await navigator.clipboard.writeText(currentMarkdown);
      btnCopy.textContent = 'Copied!';
      setTimeout(() => btnCopy.textContent = '📋 Copy', 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  });

  btnDownload.addEventListener('click', () => {
    if (!currentMarkdown) return;
    const dest = inputDestination.value.trim().replace(/[^a-zA-Z0-9]/g, '_') || 'itinerary';
    const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'trip_plan_' + dest + '.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  btnPrint.addEventListener('click', () => {
    if (!currentMarkdown) return;
    window.print();
  });

  // Model Management Strip
  btnLoadModel.addEventListener('click', async () => {
    if (modelStatus === 'ready') return;
    await handleLoad();
  });

  btnUnloadModel.addEventListener('click', async () => {
    if (modelStatus !== 'ready') return;
    await handleUnload();
  });
}

function resetTelemetry() {
  teleSpeed.textContent = '-- tok/s';
  teleTtft.textContent = '-- ms';
  teleTokens.textContent = '0';
}

// Model Polling & State
async function checkStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('demo') === '1') return;

  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    updateModelUI(data);
  } catch (e) {
    console.warn('Status check failed:', e);
  }
}

function updateModelUI(data) {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('demo') === '1') return;

  modelStatus = data.modelStatus;

  if (modelStatus === 'ready') {
    modelTitle.textContent = 'Model: ' + (data.modelName || 'Llama 3.2 1B Instruct (Q4_0)');
    modelStatusLine.textContent = 'Status: Model ready on local Vulkan 1.4 GPU';
    btnLoadModel.disabled = true;
    btnLoadModel.textContent = '⚡ Model Loaded';
    btnUnloadModel.disabled = false;
    progressTrack.style.display = 'none';
  } else if (modelStatus === 'loading') {
    modelTitle.textContent = 'Loading on-device model weights...';
    const pct = data.downloadProgress ? data.downloadProgress.percentage.toFixed(0) : 0;
    modelStatusLine.textContent = 'Status: Allocating VRAM & loading weights (' + pct + '%)';
    btnLoadModel.disabled = true;
    btnLoadModel.textContent = 'Loading...';
    btnUnloadModel.disabled = true;
    progressTrack.style.display = 'block';
    progressFill.style.width = pct + '%';
  } else {
    modelTitle.textContent = 'Model: Llama 3.2 1B Instruct (GGUF Q4_0)';
    modelStatusLine.textContent = 'Status: Model unloaded (RAM/VRAM released)';
    btnLoadModel.disabled = false;
    btnLoadModel.textContent = '⚡ Load Model';
    btnUnloadModel.disabled = true;
    progressTrack.style.display = 'none';
  }
}

async function handleLoad() {
  try {
    btnLoadModel.disabled = true;
    btnLoadModel.textContent = 'Initiating...';
    await fetch('/api/model/load', { method: 'POST' });
    checkStatus();
  } catch (e) {
    console.error('Load failed:', e);
    btnLoadModel.disabled = false;
  }
}

async function handleUnload() {
  try {
    btnUnloadModel.disabled = true;
    btnUnloadModel.textContent = 'Releasing...';
    await fetch('/api/model/unload', { method: 'POST' });
    checkStatus();
  } catch (e) {
    console.error('Unload failed:', e);
  }
}

// Generate Bespoke Itinerary
async function generateTripPlan() {
  const destination = inputDestination.value.trim();
  if (!destination) {
    inputDestination.focus();
    return;
  }

  if (modelStatus !== 'ready') {
    await handleLoad();
    alert('On-device travel model is loading into GPU memory. Please wait a few seconds...');
    return;
  }

  isGenerating = true;
  btnGenerate.disabled = true;
  streamBanner.style.display = 'flex';
  itineraryBoard.innerHTML = '';
  rawMarkdownDisplay.value = '';
  currentMarkdown = '';
  resetTelemetry();

  const startTime = Date.now();
  let receivedTokens = 0;
  let firstTokenReceived = false;

  const payload = {
    destination,
    days: parseInt(inputDays.value, 10) || 5,
    vibe: selectedVibe,
    group: inputGroup.value,
    budget: inputBudget.value,
    season: inputSeason.value,
    interests: inputInterests.value.trim()
  };

  try {
    const response = await fetch('/api/plan-trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Server error: ' + response.status);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      let currentEvent = null;

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.replace('event:', '').trim();
        } else if (line.startsWith('data:')) {
          const raw = line.replace('data:', '').trim();
          if (!raw) continue;

          try {
            const data = JSON.parse(raw);

            if (currentEvent === 'token' && data.token) {
              if (!firstTokenReceived) {
                firstTokenReceived = true;
                const ttft = Date.now() - startTime;
                teleTtft.textContent = ttft + ' ms';
              }
              receivedTokens++;
              currentMarkdown += data.token;
              rawMarkdownDisplay.value = currentMarkdown;
              itineraryBoard.innerHTML = renderMarkdownHTML(currentMarkdown);
              teleTokens.textContent = receivedTokens;

              const elapsed = (Date.now() - startTime) / 1000;
              if (elapsed > 0.1) {
                teleSpeed.textContent = (receivedTokens / elapsed).toFixed(1) + ' tok/s';
              }
            } else if (currentEvent === 'done' && data.stats) {
              teleSpeed.textContent = data.stats.tokensPerSecond + ' tok/s';
              teleTtft.textContent = data.stats.ttftMs + ' ms';
              teleTokens.textContent = data.stats.totalTokens;
            } else if (currentEvent === 'error') {
              itineraryBoard.innerHTML = '<div style="color: var(--accent-rose);">[Generation Error: ' + data.error + ']</div>';
            }
          } catch (e) {
            console.error('SSE Parse Error:', e);
          }
        }
      }
    }
  } catch (err) {
    console.error('Trip planning failed:', err);
    itineraryBoard.innerHTML = '<div style="color: var(--accent-rose);">[Error: ' + err.message + ']</div>';
  } finally {
    isGenerating = false;
    btnGenerate.disabled = false;
    streamBanner.style.display = 'none';
  }
}

// Markdown to HTML Renderer
function renderMarkdownHTML(md) {
  if (!md) return '';
  let html = md
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^- \[ \] (.*$)/gim, '<li><input type="checkbox"> $1</li>')
    .replace(/^- \[x\] (.*$)/gim, '<li><input type="checkbox" checked> $1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/gim, '<br>');

  // Format simple markdown tables
  if (html.includes('|')) {
    html = html.replace(/(?:\|[^\n]+\|\r?\n)+/g, (match) => {
      const rows = match.trim().split('\n').map(r => r.trim()).filter(r => r.startsWith('|') && r.endsWith('|'));
      if (rows.length < 2) return match;
      let tableHtml = '<table>';
      rows.forEach((row, idx) => {
        if (row.includes('---')) return;
        const cols = row.split('|').slice(1, -1).map(c => c.trim());
        tableHtml += '<tr>';
        cols.forEach(c => {
          tableHtml += idx === 0 ? '<th>' + c + '</th>' : '<td>' + c + '</td>';
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</table>';
      return tableHtml;
    });
  }

  return html;
}

// Demo Data for Headless Screenshots
function applyDemoData() {
  inputDestination.value = 'Tokyo & Kyoto, Japan';
  inputDays.value = 7;
  daysCountDisplay.textContent = '7';
  inputSeason.value = 'Autumn Foliage';
  inputGroup.value = 'Couple / Romantic';
  inputBudget.value = 'Moderate ($$) - Boutique & Comfort';
  inputInterests.value = 'Ramen alley crawl, teamLab Planets, Fushimi Inari dawn hike, matcha tea ceremony';

  currentMarkdown = `# ✈️ Tokyo & Kyoto 7-Day Master Itinerary

> **Travel Style**: Foodie & Cultural Exploration • **Season**: Autumn Foliage • **Pace**: Balanced Romantic

---

## 🗓️ Day-by-Day Experience

### 📍 Day 1: Neon Lights & Shinjuku Hidden Alleys
- **Morning**: Land at Haneda Airport. Pick up Suica IC Card & Pocket WiFi. Check into boutique hotel in Shinjuku.
- **Afternoon**: Stroll through Shinjuku Gyoen National Garden under glowing maple leaves.
- **Evening**: Atmospheric izakaya and yakitori tour down Omoide Yokocho (Memory Lane).
- **Night**: Sunset 360° panorama from the Tokyo Metropolitan Government Observatory.

### 📍 Day 2: Digital Art, Tsukiji & Ginza Elegance
- **Morning**: Early breakfast at Tsukiji Outer Market (fresh tamagoyaki, tuna sashimi bowls).
- **Afternoon**: Immersive sensory art experience at **teamLab Planets TOKYO** in Toyosu.
- **Evening**: Wander Ginza luxury avenue; artisan matcha dessert tasting at Ginza Six.

### 📍 Day 3: Ancient Temples & Akihabara Tech Culture
- **Morning**: Senso-ji temple in Asakusa before the crowds arrive. Incense ritual & Nakamise shopping.
- **Afternoon**: Retro gaming, vintage collectibles, and capsule toy arcade crawl in Akihabara.
- **Evening**: Shinkansen bullet train (Nozomi) journey to Kyoto (2 hrs 15 mins). Check in to traditional Machiya townhouse.

---

## 🎒 Offline Packing Checklist
- [x] Passport & Japan Visit Web QR code saved offline
- [x] Universal plug adapter (Type A) & 65W fast charger
- [ ] Comfortable broken-in walking shoes (18,000+ steps/day)
- [ ] Lightweight packable umbrella & slip-on shoes for temple visits
- [ ] Offline Google Maps & Suica digital wallet loaded

---

## 💡 Local Etiquette & Survival Tips
- **Transit IC Card**: Tap Suica or Pasmo on all subway turnstiles, buses, and 7-Eleven counters.
- **No Tipping Culture**: Tipping is not customary in Japan; exceptional service is already standard.
- **Trash Protocol**: Public garbage cans are rare; carry a small reusable bag for waste.
- **Quiet Subway Rule**: Keep phones on silent mode; avoid phone calls while riding trains.

---

## 💰 Estimated Budget Overview (Per Couple)

| Category | Estimated Cost (USD) | Notes |
| :--- | :--- | :--- |
| **Accommodation** | $1,250 | 4 nights Tokyo boutique + 3 nights Kyoto Machiya |
| **Shinkansen & Transit** | $320 | Tokyo-Kyoto roundtrip + local IC card |
| **Food & Dining** | $850 | Mix of ramen counters, izakayas, and 1 Kaiseki dinner |
| **Attractions & teamLab**| $180 | teamLab tickets, temple admissions |
| **Total Estimated** | **$2,600** | Exceptional value for a premier 7-day journey |
`;

  rawMarkdownDisplay.value = currentMarkdown;
  itineraryBoard.innerHTML = renderMarkdownHTML(currentMarkdown);
  teleSpeed.textContent = '114.2 tok/s';
  teleTtft.textContent = '62 ms';
  teleTokens.textContent = '412';

  if (modelTitle) modelTitle.textContent = 'Model: Llama 3.2 1B Instruct (Q4_0)';
  if (modelStatusLine) modelStatusLine.textContent = 'Status: Model ready on local Vulkan 1.4 GPU';
  if (btnLoadModel) {
    btnLoadModel.disabled = true;
    btnLoadModel.textContent = '⚡ Model Loaded';
  }
  if (btnUnloadModel) btnUnloadModel.disabled = false;
}

window.addEventListener('DOMContentLoaded', init);
