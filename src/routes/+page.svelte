<script lang="ts">
  import { Waku, WakuRTC } from "$lib";
  import { MediaStreams } from "$lib/media";

    let inputValue = '';
    let localAudio: HTMLAudioElement, remoteAudio : HTMLAudioElement;
    var localPeerId = $state('');
    var wakuRtc: WakuRTC;
    let mediaStreams: MediaStreams;
    let wakuConnected = $state(false);
    let isFree = $state(true);
    async function handleConnect() {
      const node = await Waku.get();
      localPeerId = node.peerId.toString();
      // @ts-ignore
      window.waku = node;
      wakuConnected = node.isConnected();

      wakuRtc = new WakuRTC({ node});
      await wakuRtc.start();
      mediaStreams = new MediaStreams(localAudio, remoteAudio, wakuRtc.rtcConnection);
      wakuRtc.mediaStreams = mediaStreams;
      isFree = wakuRtc.isFree;
      // @ts-ignore
      window.initiateConn = wakuRtc.initiateConnection.bind(wakuRtc);
      //@ts-ignore
      window.sendMessage = wakuRtc.sendChatMessage.bind(wakuRtc);
      await setupStreams();
    }

    async function setupStreams(){
      mediaStreams.setupLocalStream();
      mediaStreams.setupRemoteStream();
    }

    async function makeCall() {
      if (inputValue) {
        //await setupStreams();
        // @ts-ignore
        await window.initiateConn(inputValue);
      }
    }

    function hangUpCall(){
      if (wakuRtc.rtcConnection) {
        wakuRtc.hangupCall();
        wakuRtc.rtcConnection.close();
        //wakuRtc.rtcConnection = null;
      }
      mediaStreams.stopStreams();
    }

</script>

<h1>WebRTC Calling with Waku Signalling</h1>
<p>Visit <a href="https://waku.org">waku</a> to read the documentation</p>
<div>
<button on:click={handleConnect} disabled={wakuConnected}>{wakuConnected ? 'Connected' : 'Connect to Network'}</button>
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
  <button on:click={makeCall}>Call</button>
  <button on:click={hangUpCall} >Hangup-Call</button>
</div>
<div id="audio">
  <div>
      <audio bind:this={localAudio}  autoplay controls muted hidden></audio>
      </div>
  <div>
      <audio bind:this={remoteAudio} autoplay controls hidden></audio>
  </div>
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
