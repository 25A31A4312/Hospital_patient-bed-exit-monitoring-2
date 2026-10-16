import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// API: Generate High-Quality Image with gemini-3-pro-image-preview
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, imageSize = '1K', aspectRatio = '16:9' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: imageSize as any,
        },
      },
    });

    let imageUrl = '';
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'No image was returned by the model' });
    }

    return res.json({ imageUrl });
  } catch (err: any) {
    console.error('Error in /api/generate-image:', err);
    return res.status(500).json({ error: err.message || 'Image generation failed' });
  }
});

// API: Start Video Generation with veo-3.1-fast-generate-preview
app.post('/api/generate-video', async (req, res) => {
  try {
    const { imageBytes, mimeType = 'image/png', prompt = 'Realistic continuous motion', aspectRatio = '16:9' } = req.body;
    if (!imageBytes) {
      return res.status(400).json({ error: 'imageBytes (base64) is required to animate an image into video' });
    }

    const cleanBase64 = imageBytes.replace(/^data:image\/\w+;base64,/, '');

    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || 'Hospital patient CCTV camera feed',
      image: {
        imageBytes: cleanBase64,
        mimeType: mimeType || 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: (aspectRatio === '9:16' ? '9:16' : '16:9') as any,
      },
    });

    return res.json({ operationName: operation.name });
  } catch (err: any) {
    console.error('Error in /api/generate-video:', err);
    return res.status(500).json({ error: err.message || 'Video generation failed to initiate' });
  }
});

// API: Check Video Status
app.post('/api/video-status', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    return res.json({ done: updated.done, error: updated.error });
  } catch (err: any) {
    console.error('Error in /api/video-status:', err);
    return res.status(500).json({ error: err.message || 'Failed to check status' });
  }
});

// API: Download Generated Video
app.post('/api/video-download', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      return res.status(404).json({ error: 'Video URI not available in operation' });
    }

    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey },
    });

    if (!videoRes.ok) {
      return res.status(videoRes.status).json({ error: 'Failed to fetch video stream from storage' });
    }

    res.setHeader('Content-Type', 'video/mp4');
    const arrayBuffer = await videoRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error('Error in /api/video-download:', err);
    return res.status(500).json({ error: err.message || 'Failed to download video' });
  }
});

// API: Clinical AI Shift Handoff & Incident Summary
app.post('/api/clinical-ai-summary', async (req, res) => {
  try {
    const { room, events } = req.body;
    const prompt = `You are a clinical nursing risk specialist. Analyze the following patient bed telemetry and events:
Patient: ${room.patientName}, Age: ${room.patientAge}, Room: ${room.roomNumber}, Admission: ${room.admissionReason}, Morse Fall Score: ${room.morseFallScore}.
Recent Events: ${JSON.stringify(events.slice(0, 8))}

Generate a concise clinical shift handoff note (under 120 words) detailing:
1. Patient's current mobility and restless patterns
2. Frequency of unassisted bed-exit attempts
3. Recommended fall-prevention interventions (e.g. bed rails, non-skid socks, bedside commode, low-bed positioning).
Keep tone professional, clinical, and actionable.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return res.json({ summary: response.text });
  } catch (err: any) {
    console.error('Error in /api/clinical-ai-summary:', err);
    return res.status(500).json({ error: err.message || 'AI summary generation failed' });
  }
});

// Vite middleware or Static files
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Hospital Monitoring Server running on port ${port}`);
  });
}

startServer();
