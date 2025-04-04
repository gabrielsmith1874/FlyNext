import formidable from 'formidable';
import { join } from 'path';
import { promises as fs } from 'fs';

export async function parseFormData(request) {
  const uploadDir = join(process.cwd(), 'public/uploads');
  await fs.mkdir(uploadDir, { recursive: true });

  const form = formidable({
    multiples: false,
    uploadDir,
    keepExtensions: true,
  });

  // Convert Web Request to Node.js readable stream
  const arrayBuffer = await request.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = request.headers.get('content-type') || '';

  return new Promise((resolve, reject) => {
    form.parse({ headers: { 'content-type': contentType }, _readableState: true }, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ 
        fields: Object.fromEntries(
          Object.entries(fields).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
        ), 
        files 
      });
    });
    
    // Simulate a file upload by feeding the buffer to formidable
    form.onPart = (part) => {
      if (!part.filename) {
        // Handle fields
        form.handlePart(part);
        return;
      }
      // Handle files
      form.handlePart(part);
    };
    
    form.write(buffer);
    form.end();
  });
}
