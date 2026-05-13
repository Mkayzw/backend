<script>
  import Router from 'svelte-spa-router'
  import { replace } from 'svelte-spa-router'
  import { wrap } from 'svelte-spa-router/wrap'
  import { onMount } from 'svelte'
  import { session } from './lib/session.js'
  import LoginPage from './pages/LoginPage.svelte'
  import SignupPage from './pages/SignupPage.svelte'
  import PatientDashboard from './pages/PatientDashboard.svelte'
  import ClinicianDashboard from './pages/ClinicianDashboard.svelte'
  import AdminDashboard from './pages/AdminDashboard.svelte'
  import GuardedPage from './components/GuardedPage.svelte'
  import ToastContainer from './components/ToastContainer.svelte'
  import { notifications } from './lib/notifications.js'

  const roleRoutes = {
    PATIENT: '/patient',
    CLINICIAN: '/clinician',
    ADMIN: '/admin',
  }

  function redirectHome() {
    if ($session.loading) return
    replace($session.user ? roleRoutes[$session.user.role] || '/login' : '/login')
  }

  function guarded(component, roles) {
    return wrap({
      component: GuardedPage,
      props: { component, roles },
    })
  }

  const routes = {
    '/': redirectHome,
    '/login': LoginPage,
    '/signup': SignupPage,
    '/patient': guarded(PatientDashboard, ['PATIENT']),
    '/patient/*': guarded(PatientDashboard, ['PATIENT']),
    '/clinician': guarded(ClinicianDashboard, ['CLINICIAN']),
    '/clinician/*': guarded(ClinicianDashboard, ['CLINICIAN']),
    '/admin': guarded(AdminDashboard, ['ADMIN']),
    '/admin/*': guarded(AdminDashboard, ['ADMIN']),
    '*': redirectHome,
  }

  onMount(() => {
    session.restore()
    const token = localStorage.getItem('rpm_token')
    notifications.start(token)
    notifications.refresh()
    return () => notifications.stop()
  })
</script>

{#if $session.loading}
  <main class="screen-center">
    <div class="loader"></div>
  </main>
{:else}
  <Router {routes} />
{/if}

<ToastContainer />
