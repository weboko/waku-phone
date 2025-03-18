import { bytesToHex } from "@waku/utils/bytes";

export const sha256 = async (number: number | string ): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(number.toString());
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(buffer));
};

export const generateRandomNumber = (): number => {
  return Math.floor(Math.random() * 1000000);
};
