import type { Ed25519PrivateKey } from "@libp2p/interface";

import { hexToBytes } from "@waku/utils/bytes";
import { generateKeyPairFromSeed } from "@libp2p/crypto/keys";

import { sha256, generateRandomPhoneNumber } from "./utils";

export class Local {
  public static LOCAL_ID_KEY = "local-id";

  public static async getIdentity(): Promise<Ed25519PrivateKey> {
    // Generate a new random 6-digit phone number
    const phoneNumber = generateRandomPhoneNumber();

    // Hash the phone number to get a 32-byte seed
    const hash = await sha256(phoneNumber);
    const seed = hash.slice(0, 64); // Take the first 64 characters (32 bytes)

    // Store the phone number in localStorage
    localStorage.setItem(this.LOCAL_ID_KEY, phoneNumber);

    // Generate the key pair from the new seed
    return await generateKeyPairFromSeed("Ed25519", hexToBytes(seed));
  }

  public static setDebug(): void {
    localStorage.setItem('debug', 'waku*');
  }
}