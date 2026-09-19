import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudyRedirectPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  redirect(`/lernen/${sessionId}`);
}
