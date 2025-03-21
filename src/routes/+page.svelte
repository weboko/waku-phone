<svelte:head>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</svelte:head>

<script lang="ts">
  import { Waku, WakuRTC } from "$lib";
  import { onMount } from "svelte";
  import { tick } from "svelte";
  import { Local } from "$lib/local-storage";
  import { getPeerIdFromPhoneNumber } from "$lib/utils";
  import IncomingCallPopup from './incoming-call/IncomingCallPopUp.svelte';

  let inputValue = '';
  let localStream: MediaStream;
  let localPeerId = '';
  let localPhoneNumber = '';
  let wakuRtc: WakuRTC;
  let callActive = false;
  let callDuration = 0;
  let callTimer: ReturnType<typeof setTimeout>;
  let warningMessage = '';
  let audioContext: AudioContext;
  let useNumpad = true;
  let numpadInput = '';
  let calledPartyPeerId = '';
  let incomingCall = false;
  let callerPeerId = 'QmExampleCallerPeerId';

  onMount(async () => {
    const node = await Waku.get();
    localPeerId = node.peerId.toString();
    localPhoneNumber = localStorage.getItem(Local.LOCAL_ID_KEY) || ''; // Retrieve phone number from localStorage
    console.log('Local peer ID:', localPeerId);
    console.log('Local phone number:', localPhoneNumber); // Log phone number

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
      if (useNumpad) {
        calledPartyPeerId = await getPeerIdFromPhoneNumber(inputValue);
      } else {
        calledPartyPeerId = inputValue;
      }
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.getAudioTracks().forEach(track => wakuRtc.rtcConnection.addTrack(track, localStream));

      wakuRtc.rtcConnection.addEventListener("track", e => {
        console.log("ontrack", e);
        const remoteStream = e.streams[0];
        const remoteAudioSource = audioContext.createMediaStreamSource(remoteStream);
        remoteAudioSource.connect(audioContext.destination);
      });

      await wakuRtc.initiateConnection(calledPartyPeerId);
      startCall();
    } catch (error) {
      console.error('Error in makeCall:', error);
    }
  }

  function handleInput(event: Event) {
    inputValue = (event.target as HTMLInputElement).value;
  }

  function handleNumpadInput(digit: string) {
    numpadInput += digit;
    inputValue = numpadInput;
  }

  function clearNumpadInput() {
    numpadInput = '';
    inputValue = '';
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

  function handleIncomingCall() {
    incomingCall = true;
  }

  function acceptCall() {
    console.log('Call accepted');
    incomingCall = false;
    // Add logic to handle accepting the call
  }

  function rejectCall() {
    console.log('Call rejected');
    incomingCall = false;
    // Add logic to handle rejecting the call
  }
</script>
  
<h1>Waku Phone</h1>
<p>Local peer ID: {localPeerId}</p>
<p>Local phone number: {localPhoneNumber}</p>
<div class="form-group">
  <label for="toggle-input">Use Numpad:</label>
  <input 
    id="toggle-input"
    type="checkbox" 
    bind:checked={useNumpad}
  />
</div>
{#if callActive}
  <div class="call-status">
    <span class="indicator"></span>
    <span>Call in progress...</span>
    <span>Duration: {Math.floor(callDuration / 60)}:{callDuration % 60}</span>
    <span>Calling peer ID: {calledPartyPeerId}</span>
  </div>
{/if}
{#if warningMessage}
  <p class="warning">{warningMessage}</p>
{/if}
<div class="button-group">
  <button onclick={makeCall} disabled={callActive} class="call-button">
    <i class="fas fa-phone"></i>
  </button>
  <button onclick={hangUpCall} disabled={!callActive} class="hangup-button">
    <i class="fas fa-phone-slash"></i>
  </button>
  <button onclick={handleIncomingCall} class="simulate-button">
    Simulate Incoming Call
  </button>
</div>
{#if useNumpad}
  <div class="numpad-input-box">
    <p class="numpad-input">{numpadInput}</p>
  </div>
  <div class="numpad">
    {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'] as digit}
      <button onclick={() => handleNumpadInput(digit)}>{digit}</button>
    {/each}
    <button onclick={clearNumpadInput} style="margin-bottom: 1rem;">Clear</button>
  </div>
{:else}
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
{/if}

{#if incomingCall}
  <IncomingCallPopup 
    callerPeerId={callerPeerId} 
    onAccept={acceptCall} 
    onReject={rejectCall} 
  />
{/if}

<style>
  .button-group {
    display: flex;
    gap: 1rem;
  }

  .call-button {
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    height: 2.5rem;
    width: 6.5rem;
  }

  .hangup-button {
    font-size: 1.5rem;
    align-items: center;
    justify-content: center;
    background-color: red;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    height: 2.5rem;
    width: 6.5rem;
  }

  .call-button:disabled, .hangup-button:disabled {
    background-color: grey;
    cursor: not-allowed;
  }

  .call-button:hover {
    background-color: #45a049;
  }

  .hangup-button:hover {
    background-color: darkred;
  }

  .form-group {
    margin-top: 1rem;
    margin-bottom: 1rem;
  }

  .label {
    font-weight: bold;
  }

  .call-status {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-top: 1rem;
    margin-bottom: 1rem;
  }

  .indicator {
    width: 10px;
    height: 10px;
    background-color: red;
    border-radius: 50%;
    margin-right: 0.5rem;
  }

  .warning {
    color: red;
    font-weight: bold;
  }

  .numpad-input-box {
    border: 1px solid #ccc;
    padding: 0.5rem;
    margin-top: 1rem;
    margin-bottom: 1rem;
    text-align: center;
    width: 13rem; 
    height: 4rem;
  }

  .numpad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    width: 200px; 
    height: 300px; 
  }

  .numpad button {
    font-size: 1.5rem;
    aspect-ratio: 1 / 1; /* Makes the buttons square */
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #3d71d1;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .numpad button:hover {
    background-color: #45a049;
  }

  .numpad-input {
    font-size: 1.5rem;
    font-weight: bold;
    text-align: center;
    margin-bottom: 1rem;
    height: 100%;
    width: 100%;
  }

  .simulate-button {
    font-size: 1.5rem;
    align-items: center;
    justify-content: center;
    background-color: #3d71d1;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    height: 2.5rem;
    width: 15rem;
  }
</style>