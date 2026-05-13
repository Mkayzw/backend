<script>
  import { replace } from 'svelte-spa-router'
  import { Heart, LogIn } from 'lucide-svelte'
  import { session } from '../lib/session.js'

  const roleRoutes = {
    PATIENT: '/patient',
    CLINICIAN: '/clinician',
    ADMIN: '/admin',
  }

  let email = ''
  let password = ''
  let loading = false
  let error = ''

  async function submit() {
    error = ''
    if (!email.trim() || !password) {
      error = 'Email and password are required'
      return
    }

    loading = true
    try {
      const user = await session.login(email, password)
      replace(roleRoutes[user.role] || '/')
    } catch (err) {
      error = err.message || 'Login failed'
    } finally {
      loading = false
    }
  }
</script>

<main class="auth-page">
  <section class="auth-card">
    <div class="brand">
      <div class="brand-mark"><Heart size={24} /></div>
      <div>
        <h1>MedWatch</h1>
        <p>Remote Patient Monitoring System</p>
      </div>
    </div>

    <form class="form-grid" on:submit|preventDefault={submit}>
      {#if error}
        <div class="error">{error}</div>
      {/if}

      <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" bind:value={email} autocomplete="email" />
      </div>

      <div class="field">
        <label for="password">Password</label>
        <input id="password" type="password" bind:value={password} autocomplete="current-password" />
      </div>

      <button class="button primary" type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
        <LogIn size={17} />
      </button>
    </form>

    <p class="auth-switch">Need an account? <a href="#/signup">Sign up</a></p>
  </section>
</main>
