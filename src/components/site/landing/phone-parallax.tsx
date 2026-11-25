"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react"
import type { ReactNode } from "react"

export function PhoneParallax({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const [isSmall, setIsSmall] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)")
    const update = () => setIsSmall(mql.matches)
    update()
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [])
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], [0, -60])
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 2])
  if (reduce || isSmall) {
    return <div ref={ref} className="relative">{children}</div>
  }
  return (
    <motion.div
      ref={ref}
      style={{ y, rotate }}
      initial={{ opacity: 0, scale: 0.94, y: 40, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      {children}
      <span aria-hidden className="pointer-events-none absolute -inset-6 -z-10 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(255,225,77,0.18) 0%, transparent 65%)" }} />
    </motion.div>
  )
}
