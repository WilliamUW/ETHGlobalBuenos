"use client";

import { useCallback, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Address } from "@scaffold-ui/components";
import { IDKitWidget, ISuccessResult, VerificationLevel } from "@worldcoin/idkit";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { verify } from "~~/app/actions/verify";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

type ReviewData = {
  platformName: string;
  starRating: number;
  numberOfReviews: number;
  ageOfAccount: number;
  accountName: string;
  pictureId: string;
};

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractedReview, setExtractedReview] = useState<ReviewData | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const { writeContractAsync: writeYourContractAsync } = useScaffoldWriteContract({ contractName: "YourContract" });

  const onSuccess = () => {
    setIsVerified(true);
  };

  const handleVerify = async (proof: ISuccessResult) => {
    const data = await verify(proof as any);
    if (data.success) {
      console.log("Successful response from backend:\n", JSON.stringify(data));
    } else {
      throw new Error(`Verification failed: ${data.detail}`);
    }
  };

  const handleFileUpload = useCallback((file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = e => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please upload an image file");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload],
  );

  const clearImage = useCallback(() => {
    setUploadedImage(null);
    setExtractedReview(null);
  }, []);

  const handleWriteReview = async () => {
    if (!extractedReview || !connectedAddress) {
      alert("Please extract review data first and connect your wallet!");
      return;
    }

    try {
      // Convert star rating to integer with 2 decimal precision (e.g., 4.89 -> 489)
      const starRatingInt = Math.round(extractedReview.starRating * 100);

      await writeYourContractAsync({
        functionName: "writeReview",
        args: [
          connectedAddress,
          extractedReview.platformName,
          starRatingInt,
          BigInt(extractedReview.numberOfReviews),
          BigInt(extractedReview.ageOfAccount),
          extractedReview.accountName,
          extractedReview.pictureId,
        ],
      });
      alert("Review successfully written to blockchain!");
    } catch (error) {
      console.error("Error writing review:", error);
    }
  };

  const handleGeminiTest = async () => {
    if (!uploadedImage) {
      alert("Please upload an image first!");
      return;
    }

    try {
      // Extract base64 data and mime type from data URL
      const [header, base64] = uploadedImage.split(",");
      const mimeType = header.match(/:(.*?);/)?.[1] || "image/jpeg";

      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `Extract the following information from this image and return ONLY a valid JSON object with these exact fields:
{
  "platformName": "name of the platform/service",
  "starRating": decimal number from 0.00 to 5.00 (e.g., 4.89, 5.00, 3.75),
  "numberOfReviews": total number of reviews,
  "ageOfAccount": age of account in days/months/years (convert to a number representing days),
  "accountName": username or account name,
  "pictureId": use "placeholderPictureId" for now
}

IMPORTANT: starRating should be a decimal number with up to 2 decimal places (e.g., 4.89, not just 4 or 5).
If any field is not visible or cannot be determined, use reasonable defaults (empty string for strings, 0 for numbers).
Return ONLY the JSON object, no other text.`;

      // Generate content with image using the correct API pattern
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: base64,
          },
        },
        { text: prompt },
      ]);

      const responseText = result.response.text();
      console.log("Raw AI Response:", responseText);

      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedData = JSON.parse(jsonMatch[0]) as ReviewData;
          console.log("Extracted Review Data:", extractedData);
          setExtractedReview(extractedData);
        } else {
          console.log("No JSON found in response");
        }
      } catch (parseError) {
        console.error("Failed to parse JSON:", parseError);
        console.log("Response text:", responseText);
      }
    } catch (error) {
      console.error("Gemini API error:", error);
    }
  };

  return (
    <>
      <div className="flex items-center flex-col grow pt-10 px-5">
        {/* Header */}
        <div className="max-w-2xl w-full">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold mb-2">Review Verifier</span>
            <span className="block text-lg text-base-content/70">
              Verify your identity and upload review screenshots
            </span>
          </h1>

          {/* Step 1: Connect Wallet */}
          {!connectedAddress ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="bg-base-200 rounded-2xl p-12 shadow-xl border-2 border-base-300 text-center max-w-md">
                <div className="text-6xl mb-6">👋</div>
                <h2 className="text-2xl font-bold mb-4">Welcome!</h2>
                <p className="text-base-content/70 mb-6">
                  Connect your wallet to get started with secure, verified reviews.
                </p>
                <p className="text-sm text-base-content/50">
                  Click the button in the top right corner to connect
                </p>
              </div>
            </div>
          ) : !isVerified ? (
            /* Step 2: Verify with World ID */
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="bg-base-200 rounded-2xl p-12 shadow-xl border-2 border-base-300 text-center max-w-md">
                <div className="text-6xl mb-6">🌍</div>
                <h2 className="text-2xl font-bold mb-4">Verify Your Identity</h2>
                <p className="text-base-content/70 mb-2">Connected as:</p>
                <div className="mb-6">
                  <Address address={connectedAddress} />
                </div>
                <p className="text-base-content/70 mb-6">
                  Verify with World ID to ensure you're a unique human before submitting reviews.
                </p>
                <IDKitWidget
                  app_id="app_4020275d788fc6f5664d986dd931e5e6"
                  action="verify"
                  signal="user_value"
                  onSuccess={onSuccess}
                  handleVerify={handleVerify}
                  verification_level={VerificationLevel.Device}
                >
                  {({ open }: { open: () => void }) => (
                    <button onClick={open} className="btn btn-primary btn-lg w-full">
                      Verify with World ID
                    </button>
                  )}
                </IDKitWidget>
              </div>
            </div>
          ) : (
            /* Step 3: Main Application - Upload and Submit Reviews */
            <div className="space-y-8">
              {/* Success Badge */}
              <div className="bg-success/10 border-2 border-success rounded-xl p-4 text-center">
                <p className="text-success font-semibold">
                  ✅ Verified! You can now upload and submit reviews to the blockchain.
                </p>
              </div>

              {/* File Upload Section */}
              <div className="bg-base-200 rounded-2xl p-8 shadow-xl border-2 border-base-300">
                <h2 className="text-2xl font-bold mb-6 text-center">Upload Review Screenshot</h2>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`relative border-2 border-dashed rounded-xl p-12 transition-all ${
                    isDragging ? "border-primary bg-primary/10" : "border-base-300"
                  } hover:border-primary hover:bg-primary/5 cursor-pointer`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center text-center">
                    <PhotoIcon className="w-16 h-16 text-base-content/50 mb-4" />
                    <p className="text-lg font-medium mb-2">Drop your review screenshot here</p>
                    <p className="text-sm text-base-content/60">or click to browse</p>
                    <p className="text-xs text-base-content/40 mt-2">Supports: JPG, PNG, GIF, WebP</p>
                  </div>
                </div>

                {/* Image Preview */}
                {uploadedImage && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">Preview</h3>
                      <button
                        onClick={clearImage}
                        className="btn btn-circle btn-sm btn-ghost"
                        aria-label="Clear image"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="relative rounded-xl overflow-hidden border-2 border-base-300 shadow-lg">
                      <img src={uploadedImage} alt="Uploaded preview" className="w-full h-auto object-contain" />
                    </div>
                    <button onClick={handleGeminiTest} className="btn btn-primary w-full mt-4 btn-lg">
                      Extract Review Data
                    </button>
                  </div>
                )}
              </div>

              {/* Extracted Review Data Preview */}
              {extractedReview && (
                <div className="bg-base-200 rounded-2xl p-8 shadow-xl border-2 border-base-300">
                  <h3 className="text-2xl font-bold mb-6 text-center">Extracted Review Data</h3>
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center p-3 bg-base-100 rounded-lg">
                      <span className="font-semibold">Platform:</span>
                      <span className="text-right">{extractedReview.platformName}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-base-100 rounded-lg">
                      <span className="font-semibold">Star Rating:</span>
                      <span className="text-right text-lg">
                        {"⭐".repeat(Math.floor(extractedReview.starRating))} ({extractedReview.starRating.toFixed(2)}/5.00)
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-base-100 rounded-lg">
                      <span className="font-semibold">Number of Reviews:</span>
                      <span className="text-right">{extractedReview.numberOfReviews}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-base-100 rounded-lg">
                      <span className="font-semibold">Account Age:</span>
                      <span className="text-right">{extractedReview.ageOfAccount} days</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-base-100 rounded-lg">
                      <span className="font-semibold">Account Name:</span>
                      <span className="text-right">{extractedReview.accountName}</span>
                    </div>
                  </div>
                  <button onClick={handleWriteReview} className="btn btn-success w-full btn-lg">
                    Submit Review to Blockchain
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
