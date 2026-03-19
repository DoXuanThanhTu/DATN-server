import { Request, Response } from "express";
import ImageKit from "imagekit";
import dotenv from "dotenv";
dotenv.config();
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC as string,
  privateKey: process.env.IMAGEKIT_PRIVATE as string,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT as string,
});

export const deletePhoto = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { fileId } = req.params;
    if (!fileId)
      return res.status(400).json({ success: false, message: "Thiếu fileId" });

    await imagekit.deleteFile(fileId as string);
    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (error: any) {
    if (
      error.path === "deleteFile" &&
      error["$metadata"]?.httpStatusCode === 404
    ) {
      return res
        .status(200)
        .json({ success: true, message: "Already deleted" });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
};
