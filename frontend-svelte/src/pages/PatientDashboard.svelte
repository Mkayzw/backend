<script>
  import { onMount } from 'svelte'
  import { CalendarPlus, FileHeart, RefreshCw, Save } from 'lucide-svelte'
  import StatCard from '../components/StatCard.svelte'
  import RiskBadge from '../components/RiskBadge.svelte'
  import { assignmentsApi, cliniciansApi, followupAppointmentsApi, followupResponsesApi, patientsApi, reportsApi } from '../lib/api.js'
  import { session } from '../lib/session.js'
  import { toasts } from '../lib/toasts.js'

  const tabs = [
    { key: 'dashboard', href: '/patient', label: 'Dashboard' },
    { key: 'report', href: '/patient/report', label: 'Report Symptoms' },
    { key: 'clinicians', href: '/patient/clinicians', label: 'My Clinicians' },
    { key: 'history', href: '/patient/history', label: 'Report History' },
    { key: 'profile', href: '/patient/profile', label: 'Profile' },
  ]

  let activeTab = 'dashboard'
  let loading = true
  let submitting = false
  let savingProfile = false
  let error = ''

  let patient = null
  let reports = []
  let assignments = []
  let clinicians = []
  let followupResponses = []
  let appointments = []

  let reportForm = {
    symptomsText: '',
    severity: 'MILD',
    durationDays: 1,
    frequency: 'FIRST_TIME',
    notes: '',
    temperature: '',
    heartRate: '',
    medicationAdherent: '',
  }

  let profileForm = {
    dateOfBirth: '',
    gender: '',
    emergencyContact: '',
    address: '',
    chronicConditions: '',
    allergies: '',
    baselineStatus: 'stable',
  }

  $: latest = reports[0]
  $: activeAssignments = assignments.filter((item) => item.status === 'ACTIVE')
  $: canReport = Boolean(patient && activeAssignments.length > 0)

  function setTabFromHash() {
    const path = window.location.hash.replace(/^#/, '') || '/patient'
    const match = tabs.find((tab) => path === tab.href)
    activeTab = match?.key || 'dashboard'
  }

  async function load() {
    loading = true
    error = ''
    try {
      const [patientsRes, assignmentsRes, cliniciansRes] = await Promise.allSettled([
        patientsApi.list(),
        assignmentsApi.list(),
        cliniciansApi.list(),
      ])
      const patients = patientsRes.status === 'fulfilled' ? patientsRes.value : []
      const allAssignments = assignmentsRes.status === 'fulfilled' ? assignmentsRes.value : []
      const allClinicians = cliniciansRes.status === 'fulfilled' ? cliniciansRes.value : []

      patient = patients.find((item) => item.userId === $session.user.id)
      assignments = patient ? allAssignments.filter((item) => item.patientId === patient.id) : []
      clinicians = allClinicians

      if (patient) {
        const [reportsRes, responsesRes, appointmentsRes] = await Promise.allSettled([
          reportsApi.byPatient(patient.id),
          followupResponsesApi.listForPatient(patient.id),
          followupAppointmentsApi.list({ patientId: patient.id }),
        ])
        reports = reportsRes.status === 'fulfilled' ? reportsRes.value || [] : []
        followupResponses = responsesRes.status === 'fulfilled' ? responsesRes.value || [] : []
        appointments = appointmentsRes.status === 'fulfilled' ? appointmentsRes.value || [] : []

        profileForm = {
          dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '',
          gender: patient.gender || '',
          emergencyContact: patient.emergencyContact || '',
          address: patient.address || '',
          chronicConditions: parseJsonArray(patient.chronicConditions).join(', '),
          allergies: parseJsonArray(patient.allergies).join(', '),
          baselineStatus: patient.baselineStatus || 'stable',
        }
      } else {
        reports = []
        followupResponses = []
        appointments = []
      }
    } catch (err) {
      error = err.message || 'Failed to load patient data'
    } finally {
      loading = false
    }
  }

  function parseJsonArray(value) {
    if (!value) return []
    if (Array.isArray(value)) return value
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  async function submitReport() {
    if (!patient || !reportForm.symptomsText.trim()) {
      toasts.warning('Please add at least one symptom')
      return
    }

    submitting = true
    try {
      await reportsApi.create({
        patientId: patient.id,
        symptoms: reportForm.symptomsText.split(',').map((item) => item.trim()).filter(Boolean),
        severity: reportForm.severity,
        durationDays: Number(reportForm.durationDays),
        frequency: reportForm.frequency,
        notes: reportForm.notes || null,
        temperature: reportForm.temperature ? Number(reportForm.temperature) : null,
        heartRate: reportForm.heartRate ? Number(reportForm.heartRate) : null,
        medicationAdherent: reportForm.medicationAdherent === '' ? null : reportForm.medicationAdherent === 'true',
      })
      reportForm = {
        symptomsText: '',
        severity: 'MILD',
        durationDays: 1,
        frequency: 'FIRST_TIME',
        notes: '',
        temperature: '',
        heartRate: '',
        medicationAdherent: '',
      }
      toasts.success('Symptom report submitted')
      await load()
      window.location.hash = '#/patient/history'
    } catch (err) {
      toasts.error(err.message || 'Failed to submit report')
    } finally {
      submitting = false
    }
  }

  async function saveProfile() {
    if (!patient) return
    savingProfile = true
    try {
      const payload = {
        dateOfBirth: profileForm.dateOfBirth || null,
        gender: profileForm.gender || null,
        emergencyContact: profileForm.emergencyContact || null,
        address: profileForm.address || null,
        chronicConditions: JSON.stringify(splitCommaList(profileForm.chronicConditions)),
        allergies: JSON.stringify(splitCommaList(profileForm.allergies)),
        baselineStatus: profileForm.baselineStatus || 'stable',
      }
      await patientsApi.update(patient.id, payload)
      toasts.success('Profile updated')
      await load()
    } catch (err) {
      toasts.error(err.message || 'Failed to update profile')
    } finally {
      savingProfile = false
    }
  }

  function splitCommaList(value) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  function resolveClinicianName(clinicianId) {
    const clinician = clinicians.find((item) => item.id === clinicianId)
    return clinician?.user?.fullName || 'Assigned clinician'
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
    <h1>Patient workspace</h1>
    <p>Report symptoms, track clinician follow-up, and keep your profile up to date.</p>
  </div>
  <button class="button secondary" type="button" on:click={load}><RefreshCw size={16} /> Refresh</button>
</header>

<nav class="tabs" aria-label="Patient tabs">
  {#each tabs as tab}
    <a href={`#${tab.href}`} class:active={activeTab === tab.key}>{tab.label}</a>
  {/each}
</nav>

{#if loading}
  <div class="loader"></div>
{:else if error}
  <div class="error">{error}</div>
{:else if activeTab === 'dashboard'}
  <div class="grid stats">
    <StatCard label="Reports submitted" value={reports.length} />
    <StatCard label="Active assignments" value={activeAssignments.length} />
    <StatCard label="Latest risk level" value={latest?.riskLevel || 'N/A'} />
    <StatCard label="Upcoming follow-ups" value={appointments.filter((item) => item.status === 'SCHEDULED').length} />
  </div>

  <div class="grid two-col" style="margin-top:16px;">
    <section class="card">
      <h2>Latest report</h2>
      {#if latest}
        <div class="row">
          <div class="row-title">
            <strong>{latest.symptoms?.join(', ') || 'Symptom report'}</strong>
            <span>{new Date(latest.createdAt).toLocaleString()}</span>
          </div>
          <RiskBadge value={latest.riskLevel} />
        </div>
      {:else}
        <div class="empty">No reports yet.</div>
      {/if}
    </section>

    <section class="card">
      <h2>Clinician responses</h2>
      <div class="list">
        {#each followupResponses.slice(0, 5) as response}
          <div class="row">
            <div class="row-title">
              <strong>{response.message || 'Follow-up response'}</strong>
              <span>{new Date(response.createdAt).toLocaleString()}</span>
            </div>
          </div>
        {:else}
          <div class="empty">No clinician responses yet.</div>
        {/each}
      </div>
    </section>
  </div>
{:else if activeTab === 'report'}
  <section class="card">
    <h2>Submit symptom report</h2>
    {#if !canReport}
      <div class="notice">You need at least one ACTIVE clinician assignment before you can submit symptoms.</div>
    {/if}
    <form class="form-grid" on:submit|preventDefault={submitReport}>
      <div class="field">
        <label>Symptoms</label>
        <input bind:value={reportForm.symptomsText} placeholder="e.g. fever, cough, chest_pain" disabled={!canReport || submitting} />
      </div>
      <div class="field">
        <label>Severity</label>
        <select bind:value={reportForm.severity} disabled={!canReport || submitting}>
          <option value="MILD">MILD</option>
          <option value="MODERATE">MODERATE</option>
          <option value="SEVERE">SEVERE</option>
        </select>
      </div>
      <div class="field">
        <label>Duration (days)</label>
        <input type="number" min="1" bind:value={reportForm.durationDays} disabled={!canReport || submitting} />
      </div>
      <div class="field">
        <label>Frequency</label>
        <select bind:value={reportForm.frequency} disabled={!canReport || submitting}>
          <option value="FIRST_TIME">FIRST_TIME</option>
          <option value="INTERMITTENT">INTERMITTENT</option>
          <option value="CONSTANT">CONSTANT</option>
          <option value="WORSENING">WORSENING</option>
        </select>
      </div>
      <div class="grid two-col">
        <div class="field">
          <label>Temperature (optional)</label>
          <input type="number" step="0.1" bind:value={reportForm.temperature} disabled={!canReport || submitting} />
        </div>
        <div class="field">
          <label>Heart rate (optional)</label>
          <input type="number" bind:value={reportForm.heartRate} disabled={!canReport || submitting} />
        </div>
      </div>
      <div class="field">
        <label>Medication adherence</label>
        <select bind:value={reportForm.medicationAdherent} disabled={!canReport || submitting}>
          <option value="">Not set</option>
          <option value="true">Adherent</option>
          <option value="false">Not adherent</option>
        </select>
      </div>
      <div class="field">
        <label>Notes</label>
        <textarea bind:value={reportForm.notes} disabled={!canReport || submitting}></textarea>
      </div>
      <button class="button primary" type="submit" disabled={!canReport || submitting}>
        {submitting ? 'Submitting...' : 'Submit report'}
      </button>
    </form>
  </section>
{:else if activeTab === 'clinicians'}
  <section class="card">
    <h2>My clinicians</h2>
    <div class="list">
      {#each activeAssignments as assignment}
        <div class="row">
          <div class="row-title">
            <strong>{assignment.clinician?.user?.fullName || resolveClinicianName(assignment.clinicianId)}</strong>
            <span>{assignment.careContext || 'GENERAL_REVIEW'}</span>
          </div>
          <span class="badge low">{assignment.status}</span>
        </div>
      {:else}
        <div class="empty">No active clinicians assigned.</div>
      {/each}
    </div>
  </section>
{:else if activeTab === 'history'}
  <section class="card">
    <h2>Report history</h2>
    <div class="list">
      {#each reports as report}
        <div class="row">
          <div class="row-title">
            <strong>{report.symptoms?.join(', ') || 'Symptom report'}</strong>
            <span>{new Date(report.createdAt).toLocaleString()}</span>
          </div>
          <RiskBadge value={report.riskLevel || 'LOW'} />
        </div>
      {:else}
        <div class="empty">No reports available.</div>
      {/each}
    </div>
  </section>
{:else if activeTab === 'profile'}
  <section class="card">
    <h2>Profile</h2>
    <form class="form-grid" on:submit|preventDefault={saveProfile}>
      <div class="grid two-col">
        <div class="field">
          <label>Date of birth</label>
          <input type="date" bind:value={profileForm.dateOfBirth} disabled={savingProfile} />
        </div>
        <div class="field">
          <label>Gender</label>
          <input bind:value={profileForm.gender} disabled={savingProfile} />
        </div>
      </div>
      <div class="field">
        <label>Emergency contact</label>
        <input bind:value={profileForm.emergencyContact} disabled={savingProfile} />
      </div>
      <div class="field">
        <label>Address</label>
        <textarea bind:value={profileForm.address} disabled={savingProfile}></textarea>
      </div>
      <div class="field">
        <label>Chronic conditions (comma separated)</label>
        <input bind:value={profileForm.chronicConditions} disabled={savingProfile} />
      </div>
      <div class="field">
        <label>Allergies (comma separated)</label>
        <input bind:value={profileForm.allergies} disabled={savingProfile} />
      </div>
      <div class="field">
        <label>Baseline status</label>
        <select bind:value={profileForm.baselineStatus} disabled={savingProfile}>
          <option value="stable">stable</option>
          <option value="improving">improving</option>
          <option value="worsening">worsening</option>
        </select>
      </div>
      <button class="button primary" type="submit" disabled={savingProfile}>
        <Save size={16} />
        {savingProfile ? 'Saving...' : 'Save profile'}
      </button>
    </form>
  </section>
{/if}

{#if activeTab === 'dashboard' || activeTab === 'history'}
  <section class="card" style="margin-top:16px;">
    <div class="toolbar">
      <h2>Appointments</h2>
      <CalendarPlus size={18} />
    </div>
    <div class="list">
      {#each appointments.slice(0, 8) as item}
        <div class="row">
          <div class="row-title">
            <strong>{new Date(item.scheduledAt).toLocaleString()}</strong>
            <span>{item.reason || 'Follow-up appointment'}</span>
          </div>
          <span class="badge moderate">{item.status || 'SCHEDULED'}</span>
        </div>
      {:else}
        <div class="empty">No appointments yet.</div>
      {/each}
    </div>
  </section>
{/if}
