import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { learningEvents, platformSettings } from "@/db/schema";
import { requireApiAdmin } from "@/lib/auth/api";
import { sanitizeText } from "@/lib/auth/guards";
import { redirectAntwort } from "@/lib/http";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
]);

export async function POST(request: Request) {
  const auth = await requireApiAdmin(request);
  if (!auth.user) return auth.response;
  const admin = auth.user;

  const formData = await request.formData();
  const siteName = sanitizeText(String(formData.get("siteName") ?? "meydoQuest"), 160);
  const slogan = sanitizeText(String(formData.get("slogan") ?? "Vokabeln lernen. Sofort loslegen."), 240);
  const supportEmail = sanitizeText(String(formData.get("supportEmail") ?? ""), 320);
  const supportInfo = sanitizeText(String(formData.get("supportInfo") ?? ""), 1200);
  const allowRegistrations = String(formData.get("allowRegistrations") ?? "off") === "on";
  const maintenanceMode = String(formData.get("maintenanceMode") ?? "off") === "on";

  let logoData: string | null | undefined = undefined;
  let sadLogoData: string | null | undefined = undefined;
  const logo = formData.get("logo");
  const sadLogo = formData.get("sadLogo");

  if (logo instanceof File && logo.size > 0) {
    const ext = ALLOWED_TYPES.get(logo.type);
    if (!ext || logo.size > 2 * 1024 * 1024) {
      return redirectAntwort(request, "/admin?error=ungueltiges_logo");
    }

    const bytes = Buffer.from(await logo.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "branding");
    await mkdir(dir, { recursive: true });
    const filename = `site-logo${ext}`;
    await writeFile(path.join(dir, filename), bytes);
    logoData = `/branding/${filename}?v=${Date.now()}`;
  }

  if (sadLogo instanceof File && sadLogo.size > 0) {
    const ext = ALLOWED_TYPES.get(sadLogo.type);
    if (!ext || sadLogo.size > 2 * 1024 * 1024) {
      return redirectAntwort(request, "/admin?error=ungueltiges_logo");
    }

    const bytes = Buffer.from(await sadLogo.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "branding");
    await mkdir(dir, { recursive: true });
    const filename = `site-logo-sad${ext}`;
    await writeFile(path.join(dir, filename), bytes);
    sadLogoData = `/branding/${filename}?v=${Date.now()}`;
  }

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

  await db.insert(learningEvents).values({ userId: admin.id, eventType: "admin_branding_updated", payload: { siteName, logoChanged: Boolean(logoData), sadLogoChanged: Boolean(sadLogoData) } });
  return redirectAntwort(request, "/admin?saved=1");
}
