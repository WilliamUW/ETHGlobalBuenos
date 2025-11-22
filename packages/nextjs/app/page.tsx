"use client";

import { useCallback, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Address } from "@scaffold-ui/components";
import { IDKitWidget, ISuccessResult, VerificationLevel } from "@worldcoin/idkit";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ethers } from "ethers";
import { verify } from "~~/app/actions/verify";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

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
  const [showMyReviews, setShowMyReviews] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const { writeContractAsync: writeYourContractAsync } = useScaffoldWriteContract({ contractName: "YourContract" });

  // Fetch reviews for the connected wallet
  const { data: myReviews, refetch: refetchReviews } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getReviews",
    args: [connectedAddress],
  });

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
      // Refetch reviews after successful submission
      refetchReviews();
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

  const handleGetRandomNumber = async () => {
    try {
      // RandomNumberV2 address where the secure RNG is served (Flare Testnet Coston2)
      const ADDRESS = "0x5CdF9eAF3EB8b44fB696984a1420B56A7575D250";
      const RPC_URL = "https://coston2-api.flare.network/ext/C/rpc";
      // ABI for RandomNumberV2 contract
      const ABI =
        '[{"inputs":[{"internalType":"address","name":"_signingPolicySetter","type":"address"},{"internalType":"uint32","name":"_initialRewardEpochId","type":"uint32"},{"internalType":"uint32","name":"_startingVotingRoundIdForInitialRewardEpochId","type":"uint32"},{"internalType":"bytes32","name":"_initialSigningPolicyHash","type":"bytes32"},{"internalType":"uint8","name":"_randomNumberProtocolId","type":"uint8"},{"internalType":"uint32","name":"_firstVotingRoundStartTs","type":"uint32"},{"internalType":"uint8","name":"_votingEpochDurationSeconds","type":"uint8"},{"internalType":"uint32","name":"_firstRewardEpochStartVotingRoundId","type":"uint32"},{"internalType":"uint16","name":"_rewardEpochDurationInVotingEpochs","type":"uint16"},{"internalType":"uint16","name":"_thresholdIncreaseBIPS","type":"uint16"},{"internalType":"uint32","name":"_messageFinalizationWindowInRewardEpochs","type":"uint32"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint8","name":"protocolId","type":"uint8"},{"indexed":true,"internalType":"uint32","name":"votingRoundId","type":"uint32"},{"indexed":false,"internalType":"bool","name":"isSecureRandom","type":"bool"},{"indexed":false,"internalType":"bytes32","name":"merkleRoot","type":"bytes32"}],"name":"ProtocolMessageRelayed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint24","name":"rewardEpochId","type":"uint24"},{"indexed":false,"internalType":"uint32","name":"startVotingRoundId","type":"uint32"},{"indexed":false,"internalType":"uint16","name":"threshold","type":"uint16"},{"indexed":false,"internalType":"uint256","name":"seed","type":"uint256"},{"indexed":false,"internalType":"address[]","name":"voters","type":"address[]"},{"indexed":false,"internalType":"uint16[]","name":"weights","type":"uint16[]"},{"indexed":false,"internalType":"bytes","name":"signingPolicyBytes","type":"bytes"},{"indexed":false,"internalType":"uint64","name":"timestamp","type":"uint64"}],"name":"SigningPolicyInitialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"rewardEpochId","type":"uint256"}],"name":"SigningPolicyRelayed","type":"event"},{"inputs":[{"internalType":"uint256","name":"_protocolId","type":"uint256"},{"internalType":"uint256","name":"_votingRoundId","type":"uint256"}],"name":"getConfirmedMerkleRoot","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getRandomNumber","outputs":[{"internalType":"uint256","name":"_randomNumber","type":"uint256"},{"internalType":"bool","name":"_isSecureRandom","type":"bool"},{"internalType":"uint256","name":"_randomTimestamp","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_timestamp","type":"uint256"}],"name":"getVotingRoundId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastInitializedRewardEpochData","outputs":[{"internalType":"uint32","name":"_lastInitializedRewardEpoch","type":"uint32"},{"internalType":"uint32","name":"_startingVotingRoundIdForLastInitializedRewardEpoch","type":"uint32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"protocolId","type":"uint256"},{"internalType":"uint256","name":"votingRoundId","type":"uint256"}],"name":"merkleRoots","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"relay","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"uint24","name":"rewardEpochId","type":"uint24"},{"internalType":"uint32","name":"startVotingRoundId","type":"uint32"},{"internalType":"uint16","name":"threshold","type":"uint16"},{"internalType":"uint256","name":"seed","type":"uint256"},{"internalType":"address[]","name":"voters","type":"address[]"},{"internalType":"uint16[]","name":"weights","type":"uint16[]"}],"internalType":"struct IIRelay.SigningPolicy","name":"_signingPolicy","type":"tuple"}],"name":"setSigningPolicy","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"signingPolicySetter","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"rewardEpochId","type":"uint256"}],"name":"startingVotingRoundIds","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"stateData","outputs":[{"internalType":"uint8","name":"randomNumberProtocolId","type":"uint8"},{"internalType":"uint32","name":"firstVotingRoundStartTs","type":"uint32"},{"internalType":"uint8","name":"votingEpochDurationSeconds","type":"uint8"},{"internalType":"uint32","name":"firstRewardEpochStartVotingRoundId","type":"uint32"},{"internalType":"uint16","name":"rewardEpochDurationInVotingEpochs","type":"uint16"},{"internalType":"uint16","name":"thresholdIncreaseBIPS","type":"uint16"},{"internalType":"uint32","name":"randomVotingRoundId","type":"uint32"},{"internalType":"bool","name":"isSecureRandom","type":"bool"},{"internalType":"uint32","name":"lastInitializedRewardEpoch","type":"uint32"},{"internalType":"bool","name":"noSigningPolicyRelay","type":"bool"},{"internalType":"uint32","name":"messageFinalizationWindowInRewardEpochs","type":"uint32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"rewardEpochId","type":"uint256"}],"name":"toSigningPolicyHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"}]';

      // Connect to an RPC node
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      // Set up contract instance
      const randomV2 = new ethers.Contract(ADDRESS, JSON.parse(ABI), provider);
      // Fetch secure random number
      const res = await randomV2.getRandomNumber();
      // Log results
      console.log("Random Number:", res[0]);
      console.log("Is secure random:", res[1]);
      console.log("Timestamp:", res[2]);
      alert(`Random Number Generated!\nCheck console for details.\nRandom Number: ${res[0].toString()}`);
    } catch (error) {
      console.error("Error fetching random number:", error);
      alert("Failed to fetch random number. Check console for details.");
    }
  };

  return (
    <>
      <div className="flex items-center flex-col grow pt-8 px-4 pb-12">
        {/* Hero Header */}
        <div className="max-w-3xl w-full mb-10">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 mb-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              <span className="text-sm font-medium">Blockchain-Powered Reputation</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
              ReviewSync
            </h1>
            <p className="text-xl md:text-2xl font-semibold text-base-content/80">
              Never Start From Zero Again
            </p>
            <p className="text-base md:text-lg text-base-content/60 max-w-2xl mx-auto leading-relaxed">
              Import your reviews from platforms like Uber, Lyft, and Airbnb onto the blockchain. Join new platforms
              with your proven reputation intact.
            </p>
          </div>
        </div>

        <div className="max-w-2xl w-full">
          {/* Step 1: Connect Wallet */}
          {!connectedAddress ? (
            <div className="flex flex-col items-center justify-center min-h-[450px]">
              <div className="relative bg-gradient-to-br from-base-100 to-base-200 rounded-3xl p-12 shadow-2xl border border-base-300/50 text-center max-w-lg backdrop-blur-sm">
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                  👋
                </div>
                <div className="mt-6">
                  <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Welcome to ReviewSync!
                  </h2>
                  <p className="text-base-content/70 mb-8 text-lg leading-relaxed">
                    Connect your wallet to start building your cross-platform reputation on the blockchain.
                  </p>
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-6">
                    <p className="text-sm text-base-content/70 leading-relaxed">
                      <span className="font-semibold text-primary">💡 Pro tip:</span> Click the connect button in the
                      top right corner to get started
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-base-100/50 rounded-xl p-3">
                      <div className="text-2xl mb-1">🔒</div>
                      <div className="text-xs text-base-content/60">Secure</div>
                    </div>
                    <div className="bg-base-100/50 rounded-xl p-3">
                      <div className="text-2xl mb-1">⚡</div>
                      <div className="text-xs text-base-content/60">Fast</div>
                    </div>
                    <div className="bg-base-100/50 rounded-xl p-3">
                      <div className="text-2xl mb-1">🌐</div>
                      <div className="text-xs text-base-content/60">Universal</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : !isVerified ? (
            /* Step 2: Verify with World ID */
            <div className="flex flex-col items-center justify-center min-h-[450px]">
              <div className="relative bg-gradient-to-br from-base-100 to-base-200 rounded-3xl p-12 shadow-2xl border border-base-300/50 text-center max-w-lg backdrop-blur-sm">
                <div
                  className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center text-3xl shadow-lg cursor-pointer hover:scale-110 transition-transform duration-300"
                  onClick={() => setIsVerified(true)}
                  title="Click to skip verification (dev mode)"
                >
                  🌍
                </div>
                <div className="mt-6">
                  <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Verify Your Identity
                  </h2>
                  <div className="bg-success/10 border border-success/30 rounded-2xl p-4 mb-6">
                    <p className="text-sm text-base-content/70 mb-2">✅ Wallet Connected</p>
                    <div className="flex justify-center">
                      <Address address={connectedAddress} />
                    </div>
                  </div>
                  <p className="text-base-content/70 mb-8 text-lg leading-relaxed">
                    Verify with World ID to prove you&apos;re a unique human before submitting reviews to the blockchain.
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
                      <button
                        onClick={open}
                        className="btn btn-primary btn-lg w-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                      >
                        <span className="mr-2">🌐</span>
                        Verify with World ID
                      </button>
                    )}
                  </IDKitWidget>
                  <p className="text-xs text-base-content/50 mt-4">🔒 Your privacy is protected</p>
                </div>
              </div>
            </div>
          ) : (
            /* Step 3: Main Application - Upload and Submit Reviews */
            <div className="space-y-8 w-full max-w-4xl mx-auto">
              {/* Success Badge */}
              <div className="bg-gradient-to-r from-success/20 to-success/10 border border-success/40 rounded-2xl p-5 text-center shadow-lg backdrop-blur-sm">
                <p className="text-success font-semibold text-lg flex items-center justify-center gap-2">
                  <span className="text-2xl">✅</span>
                  <span>Verified! You can now upload and submit reviews to the blockchain.</span>
                </p>
              </div>

              {/* My Reviews Section */}
              <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-3xl p-8 shadow-2xl border border-base-300/50 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      📊 My Reviews
                    </h2>
                    <p className="text-sm text-base-content/60 mt-1">Your cross-platform reputation</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowMyReviews(!showMyReviews);
                        if (!showMyReviews) refetchReviews();
                      }}
                      className="btn btn-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      {showMyReviews ? "Hide Reviews" : "View My Reviews"}
                    </button>
                    {myReviews && myReviews.length > 0 && (
                      <button
                        onClick={async () => {
                          if (
                            window.confirm(
                              `Are you sure you want to delete all ${myReviews.length} review${myReviews.length !== 1 ? "s" : ""}? This action cannot be undone.`,
                            )
                          ) {
                            try {
                              await writeYourContractAsync({
                                functionName: "deleteReviews",
                                args: [connectedAddress],
                              });
                              alert("All reviews successfully deleted from blockchain!");
                              refetchReviews();
                              setShowMyReviews(false);
                            } catch (error) {
                              console.error("Error deleting reviews:", error);
                              alert("Failed to delete reviews. Please try again.");
                            }
                          }
                        }}
                        className="btn btn-error shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                      >
                        🗑️ Delete All
                      </button>
                    )}
                  </div>
                </div>

                {showMyReviews && (
                  <div className="space-y-4">
                    {myReviews && myReviews.length > 0 ? (
                      <>
                        <div className="text-sm text-base-content/70 mb-4">
                          Found {myReviews.length} review{myReviews.length !== 1 ? "s" : ""} for{" "}
                          <Address address={connectedAddress} />
                        </div>

                        {/* Summary Statistics */}
                        <div className="bg-gradient-to-br from-primary/15 to-secondary/15 rounded-2xl p-8 border border-primary/30 mb-6 shadow-xl">
                          <h3 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            ✨ Summary Statistics
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-base-100/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-primary/20 hover:scale-105 transition-transform duration-300">
                              <div className="text-4xl font-black text-primary mb-2">
                                {(
                                  myReviews.reduce((sum: number, r: any) => sum + Number(r.starRating), 0) /
                                  myReviews.length /
                                  100
                                ).toFixed(2)}
                              </div>
                              <div className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">
                                Average Stars
                              </div>
                              <div className="text-2xl mt-2">⭐</div>
                            </div>
                            <div className="bg-base-100/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-secondary/20 hover:scale-105 transition-transform duration-300">
                              <div className="text-4xl font-black text-secondary mb-2">
                                {myReviews
                                  .reduce((sum: number, r: any) => sum + Number(r.numberOfReviews), 0)
                                  .toLocaleString()}
                              </div>
                              <div className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">
                                Total Reviews
                              </div>
                              <div className="text-2xl mt-2">📝</div>
                            </div>
                            <div className="bg-base-100/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-accent/20 hover:scale-105 transition-transform duration-300">
                              <div className="text-4xl font-black text-accent mb-2">
                                {new Set(myReviews.map((r: any) => r.platformName)).size}
                              </div>
                              <div className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">
                                Platforms
                              </div>
                              <div className="text-2xl mt-2">🌐</div>
                            </div>
                            <div className="bg-base-100/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-info/20 hover:scale-105 transition-transform duration-300">
                              <div className="text-4xl font-black text-info mb-2">
                                {Math.max(...myReviews.map((r: any) => Number(r.ageOfAccount)))}
                              </div>
                              <div className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">
                                Oldest Account
                              </div>
                              <div className="text-2xl mt-2">⏰</div>
                            </div>
                          </div>
                        </div>

                        {myReviews.map((review: any, index: number) => (
                          <div
                            key={index}
                            className="bg-base-100/50 backdrop-blur-sm rounded-2xl p-6 border border-base-300/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                          >
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xl">
                                    {review.platformName.charAt(0)}
                                  </div>
                                  <div>
                                    <h3 className="text-xl font-bold">{review.platformName}</h3>
                                    <p className="text-sm text-base-content/60">@{review.accountName}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right bg-gradient-to-br from-warning/10 to-warning/5 px-4 py-3 rounded-xl border border-warning/20">
                                <div className="text-3xl mb-1">
                                  {"⭐".repeat(Math.floor(Number(review.starRating) / 100))}
                                </div>
                                <div className="text-lg font-bold text-warning">
                                  {(Number(review.starRating) / 100).toFixed(2)}/5.00
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-base-200/50 backdrop-blur-sm p-4 rounded-xl border border-base-300/30">
                                <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wide block mb-1">
                                  Total Reviews
                                </span>
                                <span className="text-lg font-bold">{review.numberOfReviews.toString()}</span>
                              </div>
                              <div className="bg-base-200/50 backdrop-blur-sm p-4 rounded-xl border border-base-300/30">
                                <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wide block mb-1">
                                  Account Age
                                </span>
                                <span className="text-lg font-bold">{review.ageOfAccount.toString()} days</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-center py-16 bg-base-100/30 rounded-2xl border border-dashed border-base-300">
                        <div className="text-7xl mb-4">📝</div>
                        <p className="text-xl font-semibold text-base-content/80 mb-2">No reviews found</p>
                        <p className="text-base text-base-content/60">
                          Upload a screenshot below to add your first review!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* File Upload Section */}
              <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-3xl p-8 shadow-2xl border border-base-300/50 backdrop-blur-sm">
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    📸 Upload Review Screenshot
                  </h2>
                  <p className="text-sm text-base-content/60 mt-2">
                    From Uber, Lyft, Airbnb, or any other platform
                  </p>
                </div>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ${
                    isDragging
                      ? "border-primary bg-gradient-to-br from-primary/20 to-secondary/20 scale-105"
                      : "border-base-300 hover:border-primary hover:bg-primary/5"
                  } cursor-pointer group`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <PhotoIcon className="w-12 h-12 text-white" />
                    </div>
                    <p className="text-xl font-semibold mb-2">Drop your review screenshot here</p>
                    <p className="text-base text-base-content/60 mb-4">or click to browse your files</p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-base-100/50 rounded-xl border border-base-300/30">
                      <span className="text-xs text-base-content/50">📄 Supports: JPG, PNG, GIF, WebP</span>
                    </div>
                  </div>
                </div>

                {/* Image Preview */}
                {uploadedImage && (
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <span>🖼️</span>
                        <span>Preview</span>
                      </h3>
                      <button
                        onClick={clearImage}
                        className="btn btn-circle btn-sm btn-ghost hover:bg-error/20 hover:text-error transition-colors"
                        aria-label="Clear image"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="relative rounded-2xl overflow-hidden border border-base-300/50 shadow-xl bg-base-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={uploadedImage} alt="Uploaded preview" className="w-full h-auto object-contain" />
                    </div>
                    <button
                      onClick={handleGeminiTest}
                      className="btn btn-primary w-full btn-lg text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    >
                      <span className="mr-2">🤖</span>
                      Extract Review Data with AI
                    </button>
                  </div>
                )}
              </div>

              {/* Extracted Review Data Preview */}
              {extractedReview && (
                <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-3xl p-8 shadow-2xl border border-base-300/50 backdrop-blur-sm">
                  <div className="text-center mb-8">
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-success to-primary bg-clip-text text-transparent flex items-center justify-center gap-2">
                      <span>✅</span>
                      <span>Extracted Review Data</span>
                    </h3>
                    <p className="text-sm text-base-content/60 mt-2">Verify the information before submitting</p>
                  </div>
                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-center p-4 bg-base-100/50 backdrop-blur-sm rounded-2xl border border-base-300/30 hover:scale-[1.02] transition-transform">
                      <span className="font-semibold text-base-content/70 flex items-center gap-2">
                        <span>🏢</span> Platform:
                      </span>
                      <span className="text-right font-bold">{extractedReview.platformName}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gradient-to-br from-warning/10 to-warning/5 rounded-2xl border border-warning/30 hover:scale-[1.02] transition-transform">
                      <span className="font-semibold text-base-content/70 flex items-center gap-2">
                        <span>⭐</span> Star Rating:
                      </span>
                      <span className="text-right text-xl font-bold">
                        {"⭐".repeat(Math.floor(extractedReview.starRating))} ({extractedReview.starRating.toFixed(2)}/5.00)
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-base-100/50 backdrop-blur-sm rounded-2xl border border-base-300/30 hover:scale-[1.02] transition-transform">
                      <span className="font-semibold text-base-content/70 flex items-center gap-2">
                        <span>📝</span> Number of Reviews:
                      </span>
                      <span className="text-right font-bold">{extractedReview.numberOfReviews.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-base-100/50 backdrop-blur-sm rounded-2xl border border-base-300/30 hover:scale-[1.02] transition-transform">
                      <span className="font-semibold text-base-content/70 flex items-center gap-2">
                        <span>⏰</span> Account Age:
                      </span>
                      <span className="text-right font-bold">{extractedReview.ageOfAccount} days</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-base-100/50 backdrop-blur-sm rounded-2xl border border-base-300/30 hover:scale-[1.02] transition-transform">
                      <span className="font-semibold text-base-content/70 flex items-center gap-2">
                        <span>👤</span> Account Name:
                      </span>
                      <span className="text-right font-bold">@{extractedReview.accountName}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleWriteReview}
                    className="btn btn-success w-full btn-lg text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  >
                    <span className="mr-2">⛓️</span>
                    Submit to Blockchain
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Collapsible Debug Panel - Always visible at bottom */}
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="max-w-7xl mx-auto px-4">
            {/* Toggle Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className="btn btn-sm btn-ghost bg-base-200/90 backdrop-blur-sm border border-base-300/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-t-lg rounded-b-none"
              >
                <span className="mr-2">{showDebugPanel ? "▼" : "▲"}</span>
                <span className="text-xs font-semibold">Debug Panel</span>
                <span className="ml-2">🔧</span>
              </button>
            </div>

            {/* Collapsible Panel Content */}
            {showDebugPanel && (
              <div className="bg-gradient-to-br from-base-200/95 to-base-300/95 backdrop-blur-md border-t border-x border-base-300/50 rounded-t-3xl shadow-2xl p-8 animate-in slide-in-from-bottom duration-300">
                <div className="max-w-2xl mx-auto">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-info to-primary bg-clip-text text-transparent">
                      🎲 Random Number Generator
                    </h3>
                    <p className="text-xs text-base-content/60">
                      Powered by Flare Network&apos;s secure RandomNumberV2 on Coston2 Testnet
                    </p>
                  </div>
                  <button
                    onClick={handleGetRandomNumber}
                    className="btn btn-info w-full btn-lg text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    <span className="mr-2">🎲</span>
                    Generate Random Number
                  </button>
                  <p className="text-xs text-base-content/50 mt-3 text-center">
                    Check your browser console for details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
