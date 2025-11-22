"use client";

import { useParams } from "next/navigation";
import { isAddress } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export default function ReviewApiPage() {
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
      <div style={{ backgroundColor: "white", minHeight: "100vh", padding: "20px" }}>
        <pre style={{ fontFamily: "monospace", fontSize: "14px", margin: 0 }}>
          {JSON.stringify({ error: "Invalid Ethereum address" }, null, 2)}
        </pre>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ backgroundColor: "white", minHeight: "100vh", padding: "20px" }}>
        <pre style={{ fontFamily: "monospace", fontSize: "14px", margin: 0 }}>
          {JSON.stringify({ status: "loading", message: "Fetching reviews from blockchain..." }, null, 2)}
        </pre>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: "white", minHeight: "100vh", padding: "20px" }}>
        <pre style={{ fontFamily: "monospace", fontSize: "14px", margin: 0 }}>
          {JSON.stringify({ error: "Failed to fetch reviews from blockchain" }, null, 2)}
        </pre>
      </div>
    );
  }

  // Calculate summary statistics
  const totalReviewsCount = reviews?.length || 0;
  const totalReviews = reviews?.reduce((sum, review: any) => sum + Number(review.numberOfReviews), 0) || 0;
  const platforms = reviews && reviews.length > 0 ? new Set(reviews.map((r: any) => r.platformName)).size : 0;
  const averageStars =
    totalReviewsCount > 0 && reviews
      ? reviews.reduce((sum, review: any) => sum + Number(review.starRating), 0) / totalReviewsCount / 100
      : 0;
  const oldestAccountAge =
    totalReviewsCount > 0 && reviews ? Math.max(...reviews.map((r: any) => Number(r.ageOfAccount))) : 0;

  const responseData = {
    address: validAddress,
    summary: {
      averageStars: Math.round(averageStars * 10) / 10,
      totalReviews,
      numberOfPlatforms: platforms,
      oldestAccountAge,
    },
    reviews:
      reviews && reviews.length > 0
        ? reviews.map((review: any) => ({
            platformName: review.platformName,
            starRating: Number(review.starRating),
            numberOfReviews: Number(review.numberOfReviews),
            ageOfAccount: Number(review.ageOfAccount),
            accountName: review.accountName,
            pictureId: review.pictureId,
          }))
        : [],
  };

  return (
    <div style={{ backgroundColor: "white", minHeight: "100vh", padding: "20px" }}>
      <pre style={{ fontFamily: "monospace", fontSize: "14px", margin: 0, color: "black" }}>
        {JSON.stringify(responseData, null, 2)}
      </pre>
    </div>
  );
}

