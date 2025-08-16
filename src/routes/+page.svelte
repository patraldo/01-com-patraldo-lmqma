<script>
let email = '';
let emailTouched = false;
let success = false;
let error = false;
let errorMessage = '';
let loading = false;

// Email validation function
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

const handleSubmit = async (e) => {
  e.preventDefault();
  emailTouched = true;
  
  // Client-side validation
  if (!isValidEmail(email)) {
    return;
  }
  
  loading = true;
  error = false;
  errorMessage = '';
  
  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      success = true;
      email = '';
      emailTouched = false;
    } else {
      error = true;
      errorMessage = data.error || 'Hubo un problema. Intenta de nuevo.';
      
      // Special handling for known errors
      if (data.message?.includes('already confirmed')) {
        errorMessage = 'Este correo ya está confirmado. ¡Gracias por tu interés!';
      } else if (data.message?.includes('pending')) {
        errorMessage = 'Este correo ya está en proceso de confirmación. Revisa tu bandeja de entrada.';
      }
    }
  } catch (err) {
    error = true;
    errorMessage = 'No pudimos conectar con el servidor. Intenta más tarde.';
  } finally {
    loading = false;
  }
};
</script>

<main class="container">
  <header class="header">
    <h1>La Musa que Más Aplauda</h1>
  </header>

  <section class="exhibition">
    <h2>TRAY CHIC</h2>
    <p>Un estreno enmarcado en plástico.</p>
    <p>
      Para nuestra exhibición inaugural, convertimos lo mundano en magnífico: 
      dibujos originales en bandejas plásticas de restaurante — un homenaje al pasado 
      de este espacio como comedor barrio.
    </p>
    <p><em>El arte nunca se vio tan… reciclable.</em></p>
  </section>

<section class="cta">
  {#if success}
    <p class="success">
      ¡Gracias! 
      <strong>Revisa tu bandeja de entrada</strong> 
      para confirmar tu suscripción.
    </p>
  {:else}
    <p>Se el primero en saber cuándo salen las bandejas.</p>
    
    <form method="post" action="/api/subscribe" on:submit={handleSubmit}>
      <input
        type="email"
        name="email"
        bind:value={email}
        placeholder="tu@correo.com"
        required
        autocomplete="email"
        class:invalid={emailTouched && !isValidEmail(email)}
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Enviando...' : 'Notifícame'}
      </button>
    </form>
    
    {#if error}
      <p class="error">
        {errorMessage || 'Hubo un problema. Intenta de nuevo.'}
      </p>
    {/if}
    
    {#if emailTouched && !isValidEmail(email)}
      <p class="error">Por favor, ingresa un correo electrónico válido.</p>
    {/if}
  {/if}
</section>

  <footer class="footer">
    <p>En Santa Teresita, Guadalajara</p>
  </footer>
</main>

<style>
  :root {
    --color-bg: #fff;
    --color-text: #222;
    --color-accent: #e91e63; /* Hot pink */
    --color-highlight: #ffeb3b; /* Sunny yellow */
    --color-button: #4caf50; /* Green */
    --font-heading: system-ui, -apple-system, sans-serif;
    --font-body: 'Segoe UI', sans-serif;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --color-bg: #111;
      --color-text: #eee;
    }
  }

  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem 1rem;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    font-family: var(--font-body);
    color: var(--color-text);
    background: var(--color-bg);
    text-align: center;
  }

  .header h1 {
    font-size: 2.5rem;
    margin: 0;
    font-weight: 700;
    background: linear-gradient(45deg, var(--color-accent), #2196f3);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .exhibition {
    margin: 2rem 0;
  }

  .exhibition h2 {
    font-size: 3rem;
    margin: 0;
    color: var(--color-accent);
    text-shadow: 2px 2px 0 var(--color-highlight);
    font-weight: 800;
    letter-spacing: -1px;
  }

  .exhibition p {
    font-size: 1.1rem;
    line-height: 1.6;
    margin: 1rem 0;
  }

  .cta {
    margin: 2rem 0;
  }

  .cta p {
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  .success, .error {
    padding: 1rem;
    border-radius: 6px;
    margin: 1rem 0;
  }

  .success {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .error {
    background: #ffebee;
    color: #c62828;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 400px;
    margin: 0 auto;
  }

  input[type="email"] {
    padding: 0.75rem;
    border: 2px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
    outline: none;
    transition: border 0.3s;
  }

  input[type="email"]:focus {
    border-color: var(--color-accent);
  }

  button {
    padding: 0.75rem;
    background: var(--color-button);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.3s;
  }

  button:hover {
    background: #388e3c;
  }

  .footer {
    margin-top: auto;
    padding: 1.5rem 0 0;
    font-size: 0.9rem;
    color: #666;
  }

  @media (max-width: 480px) {
    .header h1 {
      font-size: 2rem;
    }
    .exhibition h2 {
      font-size: 2.5rem;
    }
  }

input:invalid {
  border-color: #f44336;
  box-shadow: 0 0 0 2px rgba(244, 67, 54, 0.2);
}

.error {
  color: #f44336;
  font-size: 0.9rem;
  margin-top: 0.5rem;
  text-align: left;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
