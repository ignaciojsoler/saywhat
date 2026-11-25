import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { CaptionDemo } from "@/components/saywhat/caption-demo"
import { Logo } from "@/components/site/logo"

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors">
            <ArrowLeftIcon className="size-4" />
            Back to site
          </Link>
        </div>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</main>
        <p className="text-muted-foreground text-center text-xs">By continuing you agree to use Saywhat responsibly with content you own.</p>
      </div>

      <aside className="relative hidden overflow-hidden border-l bg-[#100e0b] lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-10 lg:p-12">
        <div className="relative">
          <CaptionDemo />
        </div>
        <p className="text-muted-foreground relative max-w-sm text-center text-balance">
          Word-by-word captions in the style you pick. Edit any word, export in seconds.
        </p>
      </aside>
    </div>
  )
}
