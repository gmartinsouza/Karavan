// Hook para buscar dados da API ao abrir uma tela.
// Devolve os dados, o erro (se houver) e uma função reload para buscar de novo
// depois de criar, editar ou apagar alguma coisa.
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setData(await api.get<T>(path));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    }
  }, [path]);

  // busca de novo sempre que o caminho mudar (ex.: outro veículo)
  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, reload };
}

// Para os formulários: pega a mensagem de qualquer erro
export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Algo deu errado';
}
