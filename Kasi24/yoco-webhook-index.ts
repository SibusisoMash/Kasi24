// ═══════════════════════════════════════════════════════════
// YOCO WEBHOOK — SUPABASE EDGE FUNCTION
// Does NOT go on your website. Does NOT go in your website folder.
//
// Where it goes: Supabase Dashboard → Edge Functions →
// "Deploy a new function" → "Via Editor" → name it exactly:
//
//        yoco-webhook
//
// Then paste this ENTIRE file's code into that editor and click Deploy,
// then turn OFF the "Verify JWT" toggle for this function only
// (find it in the function's settings after it's deployed).
// Yoco calls this URL directly — it has no Supabase login token,
// so JWT verification must be off or every notification gets rejected.
// ═══════════════════════════════════════════════════════════
//
// supabase/functions/yoco-webhook/index.ts
//
// Receives Yoco payment notifications, verifies the checkout status
// directly with Yoco (verify-then-trust), and marks the matching
// `unlocks` row as complete. This is the source of truth that
// listing-detail.html polls after the tenant returns from Yoco.
//
// Secrets needed (same function settings → Secrets):
//   YOCO_SECRET_KEY=sk_test_xxx (or sk_live_xxx when live)
//   SUPABASE_URL=https://xxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=xxx  (service_role, never the anon key)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const YOCO_SECRET_KEY = Deno.env.get("YOCO_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function getPath(obj: unknown, paths: string[][]): string {
  for (const p of paths) {
    let cur: unknown = obj;
    let ok = true;
    for (const k of p) {
      if (cur && typeof cur === "object" && k in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[k];
      } else { ok = false; break; }
    }
    if (ok && (typeof cur === "string" || typeof cur === "number")) {
      const s = String(cur);
      if (s) return s;
    }
  }
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));

    // Yoco payload shapes have varied — accept several.
    const checkoutId = getPath(body, [
      ["id"], ["checkoutId"], ["checkout_id"],
      ["data", "id"], ["object", "id"], ["checkout", "id"],
    ]);
    const unlockId = getPath(body, [
      ["metadata", "unlockId"], ["metadata", "unlock_id"],
      ["unlockId"], ["reference"],
      ["data", "metadata", "unlockId"],
    ]);

    if (!checkoutId && !unlockId) {
      return new Response(JSON.stringify({ error: "No checkout id found in webhook." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify-then-trust: ask Yoco for the authoritative checkout status.
    let paid = false;
    let verifiedAmount: number | null = null;
    if (checkoutId && YOCO_SECRET_KEY) {
      try {
        const verify = await fetch(
          "https://payments.yoco.com/api/checkouts/" + encodeURIComponent(checkoutId),
          { headers: { "Authorization": "Bearer " + YOCO_SECRET_KEY } },
        );
        if (verify.ok) {
          const c = await verify.json();
          const status = String(c.status || c.state || "").toLowerCase();
          if (["successful", "succeeded", "complete", "completed", "paid", "success"].includes(status)) {
            paid = true;
          }
          if (typeof c.amount === "number") verifiedAmount = c.amount;
        }
      } catch (_e) { /* fall through to payload check */ }
    }

    // Fallback: trust the webhook's own status field if verification was unavailable.
    if (!paid) {
      const s = getPath(body, [["status"], ["state"], ["data", "status"]]).toLowerCase();
      if (["successful", "succeeded", "complete", "completed", "paid", "success"].includes(s)) paid = true;
    }

    if (!paid) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Supabase server secrets not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark the unlock as paid. Prefer the metadata unlockId; fall back to payment_ref lookup.
    let targetFilter = "";
    if (unlockId) {
      targetFilter = "id=eq." + encodeURIComponent(unlockId);
    } else {
      targetFilter = "payment_ref=eq." + encodeURIComponent(checkoutId);
    }

    const patch: Record<string, unknown> = { payment_status: "complete" };
    if (checkoutId) patch.payment_ref = checkoutId;
    if (verifiedAmount && verifiedAmount >= 100) patch.amount_paid = verifiedAmount / 100;

    const upd = await fetch(SUPABASE_URL + "/rest/v1/unlocks?" + targetFilter, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(patch),
    });

    if (!upd.ok) {
      const t = await upd.text();
      return new Response(JSON.stringify({ error: "Supabase update failed: " + t }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
