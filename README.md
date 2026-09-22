# ✈️ QVAC Trip Planner — 100% On-Device AI Travel Concierge

> **Architect bespoke, day-by-day travel itineraries, packing checklists, and local cultural survival guides—running completely offline on your device with zero cloud API egress.**

Built for the **Tether QVAC On-Device AI Hackathon & Whop Bounty**. Powered by `@qvac/sdk` (`loadModel` + `completion`) accelerated locally via Vulkan 1.4 GPU compute.

---

## 📦 SDK Version

- **`@qvac/sdk`: `^0.19.1`** (Target: `>= 0.19.0`)
- **Zero Cloud API Egress**: 100% private, self-contained on-device inference using GGUF local weights and QVAC's built-in offline LLM engine.
- **Flight & Roaming Ready**: Designed specifically for travelers in airplanes, subways, and international roaming dead-zones without internet access.

---

## ✨ Features & Architecture

- **Bespoke Itinerary Synthesis**: Deeply personalized travel dossier generation factoring in duration (1–14 days), travel style (Foodie, Cultural, Adventure, Luxury, Backpacker), travel group (Solo, Couple, Family, Friends), season, and custom dietary/interest constraints.
- **Dual-Pane Travel Workbench**:
  - **Left Pane (Trip Config Deck)**: Interactive destination selector, duration range slider, season picker, and popular destination quick-presets (*Tokyo & Kyoto*, *Amalfi & Rome*, *Swiss Alps*, *Iceland Ring Road*).
  - **Right Pane (Itinerary Output Deck)**: Real-time token streaming with instant toggle between **Interactive Plan Board** (with styled day cards, interactive packing checkboxes, survival badges, and budget tables) and **Raw Markdown** (`.md`).
- **Offline Travel Survival Guide**: Auto-generates essential cultural etiquette, public transit card protocols, tipping rules, and emergency contacts for the destination.
- **One-Click Export**: Instant clipboard copy, `.md` file download, and clean browser print/PDF styling.
- **Dedicated Model Management Strip**: Full manual control with `⚡ Load Model` and `Release Memory` buttons to monitor VRAM allocation and unload model weights when idle.
- **Ultra-Fast Local Generation**: Blazing-fast token throughput exceeding **115 tokens/sec** with sub-70ms TTFT on local Vulkan 1.4 GPU compute.

---

## ⚡ Install Steps & Run Steps

### Install Steps

Clone the repository and install the lightweight Node.js dependencies:

```bash
git clone https://github.com/tumbhi/qvac-trip-planner.git
cd qvac-trip-planner
npm install
```

### Run Steps

Launch the local travel studio server:

```bash
npm start
```

Once started, open your browser and navigate to:
```text
http://localhost:3004
```

1. Click **⚡ Load Model** in the top Model Management Strip (allocates local VRAM).
2. Select your destination, duration, vibe, and season, or click one of the popular quick-presets.
3. Click **Craft Itinerary** (or press `Ctrl + Enter`).
4. Watch your personalized travel dossier stream in real time—completely offline!

---

## 🔬 SDK Implementation Detail

This application uses the core lifecycle and generation APIs of the `@qvac/sdk`:

1. **`loadModel()`**: Loads quantized GGUF weights (`LLAMA_3_2_1B_INST_Q4_0`) directly into GPU VRAM using the Vulkan compute backend.
2. **`completion()`**: Streams structured travel tokens via an async generator, maintaining low memory overhead and immediate response.
3. **`unloadModel()`**: Safely unloads weights and releases system memory when travel planning is complete.

```javascript
import { loadModel, completion, unloadModel, LLAMA_3_2_1B_INST_Q4_0 } from '@qvac/sdk';

// 1. Load Model into GPU memory
const modelId = await loadModel({
  modelSrc: LLAMA_3_2_1B_INST_Q4_0,
  onProgress: (p) => console.log(`Loading: ${p.percentage}%`)
});

// 2. Stream Bespoke Travel Dossier
const stream = completion({
  modelId,
  history: [
    { role: 'system', content: 'You are an elite travel concierge...' },
    { role: 'user', content: 'Destination: Tokyo & Kyoto. Duration: 7 Days...' }
  ],
  stream: true
});

for await (const chunk of stream) {
  if (chunk.token) {
    sendSSEToken(chunk.token);
  }
}

// 3. Unload & Free VRAM
await unloadModel({ modelId });
```

---

## 📊 On-Device Performance & Telemetry

Tested and benchmarked on **NVIDIA GeForce RTX 4070 Laptop GPU (8GB VRAM, Vulkan 1.4)**:

| Metric | Measured On-Device Value |
| :--- | :--- |
| **Model Weights** | Llama 3.2 1B Instruct (GGUF Q4_0) |
| **Time to First Token (TTFT)** | **~62 ms** |
| **Generation Throughput** | **110 – 118 tokens/sec** |
| **VRAM Footprint** | ~1.1 GB |
| **Cloud Network Egress** | **0.0 KB (100% Offline)** |

---

## 📜 License

Distributed under the [MIT License](LICENSE). Copyright © 2026 Akshat Sharma.
