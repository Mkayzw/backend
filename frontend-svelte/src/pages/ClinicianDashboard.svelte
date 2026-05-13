<script>
  import { onMount } from 'svelte'
  import { Bell, ClipboardList, RefreshCw, Send, UserRoundCheck, Users } from 'lucide-svelte'
  import StatCard from '../components/StatCard.svelte'
  import RiskBadge from '../components/RiskBadge.svelte'
  import {
    alertsApi,
    dashboardApi,
    followupAppointmentsApi,
    followupResponsesApi,
    tasksApi,
  } from '../lib/api.js'
  import { notifications } from '../lib/notifications.js'
  import { toasts } from '../lib/toasts.js'

  const tabs = [
    { key: 'patients', href: '/clinician', label: 'Patients' },
    { key: 'alerts', href: '/clinician/alerts', label: 'Alerts' },
    { key: 'tasks', href: '/clinician/tasks', label: 'Tasks' },
    { key: 'followups', href: '/clinician/followups', label: 'Follow-ups' },
    { key: 'trends', href: '/clinician/trends', label: 'Trends' },
  ]

  let activeTab = 'patients'
  let loading = true
  let error = ''
  let stats = null
  let patients = []
  let alerts = []
  let tasks = []
  let appointments = []

  let triaging = ''
  let responseAlertId = ''
  let responseText = ''
  let actionRequired = false
  let scheduleAlertId = ''
  let scheduleAt = ''
  let scheduleReason = ''

  $: highRisk = alerts.filter((item) => item.priority === 'HIGH' || item.riskLevel === 'HIGH')
  $: openTasks = tasks.filter((item) => item.status !== 'COMPLETED')
  $: unreadAlerts = alerts.filter((item) => !item.isRead).length
  $: notifications.setUnreadAlerts(unreadAlerts)

  function setTabFromHash() {
    const path = window.location.hash.replace(/^#/, '') || '/clinician'
    const match = tabs.find((tab) => path === tab.href)
    activeTab = match?.key || 'patients'
  }

  async function load() {
    loading = true
    error = ''
    try {
      const [statsData, patientData, alertData, taskData, appointmentsData] = await Promise.allSettled([
        dashboardApi.stats(),
        dashboardApi.prioritizedPatients(),
        alertsApi.list({ limit: 50 }),
        tasksApi.list(),
        followupAppointmentsApi.list(),
      ])
      stats = statsData.status === 'fulfilled' ? statsData.value : null
      patients = patientData.status === 'fulfilled' ? patientData.value || [] : []
      alerts = alertData.status === 'fulfilled' ? alertData.value || [] : []
      tasks = taskData.status === 'fulfilled' ? taskData.value || [] : []
      appointments = appointmentsData.status === 'fulfilled' ? appointmentsData.value || [] : []
    } catch (err) {
      error = err.message || 'Failed to load clinician dashboard'
    } finally {
      loading = false
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

  async function triageAlert(alertId, action) {
    triaging = alertId
    try {
      await alertsApi.triage(alertId, { action })
      toasts.success(`Alert ${action.toLowerCase()}`)
      await load()
    } catch (err) {
      toasts.error(err.message || 'Failed to triage alert')
    } finally {
      triaging = ''
    }
  }

  async function submitResponse() {
    const alert = alerts.find((item) => item.id === responseAlertId)
    if (!alert || !alert.symptomReportId || !responseText.trim()) {
      toasts.warning('Select an alert with symptomReportId and enter a response')
      return
    }
    try {
      await followupResponsesApi.create({
        symptomReportId: alert.symptomReportId,
        message: responseText.trim(),
        actionRequired,
      })
      responseText = ''
      actionRequired = false
      toasts.success('Follow-up response sent')
      await load()
    } catch (err) {
      toasts.error(err.message || 'Failed to send follow-up response')
    }
  }

  async function scheduleFollowUp() {
    const alert = alerts.find((item) => item.id === scheduleAlertId)
    if (!alert || !alert.patientId || !scheduleAt) {
      toasts.warning('Pick an alert and a schedule date/time')
      return
    }
    if (!scheduleReason.trim()) {
      toasts.warning('Please include a follow-up reason')
      return
    }
    try {
      await followupAppointmentsApi.create({
        patientId: Number(alert.patientId),
        scheduledAt: new Date(scheduleAt).toISOString(),
        reason: scheduleReason.trim(),
      })
      scheduleAt = ''
      scheduleReason = ''
      toasts.success('Follow-up appointment scheduled')
      await load()
    } catch (err) {
      toasts.error(err.message || 'Failed to schedule follow-up')
    }
  }

  async function updateTask(taskId, status) {
    try {
      await tasksApi.update(taskId, { status })
      await load()
    } catch (err) {
      toasts.error(err.message || 'Failed to update task')
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
    <h1>Clinician workspace</h1>
    <p>Triage alerts, coordinate follow-up, and track patient trends.</p>
  </div>
  <button class="button secondary" type="button" on:click={load}><RefreshCw size={16} /> Refresh</button>
</header>

<nav class="tabs" aria-label="Clinician tabs">
  {#each tabs as tab}
    <a href={`#${tab.href}`} class:active={activeTab === tab.key}>{tab.label}</a>
  {/each}
</nav>

{#if loading}
  <div class="loader"></div>
{:else if error}
  <div class="error">{error}</div>
{:else if activeTab === 'patients'}
  <div class="grid stats">
    <StatCard label="Prioritized patients" value={patients.length} />
    <StatCard label="Unread alerts" value={stats?.unreadAlerts ?? unreadAlerts} />
    <StatCard label="High risk alerts" value={highRisk.length} />
    <StatCard label="Open tasks" value={openTasks.length} />
  </div>

  <section class="card" style="margin-top:16px;">
    <h2>Prioritized patients</h2>
    <div class="list">
      {#each patients as item}
        <div class="row">
          <div class="row-title">
            <strong>{item.fullName || item.patient?.user?.fullName || 'Patient'}</strong>
            <span>{item.trend || item.reason || 'Priority queue'}</span>
          </div>
          <RiskBadge value={item.riskLevel || item.priority || 'LOW'} />
        </div>
      {:else}
        <div class="empty">No prioritized patients available.</div>
      {/each}
    </div>
  </section>
{:else if activeTab === 'alerts'}
  <section class="card">
    <h2>Alerts</h2>
    <div class="list">
      {#each alerts as alert}
        <div class="row">
          <div class="row-title">
            <strong>{alert.title || alert.message || 'Alert'}</strong>
            <span>{alert.patient?.user?.fullName || alert.patientName || 'Patient'} · {alert.status || 'OPEN'}</span>
          </div>
          <div class="row-actions">
            <RiskBadge value={alert.priority || alert.riskLevel} />
            <button class="button ghost" type="button" on:click={() => markAlertRead(alert.id)}>Read</button>
            <button class="button ghost" type="button" disabled={triaging === alert.id} on:click={() => triageAlert(alert.id, 'ACKNOWLEDGE')}>Acknowledge</button>
            <button class="button ghost" type="button" disabled={triaging === alert.id} on:click={() => triageAlert(alert.id, 'RESOLVE')}>Resolve</button>
          </div>
        </div>
      {:else}
        <div class="empty">No alerts available.</div>
      {/each}
    </div>
  </section>
{:else if activeTab === 'tasks'}
  <section class="card">
    <h2>Tasks</h2>
    <div class="list">
      {#each tasks as task}
        <div class="row">
          <div class="row-title">
            <strong>{task.title || task.description || 'Task'}</strong>
            <span>{task.patient?.user?.fullName || task.patientName || 'Patient'} · {task.status}</span>
          </div>
          <div class="row-actions">
            <span class="badge moderate">{task.priority || 'NORMAL'}</span>
            <button class="button ghost" type="button" on:click={() => updateTask(task.id, 'IN_PROGRESS')}>In progress</button>
            <button class="button ghost" type="button" on:click={() => updateTask(task.id, 'COMPLETED')}>Complete</button>
          </div>
        </div>
      {:else}
        <div class="empty">No tasks yet.</div>
      {/each}
    </div>
  </section>
{:else if activeTab === 'followups'}
  <div class="grid two-col">
    <section class="card">
      <div class="toolbar">
        <h2>Send follow-up response</h2>
        <Send size={18} />
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Alert</label>
          <select bind:value={responseAlertId}>
            <option value="">Choose alert</option>
            {#each alerts.filter((item) => item.symptomReportId) as alert}
              <option value={alert.id}>{alert.patient?.user?.fullName || alert.patientName || 'Patient'} · {alert.id.slice(0, 8)}</option>
            {/each}
          </select>
        </div>
        <div class="field">
          <label>Message</label>
          <textarea bind:value={responseText}></textarea>
        </div>
        <label class="checkbox"><input type="checkbox" bind:checked={actionRequired} /> Action required</label>
        <button class="button primary" type="button" on:click={submitResponse}>Send response</button>
      </div>
    </section>

    <section class="card">
      <div class="toolbar">
        <h2>Schedule follow-up appointment</h2>
        <UserRoundCheck size={18} />
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Alert</label>
          <select bind:value={scheduleAlertId}>
            <option value="">Choose alert</option>
            {#each alerts.filter((item) => item.patientId) as alert}
              <option value={alert.id}>{alert.patient?.user?.fullName || alert.patientName || 'Patient'} · {alert.id.slice(0, 8)}</option>
            {/each}
          </select>
        </div>
        <div class="field">
          <label>Schedule at</label>
          <input type="datetime-local" bind:value={scheduleAt} />
        </div>
        <div class="field">
          <label>Reason</label>
          <textarea bind:value={scheduleReason}></textarea>
        </div>
        <button class="button primary" type="button" on:click={scheduleFollowUp}>Schedule</button>
      </div>
    </section>
  </div>

  <section class="card" style="margin-top:16px;">
    <h2>Upcoming appointments</h2>
    <div class="list">
      {#each appointments as appointment}
        <div class="row">
          <div class="row-title">
            <strong>{appointment.patient?.user?.fullName || 'Patient'}</strong>
            <span>{new Date(appointment.scheduledAt).toLocaleString()} · {appointment.reason || 'Follow-up'}</span>
          </div>
          <span class="badge moderate">{appointment.status || 'SCHEDULED'}</span>
        </div>
      {:else}
        <div class="empty">No appointments scheduled.</div>
      {/each}
    </div>
  </section>
{:else if activeTab === 'trends'}
  <section class="card">
    <h2>Trend watch</h2>
    <div class="list">
      {#each patients.filter((item) => item.trend && item.trend !== 'STABLE') as item}
        <div class="row">
          <div class="row-title">
            <strong>{item.fullName || item.patient?.user?.fullName || 'Patient'}</strong>
            <span>{item.trend}</span>
          </div>
          <RiskBadge value={item.riskLevel || 'LOW'} />
        </div>
      {:else}
        <div class="empty">No unstable trends right now.</div>
      {/each}
    </div>
  </section>
{/if}
