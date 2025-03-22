import type { Ed25519PrivateKey } from "@libp2p/interface";

import { hexToBytes } from "@waku/utils/bytes";
import { generateKeyPairFromSeed } from "@libp2p/crypto/keys";

import { sha256, generateRandomPhoneNumber } from "./utils";

export class Local {
  public static LOCAL_ID_KEY = "local-id";

  public static async getIdentity(): Promise<Ed25519PrivateKey> {
    const phoneNumber = Local.getPhoneNumber();

    const hash = await sha256(phoneNumber);
    const seed = hash.slice(0, 64);

    localStorage.setItem(this.LOCAL_ID_KEY, phoneNumber);

    return await generateKeyPairFromSeed("Ed25519", hexToBytes(seed));
  }

  public static getPhoneNumber(): string {
    let phoneNumber = localStorage.getItem(this.LOCAL_ID_KEY);

    if (!phoneNumber) {
      phoneNumber = generateRandomPhoneNumber();
    }

    return phoneNumber;
  }

  public static setDebug(): void {
    localStorage.setItem('debug', 'waku*');
  }
}