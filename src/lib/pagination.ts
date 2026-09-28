export function paginate<T>(items: readonly T[], requestedPage: number, pageSize: number) {
  const size = Math.max(1, Math.floor(pageSize));
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.max(0, Math.min(pages - 1, Math.floor(requestedPage)));
  const start = page * size;
  return { page, pages, total: items.length, start, items: items.slice(start, start + size) };
}
