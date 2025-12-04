import * as crypto from "crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@config/config.service";

@Injectable()
export class UploadService {
  constructor(private readonly config: ConfigService) {}

  private get publicKey() {
    return this.config.get<string>("IMAGEKIT_PUBLIC_KEY");
  }

  private get privateKey() {
    return this.config.get<string>("IMAGEKIT_PRIVATE_KEY");
  }

  private get urlEndpoint() {
    return this.config.get<string>("IMAGEKIT_URL_ENDPOINT");
  }

  generateSignature() {
    const token = crypto.randomBytes(16).toString("hex");
    const expire = Math.floor(Date.now() / 1000) + 600;
    const privateKey = this.privateKey ?? "";
    const signature = crypto
      .createHmac("sha1", privateKey)
      .update(token + expire)
      .digest("hex");

    return {
      token,
      expire,
      signature,
      publicKey: this.publicKey,
      urlEndpoint: this.urlEndpoint,
    };
  }

  async uploadFromServer(fileBuffer: Buffer, fileName: string) {
    const auth = Buffer.from(`${this.privateKey}:`).toString("base64");

    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: fileBuffer.toString("base64"),
        fileName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ImageKit upload failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async deleteImages(fileIds: string[], concurrency = 5) {
    if (!fileIds.length) return [];

    const auth = Buffer.from(`${this.privateKey}:`).toString("base64");
    const results: { fileId: string; success: boolean; error?: string }[] = [];

    const deleteFile = async (fileId: string) => {
      try {
        const res = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
          method: "DELETE",
          headers: { Authorization: `Basic ${auth}` },
        });

        if (!res.ok) {
          return {
            fileId,
            success: false,
            error: `${res.status} ${await res.text()}`,
          };
        }

        return { fileId, success: true };
      } catch (err: any) {
        return { fileId, success: false, error: String(err) };
      }
    };

    // concurrency-limited runner
    const queue = [...fileIds];
    const workers: Promise<void>[] = [];

    for (let i = 0; i < concurrency; i++) {
      workers.push(
        (async () => {
          while (queue.length) {
            const id = queue.shift()!;
            const result = await deleteFile(id);
            results.push(result);
          }
        })(),
      );
    }

    await Promise.all(workers);
    return results;
  }
}
