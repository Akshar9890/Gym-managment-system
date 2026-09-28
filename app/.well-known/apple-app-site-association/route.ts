// app/.well-known/apple-app-site-association/route.ts
// Serves Apple App Site Association for Passkey webcredentials and Universal Links
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const aasa = {
    webcredentials: {
      apps: [
        "69J72933LT.com.akshar.bsfgym",
        "*.com.akshar.bsfgym",
        "com.akshar.bsfgym"
      ]
    },
    applinks: {
      details: [
        {
          appIDs: [
            "69J72933LT.com.akshar.bsfgym",
            "com.akshar.bsfgym"
          ],
          components: [
            {
              "/": "/*"
            }
          ]
        }
      ]
    }
  };

  return new NextResponse(JSON.stringify(aasa, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
