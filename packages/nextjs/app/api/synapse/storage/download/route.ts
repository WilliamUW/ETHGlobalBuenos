import { NextResponse } from "next/server";
import { Synapse, RPC_URLS } from "@filoz/synapse-sdk";

export async function POST(request: Request) {
  try {
    console.log("⬇️ Starting Filecoin download workflow...");

    // Parse request body to get pieceCid
    const body = await request.json();
    const { pieceCid } = body;

    if (!pieceCid) {
      return NextResponse.json(
        {
          error: "pieceCid is required",
        },
        { status: 400 },
      );
    }

    // Check if private key is set in environment (backend-only variable)
    const privateKey = process.env.SYNAPSE_PRIVATE_KEY;
    if (!privateKey) {
      console.error("Private key not found in environment variables");
      return NextResponse.json(
        {
          error: "Private key not configured on server",
          message: "Please set SYNAPSE_PRIVATE_KEY in your .env.local file (without NEXT_PUBLIC_ prefix)",
        },
        { status: 500 },
      );
    }

    // Initialize the Synapse SDK
    console.log("Initializing Synapse SDK...");
    const synapse = await Synapse.create({
      privateKey: privateKey,
      rpcURL: RPC_URLS.calibration.http,
    });
    console.log("✅ Synapse SDK initialized");

    // Download from Filecoin
    console.log(`Downloading PieceCID: ${pieceCid}`);
    const bytes = await synapse.storage.download(pieceCid);
    const decodedText = new TextDecoder().decode(bytes);
    console.log("✅ Download successful!");
    console.log(`Size: ${bytes.length} bytes`);

    // Return the data
    return NextResponse.json({
      success: true,
      data: decodedText,
      size: bytes.length,
      pieceCid: pieceCid,
      message: "Download completed successfully!",
    });
  } catch (error: any) {
    console.error("❌ Download error:");
    console.error(error.message);
    console.error(error.cause);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        cause: error.cause ? String(error.cause) : undefined,
      },
      { status: 500 },
    );
  }
}

