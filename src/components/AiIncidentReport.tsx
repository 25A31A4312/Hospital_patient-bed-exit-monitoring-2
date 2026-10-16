import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Film,
  FileText,
  Upload,
  Loader2,
  Download,
  AlertCircle,
  CheckCircle,
  Copy
} from 'lucide-react';
import { ClinicalEvent, HospitalRoom } from '../types/monitor';

interface AiIncidentReportProps {
  room: HospitalRoom;
  events: ClinicalEvent[];
}

export const AiIncidentReport: React.FC<AiIncidentReportProps> = ({ room, events }) => {
  const [activeTab, setActiveTab] = useState<'handoff' | 'image' | 'video'>('handoff');

  // Handoff state
  const [handoffText, setHandoffText] = useState<string>('');
  const [isLoadingHandoff, setIsLoadingHandoff] = useState<boolean>(false);
  const [copiedHandoff, setCopiedHandoff] = useState<boolean>(false);

  // Image Gen state (gemini-3-pro-image-preview with 1K, 2K, 4K affordance)
  const [imagePrompt, setImagePrompt] = useState<string>(
    'Realistic hospital CCTV camera view from high ceiling angle, patient resting in hospital bed with bed rails up, IV drip stand beside bed, night lighting, clinical security camera perspective.'
  );
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [imageAspect, setImageAspect] = useState<'16:9' | '4:3' | '1:1'>('16:9');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Video Gen state (veo-3.1-fast-generate-preview with 16:9 or 9:16)
  const [videoPrompt, setVideoPrompt] = useState<string>(
    'Inpatient slowly sitting up in hospital bed under CCTV monitoring, smooth natural motion.'
  );
  const [videoAspect, setVideoAspect] = useState<'16:9' | '9:16'>('16:9');
  const [videoSourceImage, setVideoSourceImage] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [videoStatusText, setVideoStatusText] = useState<string>('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Generate Handoff Summary
  const handleGenerateHandoff = async () => {
    setIsLoadingHandoff(true);
    try {
      const res = await fetch('/api/clinical-ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room, events }),
      });
      const data = await res.json();
      if (data.summary) {
        setHandoffText(data.summary);
      } else {
        setHandoffText('Failed to generate summary: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      setHandoffText('Error contacting clinical AI service: ' + err.message);
    } finally {
      setIsLoadingHandoff(false);
    }
  };

  const copyHandoff = () => {
    if (!handoffText) return;
    navigator.clipboard.writeText(handoffText);
    setCopiedHandoff(true);
    setTimeout(() => setCopiedHandoff(false), 2000);
  };

  // Generate Image with gemini-3-pro-image-preview
  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    setImageError(null);
    setGeneratedImageUrl(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          imageSize,
          aspectRatio: imageAspect,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Image generation failed');
      }

      setGeneratedImageUrl(data.imageUrl);
    } catch (err: any) {
      setImageError(err.message || 'Image generation failed');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Photo upload for Video Generation
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setVideoSourceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate Video with veo-3.1-fast-generate-preview
  const handleGenerateVideo = async () => {
    if (!videoSourceImage) {
      setVideoError('Please upload a starting photo to animate into video.');
      return;
    }

    setIsGeneratingVideo(true);
    setVideoError(null);
    setGeneratedVideoUrl(null);
    setVideoStatusText('Submitting video generation to Veo (veo-3.1-fast-generate-preview)...');

    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBytes: videoSourceImage,
          mimeType: 'image/png',
          prompt: videoPrompt,
          aspectRatio: videoAspect,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to initialize video generation');
      }

      const operationName = data.operationName;
      setVideoStatusText('Veo is rendering video frames. This usually takes 30-90 seconds...');

      // Poll until done
      let completed = false;
      let attempts = 0;
      while (!completed && attempts < 60) {
        attempts++;
        await new Promise((r) => setTimeout(r, 4000));
        setVideoStatusText(`Synthesizing motion frames... (${attempts * 4}s elapsed)`);

        const pollRes = await fetch('/api/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        });

        const pollData = await pollRes.json();
        if (pollData.error) {
          throw new Error(pollData.error.message || 'Veo operation failed');
        }

        if (pollData.done) {
          completed = true;
          setVideoStatusText('Downloading generated video...');

          const downloadRes = await fetch('/api/video-download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationName }),
          });

          if (!downloadRes.ok) {
            throw new Error('Failed to retrieve finalized video stream');
          }

          const blob = await downloadRes.blob();
          const videoUrl = URL.createObjectURL(blob);
          setGeneratedVideoUrl(videoUrl);
          break;
        }
      }

      if (!completed) {
        throw new Error('Video generation timed out. Please try again.');
      }
    } catch (err: any) {
      setVideoError(err.message || 'Video generation failed');
    } finally {
      setIsGeneratingVideo(false);
      setVideoStatusText('');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            AI Clinical Assistant &amp; Simulation Studio
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Clinical shift handover note generation, high-res synthetic CCTV training images, and Veo video animation.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('handoff')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'handoff'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Shift Handoff Note
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'image'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Generate Images (1K/2K/4K)
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'video'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Animate Video (Veo)
          </button>
        </div>
      </div>

      {/* Tab 1: Shift Handoff Note */}
      {activeTab === 'handoff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Shift Handoff Report for {room.patientName} (Room {room.roomNumber})
            </span>
            <button
              onClick={handleGenerateHandoff}
              disabled={isLoadingHandoff}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
              {isLoadingHandoff ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Synthesizing Report...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Shift Report
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <textarea
              value={handoffText}
              onChange={(e) => setHandoffText(e.target.value)}
              placeholder="Click 'Generate Shift Report' to analyze patient bed presence, sitting-up events, and risk factors with Gemini 3.8 Flash..."
              rows={6}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-sans leading-relaxed"
            />
            {handoffText && (
              <button
                onClick={copyHandoff}
                className="absolute top-3 right-3 p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-md border border-slate-700/60 transition-colors flex items-center gap-1 text-[11px]"
                title="Copy to clipboard"
              >
                {copiedHandoff ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedHandoff ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: High Quality Image Generation (gemini-3-pro-image-preview with 1K, 2K, 4K) */}
      {activeTab === 'image' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Prompt for High-Quality Clinical CCTV Image (Model: gemini-3-pro-image-preview)
            </label>
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              rows={3}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Size & Aspect controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Resolution Size (Affordance: 1K, 2K, 4K)
              </label>
              <div className="flex items-center gap-2">
                {(['1K', '2K', '4K'] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setImageSize(sz)}
                    className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors ${
                      imageSize === sz
                        ? 'bg-cyan-600 text-white border-cyan-500'
                        : 'bg-slate-850 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Aspect Ratio
              </label>
              <div className="flex items-center gap-2">
                {(['16:9', '4:3', '1:1'] as const).map((asp) => (
                  <button
                    key={asp}
                    onClick={() => setImageAspect(asp)}
                    className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors ${
                      imageAspect === asp
                        ? 'bg-cyan-600 text-white border-cyan-500'
                        : 'bg-slate-850 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {asp}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating High-Res Image ({imageSize})...
                </>
              ) : (
                <>
                  <ImageIcon className="w-3.5 h-3.5" />
                  Generate Image ({imageSize})
                </>
              )}
            </button>
          </div>

          {imageError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{imageError}</span>
            </div>
          )}

          {generatedImageUrl && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Generated Output ({imageSize} · {imageAspect})</span>
                <a
                  href={generatedImageUrl}
                  download="clinical_cctv_synthetic.png"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-800 max-h-96 flex items-center justify-center bg-black">
                <img
                  src={generatedImageUrl}
                  alt="Generated clinical scenario"
                  className="max-h-96 w-auto object-contain"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Animate Photo into Video (veo-3.1-fast-generate-preview) */}
      {activeTab === 'video' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Upload an initial photo of a clinical setting, hospital bed, or patient, and animate it into continuous motion using Veo video generations (Model: <code className="text-cyan-300">veo-3.1-fast-generate-preview</code>).
          </p>

          {/* Photo Uploader */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                1. Starting Photo Upload
              </label>

              <div
                onClick={() => photoInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 transition-all min-h-[140px] flex flex-col items-center justify-center"
              >
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                {videoSourceImage ? (
                  <div className="relative group">
                    <img
                      src={videoSourceImage}
                      alt="Source for animation"
                      className="max-h-28 rounded object-cover border border-slate-700"
                    />
                    <span className="text-[10px] text-cyan-300 mt-1 block">
                      Click to change image
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                    <span className="text-xs text-slate-300 font-medium block">
                      Choose Starting Photo
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      PNG, JPEG, WebP
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  2. Video Aspect Ratio (16:9 Landscape / 9:16 Portrait)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVideoAspect('16:9')}
                    className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors ${
                      videoAspect === '16:9'
                        ? 'bg-cyan-600 text-white border-cyan-500'
                        : 'bg-slate-850 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    16:9 (Landscape)
                  </button>
                  <button
                    onClick={() => setVideoAspect('9:16')}
                    className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors ${
                      videoAspect === '9:16'
                        ? 'bg-cyan-600 text-white border-cyan-500'
                        : 'bg-slate-850 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    9:16 (Portrait)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Motion Direction Prompt
                </label>
                <input
                  type="text"
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="e.g. Patient sits up gently and looks toward bedside monitor"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                onClick={handleGenerateVideo}
                disabled={isGeneratingVideo || !videoSourceImage}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm mt-2"
              >
                {isGeneratingVideo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating Veo Video...
                  </>
                ) : (
                  <>
                    <Film className="w-3.5 h-3.5" />
                    Animate Photo into Veo Video
                  </>
                )}
              </button>
            </div>
          </div>

          {videoStatusText && (
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-xs text-cyan-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
              <span>{videoStatusText}</span>
            </div>
          )}

          {videoError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{videoError}</span>
            </div>
          )}

          {generatedVideoUrl && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Generated Veo Video ({videoAspect})</span>
                <a
                  href={generatedVideoUrl}
                  download="clinical_veo_simulation.mp4"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download MP4
                </a>
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
                <video
                  src={generatedVideoUrl}
                  controls
                  autoPlay
                  loop
                  className="max-h-96 w-auto"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
