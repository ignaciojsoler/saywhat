"use client"

/**
 * Original video files live only on the user's device, in IndexedDB, keyed by project id.
 * The server only ever sees the transcript text; this module never sends anything anywhere.
 */

const DB_NAME = "saywhat"
const VERSION = 1
const FILES = "files"
const THUMBS = "thumbs"

type FileRecord = { id: string; userId: string; blob: Blob; name: string; type: string; size: number; lastModified: number; savedAt: number }
type ThumbRecord = { id: string; userId: string; blob: Blob }

export type SaveResult = "ok" | "quota" | "unavailable"

let opening: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB unavailable"))
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES, { keyPath: "id" }).createIndex("userId", "userId")
      if (!db.objectStoreNames.contains(THUMBS)) db.createObjectStore(THUMBS, { keyPath: "id" }).createIndex("userId", "userId")
    }
    req.onsuccess = () => {
      const db = req.result
      // another tab upgraded the schema: drop this connection so it can proceed
      db.onversionchange = () => {
        db.close()
        opening = null
      }
      resolve(db)
    }
    req.onerror = () => {
      opening = null
      reject(req.error)
    }
    req.onblocked = () => {
      opening = null
      reject(new Error("IndexedDB blocked"))
    }
  })
  return opening
}

function tx<T>(stores: string[], mode: IDBTransactionMode, run: (t: IDBTransaction) => IDBRequest<T> | void): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(stores, mode)
        const req = run(t)
        t.oncomplete = () => resolve(req ? req.result : undefined)
        t.onabort = () => reject(t.error ?? new Error("Transaction aborted"))
        t.onerror = () => reject(t.error)
      }),
  )
}

const isQuota = (e: unknown) => e instanceof DOMException && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED")

/** Keeps the original file on this device. Never throws: returns why it couldn't when it couldn't. */
export async function saveLocalVideo(userId: string, id: string, file: File): Promise<SaveResult> {
  const rec: FileRecord = { id, userId, blob: file, name: file.name, type: file.type, size: file.size, lastModified: file.lastModified, savedAt: Date.now() }
  try {
    await tx([FILES], "readwrite", (t) => t.objectStore(FILES).put(rec))
    return "ok"
  } catch (e) {
    return isQuota(e) ? "quota" : "unavailable"
  }
}

export async function getLocalVideo(id: string): Promise<File | null> {
  try {
    const rec = (await tx<FileRecord>([FILES], "readonly", (t) => t.objectStore(FILES).get(id))) ?? null
    if (!rec) return null
    return new File([rec.blob], rec.name, { type: rec.type, lastModified: rec.lastModified })
  } catch {
    return null
  }
}

export async function saveThumbnail(userId: string, id: string, blob: Blob): Promise<void> {
  try {
    await tx([THUMBS], "readwrite", (t) => t.objectStore(THUMBS).put({ id, userId, blob } satisfies ThumbRecord))
  } catch {
    // a missing thumbnail only means a placeholder on the dashboard
  }
}

/** Ids of the videos stored on this device, and their thumbnails. */
export async function getLocalIndex(): Promise<{ files: Set<string>; thumbs: Map<string, Blob> }> {
  try {
    const [keys, thumbs] = await Promise.all([
      tx<IDBValidKey[]>([FILES], "readonly", (t) => t.objectStore(FILES).getAllKeys()),
      tx<ThumbRecord[]>([THUMBS], "readonly", (t) => t.objectStore(THUMBS).getAll()),
    ])
    return { files: new Set((keys ?? []).map(String)), thumbs: new Map((thumbs ?? []).map((r) => [r.id, r.blob])) }
  } catch {
    return { files: new Set(), thumbs: new Map() }
  }
}

export async function deleteLocalVideo(id: string): Promise<void> {
  try {
    await tx([FILES, THUMBS], "readwrite", (t) => {
      t.objectStore(FILES).delete(id)
      t.objectStore(THUMBS).delete(id)
    })
  } catch {}
}

/** Copies the local file and thumbnail of a project to its duplicate. */
export async function copyLocalVideo(userId: string, from: string, to: string): Promise<void> {
  const [file, { thumbs }] = await Promise.all([getLocalVideo(from), getLocalIndex()])
  if (file) await saveLocalVideo(userId, to, file)
  const thumb = thumbs.get(from)
  if (thumb) await saveThumbnail(userId, to, thumb)
}

/** Videos this account keeps in this browser: count and bytes. */
export async function localUsage(userId: string): Promise<{ count: number; bytes: number }> {
  try {
    const recs = (await tx<FileRecord[]>([FILES], "readonly", (t) => t.objectStore(FILES).index("userId").getAll(userId))) ?? []
    return { count: recs.length, bytes: recs.reduce((n, r) => n + (r.size || 0), 0) }
  } catch {
    return { count: 0, bytes: 0 }
  }
}

/** Removes every video (and thumbnail) this account stored in this browser. Projects on the server stay. */
export async function clearLocalVideos(userId: string): Promise<void> {
  const clear = (store: string) =>
    tx([store], "readwrite", (t) => {
      const req = t.objectStore(store).index("userId").openKeyCursor(IDBKeyRange.only(userId))
      req.onsuccess = () => {
        const c = req.result
        if (!c) return
        t.objectStore(store).delete(c.primaryKey)
        c.continue()
      }
    })
  await Promise.all([clear(FILES), clear(THUMBS)])
}

/** A small JPEG frame from about a third into the clip, generated locally. Null when the browser can't decode it. */
export function makeThumbnail(file: Blob, width = 360): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement("video")
    let done = false
    const finish = (b: Blob | null) => {
      if (done) return
      done = true
      URL.revokeObjectURL(url)
      v.removeAttribute("src")
      v.load()
      resolve(b)
    }
    const timer = setTimeout(() => finish(null), 8000)
    v.muted = true
    v.playsInline = true
    v.preload = "auto"
    v.onloadedmetadata = () => {
      v.currentTime = Math.min(Math.max(0.1, (v.duration || 0) / 3), 3)
    }
    v.onseeked = () => {
      const w = Math.min(width, v.videoWidth || width)
      const h = Math.round((w * (v.videoHeight || 9)) / (v.videoWidth || 16))
      const c = document.createElement("canvas")
      c.width = w
      c.height = h
      const ctx = c.getContext("2d")
      if (!ctx) return finish(null)
      ctx.drawImage(v, 0, 0, w, h)
      c.toBlob(
        (b) => {
          clearTimeout(timer)
          finish(b)
        },
        "image/jpeg",
        0.72,
      )
    }
    v.onerror = () => {
      clearTimeout(timer)
      finish(null)
    }
    v.src = url
  })
}

/** Duration in seconds read locally from the file's metadata (0 if unreadable). */
export function readDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement("video")
    const done = (d: number) => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(d) ? d : 0)
    }
    v.preload = "metadata"
    v.onloadedmetadata = () => done(v.duration)
    v.onerror = () => done(0)
    v.src = url
  })
}

export const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`
  const units = ["KB", "MB", "GB"]
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`
}
