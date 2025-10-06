"use client"

import type React from "react"

import { Suspense } from "react"
import { ImageIcon, Zap, Copy, UploadCloud } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useCallback, useMemo } from "react"

// Simple local types to mirror your original JSON response
type Caption = { text: string; tone: string }
type CaptionResult = { hashtags: string[]; captions: Caption[] }

// Uploader Component
function Uploader({
  previewUrl,
  onImage,
}: {
  previewUrl: string | null
  onImage: (dataUrl: string, base64: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) return
    if (file.size > 5 * 1024 * 1024) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = String(e.target?.result || "")
      const base64 = dataUrl.split(",")[1] || ""
      onImage(dataUrl, base64)
    }
    reader.readAsDataURL(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="rounded-2xl border bg-card text-card-foreground shadow-sm">
      <div className="p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-balance">AI Image Captioner & Tagger</h1>
        <p className="text-sm text-muted-foreground mt-1">Powered by your AI backend (connect later)</p>

        <h2 className="text-base md:text-lg font-medium mt-6">A. Upload</h2>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => document.getElementById("file-input")?.click()}
          className={cn(
            "mt-3 cursor-pointer rounded-xl border-2 border-dashed p-6 transition-colors",
            "bg-background/60 hover:bg-muted/40",
            dragOver ? "border-primary bg-primary/5" : "border-border",
          )}
          role="button"
          aria-label="Upload image by clicking or dragging and dropping"
        >
          <input
            id="file-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.currentTarget.files)}
          />
          <div className="flex flex-col items-center justify-center text-center">
            <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" aria-hidden />
            <p className="font-medium">Drag & drop or click to upload</p>
            <p className="text-sm text-muted-foreground">Max 5MB — JPG, PNG, WEBP</p>

            {previewUrl ? (
              <div className="mt-4 w-32 h-32 rounded-lg border overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl || "/placeholder.svg"}
                  alt="Image preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="mt-4 inline-flex items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-4 w-4" aria-hidden />
                <span className="text-xs">No image selected</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Controls Component
function Controls({
  instructions,
  setInstructions,
  tone,
  setTone,
  canGenerate,
  loading,
  onGenerate,
}: {
  instructions: string
  setInstructions: (v: string) => void
  tone: string
  setTone: (v: string) => void
  canGenerate: boolean
  loading: boolean
  onGenerate: () => void
}) {
  return (
    <div className="rounded-2xl border bg-card text-card-foreground shadow-sm">
      <div className="p-6 md:p-8">
        <h2 className="text-base md:text-lg font-medium">Options</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="instructions" className="text-sm font-medium">
              Additional instructions (optional)
            </label>
            <input
              id="instructions"
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              maxLength={200}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:opacity-50"
              placeholder="e.g. Audience is teens, use casual tone"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="tone" className="text-sm font-medium">
              Caption tone
            </label>
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:opacity-50"
              disabled={loading}
            >
              <option value="Humoris">Humoris (Witty/Funny)</option>
              <option value="Deskriptif">Deskriptif (Informative)</option>
              <option value="Puitis">Puitis (Poetic/Inspiring)</option>
              <option value="Call-to-Action">Call-to-Action (Engaging)</option>
            </select>
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={!canGenerate || loading}
          className={cn(
            "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50",
          )}
          aria-busy={loading}
        >
          <Zap className="h-4 w-4" aria-hidden />
          {loading ? "Processing..." : "Analyze Image & Generate Captions"}
        </button>
      </div>
    </div>
  )
}

// Output Component
function Output({
  result,
  loading,
  onCopyAllHashtags,
  onCopyText,
  message,
}: {
  result: CaptionResult | null
  loading: boolean
  onCopyAllHashtags: () => void
  onCopyText: (text: string) => void
  message: { type: "success" | "error" | "info"; text: string } | null
}) {
  return (
    <div
      className={cn("rounded-2xl border bg-card text-card-foreground shadow-sm", loading || result ? "" : "opacity-80")}
    >
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base md:text-lg font-medium">B. Results (Captions & Hashtags)</h2>
          {result?.hashtags?.length ? (
            <button
              onClick={onCopyAllHashtags}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Copy className="h-4 w-4" aria-hidden />
              Copy all hashtags
            </button>
          ) : null}
        </div>

        {message ? (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "mt-4 rounded-md px-3 py-2 text-sm",
              message.type === "success" && "bg-emerald-100 text-emerald-900",
              message.type === "error" && "bg-destructive/15 text-destructive",
              message.type === "info" && "bg-primary/10 text-primary",
            )}
          >
            {message.text}
          </div>
        ) : null}

        {loading && (
          <div className="mt-6 flex items-center gap-2 text-primary">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm font-medium">Analyzing image and generating captions…</p>
          </div>
        )}

        <div className="mt-6 space-y-6">
          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-medium">Related Hashtags</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {result?.hashtags?.length ? (
                result.hashtags.map((tag, idx) => (
                  <button
                    key={idx}
                    onClick={() => onCopyText(tag)}
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/15"
                    title="Copy hashtag"
                  >
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No hashtags yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {result?.captions?.length ? (
              result.captions.map((c, idx) => (
                <div key={idx} className="rounded-xl border p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="text-sm font-medium">Caption Option ({c.tone})</h4>
                    <button
                      onClick={() => onCopyText(c.text)}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden /> Copy
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{c.text}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No captions yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Page Component (Client)
function CaptionerClient() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [instructions, setInstructions] = useState("")
  const [tone, setTone] = useState("Humoris")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)
  const [result, setResult] = useState<CaptionResult | null>(null)

  const canGenerate = useMemo(() => Boolean(imageBase64), [imageBase64])

  const onImage = useCallback((dataUrl: string, base64: string) => {
    setPreviewUrl(dataUrl)
    setImageBase64(base64)
    setMessage({ type: "success", text: "Image uploaded and ready for analysis." })
  }, [])

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMessage({ type: "success", text: "Copied to clipboard!" })
    } catch {
      setMessage({ type: "error", text: "Failed to copy." })
    }
  }

  const copyAllHashtags = () => {
    if (!result?.hashtags?.length) return
    copyText(result.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "))
  }

  const generate = async () => {
    if (!imageBase64) {
      setMessage({ type: "error", text: "Please upload an image first." })
      return
    }
    setLoading(true)
    setMessage({ type: "info", text: "Processing…" })
    setResult(null)

    // Hook up your existing Gemini/AI SDK route handler here and set the real result.
    await new Promise((r) => setTimeout(r, 900))
    const demo: CaptionResult = {
      hashtags: ["#photography", "#ai", "#creative", "#social", "#caption", "#visuals"],
      captions: [
        { text: "Caught in the right light—say hello to my new favorite angle.", tone },
        { text: "If pixels could talk, this would be a mic drop.", tone },
        { text: "Proof that good vibes are 100% photogenic.", tone },
      ],
    }
    setResult(demo)
    setMessage({ type: "success", text: "Captions and hashtags generated!" })
    setLoading(false)
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-6 md:py-10">
      <div className="grid grid-cols-1 gap-6">
        <Uploader previewUrl={previewUrl} onImage={onImage} />
        <Controls
          instructions={instructions}
          setInstructions={setInstructions}
          tone={tone}
          setTone={setTone}
          canGenerate={canGenerate}
          loading={loading}
          onGenerate={generate}
        />
        <Output
          result={result}
          loading={loading}
          onCopyAllHashtags={copyAllHashtags}
          onCopyText={copyText}
          message={message}
        />
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Tip: Replace the demo generator with your AI route. Keep tones and instructions as part of your prompt.
      </p>
    </main>
  )
}

export default function Page() {
  return (
    <Suspense>
      <CaptionerClient />
    </Suspense>
  )
}
