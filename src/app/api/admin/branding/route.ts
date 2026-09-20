import { eq } from "drizzle-orm";
import { db } from "@/db";
import { learningEvents, platformSettings } from "@/db/schema";
import { requireApiAdmin } from "@/lib/auth/api";
import { sanitizeText } from "@/lib/auth/guards";
import { redirectAntwort } from "@/lib/http";

export const runtime = "nodejs";

async function fileToDataUri(file: File): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > 2 * 1024 * 1024) return null;
  if (!file.type.startsWith("image/")) return null;
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${bytes.toString("base64")}`;
}

export async function POST(request: Request) {
  const auth = await requireApiAdmin(request);
  if (!auth.user) return auth.response;
  const admin = auth.user;

  const formData = await request.formData();
  const siteName = sanitizeText(String(formData.get("siteName") ?? "meydoQuest"), 160);
  const slogan = sanitizeText(String(formData.get("slogan") ?? ""), 240);
  const supportEmail = sanitizeText(String(formData.get("supportEmail") ?? ""), 320);
  const supportInfo = sanitizeText(String(formData.get("supportInfo") ?? ""), 1200);
  const allowRegistrations = String(formData.get("allowRegistrations") ?? "off") === "on";
  const maintenanceMode = String(formData.get("maintenanceMode") ?? "off") === "on";

  const logoData = await fileToDataUri(formData.get("logo") as File);
  const sadLogoData = await fileToDataUri(formData.get("sadLogo") as File);

  const current = await db.select().from(platformSettings).where(eq(platformSettings.key, "global")).limit(1);

  await db
    .insert(platformSettings)
    .values({
      key: "global",
      siteName,
      slogan,
      logoData: logoData ?? null,
      sadLogoData: sadLogoData ?? null,
      supportEmail: supportEmail || null,
      supportInfo: supportInfo || null,
      allowRegistrations,
      maintenanceMode,
      updatedBy: admin.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [platformSettings.key],
      set: {
        siteName,
        slogan,
        logoData: logoData ?? current[0]?.logoData ?? null,
        sadLogoData: sadLogoData ?? current[0]?.sadLogoData ?? null,
        supportEmail: supportEmail || null,
        supportInfo: supportInfo || null,
        allowRegistrations,
        maintenanceMode,
        updatedBy: admin.id,
        updatedAt: new Date(),
      },
    });

  await db.insert(learningEvents).values({
    userId: admin.id,
    eventType: "admin_branding_updated",
    payload: { siteName, logoChanged: Boolean(logoData), sadLogoChanged: Boolean(sadLogoData) },
  });

  return redirectAntwort(request, "/admin?saved=1");
}
