import { bytesToHex, hexToBytes } from "@waku/utils/bytes";
import { generateKeyPairFromSeed } from "@libp2p/crypto/keys";
import type { Ed25519PrivateKey } from "@libp2p/interface";
import { peerIdFromPublicKey } from "@libp2p/peer-id";

export const sha256 = async (number: number | string ): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(number.toString());
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(buffer));
};

export const generateRandomNumber = (): number => {
  return Math.floor(Math.random() * 1000000);
};

export const getKeyPairFromPhoneNumber = async (phoneNumber: string): Promise<Ed25519PrivateKey> => {
  if (phoneNumber.length !== 6) {
    throw new Error("Phone number must be 6 digits");
  }
  const hash = await sha256(phoneNumber);
  const seed = hash.slice(0, 64);
  return await generateKeyPairFromSeed("Ed25519", hexToBytes(seed));
};

export const getPeerIdFromPhoneNumber = async (phoneNumber: string): Promise<string> => {
  const keyPair = await getKeyPairFromPhoneNumber(phoneNumber);
  const peerId = peerIdFromPublicKey(keyPair.publicKey);
  return peerId.toString();
};

export const generateRandomPhoneNumber = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
