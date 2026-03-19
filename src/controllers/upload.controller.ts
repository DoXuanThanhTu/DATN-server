import crypto from "crypto";
import { Request, Response } from "express";

export const getAuth = (req: Request, res: Response) => {
  const token = crypto.randomBytes(16).toString("hex");
  const expire = Math.floor(Date.now() / 1000) + 300;

  const signature = crypto
    .createHmac("sha1", process.env.IMAGEKIT_PRIVATE!)
    .update(token + expire)
    .digest("hex");

  res.json({
    publicKey: process.env.IMAGEKIT_PUBLIC,
    token,
    expire,
    signature,
  });
};
