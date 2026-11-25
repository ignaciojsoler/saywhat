import { describe, expect, it } from "vitest"
import { emptyStateCopy } from "../empty-state-copy"

const libraryIntro =
  "Videos you caption from now on are saved here so you can reopen and edit them. Videos made before the library existed weren't stored."
const outOfCredits = "You're out of credits. Grab a pack to keep going."

describe("emptyStateCopy", () => {
  it("welcomes a new user with free credits", () => {
    expect(emptyStateCopy({ credits: 3, hasSpent: false, hasPurchased: false })).toEqual({
      title: "Caption your first video",
      body: "You have 3 videos to caption for free. Each one uses 1 credit, and your captioned videos show up here.",
    })
  })

  it("uses the singular for one credit", () => {
    expect(emptyStateCopy({ credits: 1, hasSpent: false, hasPurchased: false })).toEqual({
      title: "Caption your first video",
      body: "You have 1 video to caption for free. Each one uses 1 credit, and your captioned videos show up here.",
    })
  })

  it("drops “for free” for a new user who already bought credits", () => {
    expect(emptyStateCopy({ credits: 5, hasSpent: false, hasPurchased: true })).toEqual({
      title: "Caption your first video",
      body: "You have 5 videos to caption. Each one uses 1 credit, and your captioned videos show up here.",
    })
  })

  it("explains the library to a returning user without a purchase", () => {
    expect(emptyStateCopy({ credits: 2, hasSpent: true, hasPurchased: false })).toEqual({
      title: "Your video library",
      body: `${libraryIntro} You have 2 videos to caption for free. Each one uses 1 credit, and your captioned videos show up here.`,
    })
  })

  it("explains the library to a returning user who bought credits", () => {
    expect(emptyStateCopy({ credits: 1, hasSpent: true, hasPurchased: true })).toEqual({
      title: "Your video library",
      body: `${libraryIntro} You have 1 video to caption. Each one uses 1 credit, and your captioned videos show up here.`,
    })
  })

  it("keeps the out-of-credits copy for a returning user", () => {
    expect(emptyStateCopy({ credits: 0, hasSpent: true, hasPurchased: true })).toEqual({
      title: "Your video library",
      body: outOfCredits,
    })
  })

  it("keeps the out-of-credits copy for a new user", () => {
    expect(emptyStateCopy({ credits: 0, hasSpent: false, hasPurchased: false })).toEqual({
      title: "Caption your first video",
      body: outOfCredits,
    })
  })
})
