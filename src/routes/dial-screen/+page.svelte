<script lang="ts">
  import { Waku, WakuRTC } from "$lib";
  import { onMount } from "svelte";
  import { tick } from "svelte";

  let inputValue = '';
  let localStream: MediaStream;
  let localPeerId = '';
  let wakuRtc: WakuRTC;
  let callActive = false;
  let callDuration = 0;
  let callTimer: ReturnType<typeof setTimeout>;
  let warningMessage = '';
  let audioContext: AudioContext;

  onMount(async () => {
    const node = await Waku.get();
    localPeerId = node.peerId.toString();
    console.log('Local peer ID:', localPeerId);

    // TODO: this should interface with Waku Phone Call not WakuRTC directly
    wakuRtc = new WakuRTC({ node });
    await wakuRtc.start();

    window.addEventListener('beforeunload', () => {
      if (wakuRtc.rtcConnection) {
        console.log('Closing RTC connection before window unload');
        wakuRtc.rtcConnection.close();
      }
    });

    audioContext = new AudioContext();
  });

  async function makeCall() {
    console.log('makeCall function triggered');
    if (!inputValue) {
      warningMessage = 'Please input peer ID you want to call';
      console.warn(warningMessage);
      return;
    }
    warningMessage = '';
    console.log('Input value:', inputValue);
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.getAudioTracks().forEach(track => wakuRtc.rtcConnection.addTrack(track, localStream));

      wakuRtc.rtcConnection.addEventListener("track", e => {
        console.log("ontrack", e);
        const remoteStream = e.streams[0];
        const remoteAudioSource = audioContext.createMediaStreamSource(remoteStream);
        remoteAudioSource.connect(audioContext.destination);
      });

      await wakuRtc.initiateConnection(inputValue);
      startCall();
    } catch (error) {
      console.error('Error in makeCall:', error);
    }
  }

  function handleInput(event: Event) {
    inputValue = (event.target as HTMLInputElement).value;
  }

  function hangUpCall() {
    console.log('hangUpCall function triggered');
    if (localStream) {
      console.log('Stopping local audio tracks');
      localStream.getAudioTracks().forEach(track => track.stop());
    }
    endCall();
  }

  function startCall() {
    callActive = true;
    callDuration = 0;
    callTimer = setInterval(() => {
      callDuration++;
      tick();
    }, 1000);
  }

  function endCall() {
    callActive = false;
    clearInterval(callTimer);
    callDuration = 0;
  }
</script>
  
<h1>Waku Phone</h1>
<p>Local peer ID: {localPeerId}</p>
<div class="form-group">
  <label for="string-input">Enter peer ID to call:</label>
  <input 
    id="string-input"
    type="text" 
    bind:value={inputValue}
    placeholder="Enter peer ID..." 
    oninput={handleInput}
  />
</div>
{#if warningMessage}
  <p class="warning">{warningMessage}</p>
{/if}
<button onclick={makeCall} disabled={callActive}>Call</button>
<button onclick={hangUpCall} disabled={!callActive}>Hangup-Call</button>

{#if callActive}
  <div class="call-status">
    <span class="indicator"></span>
    <span>Call in progress...</span>
    <span>Duration: {Math.floor(callDuration / 60)}:{callDuration % 60}</span>
  </div>
{/if}

<style>
  button {
    padding: 0.5rem 1rem;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:disabled {
    background-color: grey;
    cursor: not-allowed;
  }

  button:hover {
    background-color: #45a049;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .label {
    font-weight: bold;
  }

  .call-status {
    display: flex;
    align-items: center;
    margin-top: 1rem;
  }

  .indicator {
    width: 10px;
    height: 10px;
    background-color: red;
    border-radius: 50%;
    margin-right: 0.5rem;
  }
</style>