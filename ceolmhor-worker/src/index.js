export default {
  async fetch(request, env, ctx) {
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'https://ceolmhor.scot',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const data = await request.json();

      // Verify Turnstile token
      const turnstileValid = await verifyTurnstile(
        data.turnstileToken,
        request.headers.get('CF-Connecting-IP'),
        env
      );

      if (!turnstileValid) {
        return new Response(
          JSON.stringify({ success: false, error: 'Bot verification failed' }),
          { 
            status: 400, 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'https://ceolmhor.scot',
            } 
          }
        );
      }

      // Validate required fields
      const { firstName, lastName, email, primaryType, message } = data;
      if (!firstName || !lastName || !email || !primaryType || !message) {
        return new Response(
          JSON.stringify({ success: false, error: 'Please fill in all required fields' }),
          { 
            status: 400, 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'https://ceolmhor.scot',
            } 
          }
        );
      }

      // Send notification email to Felix
      await sendNotificationEmail(data, env);

      // Send auto-response to enquirer
      await sendAutoResponse(data, env);

      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://ceolmhor.scot',
          } 
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Something went wrong. Please try again.' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://ceolmhor.scot',
          } 
        }
      );
    }
  }
};

// Verify Cloudflare Turnstile token
async function verifyTurnstile(token, ip, env) {
  if (!token) return false;
  
  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip,
      }),
    }
  );
  
  const result = await response.json();
  return result.success;
}

// Send notification email to Felix
async function sendNotificationEmail(data, env) {
  const subject = `New ${data.primaryType} enquiry — ${data.firstName} ${data.lastName}`;
  
  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="border-bottom: 1px solid #c9a84c; padding-bottom: 1rem; color: #1a1a1a;">
        New Enquiry — Ceòlmhor
      </h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
        <tr>
          <td style="padding: 0.5rem 0; color: #666; width: 140px;">Name</td>
          <td style="padding: 0.5rem 0;">${data.firstName} ${data.lastName}</td>
        </tr>
        <tr>
          <td style="padding: 0.5rem 0; color: #666;">Email</td>
          <td style="padding: 0.5rem 0;">
            <a href="mailto:${data.email}" style="color: #c9a84c;">${data.email}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 0.5rem 0; color: #666;">Enquiry type</td>
          <td style="padding: 0.5rem 0;">${data.primaryType}${data.subType ? ` — ${data.subType}` : ''}</td>
        </tr>
        ${data.eventDate ? `
        <tr>
          <td style="padding: 0.5rem 0; color: #666;">Event date</td>
          <td style="padding: 0.5rem 0;">${data.eventDate}</td>
        </tr>
        ` : ''}
        ${data.isChildEnquiry ? `
        <tr>
          <td style="padding: 0.5rem 0; color: #666;">Child enquiry</td>
          <td style="padding: 0.5rem 0; color: #c9a84c;">Yes — consent form required before first lesson</td>
        </tr>
        ` : ''}
      </table>

      <h3 style="color: #666; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em;">
        Message
      </h3>
      <p style="background: #f9f9f9; padding: 1rem; border-left: 3px solid #c9a84c; line-height: 1.7;">
        ${data.message}
      </p>

      <p style="margin-top: 2rem; color: #999; font-size: 0.85rem;">
        Reply directly to this email to respond to ${data.firstName}.
      </p>
    </div>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Ceòlmhor <contact@ceolmhor.scot>',
      to: env.ADMIN_EMAIL,
      reply_to: data.email,
      subject: subject,
      html: html,
    }),
  });
}

// Send auto-response to enquirer
async function sendAutoResponse(data, env) {
  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="border-bottom: 1px solid #c9a84c; padding-bottom: 1rem; color: #1a1a1a;">
        Ceòlmhor
      </h2>
      
      <p style="line-height: 1.7;">Dear ${data.firstName},</p>
      
      <p style="line-height: 1.7;">
        Thank you for your enquiry. It has been received and you will hear back within 24 hours.
      </p>

      <p style="line-height: 1.7;">
        If your enquiry is urgent, please reply to this email directly.
      </p>

      ${data.isChildEnquiry ? `
      <p style="line-height: 1.7; background: #f9f9f9; padding: 1rem; border-left: 3px solid #c9a84c;">
        As this is a junior tuition enquiry, a parent or guardian consent form will be sent 
        to you before the first lesson is confirmed. This covers data collection, lesson 
        recording policy, and communication channels.
      </p>
      ` : ''}

      <p style="line-height: 1.7; margin-top: 2rem;">
        Ceòlmhor<br/>
        <a href="mailto:contact@ceolmhor.scot" style="color: #c9a84c;">contact@ceolmhor.scot</a><br/>
        Edinburgh, Scotland
      </p>

      <p style="margin-top: 2rem; color: #999; font-size: 0.8rem; border-top: 1px solid #eee; padding-top: 1rem;">
        This is an automated response. Please do not reply to confirm receipt — 
        a personal response will follow within 24 hours.
      </p>
    </div>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Ceòlmhor <contact@ceolmhor.scot>',
      to: data.email,
      subject: 'Your enquiry has been received — Ceòlmhor',
      html: html,
    }),
  });
}
	