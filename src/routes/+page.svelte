<script lang="ts">
  import { Waku, WakuRTC } from "$lib";

    let inputValue = '';
    var localPeerId = ''; 
    async function handleClick() {
      const node = await Waku.get();
      localPeerId = node.peerId.toString();
      console.log('Local peer ID:', localPeerId);
      // @ts-ignore
      window.waku = node;

      const wakuRtc = new WakuRTC({ node });
      await wakuRtc.start();

      // @ts-ignore
      window.init = wakuRtc.initiateConnection.bind(wakuRtc);
      //@ts-ignore
      window.sendMessage = wakuRtc.sendChatMessage.bind(wakuRtc);
    }

    async function makeCall() {
      // @ts-ignore
      await window.init(inputValue);
    }

    function handleInput(event: Event) {
      inputValue = (event.target as HTMLInputElement).value;
    }

</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<button on:click={handleClick}>Connect</button>
<p> peerId: {localPeerId}</p>
<div class="form-group">
  <label for="string-input">Enter text:</label>
  <input 
    id="string-input"
    type="text" 
    bind:value={inputValue}
    placeholder="Type something here..." 
  />
  <p>Current value: {inputValue}</p>
</div>
<button on:click={makeCall}>Call</button>

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
