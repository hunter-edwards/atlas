import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-6">Atlas</h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto">
          Describe what you want to learn. AI researches, builds your
          curriculum, and schedules every lesson.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-8 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}
