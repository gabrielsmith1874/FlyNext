/**
 * Uploads an image file to the server and returns the URL
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The URL of the uploaded image
 */
export interface UploadResponse {
  url: string;
}

export async function uploadImage(file: File): Promise<string> {
  console.log('Starting image upload for file:', file.name);

  try {
    const formData = new FormData();
    formData.append('file', file);

    console.log('Form data created with file');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const data: UploadResponse = await response.json();
    console.log('Upload successful, received data:', data);

    return data.url;
  } catch (error) {
    console.error('Error in uploadImage function:', error);
    throw error;
  }
}
