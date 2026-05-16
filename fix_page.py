with open("relief-relay-ui/src/app/page.tsx", "r") as f:
    content = f.read()

# Make precision replacements

# 1. State
state_search = "  const [isProcessing, setIsProcessing] = useState(false);"
state_replace = "  const [isProcessing, setIsProcessing] = useState(false);\n  const [inferenceStatus, setInferenceStatus] = useState<any>(null);"
content = content.replace(state_search, state_replace)

# 2. Effect
effect_search = """  useEffect(() => {
    loadCases();
  }, [loadCases]);"""

effect_replace = """  useEffect(() => {
    loadCases();
  }, [loadCases]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/inference-status`)
      .then(r => r.json())
      .then(data => setInferenceStatus(data))
      .catch(() => {})
  }, []);"""
content = content.replace(effect_search, effect_replace)

# 3. Header
header_search = """          <div className="flex items-center gap-[8px] bg-bg-surface border border-border px-[12px] py-[4px] rounded-[12px]">
            <div className="w-[8px] h-[8px] rounded-full bg-triage-green animate-[status-blink_2.8s_ease-in-out_infinite]" />
            <span className="text-[12px] font-medium text-text-secondary">Offline Ready</span>
          </div>"""

header_replace = """          <div className="flex items-center gap-[8px] bg-bg-surface border border-border px-[12px] py-[4px] rounded-[12px]">
            <div className={cn(
              "w-[8px] h-[8px] rounded-full",
              !inferenceStatus ? "bg-gray-400" : (inferenceStatus.provider === "google" ? "bg-blue-400" : "bg-triage-green")
            )} />
            <span className="text-[12px] font-medium text-text-secondary">
              {!inferenceStatus ? "Connecting…" : (inferenceStatus.provider === "google" ? "Gemma · Cloud" : "Gemma · Local")}
            </span>
          </div>"""
content = content.replace(header_search, header_replace)

with open("relief-relay-ui/src/app/page.tsx", "w") as f:
    f.write(content)
