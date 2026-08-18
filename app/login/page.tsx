"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import TextField from "@/components/ui/TextField";
import { createClient } from "@/lib/supabase/client";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { hydrateFromCloud } from "@/lib/sync/syncEngine";

type AuthMethod = "phone" | "email";
type Step = "identifier" | "otp";

const PK_COUNTRY_CODE = "+92";
// Pakistani mobile numbers: 10 digits, starting with 3 (e.g. 3001234567).
const PHONE_DIGITS_REGEX = /^3\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<AuthMethod>("phone");
  const [step, setStep] = useState<Step>("identifier");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  const fullPhone = `${PK_COUNTRY_CODE}${phoneDigits}`;
  const identifierLabel = method === "phone" ? fullPhone : email;

  function switchMethod(next: AuthMethod) {
    setMethod(next);
    setError(null);
  }

  async function sendPhoneOtp() {
    const auth = getFirebaseAuth();
    recaptchaVerifierRef.current?.clear();
    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
      size: "invisible",
    });

    try {
      confirmationResultRef.current = await signInWithPhoneNumber(
        auth,
        fullPhone,
        recaptchaVerifierRef.current
      );
    } catch (err) {
      setError(errorMessage(err, "Failed to send code. Try again."));
      return false;
    }
    return true;
  }

  async function sendEmailOtp() {
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: undefined },
    });
    if (otpError) {
      setError(otpError.message);
      return false;
    }
    return true;
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
    const sent = method === "phone" ? await sendPhoneOtp() : await sendEmailOtp();
    setLoading(false);

    if (sent) setStep("otp");
  }

  async function verifyPhoneOtp() {
    if (!confirmationResultRef.current) {
      setError("Session expired. Request a new code.");
      return;
    }

    let userId: string;
    try {
      const credential = await confirmationResultRef.current.confirm(otp);
      const idToken = await credential.user.getIdToken();

      const response = await fetch("/api/auth/firebase-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Verification failed.");
      }
      userId = result.userId;

      await getFirebaseAuth()
        .signOut()
        .catch(() => {});
    } catch (err) {
      setError(errorMessage(err, "Verification failed. Try again."));
      return;
    }

    await hydrateFromCloud(userId);
    router.push("/");
    router.refresh();
  }

  async function verifyEmailOtp() {
    const supabase = createClient();
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (verifyError || !data.user) {
      setError(verifyError?.message ?? "Verification failed. Try again.");
      return;
    }

    await hydrateFromCloud(data.user.id);
    router.push("/");
    router.refresh();
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code you received.");
      return;
    }

    setLoading(true);
    if (method === "phone") {
      await verifyPhoneOtp();
    } else {
      await verifyEmailOtp();
    }
    setLoading(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-8">
      <div id={RECAPTCHA_CONTAINER_ID} />

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
        <form onSubmit={handleSendOtp} noValidate className="flex flex-col gap-4">
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
            {loading ? (method === "phone" ? "Verifying…" : "Sending code…") : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} noValidate className="flex flex-col gap-4">
          <label htmlFor="otp" className="text-senior-base font-medium text-brand-white">
            Verification code
          </label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
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
