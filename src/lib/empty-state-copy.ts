export type EmptyStateCopyInput = {
  credits: number
  /** The user has spent a credit on a video before. */
  hasSpent: boolean
  /** The user has bought credits before. */
  hasPurchased: boolean
}

export type EmptyStateCopy = { title: string; body: string }

const videos = (n: number) => `${n} ${n === 1 ? "video" : "videos"}`

/** Title and body for the videos library empty state. Pure so every case can be tested. */
export function emptyStateCopy({ credits, hasSpent, hasPurchased }: EmptyStateCopyInput): EmptyStateCopy {
  const title = hasSpent ? "Your video library" : "Caption your first video"
  if (credits <= 0) return { title, body: "You're out of credits. Grab a pack to keep going." }

  const free = hasPurchased ? "" : " for free"
  const balance = `You have ${videos(credits)} to caption${free}. Each one uses 1 credit, and your captioned videos show up here.`
  return {
    title,
    body: hasSpent
      ? `Videos you caption from now on are saved here so you can reopen and edit them. Videos made before the library existed weren't stored. ${balance}`
      : balance,
  }
}
