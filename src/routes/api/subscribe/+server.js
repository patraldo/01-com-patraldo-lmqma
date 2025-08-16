import { json } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';

export const POST = async ({ request, platform }) => {
  const { email } = await request.json();
  
  if (!email) {
    return json({ 
      error: 'Email is required',
      message: 'Por favor, ingresa un correo electrónico'
    }, { status: 400 });
  }

  const db = platform.env.DB;
  const token = uuidv4(); // Unique confirmation token

  try {
    // Check if email already exists
    const existing = await db.prepare(
      'SELECT * FROM subscribers WHERE email = ?'
    ).bind(email).first();

    // Handle existing subscribers
    if (existing) {
      if (existing.status === 'confirmed') {
        return json({ 
          error: 'Email already confirmed',
          message: 'Este correo ya está confirmado. ¡Gracias por tu interés!'
        }, { status: 400 });
      } else {
        // Update existing pending record with new token
        await db.prepare(
          `UPDATE subscribers 
           SET token = ? 
           WHERE email = ?`
        ).bind(token, email).run();
        
        // Continue to send confirmation email
      }
    }

    // If new subscriber, insert into database
    if (!existing) {
      await db.prepare(
        `INSERT INTO subscribers (email, token, status) 
         VALUES (?, ?, 'pending')`
      ).bind(email, token).run();
    }

    // Send confirmation email
    const confirmationLink = `https://lamusamasaaplauda.com/api/confirm?token=${token}`;
    
    const formData = new URLSearchParams();
    formData.append('from', `La Musa que Más Aplauda <events@lamusamasaaplauda.com>`);
    formData.append('to', email);
    formData.append('subject', 'Confirma tu suscripción a Tray Chic');
    formData.append('html', `
      <h1>¡Gracias por interesarte en Tray Chic!</h1>
      <p>Para confirmar tu suscripción y recibir noticias de la exhibición inaugural, 
         por favor haz clic en el siguiente enlace:</p>
      <p><a href="${confirmationLink}">Confirmar suscripción</a></p>
      <p>Este enlace expira en 24 horas.</p>
      <p>Si no solicitaste esto, ignora este mensaje.</p>
    `);

    const mailRes = await fetch(
      `https://api.mailgun.net/v3/${platform.env.MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa('api:' + platform.env.MAILGUN_API_KEY)}`,
        },
        body: formData
      }
    );

    if (!mailRes.ok) {
      throw new Error('Failed to send confirmation email');
    }

    return json({ 
      success: true,
      message: 'Revisa tu bandeja de entrada para confirmar tu suscripción' 
    });

  } catch (err) {
    return json({ 
      error: 'Failed to process subscription', 
      message: 'Hubo un problema al procesar tu suscripción. Intenta más tarde.'
    }, { status: 500 });
  }
};
