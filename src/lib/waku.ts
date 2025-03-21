import { 
  type LightNode, 
  type IDecodedMessage, 
  type IDecoder, 
  type IEncoder,
  createLightNode, 
  createDecoder, 
  createEncoder, 
  bytesToUtf8, 
  utf8ToBytes, 
  utils,
} from "@waku/sdk";

import { Local } from "./local-storage";

const DEFAULT_CONTENT_TOPIC = "/waku-phone/1/sig01/proto";

const logger = new utils.Logger("Waku");

export enum WakuPhoneMessageType {
  DIAL = "DIAL",
  RINGING = "RINGING",
  CANDIDATE = "CANDIDATE",
  ANSWER = "ANSWER",
  REJECT = "REJECT",
  BYE = "BYE"
}

export type WakuPhoneMessage = {
  messageType: WakuPhoneMessageType;
  callId: string;
  callerPeerId?: string;
  callerDisplayName?: string;
  calledPeerId?: string;
  calledDisplayName?: string;
  webrtcData?: object;
  recipient?:string;
};

type AppParams = {
  callId: string;
  callerPeerId: string;
  calledPeerId: string;
  recipient:string;
};

type WebRTCParams = {
  callId: string;
  callerPeerId: string;
  calledPeerId: string;
  webrtcData: RTCSessionDescriptionInit | RTCIceCandidate;
  recipient:string;
};

type DialParams = AppParams;

// includes WebRTC offer
type RingingParams = WebRTCParams;

// includes WebRTC answer
type AnswerParams = WebRTCParams;

// includes WebRTC ICE candidate
type CandidateParams = WebRTCParams;

type RejectParams = AppParams;

type ByeParams = AppParams;

export class Waku {
  private static instance: Waku;
  private static promise: Promise<LightNode>;

  public static async get(debug = true): Promise<Waku> {
    if (debug) {
      Local.setDebug();
    }

    if (Waku.promise) {
      await Waku.promise;
      return Waku.instance;
    }

    Waku.promise = Waku.createNode();
    Waku.instance = new Waku(await Waku.promise);

    return Waku.instance;
  }

  private static async createNode(): Promise<LightNode> {
    const identity = await Local.getIdentity();
    
    const node = await createLightNode({
      defaultBootstrap: false,
      networkConfig: {
        clusterId: 42,
        shards: [0]
      },
      libp2p: {
        privateKey: identity,
      }
    });
    await node.start()
    await node.dial("/dns4/waku-test.bloxy.one/tcp/8095/wss/p2p/16Uiu2HAmSZbDB7CusdRhgkD81VssRjQV5ZH13FbzCGcdnbbh6VwZ");
    // await node.dial("/dns4/vps-aaa00d52.vps.ovh.ca/tcp/8000/wss/p2p/16Uiu2HAm9PftGgHZwWE3wzdMde4m3kT2eYJFXLZfGoSED3gysofk");

    return node;
  }

  private isLocked = false;
  private isStarted = false;

  private encoder: IEncoder;
  private decoder: IDecoder<any>;
  private filterUnsubscribe: undefined | (() => void);

  public events: EventTarget;

  private constructor(private readonly node: LightNode) {
    this.events = new EventTarget();

    this.encoder = createEncoder({
      contentTopic: DEFAULT_CONTENT_TOPIC,
      pubsubTopicShardInfo: {
        clusterId: 42,
        shard: 0
      }
    });

    this.decoder = createDecoder(DEFAULT_CONTENT_TOPIC, { clusterId: 42 , shard: 0});
  }

  public get peerId(): string {
    return this.node.peerId.toString();
  }

  public async start(): Promise<void> {
    if (this.isLocked || this.isStarted) {
      return;
    }

    this.isLocked = true;

    try {
      this.filterUnsubscribe = await this.node.filter.subscribeWithUnsubscribe(this.decoder, this.onMessage.bind(this));
    } catch(e) {
      console.error("Error while Filter subscribe:", e);
    }

    this.isLocked = false;
    this.isStarted = true;
  }

  public async stop(): Promise<void> {
    if (this.isLocked || !this.isStarted) {
      return;
    }

    this.isLocked = true;

    try {
      this?.filterUnsubscribe?.();
    } catch(e) {
      console.error("Error while Filter unsubscribe:", e);
    }

    this.isLocked = false;
    this.isStarted = false;
  }

  public async sendDialMessage(params: DialParams): Promise<void> {
    return this.sendMessage({
      ...params,
      messageType: WakuPhoneMessageType.DIAL,
    });
  }

  public async sendRingingMessage(params: RingingParams): Promise<void> {
    return this.sendMessage({
      ...params,
      messageType: WakuPhoneMessageType.RINGING,
    });
  }

  public async sendAnswerMessage(params: AnswerParams): Promise<void> {
    return this.sendMessage({
      ...params,
      messageType: WakuPhoneMessageType.ANSWER,
    });
  }

  public async sendRejectMessage(params: RejectParams): Promise<void> {
    return this.sendMessage({
      ...params,
      messageType: WakuPhoneMessageType.REJECT,
    });
  }

  public async sendCandidateMessage(params: CandidateParams): Promise<void> {
    return this.sendMessage({
      ...params,
      messageType: WakuPhoneMessageType.CANDIDATE,
    });
  }

  public async sendByeMessage(params: ByeParams): Promise<void> {
    return this.sendMessage({
      ...params,
      messageType: WakuPhoneMessageType.BYE,
    });
  }

  private async onMessage(message: IDecodedMessage): Promise<void> {
    try {
      const payload = bytesToUtf8(message.payload);
      const data: WakuPhoneMessage = JSON.parse(payload);

      console.log("DEBUG: onMessage:", data);

      if (!data.messageType || !data.calledPeerId || !data.callerPeerId) {
        logger.warn("onMessage: wrong shape of payload", payload);
        return;
      }

      if (data.recipient !== this.node.peerId.toString()) {
          logger.info("onMessage: ignoring as i am not intended recipient", data.recipient  , this.node.peerId.toString());
          return;
      }

      logger.info("onMessage: dispatching received message");

      this.events.dispatchEvent(
        new CustomEvent<WakuPhoneMessage>(
          "message",
          { detail: data }
        )
      );
    } catch(e) {
      logger.error("onMessage: failed", e);
    }
  }

  private async sendMessage(message: WakuPhoneMessage): Promise<void> {
    const payload = JSON.stringify(message);
    const response = await this.node.lightPush.send(this.encoder, {
      payload: utf8ToBytes(payload),
    });
    logger.info(`Waku: sendWakuMessage of type:${message.messageType},  response:${JSON.stringify(response)}, payload:${payload}`);
  }
}
