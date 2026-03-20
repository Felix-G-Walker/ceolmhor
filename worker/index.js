/**
 * Ceòlmhor Contact Form Worker
 * Receives form submissions, stores in D1, sends notification via Resend.
 *
 * Required bindings (set in wrangler.toml + wrangler secret):
 *   DB              — D1 database binding
 *   RESEND_API_KEY  — Resend API key (set via: npx wrangler secret put RESEND_API_KEY)
 *   FROM_EMAIL      — sending address (contact@ceolmhor.scot)
 *   TO_EMAIL        — notification recipient (contact@ceolmhor.scot)
 */

const ALLOWED_ORIGIN = 'https://www.ceolmhor.scot';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {

    /* ── CORS preflight ─────────────────────────────────────────────── */
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    /* ── Only accept POST to /api/contact ───────────────────────────── */
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/api/contact') {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    /* ── Parse form data ────────────────────────────────────────────── */
    let data;
    try {
      const contentType = request.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        data = await request.json();
      } else {
        const formData = await request.formData();
        data = Object.fromEntries(formData.entries());
      }
    } catch (err) {
      return jsonError(400, 'Invalid request body');
    }

    /* ── Validate required fields ───────────────────────────────────── */
    const { 'first-name': firstName, 'last-name': lastName, email } = data;
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return jsonError(400, 'Missing required fields: first-name, last-name, email');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError(400, 'Invalid email address');
    }

    /* ── Honeypot spam check ────────────────────────────────────────── */
    if (data['_honeypot']) {
      return jsonSuccess('ok');
    }

    const ip = request.headers.get('CF-Connecting-IP') || '';
    const userAgent = request.headers.get('User-Agent') || '';

    /* ── Store in D1 ────────────────────────────────────────────────── */
    try {
      await env.DB.prepare(`
        INSERT INTO enquiries
          (first_name, last_name, email, enquiry_primary, enquiry_type,
           enquiry_tier, enquiry_delivery, enquiry_comp_type, enquiry_comp_format,
           event_day, event_month, event_year, child_enquiry, phone, message, user_agent, ip)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        firstName.trim(),
        lastName.trim(),
        email.trim(),
        data['enquiry-primary'] || '',
        data['enquiry-type'] || '',
        data['enquiry-tier'] || '',
        data['enquiry-delivery'] || '',
        data['enquiry-comp-type'] || '',
        data['enquiry-comp-format'] || '',
        data['event-day'] || '',
        data['event-month'] || '',
        data['event-year'] || '',
        data['child-enquiry'] || 'no',
        data['phone-cleaned'] || data['phone'] || '',
        data['message'] || '',
        userAgent,
        ip
      ).run();
    } catch (err) {
      console.error('D1 insert error:', err);
      return jsonError(500, 'Failed to store enquiry');
    }

    /* ── Build email content ────────────────────────────────────────── */
    const primary      = data['enquiry-primary'] || '';
    const enquiryType  = formatEnquiryType(primary, data['enquiry-type'], data['enquiry-comp-type']);
    const eventDate    = formatEventDate(data['event-day'], data['event-month'], data['event-year']);
    const tier         = formatTier(data['enquiry-tier']);
    const delivery     = formatDelivery(data['enquiry-delivery']);
    const compFormat   = formatCompFormat(data['enquiry-comp-format']);
    const childNote    = data['child-enquiry'] === 'yes' ? '\n⚠️  Enquiry on behalf of a child.' : '';

    const tierLine     = tier     ? `\nTier:     ${tier}`     : '';
    const deliveryLine = delivery ? `\nDelivery: ${delivery}` : '';
    const formatLine   = compFormat ? `\nFormat:   ${compFormat}` : '';

    const emailText = `
New Ceòlmhor Enquiry
${'─'.repeat(40)}

Name:     ${firstName.trim()} ${lastName.trim()}
Email:    ${email.trim()}${data['phone']?.trim() ? `\nPhone:    ${data['phone'].trim()}` : ''}
Type:     ${enquiryType}${tierLine}${deliveryLine}${formatLine}${eventDate ? `\nDate:     ${eventDate}` : ''}${childNote}

Message:
${data['message']?.trim() || '(none provided)'}

${'─'.repeat(40)}
Submitted: ${new Date().toUTCString()}
IP: ${ip}
    `.trim();

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>
  body { font-family: Georgia, serif; background: #f9f9f7; margin: 0; padding: 2rem; }
  .card { background: #fff; max-width: 560px; margin: 0 auto; padding: 2rem 2.5rem; border: 1px solid #e0ddd6; }
  h1 { font-size: 1.2rem; color: #1a1a1a; margin: 0 0 1.5rem; letter-spacing: 0.02em; }
  .field { margin-bottom: 0.75rem; }
  .label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #888; display: block; margin-bottom: 0.15rem; }
  .value { font-size: 0.95rem; color: #1a1a1a; }
  .message-box { background: #f5f4f0; padding: 1rem 1.25rem; margin-top: 1.5rem; border-left: 3px solid #c9a84c; }
  .message-box .label { margin-bottom: 0.5rem; }
  .message-box .value { white-space: pre-wrap; line-height: 1.6; }
  .child-note { background: #fff8e6; border: 1px solid #f0d080; padding: 0.6rem 1rem; margin-top: 1rem; font-size: 0.9rem; color: #7a5c00; }
  .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e0ddd6; font-size: 0.8rem; color: #aaa; }
  hr { border: none; border-top: 1px solid #e0ddd6; margin: 1.5rem 0; }
</style></head>
<body>
<div class="card">
  <h1>New Ceòlmhor Enquiry</h1>
  <div class="field"><span class="label">Name</span><span class="value">${escHtml(firstName.trim())} ${escHtml(lastName.trim())}</span></div>
  <div class="field"><span class="label">Email</span><span class="value"><a href="mailto:${escHtml(email.trim())}">${escHtml(email.trim())}</a></span></div>
  ${data['phone']?.trim() ? `<div class="field"><span class="label">Phone</span><span class="value"><a href="tel:${escHtml((data['phone-cleaned'] || data['phone']).trim())}">${escHtml(data['phone'].trim())}</a></span></div>` : ''}
  <div class="field"><span class="label">Enquiry Type</span><span class="value">${escHtml(enquiryType)}</span></div>
  ${tier     ? `<div class="field"><span class="label">Tier</span><span class="value">${escHtml(tier)}</span></div>` : ''}
  ${delivery ? `<div class="field"><span class="label">Delivery</span><span class="value">${escHtml(delivery)}</span></div>` : ''}
  ${compFormat ? `<div class="field"><span class="label">Format</span><span class="value">${escHtml(compFormat)}</span></div>` : ''}
  ${eventDate  ? `<div class="field"><span class="label">Event Date</span><span class="value">${escHtml(eventDate)}</span></div>` : ''}
  ${data['child-enquiry'] === 'yes' ? '<div class="child-note">⚠️ This enquiry is on behalf of a child.</div>' : ''}
  <hr>
  <div class="message-box">
    <span class="label">Message</span>
    <span class="value">${escHtml(data['message']?.trim() || '(none provided)')}</span>
  </div>
  <div class="footer">Submitted ${new Date().toUTCString()}</div>
</div>
</body>
</html>
    `.trim();

    /* ── Send via Resend ────────────────────────────────────────────── */
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'contact@ceolmhor.scot',
          to: ['contact@ceolmhor.scot'],
          reply_to: email.trim(),
          subject: `New Enquiry — ${firstName.trim()} ${lastName.trim()}`,
          text: emailText,
          html: emailHtml,
        }),
      });
      if (!resendRes.ok) {
        console.error('Resend error:', resendRes.status, await resendRes.text());
      }
    } catch (err) {
      console.error('Resend fetch error:', err);
      /* D1 record exists, user gets success response */
    }

    return jsonSuccess('Enquiry received');
  },
};

/* ── Helpers ────────────────────────────────────────────────────────── */

function jsonSuccess(message) {
  return new Response(JSON.stringify({ ok: true, message }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatEnquiryType(primary, sub, compType) {
  if (!primary) return 'General';
  if (primary === 'composition') {
    const compLabels = {
      private: 'Private Commission',
      media: 'Media & Commercial Commission',
      institutional: 'Heritage & Institutional Commission',
    };
    return compLabels[compType] || 'Composition';
  }
  const labels = {
    tuition: { trial: 'Trial Lesson', regular: 'Regular Tuition' },
    performance: {
      wedding: 'Wedding & Civil Ceremony',
      funeral: 'Funeral & Memorial',
      burns: 'Burns Supper & Traditional Gathering',
      corporate: 'Corporate & Business Dinner',
      festival: 'Ceilidh & Cultural Event',
      graduation: 'Graduation & Civic Ceremony',
      custom: 'Custom Engagement',
    },
    other: { other: 'Other' },
  };
  const subLabel = labels[primary]?.[sub];
  if (subLabel) return subLabel;
  if (primary === 'tuition') return 'Tuition';
  if (primary === 'performance') return 'Performance';
  return 'Other';
}

function formatTier(tier) {
  const labels = {
    beginner: 'Tier 1 — Beginner',
    intermediate: 'Tier 2 — Intermediate',
    advanced: 'Tier 3 — Advanced',
    piobaireachd: 'Tier 4 — Pìobaireachd',
  };
  return labels[tier] || '';
}

function formatDelivery(delivery) {
  if (delivery === 'in-person') return 'In-Person (Edinburgh)';
  if (delivery === 'online') return 'Online';
  return '';
}

function formatCompFormat(format) {
  if (format === 'solo') return 'Solo Pipe';
  if (format === 'band') return 'Pipe Band';
  return '';
}

function formatEventDate(day, month, year) {
  if (!day || !month || !year) return null;
  if (day.length < 2) day = day.padStart(2, '0');
  if (month.length < 2) month = month.padStart(2, '0');
  return `${day}/${month}/${year}`;
}
