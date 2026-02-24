import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// SECURITY: Use HTTPS by default
export const GDELT_BASE_URL = process.env.GDELT_BASE_URL || 'https://data.gdeltproject.org/gkg';
export const MD5_LIST_URL = `${GDELT_BASE_URL}/md5sums`;

export interface GkgFileEntry {
  md5: string;
  filename: string;
  url: string;
}

async function fetchUrlOrFile(url: string): Promise<string> {
  if (url.startsWith('file://')) {
    const filePath = fileURLToPath(url);
    console.log(`Reading from local file ${filePath}`);
    return await fs.readFile(filePath, 'utf8');
  } else {
    const response = await axios.get(url);
    return response.data as string;
  }
}

export async function fetchMd5List(): Promise<GkgFileEntry[]> {
  const localIndex = process.env.GDELT_LOCAL_INDEX;
  let data: string;

  if (localIndex) {
    console.log(`Reading MD5 list from local file ${localIndex}...`);
    try {
        let indexPath = localIndex;
        if (localIndex.startsWith('file://')) {
            indexPath = fileURLToPath(localIndex);
        }
        data = await fs.readFile(indexPath, 'utf8');
    } catch (e: any) {
        console.warn(`Failed to read local index ${localIndex}: ${e.message}, falling back to remote.`);
        data = await fetchUrlOrFile(MD5_LIST_URL);
    }
  } else {
    console.log(`Fetching MD5 list from ${MD5_LIST_URL}...`);
    try {
      data = await fetchUrlOrFile(MD5_LIST_URL);
    } catch (error) {
      console.error('Error fetching MD5 list:', error);
      throw error;
    }
  }

  const entries: GkgFileEntry[] = [];
  const lines = data.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const md5 = parts[0];
      const filename = parts[1];

      entries.push({
        md5,
        filename,
        url: `${GDELT_BASE_URL}/${filename}`
      });
    }
  }

  return entries;
}

export function filterEntriesByDate(entries: GkgFileEntry[], dateStr: string): GkgFileEntry[] {
  return entries.filter(e => e.filename.startsWith(dateStr));
}
