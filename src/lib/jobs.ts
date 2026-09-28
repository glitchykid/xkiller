import type { State } from './types';

export function jobKey(job: State['job']): string {
  return job ? `${job.id}:${job.status}` : '';
}

export function completedJob(
  previousKey: string,
  job: State['job'],
  submittedKind: string,
): boolean {
  return (
    job?.status === 'completed' &&
    jobKey(job) !== previousKey &&
    (Boolean(previousKey) || job.kind === submittedKind)
  );
}
