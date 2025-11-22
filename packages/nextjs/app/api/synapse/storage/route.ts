import { NextResponse } from "next/server";
import { Synapse, RPC_URLS, TIME_CONSTANTS } from "@filoz/synapse-sdk";
import { ethers } from "ethers";

export async function POST() {
  try {
    console.log("🚀 Starting Synapse Storage workflow...");

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

    // 1) Initialize the Synapse SDK
    console.log("Initializing Synapse SDK...");
    const synapse = await Synapse.create({
      privateKey: privateKey,
      rpcURL: RPC_URLS.calibration.http,
    });
    console.log("✅ Synapse SDK initialized");

    // 2) Fund & approve (single tx)
    console.log("Depositing USDFC and approving operator...");
    const depositAmount = ethers.parseUnits("2.5", 18);
    const tx = await synapse.payments.depositWithPermitAndApproveOperator(
      depositAmount, // 2.5 USDFC (covers 1TiB of storage for 30 days)
      synapse.getWarmStorageAddress(),
      ethers.MaxUint256,
      ethers.MaxUint256,
      TIME_CONSTANTS.EPOCHS_PER_MONTH,
    );
    await tx.wait();
    console.log("✅ USDFC deposit and Warm Storage service approval successful!");

    // 3) Upload
    console.log("Uploading data to Filecoin...");
    const data = new TextEncoder().encode(
      `🚀 Welcome to decentralized storage on Filecoin Onchain Cloud!
    Your data is safe here.
    🌍 You need to make sure to meet the minimum size
    requirement of 127 bytes per upload.`,
    );
    const { pieceCid, size } = await synapse.storage.upload(data);
    console.log("✅ Upload complete!");
    console.log(`PieceCID: ${pieceCid}`);
    console.log(`Size: ${size} bytes`);

    // 4) Download
    console.log("Downloading data from Filecoin...");
    const bytes = await synapse.storage.download(pieceCid);
    const decodedText = new TextDecoder().decode(bytes);
    console.log("✅ Download successful!");
    console.log(`Downloaded data: ${decodedText}`);

    console.log("🎉 Data storage and retrieval successful!");

    // Return success response
    return NextResponse.json({
      success: true,
      pieceCid,
      size,
      downloadedData: decodedText,
      message: "Storage workflow completed successfully!",
    });
  } catch (error: any) {
    console.error("❌ Error occurred:");
    console.error(error.message); // Clear error description
    console.error(error.cause); // Underlying error if any

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

