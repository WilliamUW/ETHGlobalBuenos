import { NextResponse } from "next/server";
import { Synapse, RPC_URLS, TIME_CONSTANTS } from "@filoz/synapse-sdk";
import { ethers } from "ethers";

export async function POST(request: Request) {
  try {
    console.log("🚀 Starting Synapse Storage workflow...");

    // Parse request body to check if we have image data
    const body = await request.json();
    const { imageBase64 } = body;

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

    // 2) Check balance and only deposit if needed
    console.log("Checking USDFC balance...");
    const balance = await synapse.payments.balance();
    const depositAmount = ethers.parseUnits("0.001", 18);
    
    if (balance < depositAmount) {
      console.log("Insufficient balance, depositing USDFC and approving operator...");
      const tx = await synapse.payments.depositWithPermitAndApproveOperator(
        depositAmount,
        synapse.getWarmStorageAddress(),
        ethers.MaxUint256,
        ethers.MaxUint256,
        TIME_CONSTANTS.EPOCHS_PER_MONTH,
      );
      await tx.wait();
      console.log("✅ USDFC deposit and Warm Storage service approval successful!");
    } else {
      console.log("✅ Sufficient balance already available, skipping deposit");
    }

    // 3) Upload
    console.log("Uploading data to Filecoin...");
    
    let data: Uint8Array;
    let dataDescription: string;
    
    if (imageBase64) {
      // Upload the base64 image data
      console.log("Uploading base64 image data...");
      data = new TextEncoder().encode(imageBase64);
      dataDescription = `Base64 image (${imageBase64.length} characters)`;
    } else {
      // Default text data if no image provided
      data = new TextEncoder().encode(
        `sdjkhskj heloooo 🚀 Welcome to decentralized storage on Filecoin Onchain Cloud!
    Your data is safe here.
    🌍 You need to make sure to meet the minimum size
    requirement of 127 bytes per upload.`,
      );
      dataDescription = "Default text data";
    }
    
    const { pieceCid, size } = await synapse.storage.upload(data);
    console.log("✅ Upload complete!");
    console.log(`PieceCID: ${pieceCid}`);
    console.log(`Size: ${size} bytes`);
    console.log(`Data: ${dataDescription}`);

    console.log("🎉 Data storage successful!");

    // Skip download to speed up the process - we can retrieve it later if needed
    // console.log("Downloading data from Filecoin...");
    // const bytes = await synapse.storage.download(pieceCid);
    // const decodedText = new TextDecoder().decode(bytes);
    // console.log("✅ Download successful!");

    // Return success response
    return NextResponse.json({
      success: true,
      pieceCid,
      size,
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

