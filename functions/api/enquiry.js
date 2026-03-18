export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const data = await request.json();
    console.log('Step 1 - Data received:', JSON.stringify(data));

    // Validate required fields
    const { firstName, lastName, email, primaryType, message } = data;
    if (!firstName || !lastName || !email || !primaryType || !message) {
      console.log('Step 2 - Validation failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Please fill in all required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    console.log('Step 2 - Validation passed');

    // Send notification email
    console.log('Step 3 - Sending notification email to:', env.ADMIN_EMAIL);
    const notifResult = await sendNotificationEmail(data, env);
    console.log('Step 3 - Notification result:', JSON.stringify(notifResult));

    // Send auto-response
    console.log('Step 4 - Sending auto-response to:', data.email);
    const autoResult = await sendAutoResponse(data, env);
    console.log('Step 4 - Auto-response result:', JSON.stringify(autoResult));

    console.log('Step 5 - Success');
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.log('ERROR:', error.message, error.stack);
    return new Response(
      JSON.stringify({ success: false, error: 'Something went wrong. Please try again.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

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
          <td style="padding: 0.5rem 0;">${data.email}</td>
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
      </table>
      <p style="background: #f9f9f9; padding: 1rem; border-left: 3px solid #c9a84c; line-height: 1.7;">
        ${data.message}
      </p>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
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

  const result = await response.json();
  return result;
}

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
      <p style="line-height: 1.7; margin-top: 2rem;">
        Ceòlmhor<br/>
        contact@ceolmhor.scot<br/>
        Edinburgh, Scotland
      </p>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
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

  const result = await response.json();
  return result;
}
