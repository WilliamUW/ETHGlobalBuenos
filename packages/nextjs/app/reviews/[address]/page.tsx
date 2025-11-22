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
  const { data: reviews, isLoading, error } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getReviews",
    args: validAddress ? [validAddress] : undefined,
  });

  if (!validAddress) {
    return (
      <div className="flex items-center justify-center min-h-screen p-5">
        <div className="bg-error/10 border-2 border-error rounded-xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">Invalid Address</h1>
          <p className="text-error">Please provide a valid Ethereum address.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-lg">Loading reviews...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-5">
        <div className="bg-error/10 border-2 border-error rounded-xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-error">Failed to fetch reviews from blockchain</p>
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
      <div className="max-w-4xl w-full space-y-6">
        {/* Header */}
        <div className="bg-base-200 rounded-2xl p-8 shadow-xl border-2 border-base-300">
          <h1 className="text-3xl font-bold mb-4 text-center">Wallet Reviews</h1>
          <div className="flex justify-center items-center gap-2">
            <span className="text-base-content/70">Address:</span>
            <Address address={validAddress} />
          </div>
        </div>

        {totalReviewsCount > 0 ? (
          <>
            {/* Summary Statistics */}
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-8 shadow-xl border-2 border-primary/20">
              <h2 className="text-2xl font-bold mb-6 text-center">Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-base-100 rounded-lg p-6 text-center shadow">
                  <div className="text-4xl font-bold text-primary mb-2">{averageStars.toFixed(2)}</div>
                  <div className="text-sm text-base-content/60">Average Stars</div>
                  <div className="text-xs text-base-content/40 mt-1">out of 5.00</div>
                </div>
                <div className="bg-base-100 rounded-lg p-6 text-center shadow">
                  <div className="text-4xl font-bold text-secondary mb-2">{totalReviews.toLocaleString()}</div>
                  <div className="text-sm text-base-content/60">Total Reviews</div>
                  <div className="text-xs text-base-content/40 mt-1">across all platforms</div>
                </div>
                <div className="bg-base-100 rounded-lg p-6 text-center shadow">
                  <div className="text-4xl font-bold text-accent mb-2">{platforms}</div>
                  <div className="text-sm text-base-content/60">Platforms</div>
                  <div className="text-xs text-base-content/40 mt-1">verified accounts</div>
                </div>
                <div className="bg-base-100 rounded-lg p-6 text-center shadow">
                  <div className="text-4xl font-bold text-info mb-2">{oldestAccountAge}</div>
                  <div className="text-sm text-base-content/60">Oldest Account</div>
                  <div className="text-xs text-base-content/40 mt-1">days</div>
                </div>
              </div>
            </div>

            {/* Individual Reviews */}
            <div className="bg-base-200 rounded-2xl p-8 shadow-xl border-2 border-base-300">
              <h2 className="text-2xl font-bold mb-6">All Reviews ({totalReviewsCount})</h2>
              <div className="space-y-4">
                {reviews!.map((review: any, index: number) => (
                  <div key={index} className="bg-base-100 rounded-xl p-6 border-2 border-base-300 shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-bold">{review.platformName}</h3>
                        <p className="text-base-content/60 text-lg">{review.accountName}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl mb-1">
                          {"⭐".repeat(Math.floor(Number(review.starRating) / 100))}
                        </div>
                        <div className="text-lg font-bold">{(Number(review.starRating) / 100).toFixed(2)}/5.00</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between p-3 bg-base-200 rounded-lg">
                        <span className="font-semibold">Total Reviews:</span>
                        <span className="font-mono">{review.numberOfReviews.toString()}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-base-200 rounded-lg">
                        <span className="font-semibold">Account Age:</span>
                        <span className="font-mono">{review.ageOfAccount.toString()} days</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* JSON Output (for API-like view) */}
            <div className="bg-base-200 rounded-2xl p-8 shadow-xl border-2 border-base-300">
              <h2 className="text-2xl font-bold mb-4">JSON Data</h2>
              <pre className="bg-base-100 p-4 rounded-lg overflow-x-auto text-sm">
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
          <div className="bg-base-200 rounded-2xl p-12 shadow-xl border-2 border-base-300 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold mb-2">No Reviews Found</h2>
            <p className="text-base-content/70">This address doesn't have any reviews on the blockchain yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

