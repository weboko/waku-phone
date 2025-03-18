<script lang="ts">
  import { Waku, WakuRTC } from "$lib";

    async function handleClick() {
      const node = await Waku.get();
      // @ts-ignore
      window.waku = node;

      const wakuRtc = new WakuRTC({ node });
      await wakuRtc.start();

      // @ts-ignore
      window.init = wakuRtc.initiateConnection.bind(wakuRtc);
    }
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<button on:click={handleClick}>Connect</button>

<style>
    button {
        padding: 0.5rem 1rem;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    button:hover {
        background-color: #45a049;
    }
</style>
