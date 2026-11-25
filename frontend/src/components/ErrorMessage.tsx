export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p className="col-span-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-600">
      {message}
    </p>
  );
}
