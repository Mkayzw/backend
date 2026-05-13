<script>
  import { onMount } from 'svelte'
  import { Activity, Bell, Link2, RefreshCw, ShieldAlert, UserPlus, UsersRound } from 'lucide-svelte'
  import StatCard from '../components/StatCard.svelte'
  import RiskBadge from '../components/RiskBadge.svelte'
  import {
    alertsApi,
    assignmentsApi,
    auditApi,
    cliniciansApi,
    dashboardApi,
    metricsApi,
    patientsApi,
    usersApi,
  } from '../lib/api.js'
  import { notifications } from '../lib/notifications.js'
  import { toasts } from '../lib/toasts.js'

  const tabs = [
    { key: 'overview', href: '/admin', label: 'Overview' },
    { key: 'users', href: '/admin/users', label: 'Users' },
    { key: 'assignments', href: '/admin/assignments', label: 'Assignments' },
    { key: 'alerts', href: '/admin/alerts', label: 'Alerts' },
    { key: 'audit', href: '/admin/audit', label: 'Audit' },
    { key: 'metrics', href: '/admin/metrics', label: 'Metrics' },
  ]

  let activeTab = 'overview'
  let loading = true
  let error = ''

  let stats = null
  let recent = []
  let users = []
  let patients = []
  let clinicians = []
  let assignments = []
  let alerts = []
  let auditLogs = []
  let metrics = { errors: null, latency: null, risk: null }

  let creatingUser = false
  let creatingAssignment = false
  let userForm = { fullName: '', email: '', password: '', phone: '', role: 'PATIENT' }
  let assignmentForm = { patientId: '', clinicianId: '', careContext: 'GENERAL_REVIEW', reason: '' }

  $: unreadAlerts = alerts.filter((item) => !item.isRead).length
  $: notifications.setUnreadAlerts(unreadAlerts)

  function setTabFromHash() {
    const path = window.location.hash.replace(/^#/, '') || '/admin'
    const match = tabs.find((tab) => path === tab.href)
    activeTab = match?.key || 'overview'
  }

  async function load() {
    loading = true
    error = ''
    try {
      const results = await Promise.allSettled([
        dashboardApi.stats(),
        dashboardApi.recent(),
        usersApi.list(),
        patientsApi.list(),
        cliniciansApi.list(),
        assignmentsApi.list(),
        alertsApi.list({ limit: 100 }),
        auditApi.logs({ limit: 100 }),
        metricsApi.errorRate(7),
        metricsApi.latency(7),
        metricsApi.riskAccuracy(),
      ])
      const pick = (index, fallback) => (results[index].status === 'fulfilled' ? results[index].value : fallback)

      stats = pick(0, null)
      recent = (pick(1, null)?.activities || pick(1, [])) || []
      users = pick(2, [])
      patients = pick(3, [])
      clinicians = pick(4, [])
      assignments = pick(5, [])
      alerts = pick(6, [])
      auditLogs = pick(7, [])
      metrics = { errors: pick(8, null), latency: pick(9, null), risk: pick(10, null) }
    } catch (err) {
      error = err.message || 'Failed to load admin dashboard'
    } finally {
      loading = false
    }
  }

  async function createUser() {
    if (!userForm.fullName.trim() || !userForm.email.trim() || !userForm.password.trim()) {
      toasts.warning('Name, email and password are required')
      return
    }
    creatingUser = true
    try {
      await usersApi.create({
        ...userForm,
        fullname: userForm.fullName,
        phone: userForm.phone || '+10000000000',
        role: String(userForm.role || 'PATIENT').toLowerCase(),
      })
      userForm = { fullName: '', email: '', password: '', phone: '', role: 'PATIENT' }
      toasts.success('User created')
      await load()
    } catch (err) {
      toasts.error(err.message || 'Failed to create user')
    } finally {
      creatingUser = false
    }
  }

  async function createAssignment() {
    if (!assignmentForm.patientId || !assignmentForm.clinicianId) {
      toasts.warning('Patient and clinician are required')
      return
    }
    creatingAssignment = true
    try {
      await assignmentsApi.create({
        ...assignmentForm,
        patientId: Number(assignmentForm.patientId),
        clinicianId: Number(assignmentForm.clinicianId),
        reason: assignmentForm.reason || null,
      })
      assignmentForm = { patientId: '', clinicianId: '', careContext: 'GENERAL_REVIEW', reason: '' }
      toasts.success('Assignment created')
      await load()
    } catch (err) {
      toasts.error(err.message || 'Failed to create assignment')
    } finally {
      creatingAssignment = false
    }
  }

  async function setAssignmentStatus(id, status) {
    try {
      await assignmentsApi.updateStatus(id, status)
      await load()
    } catch (err) {
      toasts.error(err.message || 'Failed to update assignment')
    }
  }

  async function removeAssignment(id) {
    try {
      await assignmentsApi.delete(id)
      await load()
    } catch (err) {
      toasts.error(err.message || 'Failed to remove assignment')
    }
  }

  async function markAlertRead(alertId) {
    try {
      await alertsApi.markRead(alertId)
      await load()
    } catch (err) {
      toasts.error(err.message || 'Failed to mark alert as read')
    }
  }

  onMount(() => {
    setTabFromHash()
    window.addEventListener('hashchange', setTabFromHash)
    load()
    return () => window.removeEventListener('hashchange', setTabFromHash)
  })
</script>

<header class="page-header">
  <div>
    <h1>Admin workspace</h1>
    <p>Manage users, assignments, alerts, and system performance data.</p>
  </div>
  <button class="button secondary" type="button" on:click={load}><RefreshCw size={16} /> Refresh</button>
</header>

<nav class="tabs" aria-label="Admin tabs">
  {#each tabs as tab}
    <a href={`#${tab.href}`} class:active={activeTab === tab.key}>{tab.label}</a>
  {/each}
</nav>

{#if loading}
  <div class="loader"></div>
{:else if error}
  <div class="error">{error}</div>
{:else if activeTab === 'overview'}
  <div class="grid stats">
    <StatCard label="Patients" value={patients.length || stats?.totalPatients || 0} />
    <StatCard label="Clinicians" value={clinicians.length || stats?.totalClinicians || 0} />
    <StatCard label="Assignments" value={assignments.length} />
    <StatCard label="Unread alerts" value={stats?.unreadAlerts ?? unreadAlerts} />
  </div>

  <div class="grid two-col" style="margin-top:16px;">
    <section class="card">
      <h2>Recent activity</h2>
      <div class="list">
        {#each recent.slice(0, 8) as item}
          <div class="row">
            <div class="row-title">
              <strong>{item.action || item.type || 'Activity'}</strong>
              <span>{item.description || item.resourceType || 'System event'}</span>
            </div>
          </div>
        {:else}
          <div class="empty">No recent activity.</div>
        {/each}
      </div>
    </section>

    <section class="card">
      <h2>Current risk alerts</h2>
      <div class="list">
        {#each alerts.filter((item) => item.priority === 'HIGH').slice(0, 8) as alert}
          <div class="row">
            <div class="row-title">
              <strong>{alert.title || alert.message || 'Alert'}</strong>
              <span>{alert.patient?.user?.fullName || alert.patientName || 'Patient'}</span>
            </div>
            <RiskBadge value={alert.priority || 'HIGH'} />
          </div>
        {:else}
          <div class="empty">No HIGH alerts.</div>
        {/each}
      </div>
    </section>
  </div>
{:else if activeTab === 'users'}
  <div class="grid two-col">
    <section class="card">
      <div class="toolbar">
        <h2>Create user</h2>
        <UserPlus size={18} />
      </div>
      <div class="form-grid">
        <div class="field"><label>Full name</label><input bind:value={userForm.fullName} /></div>
        <div class="field"><label>Email</label><input type="email" bind:value={userForm.email} /></div>
        <div class="field"><label>Password</label><input type="password" bind:value={userForm.password} /></div>
        <div class="field"><label>Phone</label><input type="tel" bind:value={userForm.phone} /></div>
        <div class="field">
          <label>Role</label>
          <select bind:value={userForm.role}>
            <option value="PATIENT">PATIENT</option>
            <option value="CLINICIAN">CLINICIAN</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <button class="button primary" type="button" disabled={creatingUser} on:click={createUser}>{creatingUser ? 'Creating...' : 'Create user'}</button>
      </div>
    </section>

    <section class="card">
      <div class="toolbar">
        <h2>User directory</h2>
        <UsersRound size={18} />
      </div>
      <div class="list">
        {#each users as user}
          <div class="row">
            <div class="row-title">
              <strong>{user.fullName || user.email}</strong>
              <span>{user.email}</span>
            </div>
            <span class="badge low">{user.role}</span>
          </div>
        {:else}
          <div class="empty">No users found.</div>
        {/each}
      </div>
    </section>
  </div>
{:else if activeTab === 'assignments'}
  <div class="grid two-col">
    <section class="card">
      <div class="toolbar">
        <h2>Create assignment</h2>
        <Link2 size={18} />
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Patient</label>
          <select bind:value={assignmentForm.patientId}>
            <option value="">Select patient</option>
            {#each patients as patient}
              <option value={patient.id}>{patient.user?.fullName || patient.id}</option>
            {/each}
          </select>
        </div>
        <div class="field">
          <label>Clinician</label>
          <select bind:value={assignmentForm.clinicianId}>
            <option value="">Select clinician</option>
            {#each clinicians as clinician}
              <option value={clinician.id}>{clinician.user?.fullName || clinician.id}</option>
            {/each}
          </select>
        </div>
        <div class="field"><label>Care context</label><input bind:value={assignmentForm.careContext} /></div>
        <div class="field"><label>Reason</label><textarea bind:value={assignmentForm.reason}></textarea></div>
        <button class="button primary" type="button" disabled={creatingAssignment} on:click={createAssignment}>{creatingAssignment ? 'Creating...' : 'Create assignment'}</button>
      </div>
    </section>

    <section class="card">
      <h2>Assignments</h2>
      <div class="list">
        {#each assignments as item}
          <div class="row">
            <div class="row-title">
              <strong>{item.patient?.user?.fullName || 'Patient'} -> {item.clinician?.user?.fullName || 'Clinician'}</strong>
              <span>{item.careContext || 'GENERAL_REVIEW'}</span>
            </div>
            <div class="row-actions">
              <span class="badge low">{item.status}</span>
              <button class="button ghost" type="button" on:click={() => setAssignmentStatus(item.id, 'ACTIVE')}>Activate</button>
              <button class="button ghost" type="button" on:click={() => setAssignmentStatus(item.id, 'INACTIVE')}>Deactivate</button>
              <button class="button ghost" type="button" on:click={() => removeAssignment(item.id)}>Delete</button>
            </div>
          </div>
        {:else}
          <div class="empty">No assignments available.</div>
        {/each}
      </div>
    </section>
  </div>
{:else if activeTab === 'alerts'}
  <section class="card">
    <div class="toolbar">
      <h2>Alerts</h2>
      <Bell size={18} />
    </div>
    <div class="list">
      {#each alerts as alert}
        <div class="row">
          <div class="row-title">
            <strong>{alert.title || alert.message || 'Alert'}</strong>
            <span>{alert.patient?.user?.fullName || alert.patientName || 'Patient'} · {alert.status || 'OPEN'}</span>
          </div>
          <div class="row-actions">
            <RiskBadge value={alert.priority || alert.riskLevel || 'LOW'} />
            <button class="button ghost" type="button" on:click={() => markAlertRead(alert.id)}>Mark read</button>
          </div>
        </div>
      {:else}
        <div class="empty">No alerts available.</div>
      {/each}
    </div>
  </section>
{:else if activeTab === 'audit'}
  <section class="card">
    <div class="toolbar">
      <h2>Audit log</h2>
      <ShieldAlert size={18} />
    </div>
    <div class="list">
      {#each auditLogs as log}
        <div class="row">
          <div class="row-title">
            <strong>{log.action || 'Action'}</strong>
            <span>{log.resourceType || 'Resource'} · {new Date(log.createdAt || log.timestamp || Date.now()).toLocaleString()}</span>
          </div>
        </div>
      {:else}
        <div class="empty">No audit logs available.</div>
      {/each}
    </div>
  </section>
{:else if activeTab === 'metrics'}
  <div class="grid stats">
    <StatCard label="Error rate (%)" value={metrics.errors?.error_rate?.toFixed?.(2) ?? metrics.errors?.error_rate ?? 'N/A'} />
    <StatCard label="Error count" value={metrics.errors?.error_count ?? 'N/A'} />
    <StatCard label="Latency p95 (ms)" value={metrics.latency?.p95?.toFixed?.(1) ?? metrics.latency?.p95 ?? 'N/A'} />
    <StatCard label="Risk accuracy" value={metrics.risk?.accuracy ?? 'N/A'} />
  </div>

  <section class="card" style="margin-top:16px;">
    <div class="toolbar">
      <h2>Latency distribution</h2>
      <Activity size={18} />
    </div>
    <div class="list">
      <div class="row"><strong>Average</strong><span>{metrics.latency?.average ?? 'N/A'} ms</span></div>
      <div class="row"><strong>P50</strong><span>{metrics.latency?.p50 ?? 'N/A'} ms</span></div>
      <div class="row"><strong>P95</strong><span>{metrics.latency?.p95 ?? 'N/A'} ms</span></div>
      <div class="row"><strong>P99</strong><span>{metrics.latency?.p99 ?? 'N/A'} ms</span></div>
    </div>
  </section>
{/if}
