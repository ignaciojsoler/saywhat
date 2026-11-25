"use client"

import { motion, useReducedMotion } from "motion/react"
import { useEffect, useState } from "react"

export function DrawLine({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  const [fallback, setFallback] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setFallback(true), 1500)
    return () => clearTimeout(t)
  }, [])
  if (reduce) return <div className={className} style={{ transform: "scaleX(1)", transformOrigin: "left" }} />
  return (
    <motion.div
      className={className}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      animate={fallback ? { scaleX: 1 } : undefined}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformOrigin: "left" }}
    />
  )
}