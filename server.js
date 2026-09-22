import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { loadModel, completion, unloadModel, LLAMA_3_2_1B_INST_Q4_0 } from '@qvac/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Process Safety
process.on('uncaughtException', (err) => console.error('💥 Uncaught Exception:', err));
process.on('unhandledRejection', (reason) => console.error('💥 Unhandled Rejection:', reason));

// Runtime State
let currentModelId = null;
let modelStatus = 'unloaded'; // 'unloaded' | 'loading' | 'ready' | 'error'
let modelName = 'Llama 3.2 1B Instruct (Q4_0 GGUF)';
let downloadProgress = { percentage: 0, downloaded: 0, total: 0 };
let loadError = null;
let isBusy = false;

// System Telemetry
function getSystemInfo() {
  return {
    platform: os.platform(),
    architecture: os.arch(),
    cpuCount: os.cpus().length,
    totalMemGb: (os.totalmem() / (1024 ** 3)).toFixed(1),
    freeMemGb: (os.freemem() / (1024 ** 3)).toFixed(1),
    gpuAcceleration: 'Vulkan 1.4 (NVIDIA RTX / Compatible GPU)',
    runtime: 'Node.js ' + process.version,
    qvacSdkVersion: '0.19.1',
    zeroCloudVerified: true,
    engine: 'llamacpp-completion (Local Vulkan Offload)'
  };
}

// GET /api/status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    modelStatus,
    currentModelId,
    modelName,
    downloadProgress,
    loadError,
    isBusy,
    systemInfo: getSystemInfo()
  });
});

// Shared model load runner
async function triggerModelLoad() {
  if (modelStatus === 'ready' && currentModelId) return true;
  if (modelStatus === 'loading') return true;

  modelStatus = 'loading';
  loadError = null;
  downloadProgress = { percentage: 0, downloaded: 0, total: 0 };

  try {
    console.log('▸ [Trip Planner] Loading on-device model (Llama 3.2 1B Instruct)...');
    currentModelId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      onProgress: (p) => {
        downloadProgress = {
          percentage: p.percentage || 0,
          downloaded: p.downloaded || 0,
          total: p.total || 0
        };
        const mb = (n) => (n / 1e6).toFixed(1);
        console.log(`▸ [QVAC Download] ${p.percentage?.toFixed(0)}% (${mb(p.downloaded)}/${mb(p.total)} MB)`);
      }
    });
    modelStatus = 'ready';
    console.log(`✔ [Trip Planner] Model ready! ID: ${currentModelId}`);
    return true;
  } catch (err) {
    modelStatus = 'error';
    loadError = err.message || String(err);
    console.error('✖ [Trip Planner] Error loading model:', err);
    return false;
  }
}

// POST /api/model/load
app.post('/api/model/load', async (req, res) => {
  if (modelStatus === 'ready' && currentModelId) {
    return res.json({ success: true, message: 'Model is already loaded', modelId: currentModelId });
  }

  if (modelStatus === 'loading') {
    return res.status(409).json({ success: false, message: 'Model is currently loading' });
  }

  res.json({ success: true, message: 'Model load initiated in background' });
  triggerModelLoad();
});

// POST /api/model/unload
app.post('/api/model/unload', async (req, res) => {
  if (!currentModelId) {
    modelStatus = 'unloaded';
    return res.json({ success: true, message: 'No model loaded' });
  }

  try {
    console.log(`▸ [Trip Planner] Unloading model: ${currentModelId}`);
    await unloadModel({ modelId: currentModelId });
    currentModelId = null;
    modelStatus = 'unloaded';
    downloadProgress = { percentage: 0, downloaded: 0, total: 0 };
    console.log('✔ [Trip Planner] Model unloaded and memory released.');
    res.json({ success: true, message: 'Model unloaded and system memory released' });
  } catch (err) {
    console.error('✖ [Trip Planner] Error unloading model:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/plan-trip - Live Streaming AI Travel Concierge
app.post('/api/plan-trip', async (req, res) => {
  const {
    destination = 'Tokyo, Japan',
    days = 5,
    vibe = 'Balanced Culture & Food',
    group = 'Solo Traveler',
    budget = 'Moderate ($$)',
    interests = '',
    season = 'Spring / Cherry Blossom'
  } = req.body;

  if (modelStatus !== 'ready' || !currentModelId) {
    return res.status(503).json({
      error: 'Model is not ready. Please click "Load Model" in the top bar first.',
      modelStatus
    });
  }

  if (isBusy) {
    return res.status(429).json({
      error: 'Trip planner engine is busy. Please wait for current generation to finish.',
      isBusy: true
    });
  }

  isBusy = true;

  // Server-Sent Events setup
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const startTime = Date.now();
  console.log(`▸ [Trip Planner] Generating ${days}-day itinerary for ${destination} (${vibe})...`);

  const systemPrompt = `You are an elite on-device AI travel concierge and professional itinerary architect.
Your mission is to produce a realistic, richly detailed, and inspiring travel dossier in clean GitHub Flavored Markdown.
Include:
1. # Destination Master Plan & Key Highlights
2. Day-by-day breakdown (## Day 1, ## Day 2...) with Morning, Afternoon, Evening, and Local Food recommendations
3. Practical transit tips and realistic walking/subway logistics
4. Interactive packing checklist using task lists (- [ ] Item)
5. Local customs, tipping etiquette, and emergency survival tips
6. Estimated budget breakdown table
Output purely high-quality Markdown without preamble or conversational meta chat.`;

  const userPrompt = `Generate a bespoke ${days}-day travel itinerary for:
- Destination: ${destination}
- Duration: ${days} days
- Travel Style / Vibe: ${vibe}
- Group Type: ${group}
- Budget Level: ${budget}
- Season/Weather: ${season}
${interests ? '- Specific Interests / Must-Sees: ' + interests : ''}

Create the complete structured travel plan now:`;

  let tokenCount = 0;
  let firstTokenTime = null;
  let fullPlan = '';

  try {
    const streamResult = completion({
      modelId: currentModelId,
      history: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: true
    });

    for await (const token of streamResult.tokenStream) {
      if (token) {
        if (!firstTokenTime) firstTokenTime = Date.now();
        tokenCount++;
        fullPlan += token;

        res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
      }
    }

    const totalDurationMs = Date.now() - startTime;
    const ttftMs = firstTokenTime ? firstTokenTime - startTime : 0;
    const tokensPerSecond = (tokenCount / (totalDurationMs / 1000)).toFixed(1);

    console.log(`✔ [Trip Planner] Completed: ${tokenCount} tokens in ${totalDurationMs}ms (${tokensPerSecond} tok/s, TTFT: ${ttftMs}ms)`);

    res.write(`event: done\ndata: ${JSON.stringify({
      stats: {
        totalTokens: tokenCount,
        durationMs: totalDurationMs,
        ttftMs,
        tokensPerSecond: parseFloat(tokensPerSecond)
      }
    })}\n\n`);

    res.end();
  } catch (genErr) {
    console.error('✖ [Trip Planner] Generation error:', genErr);
    res.write(`event: error\ndata: ${JSON.stringify({ error: genErr.message })}\n\n`);
    res.end();
  } finally {
    isBusy = false;
  }
});

app.listen(PORT, () => {
  console.log('===========================================================');
  console.log(`  🌍 QVAC Trip Planner Running on http://localhost:${PORT}`);
  console.log('  🔒 100% On-Device AI • Zero Cloud • Local Vulkan 1.4 GPU');
  console.log('  📖 Tether @qvac/sdk v0.19.1 Active (Offline Travel Concierge)');
  console.log('===========================================================');
  console.log('▸ Auto-warming Llama 3.2 1B Instruct on GPU...');
  triggerModelLoad();
});
