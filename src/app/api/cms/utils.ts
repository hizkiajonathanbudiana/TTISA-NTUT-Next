import { NextResponse } from 'next/server';
import { Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { z } from 'zod';
import { CMS_RESOURCE_MAP, type CmsResourceDefinition, type CmsResourceKey } from '@/lib/cms/resources';
import { CmsHttpError } from '@/lib/cms/auth';

export const serializeValue = (value: unknown) => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return value;
};

export const serializeDoc = (id: string, data: DocumentData) => {
  const output: Record<string, unknown> = { id };
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    output[key] = serializeValue(value);
  });
  return output;
};

export const stripUndefined = (input: Record<string, unknown>) => {
  const cleaned: Record<string, unknown> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    cleaned[key] = value;
  });
  return cleaned;
};

export const getResourceDefinition = (resourceKey: string): CmsResourceDefinition => {
  const definition = CMS_RESOURCE_MAP[resourceKey as CmsResourceKey];
  if (!definition) {
    throw new CmsHttpError(404, `Unknown resource: ${resourceKey}`);
  }
  return definition;
};

export const cmsErrorResponse = (error: unknown) => {
  if (error instanceof CmsHttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: 'Unexpected CMS API error.' }, { status: 500 });
};

export const formatZodError = (error: z.ZodError) => {
  const fieldErrors = Object.entries(error.flatten().fieldErrors)
    .map(([field, issues]) => {
      if (!Array.isArray(issues) || issues.length === 0) {
        return null;
      }
      return `${field}: ${issues.join(', ')}`;
    })
    .filter((value): value is string => Boolean(value));
  const formErrors = error.flatten().formErrors ?? [];
  const merged = [...formErrors, ...fieldErrors];
  return merged.length ? merged.join('\n') : 'Invalid payload.';
};
