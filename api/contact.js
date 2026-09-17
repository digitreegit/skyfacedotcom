const TO = process.env.CONTACT_TO || "contact@skyface.com";
const FROM = process.env.CONTACT_FROM || "Skyface <contact@skyface.com>";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const siteKey = process.env.TURNSTILE_SITE_KEY || "";
  if (!siteKey) return json(503, { error: "Turnstile is not configured." });
  return json(200, { siteKey });
}

export async function POST(request) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (!secret || !resendKey) {
    console.error("Contact form missing TURNSTILE_SECRET_KEY or RESEND_API_KEY");
    return json(503, { error: "The form is not configured yet." });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Invalid request." });
  }

  const company = String(payload.company || "").trim();
  if (company) return json(200, { ok: true });

  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim();
  const message = String(payload.message || "").trim();
  const token = String(payload.token || "").trim();

  if (name.length < 2 || name.length > 120) {
    return json(400, { error: "Please enter your name." });
  }
  if (!EMAIL.test(email) || email.length > 200) {
    return json(400, { error: "Please enter a valid email." });
  }
  if (message.length < 2 || message.length > 4000) {
    return json(400, { error: "Please enter a message." });
  }
  if (!token) {
    return json(400, { error: "Please complete the spam check." });
  }

  const verifyBody = new URLSearchParams({
    secret,
    response: token,
  });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) verifyBody.set("remoteip", ip);

  const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyBody,
  });
  const verifyData = await verifyRes.json().catch(() => ({}));
  if (!verifyData.success) {
    console.error("Turnstile rejected", verifyData["error-codes"]);
    return json(400, { error: "Spam check failed. Please try again." });
  }

  const html = `
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>
  `;

  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `contact/${crypto.randomUUID()}`,
    },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      reply_to: email,
      subject: `Skyface inquiry from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html,
    }),
  });

  if (!sendRes.ok) {
    const err = await sendRes.text();
    console.error("Resend failed", sendRes.status, err.slice(0, 300));
    return json(502, { error: "Could not send the message. Please try again." });
  }

  return json(200, { ok: true });
}
