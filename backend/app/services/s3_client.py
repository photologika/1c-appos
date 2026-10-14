import os
import aioboto3

S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "admin")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "password")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "street-photo")

class S3Client:
    def __init__(self):
        self.session = aioboto3.Session()

    async def upload_file(self, file_bytes: bytes, object_name: str, content_type: str = "image/jpeg"):
        async with self.session.client(
            "s3",
            endpoint_url=S3_ENDPOINT_URL,
            aws_access_key_id=S3_ACCESS_KEY,
            aws_secret_access_key=S3_SECRET_KEY,
        ) as s3:
            await s3.put_object(
                Bucket=S3_BUCKET_NAME,
                Key=object_name,
                Body=file_bytes,
                ContentType=content_type,
            )
            return object_name

    async def generate_presigned_url(self, object_name: str, expiration=3600):
        async with self.session.client(
            "s3",
            endpoint_url=S3_ENDPOINT_URL,
            aws_access_key_id=S3_ACCESS_KEY,
            aws_secret_access_key=S3_SECRET_KEY,
        ) as s3:
            response = await s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': S3_BUCKET_NAME, 'Key': object_name},
                ExpiresIn=expiration
            )
            return response

s3_client = S3Client()
