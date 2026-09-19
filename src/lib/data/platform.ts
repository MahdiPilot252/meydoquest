import { eq } from "drizzle-orm";
import { db } from "@/db";
import { platformSettings } from "@/db/schema";

export async function getPlatformSettings() {
  const rows = await db.select().from(platformSettings).where(eq(platformSettings.key, "global")).limit(1);

  return (
    rows[0] ?? {
      key: "global",
      siteName: "meydoQuest",
      slogan: "Vokabeln lernen. Sofort loslegen.",
      logoData: null,
      sadLogoData: null,
      supportEmail: null,
      supportInfo: "Bei Problemen kannst du ein Support-Ticket schreiben.",
      allowRegistrations: true,
      maintenanceMode: false,
      updatedBy: null,
      updatedAt: new Date(),
    }
  );
}
