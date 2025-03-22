<script lang="ts">
  import { Waku } from "$lib";
  import { onMount } from "svelte";
  import { tick } from "svelte";
  import { Local } from "$lib/local-storage";
  import { getPeerIdFromPhoneNumber } from "$lib/utils";
  import IncomingCallPopup from "./incoming-call/IncomingCallPopUp.svelte";
  import { Phone } from "$lib/phone";

  let inputValue = "";
  let localPeerId = "";
  let localPhoneNumber = "";
  let phone: Phone;
  let callActive = false;
  let callDuration = 0;
  let callTimer: ReturnType<typeof setTimeout>;
  let warningMessage = "";
  let calledPartyPeerId = "";
  let incomingCall = false;
  let callerPeerId = "";

  let localAudio = new Audio();
  let systemAudio = new Audio();
  let remoteAudio = new Audio();

  function handleKeydown(event: KeyboardEvent) {
    if (callActive) return;

    if (/^[0-9]$/.test(event.key)) {
      inputValue += event.key;
    } else if (event.key === "Backspace") {
      inputValue = inputValue.slice(0, -1);
    } else if (event.key === "Enter") {
      makeCall();
    } else if (event.key === "Escape") {
      clearInput();
    }
  }

  onMount(async () => {
    window.addEventListener("keydown", handleKeydown);

    const node = await Waku.get();
    localPeerId = node.peerId.toString();
    localPhoneNumber = Local.getPhoneNumber();
    console.log("Local peer ID:", localPeerId);
    console.log("Local phone number:", localPhoneNumber);

    phone = new Phone({
      waku: node,
      systemAudio,
      localAudio,
      remoteAudio,
    });

    await node.start();
    await phone.start();

    phone.events.addEventListener("incomingCall", handleIncomingCall as any);
    phone.events.addEventListener("hangup", endCall);

    window.addEventListener("beforeunload", async () => {
      await node.stop();
      await phone.stop();
    });

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  });

  async function makeCall() {
    console.log("makeCall function triggered");
    if (!inputValue) {
      warningMessage = "Please enter a phone number";
      console.warn(warningMessage);
      return;
    }
    warningMessage = "";
    console.log("Input value:", inputValue);
    try {
      calledPartyPeerId = await getPeerIdFromPhoneNumber(inputValue);
      await phone.dial(calledPartyPeerId);
      startCall();
    } catch (error) {
      console.error("Error in makeCall:", error);
    }
  }

  function handleNumpadInput(digit: string) {
    if (callActive) return;
    inputValue += digit;
  }

  function clearInput() {
    inputValue = "";
  }

  function backspace() {
    inputValue = inputValue.slice(0, -1);
  }

  async function hangUpCall() {
    console.log("hangUpCall function triggered");
    await phone.hangup();
  }

  function startCall() {
    callActive = true;
    callDuration = 0;
    callTimer = setInterval(() => {
      callDuration++;
      tick();
    }, 1000);

    remoteAudio.autoplay = true;
  }

  function endCall() {
    callActive = false;
    clearInterval(callTimer);
    callDuration = 0;
  }

  function handleIncomingCall(event: CustomEvent) {
    callerPeerId = event.detail?.callerPhoneNumber || "unknown";
    incomingCall = true;
  }

  function answerCall() {
    console.log("Call answered");
    incomingCall = false;
    phone.answerCall();
    startCall();
  }

  function rejectCall() {
    console.log("Call rejected");
    incomingCall = false;
    phone.rejectCall();
    endCall();
  }
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
  />
</svelte:head>

<div class="phone-container">
  <div class="status-bar">
    <p class="phone-id">{localPhoneNumber || "No Number"}</p>
  </div>

  {#if callActive}
    <div class="call-screen">
      <div class="call-info">
        <span class="call-indicator"></span>
        <p class="call-status-text">Call in progress</p>
        <p class="call-duration">
          {Math.floor(callDuration / 60)}:{(callDuration % 60)
            .toString()
            .padStart(2, "0")}
        </p>
        <p class="calling-number">{inputValue}</p>
      </div>
      <button class="hangup-button" on:click={hangUpCall} aria-label="End call">
        <i class="fas fa-phone-slash"></i>
      </button>
    </div>
  {:else}
    <div class="dialer">
      <div class="number-display">
        <span class="phone-number">{inputValue}</span>
        {#if inputValue}
          <button class="backspace-button" on:click={backspace} aria-label="Delete last digit">
            <i class="fas fa-backspace"></i>
          </button>
        {/if}
      </div>

      <div class="numpad">
        {#each ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as digit}
          <button
            class="numpad-button"
            on:click={() => handleNumpadInput(digit)}
          >
            <span class="digit">{digit}</span>
          </button>
        {/each}
      </div>

      <div class="action-buttons">
        <button
          class="clear-button"
          on:click={clearInput}
          disabled={!inputValue}
          aria-label="Clear number"
        >
          <i class="fas fa-times"></i>
        </button>
        <button 
          class="call-button" 
          on:click={makeCall} 
          disabled={!inputValue}
          aria-label="Make call"
        >
          <i class="fas fa-phone"></i>
        </button>
      </div>
    </div>
  {/if}

  {#if warningMessage}
    <div class="warning-banner">
      <p class="warning">{warningMessage}</p>
    </div>
  {/if}
</div>

{#if incomingCall}
  <IncomingCallPopup
    {callerPeerId}
    onAccept={answerCall}
    onReject={rejectCall}
  />
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    background-color: #f5f5f5;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .phone-container {
    position: relative;
    width: 100%;
    max-width: 360px;
    height: 100%;
    max-height: 640px;
    background-color: white;
    border-radius: 24px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-bottom: 8px;
  }

  .status-bar {
    padding: 8px 16px;
    background-color: #f8f8f8;
    border-bottom: 1px solid #eaeaea;
    text-align: center;
  }

  .phone-id {
    font-size: 14px;
    color: #666;
    margin: 0;
  }

  .dialer {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: 12px;
    justify-content: space-between;
  }

  .number-display {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 0 16px;
    position: relative;
    min-height: 40px;
  }

  .phone-number {
    font-size: 32px;
    font-weight: 300;
    letter-spacing: 1px;
    text-align: center;
  }

  .backspace-button {
    position: absolute;
    right: 0;
    background: none;
    border: none;
    font-size: 20px;
    color: #666;
    cursor: pointer;
    padding: 8px;
  }

  .numpad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 8px;
    flex: 0 1 auto;
    justify-content: center;
    margin-left: auto;
    margin-right: auto;
    max-width: 320px;
    grid-template-areas:
      "a b c"
      "d e f"
      "g h i"
      ". j .";
  }

  .numpad-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: #f2f2f2;
    border: none;
    border-radius: 50%;
    aspect-ratio: 1;
    cursor: pointer;
    padding: 0;
    transition: background-color 0.2s;
    min-height: 85px;
    max-height: 85px;
    text-align: center;
    margin: 0 auto;
    width: 100%;
  }

  .numpad-button:nth-child(10) {
    grid-area: j;
  }

  .numpad-button:hover,
  .numpad-button:active {
    background-color: #e0e0e0;
  }

  .digit {
    font-size: 24px;
    font-weight: 400;
    color: #333;
  }

  .action-buttons {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 12px;
    padding-bottom: 4px;
    gap: 20px;
  }

  .call-button,
  .hangup-button,
  .clear-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 85px;
    height: 85px;
    border: none;
    border-radius: 50%;
    font-size: 22px;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .call-button {
    background-color: #4caf50;
  }

  .call-button:hover:not(:disabled) {
    background-color: #45a049;
    transform: scale(1.05);
  }

  .clear-button {
    background-color: #f44336;
  }

  .clear-button:hover:not(:disabled) {
    background-color: #e53935;
    transform: scale(1.05);
  }

  .hangup-button {
    background-color: #f44336;
    margin: 0 auto;
  }

  .hangup-button:hover {
    background-color: #e53935;
    transform: scale(1.05);
  }

  .call-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    flex: 1;
    padding: 40px 16px;
  }

  .call-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 40px;
  }

  .call-indicator {
    width: 16px;
    height: 16px;
    background-color: #4caf50;
    border-radius: 50%;
    animation: pulse 1.5s infinite;
  }

  .call-status-text {
    font-size: 20px;
    font-weight: 500;
    margin: 16px 0 8px;
  }

  .call-duration {
    font-size: 18px;
    color: #666;
    margin: 0 0 24px;
  }

  .calling-number {
    font-size: 24px;
    font-weight: 300;
  }

  .warning-banner {
    position: absolute;
    bottom: 16px;
    left: 16px;
    right: 16px;
    background-color: rgba(244, 67, 54, 0.9);
    padding: 8px 16px;
    border-radius: 8px;
    text-align: center;
  }

  .warning {
    color: white;
    margin: 0;
    font-size: 14px;
  }

  .call-button:disabled,
  .clear-button:disabled {
    background-color: #bdbdbd;
    cursor: not-allowed;
    transform: none;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
    }
  }

  @media (max-height: 640px) {
    .numpad {
      gap: 8px;
    }

    .digit {
      font-size: 20px;
    }
    
    .call-button,
    .hangup-button,
    .clear-button {
      width: 48px;
      height: 48px;
      font-size: 20px;
    }

    .number-display {
      padding: 6px 0 10px;
    }

    .phone-number {
      font-size: 26px;
    }

    .action-buttons {
      margin-top: 10px;
    }
  }

  @media (max-height: 568px) {
    .status-bar {
      padding: 4px 8px;
    }

    .numpad {
      gap: 6px;
    }

    .digit {
      font-size: 18px;
    }
    
    .call-button,
    .hangup-button,
    .clear-button {
      width: 44px;
      height: 44px;
      font-size: 18px;
    }

    .dialer {
      padding: 8px;
    }
  }

  @media (max-width: 360px) {
    .phone-container {
      border-radius: 0;
    }
  }
</style>