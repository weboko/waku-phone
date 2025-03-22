<script>
  export let callerPeerId;
  export let onAccept;
  export let onReject;
</script>

<div class="popup-overlay">
  <div class="popup">
    <h3>Incoming Call</h3>
    <p>From: {callerPeerId}</p>
    <div class="buttons">
      <button class="accept-btn" on:click={onAccept} aria-label="Accept call">
        <i class="fas fa-phone"></i>
      </button>
      <button class="reject-btn" on:click={onReject} aria-label="Reject call">
        <i class="fas fa-phone-slash"></i>
      </button>
    </div>
  </div>
</div>

<style>
  .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .popup {
    background-color: white;
    padding: 20px;
    border-radius: 10px;
    width: 300px;
    max-width: 90%;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    text-align: center;
  }

  h3 {
    margin-top: 0;
    color: #333;
  }

  p {
    margin-bottom: 20px;
    color: #666;
    word-break: break-all;
  }

  .buttons {
    display: flex;
    justify-content: center;
    gap: 20px;
  }

  .accept-btn, .reject-btn {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: white;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .accept-btn {
    background-color: #4CAF50;
  }

  .reject-btn {
    background-color: #F44336;
  }

  .accept-btn:hover, .reject-btn:hover {
    transform: scale(1.1);
  }
</style>