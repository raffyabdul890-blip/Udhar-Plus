"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import TextField from "@/components/ui/TextField";
import { createClient } from "@/lib/supabase/client";
import { hydrateFromCloud } from "@/lib/sync/syncEngine";

type AuthMethod = "phone" | "email";
type Step = "identifier" | "otp";

const PK_COUNTRY_CODE = "+92";
// Pakistani mobile numbers: 10 digits, starting with 3 (e.g. 3001234567).
const PHONE_DIGITS_REGEX = /^3\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<AuthMethod>("phone");
  const [step, setStep] = useState<Step>("identifier");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullPhone = `${PK_COUNTRY_CODE}${phoneDigits}`;
  const identifierLabel = method === "phone" ? fullPhone : email;

  function switchMethod(next: AuthMethod) {
    setMethod(next);
    setError(null);
  }

  async function handleSendOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (method === "phone" && !PHONE_DIGITS_REGEX.test(phoneDigits)) {
      setError("Enter a valid 10-digit mobile number, e.g. 3001234567.");
      return;
    }
    if (method === "email" && !EMAIL_REGEX.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: otpError } =
      method === "phone"
        ? await supabase.auth.signInWithOtp({ phone: fullPhone })
        : await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    setStep("otp");
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code you received.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: verifyError } =
      method === "phone"
        ? await supabase.auth.verifyOtp({ phone: fullPhone, token: otp, type: "sms" })
        : await supabase.auth.verifyOtp({ email, token: otp, type: "email" });

    if (verifyError || !data.user) {
      setLoading(false);
      setError(verifyError?.message ?? "Verification failed. Try again.");
      return;
    }

    await hydrateFromCloud(data.user.id);
    setLoading(false);
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-8">
      <div>
        <h1 className="text-senior-2xl font-bold text-brand-white">Udhar Plus</h1>
        <p className="mt-2 text-senior-base text-brand-white/80">
          {step === "identifier"
            ? "Sign in with your phone number or email."
            : `Enter the code sent to ${identifierLabel}.`}
        </p>
      </div>

      {step === "identifier" && (
        <div
          role="tablist"
          aria-label="Login method"
          className="flex gap-2 rounded-xl bg-brand-charcoal/40 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={method === "phone"}
            onClick={() => switchMethod("phone")}
            className={`min-h-tap flex-1 rounded-lg text-senior-base font-bold transition ${
              method === "phone" ? "bg-brand-red text-brand-white" : "text-brand-white/70"
            }`}
          >
            Phone Number
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={method === "email"}
            onClick={() => switchMethod("email")}
            className={`min-h-tap flex-1 rounded-lg text-senior-base font-bold transition ${
              method === "email" ? "bg-brand-red text-brand-white" : "text-brand-white/70"
            }`}
          >
            Email Address
          </button>
        </div>
      )}

      {step === "identifier" ? (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
          {method === "phone" ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="phone" className="text-senior-base font-medium text-brand-white">
                Mobile number
              </label>
              <div className="flex items-stretch gap-2">
                <span className="flex min-h-tap items-center rounded-xl border border-brand-charcoal bg-brand-charcoal px-4 text-senior-base font-medium text-brand-white">
                  {PK_COUNTRY_CODE}
                </span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="3001234567"
                  value={phoneDigits}
                  onChange={(e) =>
                    setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  className="min-h-tap flex-1 rounded-xl border border-brand-charcoal bg-transparent px-4 text-senior-base text-brand-white placeholder:text-brand-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
                />
              </div>
            </div>
          ) : (
            <TextField
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-brand-red bg-brand-charcoal px-4 py-3 text-senior-sm font-medium text-brand-white"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-tap min-w-tap rounded-xl bg-brand-red px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred disabled:bg-brand-charcoal disabled:text-brand-white/50"
          >
            {loading ? "Sending code…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
          <label htmlFor="otp" className="text-senior-base font-medium text-brand-white">
            Verification code
          </label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="min-h-tap rounded-xl border border-brand-charcoal bg-transparent px-4 text-senior-xl tracking-[0.3em] text-brand-white placeholder:text-brand-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-white"
          />

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-brand-red bg-brand-charcoal px-4 py-3 text-senior-sm font-medium text-brand-white"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-tap min-w-tap rounded-xl bg-brand-red px-6 text-senior-base font-bold text-brand-white transition active:scale-[0.98] active:bg-brand-darkred disabled:bg-brand-charcoal disabled:text-brand-white/50"
          >
            {loading ? "Verifying…" : "Verify & sign in"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("identifier");
              setOtp("");
              setError(null);
            }}
            className="min-h-tap text-senior-sm font-medium text-brand-white/80 underline"
          >
            {method === "phone" ? "Change number" : "Change email"}
          </button>
        </form>
      )}
    </main>
  );
}
