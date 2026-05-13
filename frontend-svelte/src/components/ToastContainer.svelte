<script>
  import { toasts } from '../lib/toasts.js'
</script>

<div class="toast-stack" aria-live="polite">
  {#each $toasts as toast (toast.id)}
    <article class={`toast ${toast.type}`}>
      <div>{toast.message}</div>
      <button type="button" class="toast-close" on:click={() => toasts.remove(toast.id)}>x</button>
    </article>
  {/each}
</div>
