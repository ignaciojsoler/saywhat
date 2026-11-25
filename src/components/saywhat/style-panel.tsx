"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CaptionCanvas } from "./caption-text"
import { matchPreset, PRESETS, type Preset } from "@/lib/captions/presets"
import {
  FONTS,
  fontWeight,
  type Background,
  type CaptionStyle,
  type Entrance,
  type FontDef,
  type FontId,
  type Highlight,
  type Reveal,
  type TextCase,
  type Word,
} from "@/lib/captions/types"
import { cn } from "@/lib/utils"
import { useEditor } from "@/store/editor"

/** Sample line for the preset thumbnails, timed like speech. */
const SAMPLE: Word[] = [
  { w: "Say", s: 0.25, e: 0.55 },
  { w: "it", s: 0.6, e: 0.85 },
  { w: "beautifully", s: 0.95, e: 1.75 },
]
/** still frame: the last word mid-sweep, earlier transitions settled */
const STILL = 1.35
/** hover replays the line on this loop */
const LOOP = 2.8

function Field({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        {value != null && <span className="text-muted-foreground font-mono text-[11px] tabular-nums">{value}</span>}
      </div>
      {children}
    </div>
  )
}

type NumKey = { [K in keyof CaptionStyle]: CaptionStyle[K] extends number ? K : never }[keyof CaptionStyle]

/** Live-updating slider that records a single undo step on release. */
function StyleSlider({ k, min, max, step = 1 }: { k: NumKey; min: number; max: number; step?: number }) {
  const value = useEditor((s) => s.style[k])
  const setStyle = useEditor((s) => s.setStyle)
  const commit = useEditor((s) => s.commitStyle)
  return (
    <Slider
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={([v]) => setStyle({ [k]: v } as Partial<CaptionStyle>, false)}
      onValueCommit={commit}
    />
  )
}

/** Single-choice row bound to a style key. */
function Choice<K extends "reveal" | "highlight" | "background" | "textCase">({
  k,
  options,
}: {
  k: K
  options: [value: CaptionStyle[K], label: string][]
}) {
  const value = useEditor((s) => s.style[k])
  const setStyle = useEditor((s) => s.setStyle)
  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      className="w-full"
      value={value}
      onValueChange={(v) => v && setStyle({ [k]: v } as Partial<CaptionStyle>)}
    >
      {options.map(([v, label]) => (
        <ToggleGroupItem key={v} value={v} className="flex-1 text-xs">
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function ColorInput({ k, label }: { k: "color" | "activeColor" | "strokeColor" | "boxColor"; label: string }) {
  const value = useEditor((s) => s.style[k])
  const setStyle = useEditor((s) => s.setStyle)
  const commit = useEditor((s) => s.commitStyle)
  // the native picker has no alpha: keep the current one (e.g. a translucent panel)
  const alpha = value.length === 9 ? value.slice(7) : ""
  return (
    <label className="flex cursor-pointer flex-col items-center gap-1.5 text-[11px]">
      <span
        className="relative size-8 overflow-hidden rounded-md ring-1 ring-white/15"
        style={{ background: `conic-gradient(#888 25%, #555 0 50%, #888 0 75%, #555 0) 0 0 / 8px 8px` }}
      >
        <span className="absolute inset-0" style={{ background: value }} />
        <input
          type="color"
          value={value.slice(0, 7)}
          onChange={(e) => setStyle({ [k]: e.target.value + alpha }, false)}
          onBlur={commit}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={label}
        />
      </span>
      <span className="text-muted-foreground">{label}</span>
    </label>
  )
}

// stand-in "footage" behind preset previews: a dim, warm interior with a soft light source
const THUMB_BG =
  "radial-gradient(120% 90% at 70% 15%, #6b5a49 0%, #2c2621 45%, #121110 100%)"

function PresetThumb({ preset, selected, onPick }: { preset: Preset; selected: boolean; onPick: () => void }) {
  const [hover, setHover] = useState(false)
  const [t, setT] = useState(STILL)

  // replay the line while hovered; deterministic in the loop time like any other caption
  useEffect(() => {
    if (!hover) return
    let id = 0
    let t0 = 0
    const tick = (now: number) => {
      if (!t0) t0 = now
      setT(((now - t0) / 1000) % LOOP)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(id)
      setT(STILL)
    }
  }, [hover])

  const s = preset.style
  const style: CaptionStyle = { ...s, size: Math.min(s.size * 1.9, 12), position: 12, wordsPerLine: 3 }
  return (
    <button
      type="button"
      onClick={onPick}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      title={preset.tagline}
      className={cn(
        "group flex flex-col gap-1.5 rounded-lg p-1.5 text-left transition-colors hover:bg-muted/60",
        selected && "bg-muted ring-primary ring-2",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-md" style={{ background: THUMB_BG }}>
        <CaptionCanvas words={SAMPLE} t={t} style={style} />
      </div>
      <span className="px-0.5 text-xs font-medium">{preset.name}</span>
    </button>
  )
}

function Presets() {
  const style = useEditor((s) => s.style)
  const setStyle = useEditor((s) => s.setStyle)
  const current = matchPreset(style)
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((p) => (
          <PresetThumb key={p.id} preset={p} selected={current?.id === p.id} onPick={() => setStyle(p.style)} />
        ))}
      </div>
      <p className="text-muted-foreground px-1 text-[11px]">
        {current ? current.tagline : "Customized. Pick a style to start over."}
      </p>
    </div>
  )
}

const ENTRANCES: [Entrance, string][] = [
  ["none", "None"],
  ["fade", "Fade"],
  ["rise", "Rise"],
  ["blur", "Blur in"],
  ["pop", "Pop"],
]

function Customize() {
  const style = useEditor((s) => s.style)
  const setStyle = useEditor((s) => s.setStyle)
  const font: FontDef = FONTS[style.font]
  const weights = font.weights
  const fontIds = (Object.keys(FONTS) as FontId[]).filter((f) => !(FONTS[f] as FontDef).legacy || f === style.font)

  return (
    <div className="flex flex-col gap-5">
      <Field label="Font">
        <Select value={style.font} onValueChange={(v) => setStyle({ font: v as FontId, weight: fontWeight({ font: v as FontId, weight: style.weight }) })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fontIds.map((f) => {
              const d: FontDef = FONTS[f]
              return (
                <SelectItem key={f} value={f}>
                  <span style={{ fontFamily: `"${d.family}"`, fontWeight: d.weights[Math.floor(d.weights.length / 2)], fontStyle: d.italic ? "italic" : undefined }}>
                    {d.label}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </Field>

      {weights.length > 1 && (
        <Field label="Weight" value={fontWeight(style)}>
          <Slider
            min={0}
            max={weights.length - 1}
            step={1}
            value={[Math.max(0, weights.indexOf(fontWeight(style)))]}
            onValueChange={([i]) => setStyle({ weight: weights[i] }, false)}
            onValueCommit={useEditor.getState().commitStyle}
          />
        </Field>
      )}

      <Field label="Case">
        <Choice<"textCase">
          k="textCase"
          options={[
            ["none" as TextCase, "Aa"],
            ["upper" as TextCase, "AA"],
            ["lower" as TextCase, "aa"],
          ]}
        />
      </Field>

      <Separator />

      <Field label="Reveal">
        <Choice<"reveal">
          k="reveal"
          options={[
            ["line" as Reveal, "Line"],
            ["build" as Reveal, "Build"],
            ["single" as Reveal, "One word"],
          ]}
        />
      </Field>
      <Field label="Entrance">
        <Select value={style.entrance} onValueChange={(v) => setStyle({ entrance: v as Entrance })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTRANCES.map(([v, label]) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Highlight">
        <Choice<"highlight">
          k="highlight"
          options={[
            ["none" as Highlight, "None"],
            ["color" as Highlight, "Color"],
            ["pill" as Highlight, "Pill"],
            ["fill" as Highlight, "Fill"],
          ]}
        />
      </Field>
      <Field label="Active word scale" value={`${Math.round(style.emphasis * 100)}%`}>
        <StyleSlider k="emphasis" min={1} max={1.3} step={0.01} />
      </Field>
      {(style.reveal === "line" || style.highlight === "fill") && (
        <Field label="Upcoming words" value={`${Math.round(style.dim * 100)}%`}>
          <StyleSlider k="dim" min={0.15} max={1} step={0.05} />
        </Field>
      )}

      <Separator />

      <Field label="Size" value={`${style.size}%`}>
        <StyleSlider k="size" min={3} max={14} step={0.1} />
      </Field>
      <Field label="Letter spacing" value={`${(style.tracking * 100).toFixed(1)}%`}>
        <StyleSlider k="tracking" min={-0.06} max={0.12} step={0.005} />
      </Field>
      <Field label="Words per line" value={style.wordsPerLine}>
        <StyleSlider k="wordsPerLine" min={1} max={8} />
      </Field>
      <Field label="Height" value={`${style.position}%`}>
        <StyleSlider k="position" min={3} max={80} />
      </Field>

      <Separator />

      <Field label="Colors">
        <div className="flex gap-4">
          <ColorInput k="color" label="Text" />
          <ColorInput k="activeColor" label="Highlight" />
          <ColorInput k="strokeColor" label="Outline" />
          {style.background !== "none" && <ColorInput k="boxColor" label="Panel" />}
        </div>
      </Field>
      <Field label="Outline" value={style.stroke ? `${style.stroke}%` : "off"}>
        <StyleSlider k="stroke" min={0} max={20} />
      </Field>
      <Field label="Shadow" value={style.shadow ? `${Math.round(style.shadow * 100)}%` : "off"}>
        <StyleSlider k="shadow" min={0} max={1} step={0.05} />
      </Field>
      <Field label="Glow" value={style.glow ? `${Math.round(style.glow * 100)}%` : "off"}>
        <StyleSlider k="glow" min={0} max={1} step={0.05} />
      </Field>
      <Field label="Background">
        <Choice<"background">
          k="background"
          options={[
            ["none" as Background, "None"],
            ["box" as Background, "Box"],
            ["glass" as Background, "Glass"],
          ]}
        />
      </Field>
    </div>
  )
}

export function StylePanel() {
  return (
    <Tabs defaultValue="presets" className="flex h-full min-h-0 flex-col gap-0">
      <div className="border-b px-4 py-3">
        <TabsList className="w-full">
          <TabsTrigger value="presets">Styles</TabsTrigger>
          <TabsTrigger value="custom">Customize</TabsTrigger>
        </TabsList>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <TabsContent value="presets" className="p-3">
          <Presets />
        </TabsContent>
        <TabsContent value="custom" className="p-4">
          <Customize />
        </TabsContent>
      </ScrollArea>
    </Tabs>
  )
}
