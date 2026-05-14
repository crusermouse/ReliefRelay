"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Mic, MicOff, Type, Send, X, Zap } from "lucide-react";
import clsx from "clsx";

interface DemoCase {
  id: string;
  title: string;
  description: string;
  triage: "critical" | "medium" | "low";
}

interface IntakePanelProps {
  onSubmit: (image?: File, voiceText?: string, manualText?: string, demoId?: string) => void;
  isLoading: boolean;
}

type InputMode = "image" | "voice" | "text";

export function IntakePanel({ onSubmit, isLoading }: IntakePanelProps) {
  const [mode, setMode] = useState<InputMode>("image");
  const [demoMode, setDemoMode] = useState(false);
  const [demoCases, setDemoCases] = useState<DemoCase[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState("");
  const [manualText, setManualText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    return Boolean(SpeechRecognitionAPI);
  });
  const [speechError, setSpeechError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Load demo cases on mount
  useEffect(() => {
    const loadDemos = async () => {
      try {
        const response = await fetch("/demo-cache/index.json");
        const data = await response.json();
        setDemoCases(data.demos || []);
      } catch (error) {
        console.warn("Failed to load demo cases:", error);
      }
    };
    loadDemos();
  }, []);

  const handleFileSelect = (file: File) => {
    setImage(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const startRecording = () => {
    setSpeechError(null);
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setSpeechSupported(false);
      setSpeechError("Speech recognition is not supported in this browser. Paste the transcript below instead.");
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setVoiceText(transcript);
    };
    recognition.onerror = () => {
      setSpeechError("Voice capture stopped unexpectedly. You can still paste the transcript manually.");
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    onSubmit(
      image ?? undefined,
      voiceText || undefined,
      manualText || undefined,
    );
  };

  const handleDemoSubmit = (demoId: string) => {
    onSubmit(undefined, undefined, undefined, demoId);
  };

  const hasInput = !!image || !!voiceText || !!manualText;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-2xl mx-auto space-y-6 glass-panel rounded-2xl p-5 md:p-6"
      data-intake-panel
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-[0.17em] text-cyan-300 mb-1">Humanitarian Intake Console</p>
          <h1 className="text-2xl font-bold text-white mb-1">Mission Intake Processing</h1>
          <p className="text-gray-300 text-sm">
            {demoMode ? "🚀 See ReliefRelay in action with live demo scenarios (instant <100ms)" : "Upload a form photo, record a voice note, or type notes. Gemma 4 orchestrates extraction, triage, and response routing."}
          </p>
        </div>
        {/* Demo Mode Toggle - High Visibility CTA */}
        <motion.button
          onClick={() => {
            setDemoMode(!demoMode);
            if (!demoMode) {
              // Clear any existing input when entering demo mode
              setImage(null);
              setImagePreview(null);
              setVoiceText("");
              setManualText("");
            }
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={clsx(
            "flex items-center gap-2 px-4 py-3 md:px-4 md:py-3 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-cyan-400 min-h-[44px] flex-shrink-0",
            demoMode
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/50 border border-amber-400"
              : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/50 border border-blue-400 hover:shadow-blue-500/70",
          )}
          title={demoMode ? "Click to use live inference mode" : "Click for instant 30-second demo (no waiting)"}
        >
          <Zap className={clsx("w-4 h-4 md:w-5 md:h-5", demoMode && "animate-pulse")} />
          <span className="hidden sm:inline">{demoMode ? "Demo Mode ✨" : "Try Live Demo"}</span>
          <span className="sm:hidden">{demoMode ? "Demo ✨" : "Demo"}</span>
        </motion.button>
      </div>

      {/* Demo Mode: Show 3 demo cases with better visual hierarchy */}
      {demoMode && demoCases.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-xs text-blue-300 font-semibold uppercase tracking-widest mb-3">⚡ Select a Scenario (loads instantly)</p>
            <p className="text-sm text-gray-300">Each demo showcases different triage levels and resource recommendations. Results appear in <span className="font-bold text-cyan-300">&lt;100ms</span>.</p>
          </div>
          <div className="grid gap-3 md:gap-4">
            {demoCases.map((demo) => (
              <motion.button
                key={demo.id}
                onClick={() => handleDemoSubmit(demo.id)}
                disabled={isLoading}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={clsx(
                  "text-left p-4 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group min-h-[96px] md:min-h-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                  demo.triage === "critical"
                    ? "border-red-500/50 bg-red-500/5 hover:bg-red-500/10 hover:border-red-400 hover:shadow-lg hover:shadow-red-500/20 focus-visible:ring-red-400"
                    : demo.triage === "medium"
                      ? "border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/20 focus-visible:ring-amber-400"
                      : "border-green-500/50 bg-green-500/5 hover:bg-green-500/10 hover:border-green-400 hover:shadow-lg hover:shadow-green-500/20 focus-visible:ring-green-400",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white group-hover:text-cyan-200 transition-colors text-base md:text-lg">{demo.title}</p>
                    <p className="text-sm md:text-base text-gray-400 mt-1 line-clamp-2">{demo.description}</p>
                  </div>
                  {isLoading ? (
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-white/30 border-t-white animate-spin flex-shrink-0 mt-1" />
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      whileHover={{ opacity: 1, x: 0 }}
                      className="text-2xl md:text-3xl flex-shrink-0 mt-1"
                    >
                      ▶
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
          <motion.button
            onClick={() => setDemoMode(false)}
            whileHover={{ x: 4 }}
            className="w-full py-2 text-sm text-gray-400 hover:text-cyan-300 transition-colors font-medium"
          >
            ← Back to live intake
          </motion.button>
        </motion.div>
      ) : null}

      {/* Live Mode: Input modes and upload */}
      {!demoMode && (
        <>
          {/* Mode tabs */}
          <div className="flex gap-1 bg-white/[0.04] rounded-lg p-1" role="tablist" aria-label="Intake input modes">
            {(["image", "voice", "text"] as InputMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                role="tab"
                aria-selected={mode === m}
                aria-label={`Switch to ${m} input mode`}
                className={clsx(
                  "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all capitalize flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70",
                  mode === m
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-gray-200",
                )}
              >
                {m === "image" && <Upload className="w-4 h-4" />}
                {m === "voice" && <Mic className="w-4 h-4" />}
                {m === "text" && <Type className="w-4 h-4" />}
                {m}
              </button>
            ))}
          </div>

      {/* Image dropzone */}
      {mode === "image" && (
        <div>
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Form preview"
                className="w-full max-h-64 object-contain bg-black/40"
              />
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 p-1.5 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              tabIndex={0}
              role="button"
              aria-label="Upload or drop a form photo"
              className={clsx(
                "border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70",
                isDragging
                  ? "border-blue-400 bg-blue-500/10"
                  : "border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]",
              )}
            >
              <Upload className="w-10 h-10 text-gray-500" />
              <div className="text-center">
                <p className="text-gray-300 font-medium">Drop a form photo here</p>
                <p className="text-gray-500 text-sm mt-1">
                  or click to browse · PNG, JPG, WEBP
                </p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />
        </div>
      )}

      {/* Voice input */}
      {mode === "voice" && (
        <div className="space-y-3">
          <div className="flex justify-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              aria-label={isRecording ? "Stop voice recording" : "Start voice recording"}
              disabled={speechSupported === false}
              className={clsx(
                "w-20 h-20 rounded-full flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70",
                isRecording
                  ? "bg-red-500/20 border-2 border-red-500 text-red-400 animate-pulse"
                  : speechSupported === false
                    ? "bg-white/5 border-2 border-white/10 text-gray-600 cursor-not-allowed"
                    : "bg-blue-500/20 border-2 border-blue-500 text-blue-400 hover:bg-blue-500/30",
              )}
            >
              {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
          </div>
          <p className="text-center text-sm text-gray-500">
            {isRecording ? "Recording… click to stop" : speechSupported === false ? "Voice input is unavailable here, so paste the transcript below." : "Click to start recording"}
          </p>
          {speechError && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {speechError}
            </div>
          )}
          {speechSupported === false && (
            <textarea
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Paste a transcript here if speech recognition is unavailable."
              rows={6}
              aria-label="Voice transcript fallback"
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-none text-sm leading-relaxed"
            />
          )}
          {voiceText && (
            <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Transcript</p>
              <p className="text-gray-300 text-sm leading-relaxed">{voiceText}</p>
            </div>
          )}
        </div>
      )}

      {/* Text input */}
      {mode === "text" && (
        <label className="block space-y-2">
          <span className="sr-only">Manual intake notes</span>
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="Type intake notes here — name, age, location, injuries, needs…"
          rows={8}
          maxLength={25000}
          aria-label="Manual intake notes"
          className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-none text-sm leading-relaxed"
        />
        </label>
      )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !hasInput}
            className={clsx(
              "w-full py-3 px-6 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
              isLoading || !hasInput
                ? "bg-white/5 text-gray-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white active:scale-[0.98]",
            )}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Process Intake
              </>
            )}
          </button>
        </>
      )}
    </motion.div>
  );
}
