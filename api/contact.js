const TO = process.env.CONTACT_TO || "contact@skyface.com";
const SITE = process.env.SITE_URL || "https://skyface.com";
const LOGO = `${SITE}/img/email/skyface-logo.png`;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fromHeader() {
  const raw = process.env.CONTACT_FROM || "Skyface <contact@skyface.com>";
  const bracket = raw.match(/<([^>]+)>/);
  const address = (bracket ? bracket[1] : raw).trim();
  return `Skyface <${address.includes("@") ? address : "contact@skyface.com"}>`;
}

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

function layout({ title, preview, heading, intro, body, buttonLabel, buttonHref }) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;">
  <div lang="en" dir="ltr">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(preview)}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f6f8;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:100%;max-width:560px;">
            <tr>
              <td style="padding:0 8px 24px;">
                <a href="${SITE}" style="text-decoration:none;">
                  <img src="${LOGO}" width="150" alt="Skyface" style="display:block;width:150px;height:auto;border:0;" />
                </a>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border-radius:16px;padding:32px 28px;">
                <h1 style="margin:0 0 12px;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;letter-spacing:-0.03em;color:#111111;font-weight:600;">
                  ${escapeHtml(heading)}
                </h1>
                <p style="margin:0 0 24px;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#5b6570;">
                  ${escapeHtml(intro)}
                </p>
                ${body}
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
                  <tr>
                    <td style="border-radius:999px;background:#111111;">
                      <a href="${buttonHref}" style="display:inline-block;padding:12px 22px;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                        ${escapeHtml(buttonLabel)}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 8px 0;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#8b949e;">
                Skyface, LLC · ${year}<br />
                <a href="${SITE}" style="color:#8b949e;">skyface.com</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

function field(label, valueHtml) {
  return `
    <tr>
      <td style="padding:0 0 16px;">
        <p style="margin:0 0 4px;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#8b949e;">${label}</p>
        <p style="margin:0;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#111111;">${valueHtml}</p>
      </td>
    </tr>`;
}

function inquiryHtml({ name, email, message }) {
  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      ${field("Name", escapeHtml(name))}
      ${field("Email", `<a href="mailto:${escapeHtml(email)}" style="color:#111111;text-decoration:underline;">${escapeHtml(email)}</a>`)}
      ${field("Message", escapeHtml(message).replace(/\n/g, "<br />"))}
    </table>`;
  return layout({
    title: `Inquiry from ${name}`,
    preview: `${name} wrote from the skyface.com contact form.`,
    heading: "New inquiry",
    intro: "A message from the skyface.com contact form.",
    body,
    buttonLabel: "Reply",
    buttonHref: `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("Re: Skyface inquiry")}`,
  });
}

function confirmHtml({ name, email, message }) {
  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      ${field("Sent as", escapeHtml(email))}
      ${field("Your message", escapeHtml(message).replace(/\n/g, "<br />"))}
    </table>`;
  return layout({
    title: "We received your message",
    preview: "Thanks – we’ll get back to you soon.",
    heading: "Thanks, we got your message.",
    intro: `Hi ${name}. We’ll reply to this email as soon as we can.`,
    body,
    buttonLabel: "Visit Skyface",
    buttonHref: SITE,
  });
}

async function sendEmail(resendKey, payload, idempotencyKey) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Resend failed", res.status, err.slice(0, 300));
    return false;
  }
  return true;
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
  if (message.length < 10 || message.length > 4000) {
    return json(400, { error: "Please enter at least 10 characters in your message." });
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

  const id = crypto.randomUUID();
  const text = `Name: ${name}\nEmail: ${email}\n\n${message}`;

  const inquiryOk = await sendEmail(
    resendKey,
    {
      from: fromHeader(),
      to: [TO],
      reply_to: email,
      subject: `Skyface inquiry from ${name}`,
      text,
      html: inquiryHtml({ name, email, message }),
    },
    `contact-inquiry/${id}`
  );

  if (!inquiryOk) {
    return json(502, { error: "Could not send the message. Please try again." });
  }

  const confirmOk = await sendEmail(
    resendKey,
    {
      from: fromHeader(),
      to: [email],
      reply_to: TO,
      subject: "We received your message – Skyface",
      text: `Hi ${name},\n\nThanks for writing to Skyface. We’ll reply to ${email} as soon as we can.\n\nYour message:\n${message}\n\n${SITE}`,
      html: confirmHtml({ name, email, message }),
    },
    `contact-confirm/${id}`
  );

  if (!confirmOk) {
    console.error("Confirmation email failed after inquiry was sent");
  }

  return json(200, { ok: true });
}
