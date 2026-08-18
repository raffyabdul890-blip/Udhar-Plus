import { NextResponse, type NextRequest } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createClient as createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;

// Verifying against Firebase's public JWKS avoids needing the firebase-admin SDK
// (and the service-account JSON secret it requires) just to check a token signature.
const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

function randomPassword() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const idToken = body?.idToken;

  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    }));
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const signInProvider = (payload.firebase as { sign_in_provider?: string } | undefined)
    ?.sign_in_provider;
  const phone = payload.phone_number as string | undefined;

  if (signInProvider !== "phone" || !phone) {
    return NextResponse.json(
      { error: "Token was not issued for phone verification" },
      { status: 401 }
    );
  }

  const admin = createAdminClient();
  const password = randomPassword();

  const { error: createError } = await admin.auth.admin.createUser({
    phone,
    phone_confirm: true,
    password,
  });

  if (createError) {
    // Most likely already registered from a previous login — find them and reset
    // their one-time bridge password. Linear-scans one page of users since the
    // admin API has no phone filter; revisit if the user base passes ~1000.
    const { data: listed, error: listError } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });

    const existing = listed?.users.find(
      (u) => u.phone === phone || u.phone === phone.replace(/^\+/, "")
    );

    if (listError || !existing) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
      password,
    });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  const supabase = await createServerClient();
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    phone,
    password,
  });

  if (signInError || !signInData.session) {
    return NextResponse.json(
      { error: signInError?.message ?? "Sign-in failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ userId: signInData.session.user.id });
}
