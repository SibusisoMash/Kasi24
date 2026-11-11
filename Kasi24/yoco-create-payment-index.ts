// ═══════════════════════════════════════════════════════════
// YOCO CREATE-PAYMENT — SUPABASE EDGE FUNCTION
// Does NOT go on your website. Does NOT go in your website folder.
//
// Where it goes: Supabase Dashboard → Edge Functions →
// "Deploy a new function" → "Via Editor" → name it exactly:
//
//        yoco-create-payment
//
// Then paste this ENTIRE file's code into that editor and click Deploy.
// ═══════════════════════════════════════════════════════════
//
// supabase/functions/yoco-create-payment/index.ts
//
// Creates a Yoco Checkout server-side and returns its redirectUrl.
// The Yoco secret key must NEVER be sent to the browser — this function
// is the only place it's used, pulled from a Supabase secret at runtime.
//
// Deploy:   supabase functions deploy yoco-create-payment
// Secrets:  supabase secrets set YOCO_SECRET_KEY=sk_test_xxx
//           supabase secrets set SUPABASE_URL=https://xxx.supabase.co
//           supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxx
//
// Test cards (with a sk_test_ key): 4111 1111 1111 1111, any expiry/CVV.
// Go live by swapping the secret to your sk_live_ key — no code change.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const YOCO_SECRET_KEY = Deno.env.get("YOCO_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!YOCO_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "Yoco secret not configured on the server." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { reference, amount, returnUrl, cancelUrl, notifyUrl, listingId } = await req.json();

    if (!reference || !amount || !returnUrl || !cancelUrl) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountCents = Math.round(Number(amount) * 100);
    if (!amountCents || amountCents < 100) {
      return new Response(JSON.stringify({ error: "Invalid amount." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: Record<string, unknown> = {
      amount: amountCents,
      currency: "ZAR",
      successUrl: String(returnUrl),
      cancelUrl: String(cancelUrl),
      failureUrl: String(cancelUrl),
      metadata: {
        unlockId: String(reference),
        listingId: listingId ? String(listingId) : "",
      },
    };
    if (notifyUrl) payload.notifyUrl = String(notifyUrl);

    const yocoResp = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + YOCO_SECRET_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const yocoData = await yocoResp.json().catch(() => ({}));
    if (!yocoResp.ok) {
      const msg =
        (yocoData && (yocoData.message || yocoData.error || yocoData.description)) ||
        "Yoco rejected the checkout request.";
      return new Response(JSON.stringify({ error: String(msg) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkoutId = (yocoData as Record<string, string>).id || "";
    const redirectUrl =
      (yocoData as Record<string, string>).redirectUrl || "";

    if (!redirectUrl) {
      return new Response(JSON.stringify({ error: "Yoco did not return a redirect URL." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store the Yoco checkout id on the unlock row for debugging/reconciliation.
    // Non-fatal if Supabase vars are missing — the webhook can still match via metadata.
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && checkoutId) {
      try {
        await fetch(SUPABASE_URL + "/rest/v1/unlocks?id=eq." + encodeURIComponent(String(reference)), {
          method: "PATCH",
          headers: {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ payment_ref: checkoutId }),
        });
      } catch (_e) { /* ignore — webhook remains source of truth */ }
    }

    return new Response(JSON.stringify({ redirectUrl, checkoutId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
