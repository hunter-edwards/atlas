import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold">Your Courses</h1>
          <p className="text-muted-foreground mt-1">
            Pick up where you left off or start something new.
          </p>
        </div>
        <Link
          href="/onboarding/describe"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          New Course
        </Link>
      </div>

      {/* Empty state */}
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground mb-4">
          No courses yet. Start by describing what you want to learn.
        </p>
        <Link
          href="/onboarding/describe"
          className="text-sm font-medium text-accent hover:underline"
        >
          Create your first course
        </Link>
      </div>
    </div>
  );
}
