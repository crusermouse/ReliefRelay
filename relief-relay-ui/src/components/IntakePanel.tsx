"use client";

import { useState, useRef, useCallback } from "react";
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

  const hasInput = !!image || !!voiceText || !!manualText;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Intake Processing</h1>
        <p className="text-gray-400 text-sm">
          Upload a form photo, record a voice note, or type notes. Gemma 4 handles the rest.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-white/[0.04] rounded-lg p-1">
        {(["image", "voice", "text"] as InputMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={clsx(
              "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all capitalize flex items-center justify-center gap-2",
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
              className={clsx(
                "border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-all",
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
            accept="image/*"
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
              className={clsx(
                "w-20 h-20 rounded-full flex items-center justify-center transition-all",
                isRecording
                  ? "bg-red-500/20 border-2 border-red-500 text-red-400 animate-pulse"
                  : "bg-blue-500/20 border-2 border-blue-500 text-blue-400 hover:bg-blue-500/30",
              )}
            >
              {isRecording ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
          </div>
          <p className="text-center text-sm text-gray-500">
            {isRecording ? "Recording… click to stop" : "Click to start recording"}
          </p>
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
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="Type intake notes here — name, age, location, injuries, needs…"
          rows={8}
          className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-none text-sm leading-relaxed"
        />
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
    </div>
  );
}
