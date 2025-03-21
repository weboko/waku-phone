
export class MediaStreams {

    private localStream?: MediaStream;
    private localAudioElement: HTMLAudioElement;
    private remoteAudioElement: HTMLAudioElement;
    private rtcConnection: RTCPeerConnection;

    public constructor(
        localAudioElement: HTMLAudioElement, 
        remoteAudioElement: HTMLAudioElement,
        rtcConnection: RTCPeerConnection) {
        this.rtcConnection = rtcConnection;
        this.localAudioElement = localAudioElement;
        this.remoteAudioElement = remoteAudioElement;   
    }

    public async setupLocalStream(): Promise<void> {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.localAudioElement.srcObject = this.localStream;
        this.localStream.getAudioTracks().forEach(track => {
            console.log("DEBUG: getAudioTracks localStream", track);
            this.rtcConnection.addTrack(track, this.localStream!);
        });
    }

    public async setupRemoteStream(): Promise<void> {
        this.rtcConnection.addEventListener("track", e => {
            console.log("DEBUG: setupRemoteStream track", e);
            this.remoteAudioElement.srcObject = e.streams[0];
          });
    }

    public async stopStreams(): Promise<void> {
        this.localStream?.getTracks().forEach(track => track.stop());
    }
}