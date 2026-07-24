import { signIn, signUp } from "@/actions/auth";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string; mode?: string };
}) {
  const isSignup = searchParams.mode === "signup";

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-5">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:col-span-2 flex-col justify-between bg-manifest-navy-800 text-white p-12 relative overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.08]"
          viewBox="0 0 400 800"
          preserveAspectRatio="none"
        >
          <path d="M0 700 L120 700 L160 620 L400 620" stroke="white" strokeWidth="2" fill="none" />
          <path d="M0 500 L80 500 L140 420 L400 420" stroke="white" strokeWidth="2" fill="none" />
          <path d="M0 300 L200 300 L240 240 L400 240" stroke="white" strokeWidth="2" fill="none" />
          <circle cx="160" cy="620" r="4" fill="white" />
          <circle cx="140" cy="420" r="4" fill="white" />
          <circle cx="240" cy="240" r="4" fill="white" />
        </svg>
        <div className="relative z-10 max-w-sm">
          <img
            src="/paragon-nexus-logo.png"
            alt="Paragon Nexus — Powered by Paragon Global Logistics"
            className="w-full h-auto brightness-0 invert mb-6"
          />
          <h1 className="font-display text-4xl leading-tight font-medium">
            The operating system
            <br /> behind every shipment.
          </h1>
        </div>
        <p className="relative z-10 text-sm text-manifest-navy-100 max-w-sm">
          Track every prospect, contact, and touchpoint — from cold lead to
          contracted customer.
        </p>
      </div>

      {/* Form panel */}
      <div className="col-span-1 lg:col-span-3 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 text-center">
            <img
              src="/paragon-nexus-logo.png"
              alt="Paragon Nexus — Powered by Paragon Global Logistics"
              className="w-48 h-auto mx-auto"
            />
          </div>

          <h2 className="font-display text-2xl font-medium text-manifest-navy-800 mb-1">
            {isSignup ? "Create your account" : "Sign in"}
          </h2>
          <p className="text-sm text-manifest-navy-400 mb-6">
            {isSignup
              ? "Set up access to the Paragon portal."
              : "Welcome back. Enter your credentials to continue."}
          </p>

          {searchParams.error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {searchParams.error}
            </div>
          )}
          {searchParams.message && (
            <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {searchParams.message}
            </div>
          )}

          <form action={isSignup ? signUp : signIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="field-input"
                placeholder="you@paragonlogistics.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="field-input"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              {isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-manifest-navy-400">
            {isSignup ? (
              <>
                Already have access?{" "}
                <a href="/login" className="font-medium text-manifest-signal hover:underline">
                  Sign in
                </a>
              </>
            ) : (
              <>
                Need an account?{" "}
                <a href="/login?mode=signup" className="font-medium text-manifest-signal hover:underline">
                  Create one
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
