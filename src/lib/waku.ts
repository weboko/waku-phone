import { createLightNode, type LightNode } from "@waku/sdk";
import { Local } from "./local-storage";

export class Waku {
  private static promise: Promise<LightNode>;

  public static async get(): Promise<LightNode> {
    if (Waku.promise) {
      return await Waku.promise;
    }

    Waku.promise = (async (): Promise<LightNode> => {
      const identity = await Local.getIdentity();
    
      const node = await createLightNode({
        defaultBootstrap: false,
        networkConfig: {
          clusterId: 42,
          shards: [0, 1, 3, 4, 5, 6, 7, 8]
        },
        libp2p: {
          privateKey: identity,
        }
      });
      await node.start()
      await node.dial("/dns4/waku-test.bloxy.one/tcp/8095/wss/p2p/16Uiu2HAmSZbDB7CusdRhgkD81VssRjQV5ZH13FbzCGcdnbbh6VwZ");

      return node;
    })();

    return Waku.promise;
  }
}
