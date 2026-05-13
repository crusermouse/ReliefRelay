"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, Mic, MicOff, Type, Send, X } from "lucide-react";
import clsx from "clsx";

interface IntakePanelProps {
  onSubmit: (image?: File, voiceText?: string, manualText?: string) => void;
  isLoading: boolean;
}

type InputMode = "image" | "voice" | "text";

export function IntakePanel({ onSubmit, isLoading }: IntakePanelProps) {
  const [mode, setMode] = useState<InputMode>("image");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState("");
  const [manualText, setManualText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handleFileSelect = (file: File) => {
    setImage(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleFileSelect(file);
      }
    },
    [imagePreview],
  );

  const startRecording = () => {
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert("Speech recognition is not supported in this browser. Use Chrome.");
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
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    onSubmit(image ?? undefined, voiceText || undefined, manualText || undefined);
  };

  const hasInput = !!image || !!voiceText || !!manualText;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel mx-auto max-w-3xl rounded-2xl p-5 sm:p-6"
    >
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/75">Mission intake</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Humanitarian case capture</h1>
        <p className="mt-2 text-sm text-slate-300/80">
          Upload field evidence, transcribe voice notes, or write direct context. Gemma 4 converts it into coordinated action.
        </p>
      </div>

      <div className="mb-4 flex gap-1 rounded-xl border border-white/10 bg-black/25 p-1">
        {(["image", "voice", "text"] as InputMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={clsx(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium capitalize transition-all",
              mode === m
                ? "bg-gradient-to-r from-blue-500/80 to-cyan-500/75 text-white"
                : "text-slate-300/70 hover:text-slate-100",
            )}
          >
            {m === "image" && <Upload className="h-4 w-4" />}
            {m === "voice" && <Mic className="h-4 w-4" />}
            {m === "text" && <Type className="h-4 w-4" />}
            {m}
          </button>
        ))}
      </div>

      {mode === "image" && (
        <div>
          {imagePreview ? (
            <div className="relative overflow-hidden rounded-xl border border-white/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Form preview" className="max-h-72 w-full object-contain bg-black/55" />
              <button
                onClick={clearImage}
                className="absolute right-2 top-2 rounded-full border border-white/20 bg-black/55 p-1.5 text-white transition hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                "cursor-pointer rounded-xl border-2 border-dashed px-6 py-14 text-center transition-all",
                isDragging
                  ? "border-cyan-300 bg-cyan-400/10"
                  : "border-white/15 bg-white/[0.02] hover:border-cyan-200/45 hover:bg-cyan-400/5",
              )}
            >
              <Upload className="mx-auto h-10 w-10 text-cyan-100/70" />
              <p className="mt-3 text-sm font-medium text-slate-100">Drop a handwritten intake form</p>
              <p className="mt-1 text-xs text-slate-400">PNG, JPG, WEBP · click to browse</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />
        </div>
      )}

      {mode === "voice" && (
        <div className="space-y-3">
          <div className="flex justify-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={clsx(
                "flex h-20 w-20 items-center justify-center rounded-full border-2 transition",
                isRecording
                  ? "border-rose-300/70 bg-rose-400/20 text-rose-200 pulse-halo"
                  : "border-cyan-200/60 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-300/20",
              )}
            >
              {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </button>
          </div>
          <p className="text-center text-sm text-slate-400">
            {isRecording ? "Recording humanitarian voice note..." : "Tap to begin live transcript"}
          </p>
          {voiceText && (
            <div className="rounded-lg border border-white/12 bg-black/20 p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-cyan-200/70">Transcript</p>
              <p className="text-sm leading-relaxed text-slate-200">{voiceText}</p>
            </div>
          )}
        </div>
      )}

      {mode === "text" && (
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="Type field summary, vulnerabilities, and immediate needs..."
          rows={8}
          className="w-full resize-none rounded-xl border border-white/15 bg-black/20 p-4 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-cyan-200/60 focus:outline-none"
        />
      )}

      <button
        onClick={handleSubmit}
        disabled={isLoading || !hasInput}
        className={clsx(
          "mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition",
          isLoading || !hasInput
            ? "cursor-not-allowed bg-white/5 text-slate-500"
            : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:brightness-110",
        )}
      >
        {isLoading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Processing operation...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Launch triage pipeline
          </>
        )}
      </button>
    </motion.section>
  );
}
