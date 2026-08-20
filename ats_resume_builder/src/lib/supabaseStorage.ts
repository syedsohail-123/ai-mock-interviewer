import { supabase } from './supabase';
import { ResumeData } from '../types/resume';

export const RESUMES_BUCKET = 'resumes';
export const TEMPLATES_BUCKET = 'templates';

/**
 * Uploads or updates a candidate's resume JSON directly in Supabase S3-compatible Storage
 */
export async function uploadResumeToStorage(
  userEmail: string,
  resumeId: string,
  data: ResumeData
): Promise<{ path: string; publicUrl?: string }> {
  // Convert email to clean S3-safe directory path without special % characters
  const safeDir = userEmail.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = `${safeDir}/${resumeId}.json`;
  const fileBody = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });

  const { data: uploadData, error } = await supabase.storage
    .from(RESUMES_BUCKET)
    .upload(filePath, fileBody, {
      upsert: true,
      contentType: 'application/json',
    });

  if (error) {
    console.warn(`Supabase Storage upload notice (${filePath}):`, error.message);
    throw error;
  }

  const { data: urlData } = supabase.storage.from(RESUMES_BUCKET).getPublicUrl(filePath);

  return {
    path: uploadData.path,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * Downloads a resume JSON from Supabase Storage
 */
export async function downloadResumeFromStorage(
  userEmail: string,
  resumeId: string
): Promise<ResumeData | null> {
  const safeDir = userEmail.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = `${safeDir}/${resumeId}.json`;

  const { data, error } = await supabase.storage.from(RESUMES_BUCKET).download(filePath);

  if (error) {
    console.warn(`Supabase Storage download notice (${filePath}):`, error.message);
    return null;
  }

  const text = await data.text();
  return JSON.parse(text) as ResumeData;
}

/**
 * Uploads a template configuration JSON to the templates bucket
 */
export async function uploadTemplateToStorage(
  templateName: string,
  templateConfig: Record<string, unknown>
): Promise<{ path: string; publicUrl?: string }> {
  const filePath = `${templateName}.json`;
  const fileBody = new Blob([JSON.stringify(templateConfig, null, 2)], {
    type: 'application/json',
  });

  const { data: uploadData, error } = await supabase.storage
    .from(TEMPLATES_BUCKET)
    .upload(filePath, fileBody, {
      upsert: true,
      contentType: 'application/json',
    });

  if (error) {
    console.warn(`Supabase Template upload error (${filePath}):`, error.message);
    throw error;
  }

  const { data: urlData } = supabase.storage.from(TEMPLATES_BUCKET).getPublicUrl(filePath);

  return {
    path: uploadData.path,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * Fetches dynamic template definitions from Supabase Storage
 */
export async function fetchTemplateFromStorage(
  templateName: string
): Promise<Record<string, unknown> | null> {
  const filePath = `${templateName}.json`;
  const { data, error } = await supabase.storage.from(TEMPLATES_BUCKET).download(filePath);

  if (error) {
    return null;
  }

  const text = await data.text();
  return JSON.parse(text) as Record<string, unknown>;
}
