import { utils } from "@waku/sdk";

import { WakuPhoneMessageType, type Waku, type WakuPhoneMessage } from "./waku";
import { Call, CallState, Role } from "./call";
import { AudioSignal, SignalType } from "./audiosignal";
import { Local } from "./local-storage";

type PhoneParams = {
  waku: Waku;
  systemAudio: HTMLAudioElement;
  localAudio: HTMLAudioElement;
  remoteAudio: HTMLAudioElement;
};

type EventListener = (e: Event) => void;

const logger = new utils.Logger("Phone");

export class Phone {
  private isStarted = false;

  private readonly waku: Waku;

  private call?: Call;
  private readonly audioSignal: AudioSignal;

  public readonly events = new EventTarget();

  constructor(private readonly params: PhoneParams) {
    this.waku = params.waku;
    this.audioSignal = new AudioSignal(params.systemAudio);

    this.onSystemMessage = this.onSystemMessage.bind(this);
    this.handleCallStateChange = this.handleCallStateChange.bind(this);
  }

  public async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    this.waku.events.addEventListener("message", this.onSystemMessage as unknown as EventListener);
    this.events.addEventListener("call:state", this.handleCallStateChange as unknown as EventListener);

    this.isStarted = true;
  }

  public async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    this.waku.events.removeEventListener("message", this.onSystemMessage as unknown as EventListener);
    this.events.removeEventListener("call:state", this.handleCallStateChange as unknown as EventListener);
    await this.call?.stop?.();
    this.call = undefined;

    this.isStarted = false;
  }

  public async dial(peerId: string): Promise<void> {
    const callId = crypto.randomUUID();
    const callerPeerId = this.waku.peerId;
    const calledPeerId = peerId;

    this.call = new Call({
      role: Role.Caller,
      callId,
      callerId: callerPeerId,
      calledId: calledPeerId,
      events: this.events,
      localAudio: this.params.localAudio,
      remoteAudio: this.params.remoteAudio,
      handleIceCandidates: (
        async (event: any) => {
          console.log("DEBUG: handleIceCandidates", event);
          
          if (!event.candidate) {
            return;
          }
  
          await this.waku.sendCandidateMessage({
            callId,
            callerPeerId,
            calledPeerId,
            webrtcData: event.candidate,
            recipient: calledPeerId,
          });
        }).bind(this)
      });
    await this.call.start();

    const offer = await this.call.prepareOffer();
    await this.waku.sendDialMessage({
      callId: callId,
      callerPeerId:callerPeerId,
      calledPeerId:calledPeerId,
      recipient: calledPeerId,
      webrtcData: offer,
      callerPhoneNumber: Local.getPhoneNumber() || "unknown",
    });
  }

  public async hangup(): Promise<void> {
    if (!this.call) {
      logger.warn("hangup: no ongoing calls, ignoring");
      return;
    }

    this.audioSignal.stopSignal();

    await this.waku.sendByeMessage({
      callId: this.call.callId,
      calledPeerId: this.call.calledId,
      callerPeerId: this.call.callerId,
      recipient: this.getRecepient(this.call.calledId, this.call.callerId),
    });

    this.events.dispatchEvent(new CustomEvent(
      "hangup",
      { detail: true }
    ));

    this.call.stop();
    this.call = undefined;
  }

  public async answerCall(): Promise<void> {
    if (!this.call) {
      logger.warn("answerCall: no ongoing calls, ignoring");
      return;
    }
    const answer = await this.call.prepareAnswer();

    await this.waku.sendAnswerMessage({
      callId: this.call.callId,
      calledPeerId: this.call.calledId!,
      callerPeerId: this.call.callerId!,
      webrtcData: answer,
      recipient: this.getRecepient(this.call.calledId!, this.call.callerId!),
    });
  }

  public async rejectCall(): Promise<void> {
    if (!this.call) {
      logger.warn("rejectCall: no ongoing calls, ignoring");
      return;
    }
    await this.waku.sendRejectMessage({
      callId: this.call.callId,
      calledPeerId: this.call.calledId!,
      callerPeerId: this.call.callerId!,
      recipient: this.getRecepient(this.call.calledId!, this.call.callerId!),
    });
    this.call.stop();
    this.call = undefined;
  }

  private async onSystemMessage(event: CustomEvent<WakuPhoneMessage>): Promise<void> {
    const message = event.detail;

    console.log("onSystemMessage: received message:", message);
    if (message.messageType === WakuPhoneMessageType.DIAL) {
      await this.handleDialMessage(message);
      return;
    }
    
    if (message.messageType === WakuPhoneMessageType.RINGING) {
      await this.handleRingingMessage(message);
      return;
    }

    if (message.messageType === WakuPhoneMessageType.CANDIDATE) {
      await this.handleCandidateMessage(message);
      return;
    }

    if (message.messageType === WakuPhoneMessageType.ANSWER) {
      await this.handleAnswerMessage(message);
      return;
    }

    if (message.messageType === WakuPhoneMessageType.REJECT) {
      await this.handleRejectMessage(message);
      return;
    }

    if (message.messageType === WakuPhoneMessageType.BYE) {
      await this.handleByeMessage(message);
      return;
    }

    logger.warn("onSystemMessage: got unknown type of message", message);
  }

  private async handleDialMessage(message: WakuPhoneMessage): Promise<void> {
    if (this?.call?.isForWakuMessage(message)) {
      logger.warn("handleDialMessage: received dial for same ongoing call, ignoring");
      return;
    }
    
    if (this.call) {
      logger.warn(`handleDialMessage: received ${WakuPhoneMessageType.DIAL} message while having a call, rejecting`);
      await this.waku.sendRejectMessage({
        callId: message.callId,
        calledPeerId: message.calledPeerId!,
        callerPeerId: message.callerPeerId!,
        recipient: this.getRecepient(message.calledPeerId!, message.callerPeerId!),
      });
      return;
    }

    this.call = new Call({
      role: Role.Called,
      callId: message.callId,
      callerId: message.callerPeerId!,
      calledId: message.calledPeerId!,
      events: this.events,
      localAudio: this.params.localAudio,
      remoteAudio: this.params.remoteAudio,
      handleIceCandidates: (async (event: any) => {
        console.log("DEBUG: handleIceCandidates", event);

        if (!event.candidate) {
          return;
        }

        await this.waku.sendCandidateMessage({
          callId: message.callId,
          callerPeerId: message.callerPeerId!,
          calledPeerId: message.calledPeerId!,
          webrtcData: event.candidate,
          recipient: this.getRecepient(message.calledPeerId!, message.callerPeerId!),
        });
      }).bind(this),
    });
    await this.call.start();
    await this.call.setRemoteDescription(message.webrtcData!);

    await this.waku.sendRingingMessage({
      callId: message.callId,
      callerPeerId: message.callerPeerId!,
      calledPeerId: message.calledPeerId!,
      recipient: this.getRecepient(message.calledPeerId!, message.callerPeerId!),
    });

    this.events.dispatchEvent(new CustomEvent('incomingCall', {
      detail: {
        callerPeerId: message.callerPeerId,
        callId: message.callId,
        callerPhoneNumber: message.callerPhoneNumber,
      }
    }));
  }

  private async handleRingingMessage(message: WakuPhoneMessage): Promise<void> {
    if (!this.call) {
      logger.warn("handleRingingMessage: no ongoing calls, ignoring");
      return;
    }

    if (this.call && !this.call.isForWakuMessage(message)) {
      logger.warn(`handleRingingMessage: received ${WakuPhoneMessageType.RINGING} message for different call than ongoing, rejecting`);
      await this.waku.sendRejectMessage({
        callId: message.callId,
        calledPeerId: message.calledPeerId!,
        callerPeerId: message.callerPeerId!,
        recipient: this.getRecepient(message.calledPeerId!, message.callerPeerId!),
      });
      return;
    }
  }

  private async handleCandidateMessage(message: WakuPhoneMessage): Promise<void> {
    if (!this.call) {
      logger.warn("handleCandidateMessage: no ongoing calls, ignoring");
      return;
    }

    if (this.call && !this.call.isForWakuMessage(message)) {
      logger.warn(`handleCandidateMessage: received ${WakuPhoneMessageType.CANDIDATE} message for different call than ongoing, rejecting`);
      await this.waku.sendRejectMessage({
        callId: message.callId,
        calledPeerId: message.calledPeerId!,
        callerPeerId: message.callerPeerId!,
        recipient: this.getRecepient(message.calledPeerId!, message.callerPeerId!),
      });
      return;
    }

    if (!message.webrtcData) {
      logger.warn("handleCandidateMessage: missing webrtcData field, ignoring");
      return;
    }

    await this.call.acceptCandidate(message.webrtcData!);
  }

  private async handleAnswerMessage(message: WakuPhoneMessage): Promise<void> {
    if (!this.call) {
      logger.warn("handleAnswerMessage: no ongoing calls, ignoring");
      return;
    }

    if (this.call && !this.call.isForWakuMessage(message)) {
      logger.warn(`handleAnswerMessage: received ${WakuPhoneMessageType.ANSWER} message for different call than ongoing, rejecting`);
      await this.waku.sendRejectMessage({
        callId: message.callId,
        calledPeerId: message.calledPeerId!,
        callerPeerId: message.callerPeerId!,
        recipient: this.getRecepient(message.calledPeerId!, message.callerPeerId!),
      });
      return;
    }

    if (!message.webrtcData) {
      logger.warn("handleAnswerMessage: missing webrtcData field, ignoring");
      return;
    }

    await this.call.acceptAnswer(message.webrtcData);
  }

  private async handleRejectMessage(message: WakuPhoneMessage): Promise<void> {
    if (this.call && !this.call.isForWakuMessage(message)) {
      logger.warn(`handleRejectMessage: received ${WakuPhoneMessageType.REJECT} message for different call than ongoing, ignoring`);
      return;
    }

    await this.hangup();
  }

  private async handleByeMessage(message: WakuPhoneMessage): Promise<void> {
    if (this.call && !this.call.isForWakuMessage(message)) {
      logger.warn(`handleByeMessage: received ${WakuPhoneMessageType.BYE} message for different call than ongoing, ignoring`);
      return;
    }

    await this.hangup();
  }

  private handleCallStateChange(event: CustomEvent<CallState>): void {
    if (event.detail === CallState.RINGING) {
      this.audioSignal.playSignal(SignalType.RINGING);
    }else if (event.detail === CallState.IN_CALL) {
      this.audioSignal.stopSignal();
    }
  }

  private getRecepient(calledPeerId: string, callerPeerId: string):string {
    if (this.call?.isOriginator()){
      return calledPeerId!;
    }else{
      return callerPeerId!;
    }
  }
}
