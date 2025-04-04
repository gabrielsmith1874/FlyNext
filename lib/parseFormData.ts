import formidable, { Fields, Files } from 'formidable';
import { join } from 'path';
import { promises as fs } from 'fs';

/**
 * Parse form data from a request
 * @param request - Incoming HTTP request
 * @returns Parsed fields and files
 */
export async function parseFormData(
  request: any
): Promise<{ fields: Fields; files: Files }> {
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