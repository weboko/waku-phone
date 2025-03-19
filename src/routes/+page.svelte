<script lang="ts">
  import { Waku, WakuRTC } from "$lib";

    let inputValue = '', localStream:MediaStream;
    let localAudio: HTMLAudioElement, remoteAudio : HTMLAudioElement;
    var localPeerId = ''; 
    var wakuRtc: WakuRTC;
    async function handleClick() {
      const node = await Waku.get();
      localPeerId = node.peerId.toString();
      console.log('Local peer ID:', localPeerId);
      // @ts-ignore
      window.waku = node;

      wakuRtc = new WakuRTC({ node });
      await wakuRtc.start();
      // @ts-ignore
      window.init = wakuRtc.initiateConnection.bind(wakuRtc);
      //@ts-ignore
      window.sendMessage = wakuRtc.sendChatMessage.bind(wakuRtc);

      wakuRtc.rtcConnection.ontrack = e => {
        console.log("ontrack", e);
        remoteAudio.srcObject = e.streams[0];
      };
    }

    async function makeCall() {
      if (inputValue) {
        // @ts-ignore
        await window.init(inputValue);
      }
      localStream = await navigator.mediaDevices.getUserMedia({audio: true, video: false});
      localAudio.srcObject = localStream;
      localStream.getAudioTracks().forEach(track =>  wakuRtc.rtcConnection.addTrack(track, localStream));
    }

    function handleInput(event: Event) {
      inputValue = (event.target as HTMLInputElement).value;
    }

    function hangUpCall(){
      if (wakuRtc.rtcConnection) {
        wakuRtc.rtcConnection.close();
        //wakuRtc.rtcConnection = null;
      }
      localStream.getAudioTracks().forEach(track => track.stop());
      //localStream = null;
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
<div id="audio">
  <div>
      <div class="label">Local audio:</div>
      <audio bind:this={localAudio}  autoplay controls muted></audio>
      </div>
  <div>
      <audio bind:this={remoteAudio} autoplay controls></audio>
  </div>
</div>
<button on:click={hangUpCall}>Hangup-Call</button>


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
