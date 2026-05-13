<script>
  import { replace } from 'svelte-spa-router'
  import { Heart, UserPlus } from 'lucide-svelte'
  import { session } from '../lib/session.js'

  let form = {
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'PATIENT',
    specialization: '',
  }
  let loading = false
  let error = ''

  async function submit() {
    error = ''
    if (!form.fullName.trim() || !form.email.trim() || !form.password || !form.phone.trim()) {
      error = 'Name, email, phone and password are required'
      return
    }

    loading = true
    try {
      const user = await session.signup(form)
      const route = user.role === 'CLINICIAN' ? '/clinician' : user.role === 'ADMIN' ? '/admin' : '/patient'
      replace(route)
    } catch (err) {
      error = err.message || 'Signup failed'
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
        <h1>Create account</h1>
        <p>Join the monitoring workspace</p>
      </div>
    </div>

    <form class="form-grid" on:submit|preventDefault={submit}>
      {#if error}
        <div class="error">{error}</div>
      {/if}

      <div class="field">
        <label for="fullName">Full name</label>
        <input id="fullName" bind:value={form.fullName} autocomplete="name" />
      </div>

      <div class="field">
        <label for="signupEmail">Email</label>
        <input id="signupEmail" type="email" bind:value={form.email} autocomplete="email" />
      </div>

      <div class="field">
        <label for="signupPassword">Password</label>
        <input id="signupPassword" type="password" bind:value={form.password} autocomplete="new-password" />
      </div>

      <div class="field">
        <label for="signupPhone">Phone</label>
        <input id="signupPhone" type="tel" bind:value={form.phone} autocomplete="tel" />
      </div>

      <div class="field">
        <label for="role">Role</label>
        <select id="role" bind:value={form.role}>
          <option value="PATIENT">Patient</option>
          <option value="CLINICIAN">Clinician</option>
        </select>
      </div>

      {#if form.role === 'CLINICIAN'}
        <div class="field">
          <label for="specialization">Specialization (optional)</label>
          <input id="specialization" bind:value={form.specialization} />
        </div>
      {/if}

      <button class="button primary" type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Create account'}
        <UserPlus size={17} />
      </button>
    </form>

    <p class="auth-switch">Already registered? <a href="#/login">Sign in</a></p>
  </section>
</main>
