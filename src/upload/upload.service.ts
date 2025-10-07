import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  constructor(private readonly config: ConfigService) {}

  private get privateKey() {
    return this.config.get<string>('IMAGEKIT_PRIVATE_KEY', '');
  }

  private get publicKey() {
    return this.config.get<string>('IMAGEKIT_PUBLIC_KEY', '');
  }

  private get urlEndpoint() {
    return this.config.get<string>('IMAGEKIT_URL_ENDPOINT', '');
  }

  generateSignature() {
    const timestamp = Math.floor(Date.now() / 1000);
    const hashValue = timestamp + this.privateKey;
    const signature = crypto.createHash('sha1').update(hashValue).digest('hex');

    return {
      signature,
      expire: timestamp,
      token: crypto.randomBytes(16).toString('hex'),
      publicKey: this.publicKey,
      urlEndpoint: this.urlEndpoint,
    };
  }

  async uploadFromServer(fileBuffer: Buffer, fileName: string) {
    const auth = Buffer.from(`${this.privateKey}:`).toString('base64');

    const response = await fetch(
      'https://upload.imagekit.io/api/v1/files/upload',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: fileBuffer.toString('base64'),
          fileName,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ImageKit upload failed: ${response.status} ${errorText}`,
      );
    }

    return response.json();
  }
}
