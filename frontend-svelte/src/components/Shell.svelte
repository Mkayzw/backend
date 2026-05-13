<script>
  import { Bell, Heart, LogOut } from 'lucide-svelte'
  import { onMount } from 'svelte'
  import { session } from '../lib/session.js'
  import { navItems } from '../lib/navigation.js'
  import { notifications } from '../lib/notifications.js'

  $: items = navItems[$session.user?.role] || []
  $: initial = $session.user?.fullName?.[0] || $session.user?.email?.[0] || '?'
  let currentPath = '/'
  let showNotifications = false

  function updatePath() {
    currentPath = window.location.hash.replace('#', '') || '/'
  }

  onMount(() => {
    updatePath()
    window.addEventListener('hashchange', updatePath)
    return () => window.removeEventListener('hashchange', updatePath)
  })
</script>

<div class="app-shell">
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark"><Heart size={23} /></div>
      <div>
        <h1>MedWatch</h1>
        <p>Patient Monitoring</p>
      </div>
    </div>

    <nav class="nav" aria-label="Main navigation">
      {#each items as item}
        <a href={`#${item.href}`} class:active={currentPath === item.href || currentPath.startsWith(`${item.href}/`)}>
          <svelte:component this={item.icon} size={18} />
          <span>{item.label}</span>
        </a>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <div class="notif-wrap">
        <button class="button ghost notif-btn" type="button" on:click={() => (showNotifications = !showNotifications)}>
          <Bell size={17} />
          Notifications
          {#if $notifications.unreadCount > 0}
            <span class="pill">{$notifications.unreadCount}</span>
          {/if}
        </button>
        {#if showNotifications}
          <div class="notif-popover">
            <div class="notif-head">
              <strong>Notifications</strong>
              <button type="button" class="button ghost" on:click={() => notifications.markAllRead()}>Mark all read</button>
            </div>
            <div class="notif-list">
              {#each $notifications.items.slice(0, 8) as item}
                <button
                  type="button"
                  class={`notif-item ${item.isRead ? '' : 'new'}`}
                  on:click={() => notifications.markRead(item.id)}
                >
                  <strong>{item.title || item.type || 'Update'}</strong>
                  <span>{item.message || item.description || 'Notification'}</span>
                </button>
              {:else}
                <div class="empty">No notifications.</div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      <div class="user-chip">
        <div class="avatar">{initial}</div>
        <div>
          <strong>{$session.user?.fullName || 'User'}</strong>
          <span>{$session.user?.role}</span>
        </div>
      </div>
      <button class="button ghost" type="button" on:click={() => session.logout()}>
        <LogOut size={17} />
        Sign out
      </button>
    </div>
  </aside>

  <main class="main">
    <slot />
  </main>
</div>
