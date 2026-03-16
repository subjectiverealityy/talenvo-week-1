import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="text-sm text-gray-500">
            Sign up to start organizing your boards.
          </p>
        </header>

        <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
          Sign-up UI is coming soon. If you already have access, head back to
          the login page.
        </div>

        <div className="flex items-center justify-between text-sm">
          <Link href="/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
          <Link href="/board-list" className="text-gray-600 hover:underline">
            Go to boards
          </Link>
        </div>
      </div>
    </main>
  );
}
