<script lang="ts">
    export let callerPeerId: string;
    export let onAccept: () => void;
    export let onReject: () => void;
  </script>
  
  <div class="popup">
    <h2>Incoming Call</h2>
    <p>Caller Peer ID: {callerPeerId}</p>
    <div class="button-group">
      <button onclick={onAccept} class="accept-button">
        <i class="fas fa-phone"></i>
    </button>
    <button onclick={onReject} class="reject-button">
        <i class="fas fa-phone-slash"></i>
    </button>
    </div>
  </div>
  
  <style>
    .popup {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: white;
      padding: 2rem;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      z-index: 1000;
    }
  
    .button-group {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }
  
    .accept-button {
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      padding: 0.5rem 1rem;
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  
    .reject-button {
      background-color: red;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      padding: 0.5rem 1rem;
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  
    .accept-button:hover {
      background-color: #45a049;
    }
  
    .reject-button:hover {
      background-color: darkred;
    }
  </style>