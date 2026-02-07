// Pure JS mulaw <-> PCM s16le conversion + resampling
// No native dependencies required

// mulaw decode table (256 entries: mulaw byte -> 16-bit PCM value)
const MULAW_DECODE = new Int16Array(256);
for (let i = 0; i < 256; i++) {
  let mu = ~i & 0xff;
  let sign = mu & 0x80;
  let exponent = (mu >> 4) & 0x07;
  let mantissa = mu & 0x0f;
  let sample = ((mantissa << 3) + 0x84) << exponent;
  sample -= 0x84;
  MULAW_DECODE[i] = sign ? -sample : sample;
}

// PCM -> mulaw encode lookup (65536 entries for fast encoding)
const MULAW_ENCODE = new Uint8Array(65536);
const BIAS = 0x84;
const CLIP = 32635;

for (let i = 0; i < 65536; i++) {
  let sample = (i < 32768) ? i : i - 65536; // signed interpretation
  let sign = 0;
  if (sample < 0) {
    sign = 0x80;
    sample = -sample;
  }
  if (sample > CLIP) sample = CLIP;
  sample += BIAS;

  let exponent = 7;
  let expMask = 0x4000;
  while (exponent > 0 && !(sample & expMask)) {
    exponent--;
    expMask >>= 1;
  }
  let mantissa = (sample >> (exponent + 3)) & 0x0f;
  let mulawByte = ~(sign | (exponent << 4) | mantissa) & 0xff;
  MULAW_ENCODE[i & 0xffff] = mulawByte;
}

/**
 * Decode mulaw 8kHz base64 -> PCM s16le 16kHz Buffer
 * Steps: base64 -> mulaw bytes -> PCM 8kHz -> upsample to 16kHz
 */
export function mulawToPcm16k(base64Mulaw) {
  const mulawBuf = Buffer.from(base64Mulaw, 'base64');
  const sampleCount8k = mulawBuf.length;
  const sampleCount16k = sampleCount8k * 2;

  // Output: PCM s16le at 16kHz (2 bytes per sample)
  const pcmBuf = Buffer.alloc(sampleCount16k * 2);

  for (let i = 0; i < sampleCount8k; i++) {
    const sample = MULAW_DECODE[mulawBuf[i]];
    const nextSample = (i + 1 < sampleCount8k) ? MULAW_DECODE[mulawBuf[i + 1]] : sample;

    // Write original sample
    pcmBuf.writeInt16LE(sample, i * 4);
    // Write interpolated sample
    const interp = Math.round((sample + nextSample) / 2);
    pcmBuf.writeInt16LE(interp, i * 4 + 2);
  }

  return pcmBuf;
}

/**
 * Encode PCM s16le 16kHz -> mulaw 8kHz base64
 * Steps: PCM 16kHz -> downsample to 8kHz -> mulaw encode -> base64
 */
export function pcm16kToMulaw(pcmBuffer) {
  const sampleCount16k = pcmBuffer.length / 2;
  const sampleCount8k = Math.floor(sampleCount16k / 2);

  const mulawBuf = Buffer.alloc(sampleCount8k);

  for (let i = 0; i < sampleCount8k; i++) {
    // Downsample: take every other sample
    const sample = pcmBuffer.readInt16LE(i * 4);
    mulawBuf[i] = MULAW_ENCODE[(sample + 65536) & 0xffff];
  }

  return mulawBuf.toString('base64');
}

/**
 * Encode raw PCM s16le bytes -> mulaw base64 (no resampling)
 * Used when TTS output is already at 8kHz
 */
export function pcmToMulaw(pcmBuffer) {
  const sampleCount = pcmBuffer.length / 2;
  const mulawBuf = Buffer.alloc(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const sample = pcmBuffer.readInt16LE(i * 2);
    mulawBuf[i] = MULAW_ENCODE[(sample + 65536) & 0xffff];
  }

  return mulawBuf.toString('base64');
}
