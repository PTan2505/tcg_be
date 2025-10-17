import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.bucketName = process.env.AWS_S3_BUCKET_NAME!;
  }

  async uploadFile(folder:string,file: Buffer, fileName: string, mimeType: string): Promise<string> {
    const key = `${folder}/${uuidv4()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: mimeType,
      ACL: "public-read", // Make images publicly accessible
    });

    try {
      await this.s3Client.send(command);
      return `https://${this.bucketName}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
    } catch (error) {
      console.error("Error uploading file to S3:", error);
      const { getMessage } = require('../constants/messages');
      const AppError = require('../errors/AppError').default;
      throw new AppError(getMessage('ERRORS.INTERNAL_SERVER_ERROR'), 500, { cause: error });
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract key from URL
      const url = new URL(fileUrl);
      const key = url.pathname.substring(1); // Remove leading slash

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error("Error deleting file from S3:", error);
      const { getMessage } = require('../constants/messages');
      const AppError = require('../errors/AppError').default;
      throw new AppError(getMessage('ERRORS.INTERNAL_SERVER_ERROR'), 500, { cause: error });
    }
  }

  async getSignedUrlForUpload(fileName: string, mimeType: string): Promise<{ uploadUrl: string; fileUrl: string }> {
    const key = `posts/${uuidv4()}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: mimeType,
      ACL: "public-read",
    });

    try {
      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // 1 hour
      const fileUrl = `https://${this.bucketName}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
      
      return { uploadUrl, fileUrl };
    } catch (error) {
      console.error("Error generating signed URL:", error);
      const { getMessage } = require('../constants/messages');
      const AppError = require('../errors/AppError').default;
      throw new AppError(getMessage('ERRORS.INTERNAL_SERVER_ERROR'), 500, { cause: error });
    }
  }
}