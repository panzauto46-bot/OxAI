import { useEffect, useMemo, useState } from 'react';
import {
  AVAILABLE_MODELS,
  DEFAULT_MODEL_ID,
  type ModelOption,
  fetchAvailableModels,
} from '../services/oxloApi';

interface UseAvailableModelsResult {
  models: ModelOption[];
  modelOptions: { value: string; label: string }[];
  defaultModelId: string;
  isLoadingModels: boolean;
}

export function useAvailableModels(apiKey: string): UseAvailableModelsResult {
  const [models, setModels] = useState<ModelOption[]>(AVAILABLE_MODELS);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const remoteModels = await fetchAvailableModels(apiKey);
        if (!cancelled && remoteModels.length > 0) {
          setModels(remoteModels);
        }
      } catch {
        if (!cancelled) {
          setModels(AVAILABLE_MODELS);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingModels(false);
        }
      }
    };

    void loadModels();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  const modelOptions = useMemo(
    () => models.map((model) => ({ value: model.id, label: `${model.name} (${model.provider})` })),
    [models]
  );

  return {
    models,
    modelOptions,
    defaultModelId: models[0]?.id || DEFAULT_MODEL_ID,
    isLoadingModels,
  };
}
