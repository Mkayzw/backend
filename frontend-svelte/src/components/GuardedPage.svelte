<script>
  import { replace } from 'svelte-spa-router'
  import { session } from '../lib/session.js'
  import Shell from './Shell.svelte'

  export let component
  export let roles = []

  $: allowed = $session.user && roles.includes($session.user.role)
  $: if (!$session.loading && !$session.user) replace('/login')
  $: if (!$session.loading && $session.user && !allowed) replace('/')
</script>

{#if allowed}
  <Shell>
    <svelte:component this={component} />
  </Shell>
{/if}
