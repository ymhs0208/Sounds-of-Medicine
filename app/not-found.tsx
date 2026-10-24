import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="text-3xl font-semibold">找不到這個頁面</h1>
      <p className="mt-3 text-base leading-relaxed">This page is not part of YaoSheng.</p>
      <p className="mt-4">
        <Link className="inline-flex min-h-12 items-center font-semibold underline" href="/">
          藥聲
        </Link>
      </p>
    </main>
  );
}
