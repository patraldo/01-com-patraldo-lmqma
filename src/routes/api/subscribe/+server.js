export async function POST({ request, platform }) {
  try {
    const { email } = await request.json();
    
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ message: 'Valid email is required' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if already subscribed
    const existingSubscriber = await platform.env.DB.prepare(`
      SELECT * FROM subscribers 
      WHERE email = ?
    `).bind(email).first();
    
    if (existingSubscriber && existingSubscriber.status === 'confirmed') {
      return new Response(
        JSON.stringify({ message: 'Ya está registrado, gracias!' }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Generate token and expiration
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Check if subscriber exists and update accordingly
    let result;
    if (existingSubscriber) {
      // Update existing subscriber
      result = await platform.env.DB.prepare(`
        UPDATE subscribers 
        SET token = ?, token_expires_at = ?, status = 'pending'
        WHERE email = ?
      `).bind(token, expiresAt.toISOString(), email).run();
    } else {
      // Insert new subscriber
      result = await platform.env.DB.prepare(`
        INSERT INTO subscribers (email, token, token_expires_at, status, created_at)
        VALUES (?, ?, ?, 'pending', datetime('now'))
      `).bind(email, token, expiresAt.toISOString()).run();
    }
    
    console.log('Subscriber added/updated in database:', result);
    
    // Try to send verification email, but don't fail if it doesn't work
    try {
      await sendVerificationEmail(email, platform.env, token, expiresAt);
      console.log('Verification email sent successfully');
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Log the error but don't fail the subscription
    }
    
    return new Response(
      JSON.stringify({ message: 'Por favor revise su correo electrónico para confirmar su suscripción.' }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Subscription error:', error);
    
    return new Response(
      JSON.stringify({ message: 'No se pudo enviar el correo de verificación. Inténtalo de nuevo.' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sendVerificationEmail(email, env, token, expiresAt) {
  const verificationUrl = `https://lamusa.patraldo.com/api/confirm?token=${token}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Confirmar suscripción</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { border: 1px solid #ddd; border-radius: 5px; padding: 20px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
        .footer { margin-top: 30px; font-size: 12px; color: #888; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Confirmar su suscripción</h2>
        <p>Gracias por registrarse con La Musa que Más Aplauda. Haga clic para confirmar su correo electrónico.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" class="button">Confirmar correo electrónico</a>
        </p>
        <p>Si el botón no funciona, puede copiar y pegar el siguiente enlace en su navegador:</p>
        <p>${verificationUrl}</p>
        <p>Este enlace caducará en 24 horas.</p>
        <div class="footer">
          <p>© 2025 La Musa que Más Aplauda. Todos los derechos reservados.</p>
          <p>Si no se suscribió a estas actualizaciones, puede ignorar este correo electrónico.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  await sendEmail(email, 'Confirme su suscripción a La Musa que Más Aplauda', htmlContent, env);
}

async function sendEmail(to, subject, htmlContent, env) {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second between retries
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`https://api.mailgun.net/v3/${env.MAILGUN_DOMAIN}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          from: `lamusa@patraldo.com`,
          to: to,
          subject: subject,
          html: htmlContent
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Mailgun API error: ${error}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Email sending attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error('All email sending attempts failed');
        throw new Error(`Failed to send email after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}
