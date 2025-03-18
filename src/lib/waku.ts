import { createLightNode, type LightNode } from "@waku/sdk";
import { Local } from "./localStorage";

export class Waku {
  private static _self: Waku;
  private readonly node: LightNode;

  public static async create(): Promise<Waku> {
    if (Waku._self) {
      return Waku._self;
    }

    const identity = await Local.getIdentity();
    const node = await createLightNode({
      defaultBootstrap: true,
      libp2p: {
        privateKey: identity,
      }
    });
    
    Waku._self = new Waku(node);

    return Waku._self;
  }

  private constructor(node: LightNode) {
    this.node = node;
  }
}
