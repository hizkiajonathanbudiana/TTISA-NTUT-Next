import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { createCmsDocument, deleteCmsDocument, listCmsDocuments, updateCmsDocument, type CmsDocument } from '@/lib/cms/client';
import { type CmsResourceKey } from '@/lib/cms/resources';
import { useAuth } from '@/providers/AuthProvider';

interface UseCmsCollectionResult<TData extends CmsDocument = CmsDocument> {
  items: TData[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  createItem: (body: Record<string, unknown>) => Promise<void>;
  updateItem: (id: string, body: Record<string, unknown>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useCmsCollection = <TData extends CmsDocument = CmsDocument>(resource: CmsResourceKey): UseCmsCollectionResult<TData> => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => ['cms-collection', resource], [resource]);

  const collectionQuery = useQuery({
    queryKey,
    enabled: Boolean(user),
    queryFn: () => listCmsDocuments<TData>(user, resource),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => createCmsDocument<TData>(user, resource, body),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      updateCmsDocument<TData>(user, resource, id, body),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCmsDocument(user, resource, id),
    onSuccess: invalidate,
  });

  return {
    items: collectionQuery.data ?? [],
    isLoading: collectionQuery.isLoading,
    isError: collectionQuery.isError,
    refetch: () => {
      collectionQuery.refetch();
    },
    createItem: async (body) => {
      await createMutation.mutateAsync(body);
    },
    updateItem: async (id, body) => {
      await updateMutation.mutateAsync({ id, body });
    },
    deleteItem: async (id) => {
      await deleteMutation.mutateAsync(id);
    },
  };
};
