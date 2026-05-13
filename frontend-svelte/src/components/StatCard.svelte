<script>
  export let label
  export let value = 0
  export let detail = ''
</script>

<section class="card stat">
  <span>{label}</span>
  <strong>{value ?? 0}</strong>
  {#if detail}
    <small>{detail}</small>
  {/if}
</section>
