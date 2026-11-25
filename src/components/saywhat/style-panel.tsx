"use client"

import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CaptionText } from "./caption-text"
import { PRESETS } from "@/lib/captions/presets"
import { FONTS, type Animation, type CaptionStyle, type FontId } from "@/lib/captions/types"
import { cn } from "@/lib/utils"
import { useEditor } from "@/store/editor"

const SAMPLE = ["Captions", "that", "pop"]

const sameStyle = (a: CaptionStyle, b: CaptionStyle) => JSON.stringify(a) === JSON.stringify(b)

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

/** Live-updating slider that records a single undo step on release. */
function StyleSlider({ k, min, max, step = 1 }: { k: keyof CaptionStyle; min: number; max: number; step?: number }) {
  const value = useEditor((s) => s.style[k]) as number
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

function ColorInput({ k, label }: { k: "color" | "activeColor" | "strokeColor"; label: string }) {
  const value = useEditor((s) => s.style[k])
  const setStyle = useEditor((s) => s.setStyle)
  const commit = useEditor((s) => s.commitStyle)
  return (
    <label className="flex cursor-pointer flex-col items-center gap-1.5 text-[11px]">
      <span
        className="relative size-8 overflow-hidden rounded-md ring-1 ring-white/15"
        style={{ background: value }}
      >
        <input
          type="color"
          value={value.slice(0, 7)}
          onChange={(e) => setStyle({ [k]: e.target.value }, false)}
          onBlur={commit}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={label}
        />
      </span>
      <span className="text-muted-foreground">{label}</span>
    </label>
  )
}

function Presets() {
  const style = useEditor((s) => s.style)
  const setStyle = useEditor((s) => s.setStyle)
  return (
    <div className="grid grid-cols-2 gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setStyle(p.style)}
          className={cn(
            "group flex flex-col gap-1.5 rounded-lg p-1.5 text-left transition-colors hover:bg-muted/60",
            sameStyle(style, p.style) && "bg-muted ring-primary ring-2",
          )}
        >
          <div className="relative grid aspect-[4/3] place-items-end overflow-hidden rounded-md pb-[14%] [container-type:size]"
            style={{ background: THUMB_BG }}
          >
            <CaptionText words={SAMPLE} active={1} style={{ ...p.style, size: p.style.size * 1.9 }} className="w-full px-1" />
          </div>
          <span className="px-0.5 text-xs font-medium">{p.name}</span>
        </button>
      ))}
    </div>
  )
}

function Customize() {
  const style = useEditor((s) => s.style)
  const setStyle = useEditor((s) => s.setStyle)
  return (
    <div className="flex flex-col gap-5">
      <Field label="Font">
        <Select value={style.font} onValueChange={(v) => setStyle({ font: v as FontId })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FONTS) as FontId[]).map((f) => (
              <SelectItem key={f} value={f}>
                <span style={{ fontFamily: FONTS[f].css, fontWeight: FONTS[f].weight }}>{FONTS[f].label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Animation">
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          className="w-full"
          value={style.animation}
          onValueChange={(v) => v && setStyle({ animation: v as Animation })}
        >
          <ToggleGroupItem value="pop" className="flex-1 text-xs">Pop</ToggleGroupItem>
          <ToggleGroupItem value="karaoke" className="flex-1 text-xs">Karaoke</ToggleGroupItem>
          <ToggleGroupItem value="single" className="flex-1 text-xs">One word</ToggleGroupItem>
          <ToggleGroupItem value="classic" className="flex-1 text-xs">Static</ToggleGroupItem>
        </ToggleGroup>
      </Field>

      <Field label="Size" value={`${style.size}%`}>
        <StyleSlider k="size" min={3} max={14} step={0.5} />
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
        </div>
      </Field>
      <Field label="Outline" value={style.stroke ? `${style.stroke}%` : "off"}>
        <StyleSlider k="stroke" min={0} max={25} />
      </Field>

      <div className="flex flex-col gap-3">
        {(
          [
            ["shadow", "Shadow"],
            ["box", "Background box"],
            ["uppercase", "All caps"],
          ] as const
        ).map(([k, label]) => (
          <div key={k} className="flex items-center justify-between">
            <Label htmlFor={k} className="text-xs">
              {label}
            </Label>
            <Switch id={k} checked={style[k]} onCheckedChange={(v) => setStyle({ [k]: v })} />
          </div>
        ))}
      </div>
    </div>
  )
}

// stand-in "footage" behind preset previews, same mood as the landing demo
const THUMB_BG =
  "linear-gradient(160deg, #3a3a3a 0%, #1c1c1c 100%)"

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
