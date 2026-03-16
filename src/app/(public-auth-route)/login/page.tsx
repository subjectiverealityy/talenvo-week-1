import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-gray-500">
            Log in to continue to BoardList.
          </p>
        </header>

        <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
          Authentication UI is coming soon. For now, you can explore the app
          from the board list.
        </div>

        <div className="flex items-center justify-between text-sm">
          <Link href="/signup" className="text-blue-600 hover:underline">
            Create account
          </Link>
          <Link href="/board-list" className="text-gray-600 hover:underline">
            Go to boards
          </Link>
        </div>
      </div>
    </main>
  );
}
