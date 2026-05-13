<script>
  export let value = 'LOW'
  $: level = String(value || 'LOW').toLowerCase()
</script>

<span class={`badge ${level}`}>{value}</span>
