import type { WakuPhoneMessage } from "./waku";
import { MediaStreams } from "./media";

export enum CallState {
  IDLE = "IDLE",
  CALLING = "CALLING",
  RINGING = "RINGING",
  IN_CALL = "IN_CALL",
  ENDED = "ENDED",
}

export enum Role {
  Caller = "Caller",
  Called = "Called"
}

type HandleIceCandidatesCallback = (event: RTCPeerConnectionIceEvent) => void;

type CallParams = {
  role: Role,
  callId: string;
  callerId: string;
  calledId: string;
  events: EventTarget;
  localAudio: HTMLAudioElement;
  remoteAudio: HTMLAudioElement;
  handleIceCandidates: HandleIceCandidatesCallback,
};

const DEFAULT_STUN = "stun:stun.l.google.com:19302";

export class Call {
  private readonly role: Role;
  public readonly callId: string;
  public readonly calledId: string;
  public readonly callerId: string;
  private readonly events: EventTarget;
  private readonly mediaStreams: MediaStreams;
  private readonly handleIceCandidates: HandleIceCandidatesCallback;

  private rtcConnection: RTCPeerConnection;
  private outboundChannel: RTCDataChannel;
  private inboundChannel?: RTCDataChannel;

  constructor(params: CallParams) {
    this.role = params.role;
    this.callId = params.callId;
    this.calledId = params.calledId;
    this.callerId = params.callerId;
    this.events = params.events;
    this.handleIceCandidates = params.handleIceCandidates;

    this.rtcConnection = new RTCPeerConnection({
      iceServers: [{ urls: DEFAULT_STUN }],
    });
    this.outboundChannel = this.rtcConnection.createDataChannel("outbound");

    this.onStateChange = this.onStateChange.bind(this);

    this.mediaStreams = new MediaStreams(params.localAudio, params.remoteAudio, this.rtcConnection);

    // DO NOT REMOVE IT!!!!!!!!!!
    this.rtcConnection.addEventListener("datachannel", (event) => {
      this.inboundChannel = event.channel;
      this.inboundChannel.addEventListener("message", (event) => {
        console.log("Received message:", event.data);
      });
    });
    this.rtcConnection.addEventListener("connectionstatechange", this.onStateChange);
    this.rtcConnection.addEventListener("icecandidate", this.handleIceCandidates);

  } 

  public async start(): Promise<void> {
    await this.mediaStreams.setupLocalStream();
    await this.mediaStreams.setupRemoteStream();
  }

  public isForWakuMessage(message: WakuPhoneMessage): boolean {
    return message?.calledPeerId === this.calledId && message.callerPeerId === this.callerId;
  }

  public async stop(): Promise<void> {
    if (!this.rtcConnection) {
      return;
    }

    this.outboundChannel.close();
    this.rtcConnection.removeEventListener("icecandidate", this.handleIceCandidates);
    this.rtcConnection.close();

    this.mediaStreams.stopStreams();
  }

  public async prepareOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.rtcConnection.createOffer();
    await this.rtcConnection.setLocalDescription(offer);

    this.events.dispatchEvent(new CustomEvent(
      "call:state",
      { detail: CallState.RINGING }
    ));

    return offer;
  }

  public async setRemoteDescription(offer: object): Promise<void> {
    await this.rtcConnection.setRemoteDescription(
      new RTCSessionDescription(offer as RTCSessionDescriptionInit)
    );
  }

  public async prepareAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.rtcConnection.createAnswer();
    this.rtcConnection.setLocalDescription(answer);

    return answer;
  }

  public async acceptCandidate(candidate: object): Promise<void> {
    await this.rtcConnection.addIceCandidate(
      new RTCIceCandidate(candidate)
    );
  }

  public async acceptAnswer(answer: object): Promise<void> {
    await this.rtcConnection.setRemoteDescription(
      new RTCSessionDescription(answer as RTCSessionDescriptionInit)
    );
  }

  private onStateChange(_event: Event): void {
    const endState = ["closed", "failed", "disconnected"].includes(this.rtcConnection.connectionState);
    if (endState) {
      this.events.dispatchEvent(new CustomEvent(
        "call:state",
        { detail: CallState.ENDED }
      ));
      return;
    }

    if (this.rtcConnection.connectionState === "connected") {
      this.events.dispatchEvent(new CustomEvent(
        "call:state",
        { detail: CallState.IN_CALL }
      ));
      return;
    }
  }

  public isOriginator(): boolean {
    return this.role === Role.Caller;
  }
}
