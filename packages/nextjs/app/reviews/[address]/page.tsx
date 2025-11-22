"use client";

import { useParams } from "next/navigation";
import { Address } from "@scaffold-ui/components";
import { isAddress } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export default function ReviewsPage() {
  const params = useParams();
  const address = params?.address as string;

  // Validate address
  const validAddress = address && isAddress(address) ? address : undefined;

  // Fetch reviews using the hook
  const {
    data: reviews,
    isLoading,
    error,
  } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getReviews",
    args: [validAddress],
  });

  if (!validAddress) {
    return (
      <div className="flex items-center justify-center min-h-screen p-5">
        <div className="bg-gradient-to-br from-error/20 to-error/10 border border-error/40 rounded-3xl p-12 text-center max-w-md shadow-2xl backdrop-blur-sm">
          <div className="text-7xl mb-6">❌</div>
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-error to-warning bg-clip-text text-transparent">
            Invalid Address
          </h1>
          <p className="text-error font-semibold">Please provide a valid Ethereum address.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-6 text-xl font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Loading reviews...
          </p>
          <p className="text-sm text-base-content/60 mt-2">Fetching data from blockchain</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-5">
        <div className="bg-gradient-to-br from-error/20 to-error/10 border border-error/40 rounded-3xl p-12 text-center max-w-md shadow-2xl backdrop-blur-sm">
          <div className="text-7xl mb-6">⚠️</div>
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-error to-warning bg-clip-text text-transparent">
            Error
          </h1>
          <p className="text-error font-semibold">Failed to fetch reviews from blockchain</p>
        </div>
      </div>
    );
  }

  // Calculate summary statistics
  const totalReviewsCount = reviews?.length || 0;
  const totalReviews = reviews?.reduce((sum, review: any) => sum + Number(review.numberOfReviews), 0) || 0;
  const platforms = reviews ? new Set(reviews.map((r: any) => r.platformName)).size : 0;
  const averageStars =
    totalReviewsCount > 0
      ? reviews!.reduce((sum, review: any) => sum + Number(review.starRating), 0) / totalReviewsCount / 100
      : 0;
  const oldestAccountAge = totalReviewsCount > 0 ? Math.max(...reviews!.map((r: any) => Number(r.ageOfAccount))) : 0;

  return (
    <div className="flex flex-col items-center min-h-screen p-5 pt-10">
      <div className="max-w-5xl w-full space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-3xl p-10 shadow-2xl border border-base-300/50 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Wallet Reviews
            </h1>
            <div className="inline-flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-full px-6 py-3">
              <span className="text-sm font-medium text-base-content/70">Wallet Address:</span>
              <Address address={validAddress} />
            </div>
          </div>
        </div>

        {totalReviewsCount > 0 ? (
          <>
            {/* Summary Statistics */}
            <div className="bg-gradient-to-br from-primary/15 to-secondary/15 rounded-3xl p-10 shadow-2xl border border-primary/30 backdrop-blur-sm">
              <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                ✨ Reputation Summary
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-base-100/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-primary/20 hover:scale-105 transition-transform duration-300">
                  <div className="text-5xl font-black text-primary mb-3">{averageStars.toFixed(2)}</div>
                  <div className="text-sm font-semibold text-base-content/70 uppercase tracking-wide">
                    Average Stars
                  </div>
                  <div className="text-xs text-base-content/50 mt-2">out of 5.00</div>
                  <div className="text-3xl mt-3">⭐</div>
                </div>
                <div className="bg-base-100/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-secondary/20 hover:scale-105 transition-transform duration-300">
                  <div className="text-5xl font-black text-secondary mb-3">{totalReviews.toLocaleString()}</div>
                  <div className="text-sm font-semibold text-base-content/70 uppercase tracking-wide">
                    Total Reviews
                  </div>
                  <div className="text-xs text-base-content/50 mt-2">across all platforms</div>
                  <div className="text-3xl mt-3">📝</div>
                </div>
                <div className="bg-base-100/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-accent/20 hover:scale-105 transition-transform duration-300">
                  <div className="text-5xl font-black text-accent mb-3">{platforms}</div>
                  <div className="text-sm font-semibold text-base-content/70 uppercase tracking-wide">Platforms</div>
                  <div className="text-xs text-base-content/50 mt-2">verified accounts</div>
                  <div className="text-3xl mt-3">🌐</div>
                </div>
                <div className="bg-base-100/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-info/20 hover:scale-105 transition-transform duration-300">
                  <div className="text-5xl font-black text-info mb-3">{oldestAccountAge}</div>
                  <div className="text-sm font-semibold text-base-content/70 uppercase tracking-wide">
                    Oldest Account
                  </div>
                  <div className="text-xs text-base-content/50 mt-2">days</div>
                  <div className="text-3xl mt-3">⏰</div>
                </div>
              </div>
            </div>

            {/* Individual Reviews */}
            <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-3xl p-10 shadow-2xl border border-base-300/50 backdrop-blur-sm">
              <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                📊 All Reviews ({totalReviewsCount})
              </h2>
              <div className="space-y-6">
                {reviews!.map((review: any, index: number) => (
                  <div
                    key={index}
                    className="bg-base-100/50 backdrop-blur-sm rounded-2xl p-8 border border-base-300/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-6">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl shadow-lg">
                          {review.platformName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold">{review.platformName}</h3>
                          <p className="text-base-content/60 text-lg">@{review.accountName}</p>
                        </div>
                      </div>
                      <div className="text-right bg-gradient-to-br from-warning/20 to-warning/10 px-6 py-4 rounded-2xl border border-warning/30 shadow-md">
                        <div className="text-4xl mb-2">{"⭐".repeat(Math.floor(Number(review.starRating) / 100))}</div>
                        <div className="text-2xl font-bold text-warning">
                          {(Number(review.starRating) / 100).toFixed(2)}/5.00
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-base-200/50 backdrop-blur-sm p-5 rounded-2xl border border-base-300/30">
                        <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wide block mb-2">
                          Total Reviews
                        </span>
                        <span className="text-2xl font-bold">{review.numberOfReviews.toString()}</span>
                      </div>
                      <div className="bg-base-200/50 backdrop-blur-sm p-5 rounded-2xl border border-base-300/30">
                        <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wide block mb-2">
                          Account Age
                        </span>
                        <span className="text-2xl font-bold">{review.ageOfAccount.toString()} days</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* JSON Output (for API-like view) */}
            <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-3xl p-10 shadow-2xl border border-base-300/50 backdrop-blur-sm">
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                💾 Raw JSON Data
              </h2>
              <pre className="bg-base-300/30 backdrop-blur-sm p-6 rounded-2xl overflow-x-auto text-sm border border-base-300/50 shadow-inner">
                {JSON.stringify(
                  {
                    address: validAddress,
                    summary: {
                      averageStars: Math.round(averageStars * 10) / 10,
                      totalReviews,
                      numberOfPlatforms: platforms,
                      oldestAccountAge,
                    },
                    reviews: reviews!.map((review: any) => ({
                      platformName: review.platformName,
                      starRating: Number(review.starRating),
                      numberOfReviews: Number(review.numberOfReviews),
                      ageOfAccount: Number(review.ageOfAccount),
                      accountName: review.accountName,
                      pictureId: review.pictureId,
                    })),
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          </>
        ) : (
          <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-3xl p-16 shadow-2xl border border-base-300/50 text-center backdrop-blur-sm">
            <div className="text-8xl mb-6">📝</div>
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              No Reviews Found
            </h2>
            <p className="text-lg text-base-content/70">
              This address doesn&apos;t have any reviews on the blockchain yet.
            </p>
            <p className="text-sm text-base-content/50 mt-4">
              Be the first to add your reputation to this address!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
