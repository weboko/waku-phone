<script lang="ts">
  import { Waku, WakuRTC } from "$lib";
  import { AudioSignal } from "$lib/audiosignal";
  import { MediaStreams } from "$lib/media";
	import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Phone } from "$lib/phone";

    let inputValue = '';
    let localAudio: HTMLAudioElement, remoteAudio : HTMLAudioElement, systemAudio: HTMLAudioElement;
    var localPeerId = $state('');
    let phone: Phone;

    let wakuConnected = $state(false);

    async function handleConnect() {
      const waku = await Waku.get();
      // @ts-ignore
      window.waku = waku["node"];
      localPeerId = waku.peerId.toString();
      
      await waku.start();

      phone = new Phone({ waku, localAudio, remoteAudio, systemAudio });
      await phone.start();
    }

    async function makeCall() {
      if (inputValue) {
        await phone.dial(inputValue);
      }
    }

    function hangUpCall(){
      phone.hangup();
    }

</script>

<h1>WebRTC Calling with Waku Signalling</h1>
<p>Visit <a href="https://waku.org">waku</a> to read the documentation</p>
<div>
<button onclick={() => goto('/dial-screen')}>Go to New Dial Screen</button>
<button onclick={handleConnect} disabled={wakuConnected}>{wakuConnected ? 'Connected' : 'Connect to Network'}</button>
</div>
<p> Our PeerId: {localPeerId}</p>
<div class="form-group">
  <label for="string-input">Call Peer:</label>
  <input 
    id="string-input"
    type="text" 
    size="70"
    bind:value={inputValue}
    placeholder="Remote PeerId..."
  />
</div>
<br/>
<div>
  <button onclick={makeCall}>Call</button>
  <button onclick={hangUpCall} >Hangup-Call</button>
</div>
<div id="audio">
  <div>
      <audio bind:this={localAudio}  autoplay controls muted hidden></audio>
      </div>
  <div>
      <audio bind:this={remoteAudio} autoplay controls hidden></audio>
  </div>
  <audio bind:this={systemAudio} preload="none" hidden></audio>
</div>


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

    button:disabled {
        background-color: #cccccc;
        color: #888888;
        cursor: not-allowed;
        opacity: 0.7;
    }
</style>
