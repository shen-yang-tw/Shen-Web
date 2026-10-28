'use client';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html>
      <body>
        <h2>An error occurred: {error.message}</h2>
      </body>
    </html>
  );
}