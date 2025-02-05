import Link from "next/link";

// Components
import Protected from "@/components/utils/Protected";

async function TokenDetail({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  return (
    <Protected>
      <main>
        <div className="container mx-auto py-12">
          <Link href="/" className="text-blue-500">
            Go to main menu
          </Link>
          <h1 className="text-4xl font-bold mt-8">Token Details</h1>
          <p>{address}</p>
        </div>
      </main>
    </Protected>
  );
}

export default TokenDetail;
