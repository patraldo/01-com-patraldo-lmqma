import { json } from '@sveltejs/kit';

export const GET = async ({ url, platform }) => {
  const token = url.searchParams.get('token');
  
  if (!token) {
    return new Response(
      'Token missing. Please check your confirmation link.',
      { status: 400 }
    );
  }

  const db = platform.env.DB;
  
  try {
    // Verify token and get email
    const subscriber = await db.prepare(
      'SELECT email FROM subscribers WHERE token = ? AND status = "pending"'
    ).bind(token).first();

    if (!subscriber) {
      return new Response(
        'Invalid or expired token. Please request a new confirmation email.',
        { status: 400 }
      );
    }

    // Confirm subscription
    await db.prepare(
      `UPDATE subscribers 
       SET status = 'confirmed', confirmed_at = datetime('now') 
       WHERE token = ?`
    ).bind(token).run();

    // Optional: Send welcome email
    // ...

    // Return HTML response for browser
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Suscripción Confirmada</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; text-align: center; }
            h1 { color: #4caf50; }
            p { line-height: 1.5; }
            a { color: #2196f3; }
          </style>
        </head>
        <body>
          <h1>¡Confirmado!</h1>
          <p>Gracias por confirmar tu suscripción a <strong>Tray Chic</strong>.</p>
          <p>Recibirás noticias cuando la exhibición esté lista.</p>
          <p><a href="/">Volver al sitio</a></p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
      status: 200
    });

  } catch (err) {
    return new Response('Internal server error', { status: 500 });
  }
};
