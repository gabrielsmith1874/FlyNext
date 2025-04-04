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

  return new Promise((resolve, reject) => {
    form.parse(request, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
}
