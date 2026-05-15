import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Camera, Mic, FileText, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

interface IntakePanelProps {
  onSubmit: (file?: File, text?: string) => void;
  isProcessing: boolean;
  onClear: () => void;
}

type InputMode = "photo" | "voice" | "text";

const PROCESSING_STEPS = [
  "Extracting fields…",
  "Retrieving policy…",
  "Running agent…"
];

export function IntakePanel({ onSubmit, isProcessing, onClear }: IntakePanelProps) {
  const [mode, setMode] = useState<InputMode>("photo");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [processingStepIndex, setProcessingStepIndex] = useState(0);

  // Fallback for speech recognition
  const SpeechRecognitionAPI = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selected = acceptedFiles[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setMode("photo");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
    noClick: mode !== "photo"
  });

  const handleClear = () => {
    setFile(null);
    setPreviewUrl(null);
    setText("");
    setIsRecording(false);
    onClear();
  };

  const handleProcess = () => {
    if (!file && !text.trim()) return;
    onSubmit(file || undefined, text);
  };

  // Cycle processing steps when loading
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      interval = setInterval(() => {
        setProcessingStepIndex(prev => (prev + 1) % PROCESSING_STEPS.length);
      }, 1500);
    } else {
      setProcessingStepIndex(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Handle Speech Recognition
  useEffect(() => {
    let recognition: any;

    if (isRecording && SpeechRecognitionAPI) {
      recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          }
        }
        if (finalTranscript) {
          setText(prev => (prev + " " + finalTranscript).trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
        toast.error("Microphone error");
      };

      recognition.start();
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [isRecording, SpeechRecognitionAPI]);

  const hasInput = !!file || !!text.trim();

  return (
    <div className="bg-bg-secondary border border-border rounded-[16px] overflow-hidden">

      {/* HEADER */}
      <div className="flex items-center justify-between px-[16px] py-[12px] border-b border-border bg-bg-surface">
        <h2 className="text-[13px] font-semibold text-text-muted uppercase tracking-[0.08em]">New Intake</h2>
        <button
          onClick={handleClear}
          className="text-[12px] font-medium text-text-secondary hover:text-text-primary px-[8px] py-[4px]"
        >
          Clear
        </button>
      </div>

      <div className="p-[16px] md:p-[24px] flex flex-col gap-[24px]">

        {/* INPUT TABS */}
        <div className="flex bg-bg-surface border border-border p-[4px] rounded-[12px] relative w-fit self-center">
          {(["photo", "voice", "text"] as InputMode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                if (m === "voice" && !SpeechRecognitionAPI) {
                  toast.error("Voice input not supported in this browser");
                  return;
                }
                setMode(m);
              }}
              className={cn(
                "relative px-[16px] py-[8px] rounded-[8px] text-[13px] font-medium flex items-center gap-[6px] z-10 transition-colors",
                mode === m ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {mode === m && (
                <motion.div
                  layoutId="intake-tab"
                  className="absolute inset-0 bg-bg-tertiary rounded-[8px] border border-border -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              {m === "photo" && <Camera size={16} />}
              {m === "voice" && <Mic size={16} />}
              {m === "text" && <FileText size={16} />}
              <span className="capitalize">{m}</span>
            </button>
          ))}
        </div>

        {/* INPUT AREA */}
        <div className="flex flex-col gap-[16px]">

          {/* PHOTO MODE */}
          {mode === "photo" && (
            <div
              {...getRootProps()}
              className={cn(
                "min-h-[180px] rounded-[12px] border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden transition-all duration-200 cursor-pointer p-[16px]",
                isDragActive ? "border-accent bg-[rgba(59,130,246,0.06)]" : "border-border-hover bg-bg-tertiary hover:border-accent hover:bg-[rgba(59,130,246,0.06)]"
              )}
            >
              <input {...getInputProps()} />

              <AnimatePresence mode="wait">
                {previewUrl ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-[12px] w-full"
                    onClick={(e) => e.stopPropagation()} // prevent clicking image from opening file dialog again if already set
                  >
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Intake form" className="max-h-[200px] object-contain rounded-[8px] border border-border" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setPreviewUrl(null);
                        }}
                        className="absolute -top-[12px] -right-[12px] bg-bg-surface border border-border p-[4px] rounded-full text-text-secondary hover:text-text-primary hover:border-text-muted"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    {file && <span className="font-mono text-[13px] text-text-muted break-all text-center">{file.name}</span>}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center gap-[12px] pointer-events-none"
                  >
                    <Camera size={32} className="text-text-muted" />
                    <div>
                      <p className="text-[15px] font-medium text-text-primary">Drop form photo here</p>
                      <p className="text-[13px] text-text-secondary mt-[4px]">or click to upload</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* VOICE MODE */}
          {mode === "voice" && (
            <div className="flex flex-col items-center gap-[24px] min-h-[180px] justify-center py-[24px]">
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={cn(
                  "w-[56px] h-[56px] rounded-full flex items-center justify-center border transition-all duration-300 relative",
                  isRecording
                    ? "bg-triage-red-bg border-triage-red text-triage-red"
                    : "bg-bg-surface border-border text-text-primary hover:border-border-hover"
                )}
              >
                {isRecording && (
                  <span className="absolute inset-0 rounded-full border-2 border-triage-red opacity-50 animate-[pulse-ring_2s_ease-out_infinite]" />
                )}
                <Mic size={24} className={cn(isRecording ? "animate-pulse" : "")} />
              </button>

              <div className="w-full">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  readOnly={isRecording} // make it read-only while actively transcribing
                  placeholder={isRecording ? "Listening..." : "Voice notes will appear here..."}
                  className="w-full h-[100px] bg-bg-tertiary border border-border rounded-[12px] p-[16px] text-[15px] text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-text-muted"
                />
              </div>
            </div>
          )}

          {/* TEXT MODE */}
          {(mode === "text" || mode === "photo") && (
            <div className="flex flex-col gap-[8px]">
              {mode === "photo" && <div className="text-center text-[12px] text-text-muted font-medium uppercase tracking-wider py-[8px]">── or type notes below ──</div>}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter intake notes, names, or observations manually..."
                className="w-full min-h-[120px] bg-bg-tertiary border border-border rounded-[12px] p-[16px] text-[15px] text-text-primary resize-y focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-text-muted"
              />
            </div>
          )}
        </div>

        {/* SUBMIT BUTTON */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleProcess}
          disabled={!hasInput || isProcessing}
          className={cn(
            "w-full h-[48px] rounded-[12px] font-semibold text-[15px] flex items-center justify-center gap-[8px] transition-colors mt-[8px]",
            isProcessing
              ? "bg-bg-surface text-text-secondary cursor-wait border border-border"
              : hasInput
                ? "bg-accent text-white hover:bg-accent-light"
                : "bg-bg-surface text-text-muted border border-border cursor-not-allowed"
          )}
        >
          {isProcessing ? (
            <>
              <div className="flex gap-[4px] mr-[8px]">
                <div className="w-[6px] h-[6px] rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-[6px] h-[6px] rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-[6px] h-[6px] rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="min-w-[140px] text-left">{PROCESSING_STEPS[processingStepIndex]}</span>
            </>
          ) : (
            <>
              Process Intake <ArrowRight size={18} />
            </>
          )}
        </motion.button>

      </div>
    </div>
  );
}
