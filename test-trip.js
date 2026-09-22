import { loadModel, completion, unloadModel, LLAMA_3_2_1B_INST_Q4_0 } from '@qvac/sdk';

console.log('===========================================================');
console.log('  Testing QVAC Trip Planner on-device inference pipeline...');
console.log('===========================================================');

async function runTest() {
  const startLoad = Date.now();
  console.log('▸ [Test] Loading Llama 3.2 1B Instruct via Vulkan...');
  const modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    onProgress: (p) => {
      if (p.percentage) {
        console.log(`  Progress: ${p.percentage.toFixed(0)}%`);
      }
    }
  });
  console.log(`✔ [Test] Model loaded successfully! ID: ${modelId} (${Date.now() - startLoad}ms)`);

  console.log('▸ [Test] Streaming 3-day Kyoto travel plan...');
  const startGen = Date.now();
  let firstTokenTime = null;
  let tokenCount = 0;
  let samplePlan = '';

  const stream = completion({
    modelId,
    history: [
      {
        role: 'system',
        content: 'You are an elite travel concierge. Generate a 3-day Kyoto itinerary in structured Markdown with Day 1, Day 2, Day 3 and packing checklist.'
      },
      {
        role: 'user',
        content: 'Destination: Kyoto, Japan. Duration: 3 Days. Vibe: Historic Temples & Food.'
      }
    ],
    stream: true
  });

  for await (const token of stream.tokenStream) {
    if (token) {
      if (!firstTokenTime) firstTokenTime = Date.now();
      tokenCount++;
      samplePlan += token;
      process.stdout.write(token);
      if (tokenCount >= 60) break;
    }
  }

  const duration = (Date.now() - startGen) / 1000;
  const ttft = firstTokenTime ? firstTokenTime - startGen : 0;
  const tokPerSec = (tokenCount / duration).toFixed(1);

  console.log('\n-----------------------------------------------------------');
  console.log(`✔ [Test] Generation verified: ${tokenCount} tokens in ${duration.toFixed(2)}s (${tokPerSec} tok/s, TTFT: ${ttft}ms)`);

  console.log('▸ [Test] Unloading model to release memory...');
  await unloadModel({ modelId });
  console.log('✔ [Test] Model unloaded. Test PASSED!');
}

runTest().catch((err) => {
  console.error('✖ Test FAILED:', err);
  process.exit(1);
});
